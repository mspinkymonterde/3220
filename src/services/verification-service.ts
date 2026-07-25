import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  GuildMember,
  MessageFlags,
  type Client,
  type InteractionReplyOptions,
  type TextChannel,
} from 'discord.js';
import { Prisma } from '@prisma/client';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { logger } from '../logger.js';
import { logBotEvent, logMemberEvent } from './logging-service.js';
import type { VerificationInput } from '../types.js';
import { buildVerificationEmbed } from '../utils/embeds.js';
import { UserFacingError } from '../utils/errors.js';
import { validateAlliance } from '../utils/validators.js';

function buildReviewButtons(disabled = false) {
  return [
    new ButtonBuilder()
      .setCustomId('verification:approve')
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('verification:deny')
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  ];
}

async function logAudit(action: string, discordUserId: string, targetDiscordId: string | null, details: Prisma.InputJsonValue) {
  await prisma.auditLog.create({
    data: {
      action,
      discordUserId,
      targetDiscordId,
      details,
    },
  });
}

async function getReviewChannel(client: Client): Promise<TextChannel> {
  const channel = await client.channels.fetch(config.reviewChannelId);
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new UserFacingError('Verification review channel is missing or not a text channel.');
  }

  return channel;
}

async function updateMemberVisuals(member: GuildMember, input: VerificationInput): Promise<{ nicknameChanged: boolean; rolesAssigned: string[] }> {
  const rolesAssigned: string[] = [];
  let nicknameChanged = false;

  // Fetch a fresh copy of the member to ensure the cache is up to date
  let freshMember: GuildMember = member;
  try {
    freshMember = await member.guild.members.fetch({ user: member.id, force: true });
  } catch (error) {
    logger.warn({ error, memberId: member.id }, 'Failed to re-fetch member, using cached copy');
  }

  // Nickname: only possible when the bot can manage this member
  try {
    if (freshMember.manageable) {
      await freshMember.setNickname(input.ign);
      nicknameChanged = true;
    } else {
      logger.warn({ memberId: freshMember.id, manageable: freshMember.manageable }, 'Bot cannot manage this member – skipping nickname change');
    }
  } catch (error) {
    logger.warn({ error, memberId: freshMember.id }, 'Failed to change nickname');
  }

  // verifiedRoleId is the State 3220 role – only assign it to members who are in State 3220.
  // Alliance role is always assigned.
  const rolesToAdd = [
    input.inState3220 ? config.verifiedRoleId : null,
    config.allianceRoleIds[input.alliance],
  ].filter(Boolean) as string[];
  logger.info({ memberId: freshMember.id, rolesToAdd, inState3220: input.inState3220, alliance: input.alliance }, 'Attempting to assign roles');
  if (rolesToAdd.length > 0) {
    try {
      await freshMember.roles.add(rolesToAdd);
      rolesAssigned.push(...rolesToAdd);
    } catch (error) {
      logger.warn({ error, memberId: freshMember.id, rolesToAdd }, 'Failed to assign roles');
    }
  } else {
    logger.warn({ memberId: freshMember.id, verifiedRoleId: config.verifiedRoleId, alliance: input.alliance }, 'No roles to add – check VERIFIED_ROLE_ID and ALLIANCE_ROLE_IDS_JSON');
  }

  return { nicknameChanged, rolesAssigned };
}

export async function submitVerification(client: Client, member: GuildMember, input: VerificationInput) {
  const duplicate = await prisma.member.findFirst({
    where: {
      playerId: input.playerId,
      discordId: { not: member.id },
    },
  });

  if (duplicate) {
    await logAudit('duplicate_player_id_attempt', member.id, duplicate.discordId, {
      playerId: input.playerId,
      ign: input.ign,
      alliance: input.alliance,
    });
    await logBotEvent(client, 'Duplicate Player ID Attempt', 'A verification submission reused an existing Player ID.', [
      { name: 'Discord', value: `<@${member.id}>`, inline: true },
      { name: 'Player ID', value: input.playerId, inline: true },
      { name: 'IGN', value: input.ign, inline: true },
    ]);
    throw new UserFacingError('This Player ID is already registered.\n\nPlease contact a moderator if you believe this is an error.');
  }

  const savedMember = await prisma.member.upsert({
    where: { discordId: member.id },
    create: {
      discordId: member.id,
      username: member.user.username,
      nickname: member.nickname,
      ign: input.ign,
      playerId: input.playerId,
      alliance: input.alliance,
      stateNumber: input.inState3220 ? 3220 : Number(input.currentState ?? 0),
      verified: input.inState3220,
      notes: input.notes ?? null,
      joinedDiscordAt: member.joinedAt ?? null,
      verifiedAt: input.inState3220 ? new Date() : null,
    },
    update: {
      username: member.user.username,
      nickname: member.nickname,
      ign: input.ign,
      playerId: input.playerId,
      alliance: input.alliance,
      stateNumber: input.inState3220 ? 3220 : Number(input.currentState ?? 0),
      verified: input.inState3220,
      notes: input.notes ?? null,
      joinedDiscordAt: member.joinedAt ?? null,
      verifiedAt: input.inState3220 ? new Date() : null,
    },
  });

  const request = await prisma.verificationRequest.create({
    data: {
      memberId: savedMember.id,
      status: input.inState3220 ? 'AutoApproved' : 'Pending',
      submittedByDiscordId: member.id,
      payloadSnapshot: {
        ign: input.ign,
        playerId: input.playerId,
        alliance: input.alliance,
        inState3220: input.inState3220,
        currentState: input.currentState ?? null,
        notes: input.notes ?? null,
      },
    },
  });

  if (input.inState3220) {
    const visualResult = await updateMemberVisuals(member, input);
    await logAudit('verification_auto_approved', member.id, member.id, {
      requestId: request.id,
      memberId: savedMember.id,
      nicknameChanged: visualResult.nicknameChanged,
      rolesAssigned: visualResult.rolesAssigned,
    });
    await logMemberEvent(client, 'Auto Verification', 'A member was automatically verified.', [
      { name: 'Discord', value: `<@${member.id}>`, inline: true },
      { name: 'IGN', value: input.ign, inline: true },
      { name: 'Player ID', value: input.playerId, inline: true },
      { name: 'Alliance', value: input.alliance, inline: true },
      { name: 'State', value: '3220', inline: true },
      { name: 'Nickname Changed', value: visualResult.nicknameChanged ? 'Yes' : 'No', inline: true },
    ]);

    return {
      requestId: request.id,
      status: 'auto-approved' as const,
      reply: {
        content: 'Verification complete. You have been automatically approved.',
        flags: MessageFlags.Ephemeral,
      } satisfies InteractionReplyOptions,
    };
  }

  const reviewChannel = await getReviewChannel(client);
  const reviewEmbed = buildVerificationEmbed(input, member.user.tag).setFooter({ text: request.id });
  const reviewMessage = await reviewChannel.send({
    embeds: [reviewEmbed],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(...buildReviewButtons())],
  });

  await prisma.verificationRequest.update({
    where: { id: request.id },
    data: { reviewMessageId: reviewMessage.id },
  });

  await logAudit('verification_pending', member.id, member.id, {
    requestId: request.id,
    reviewMessageId: reviewMessage.id,
  });
  await logMemberEvent(client, 'Pending Verification', 'A verification request is awaiting moderator review.', [
    { name: 'Discord', value: `<@${member.id}>`, inline: true },
    { name: 'IGN', value: input.ign, inline: true },
    { name: 'Player ID', value: input.playerId, inline: true },
    { name: 'Alliance', value: input.alliance, inline: true },
    { name: 'Current State', value: input.currentState ?? 'Unknown', inline: true },
  ]);

  return {
    requestId: request.id,
    status: 'pending' as const,
    reply: {
      content: 'Your verification has been submitted for moderator review.',
      flags: MessageFlags.Ephemeral,
    } satisfies InteractionReplyOptions,
  };
}

export async function approveRequest(client: Client, requestId: string, reviewer: GuildMember) {
  const request = await prisma.verificationRequest.findUnique({
    where: { id: requestId },
    include: { member: true },
  });

  if (!request || !request.member) {
    throw new UserFacingError('Pending verification request not found.');
  }

  if (request.status !== 'Pending') {
    throw new UserFacingError('This verification request has already been resolved.');
  }

  const payload = request.payloadSnapshot as Record<string, unknown>;
  const ign = String(payload.ign ?? request.member.ign);
  const alliance = validateAlliance(String(payload.alliance ?? request.member.alliance));
  const inState3220 = Boolean(payload.inState3220);
  const stateNumber = inState3220 ? 3220 : Number(payload.currentState ?? request.member.stateNumber);

  await prisma.$transaction([
    prisma.member.update({
      where: { id: request.member.id },
      data: {
        ign,
        alliance,
        stateNumber,
        verified: true,
        verifiedAt: new Date(),
        notes: (payload.notes ?? request.member.notes ?? null) as string | null,
      },
    }),
    prisma.verificationRequest.update({
      where: { id: request.id },
      data: {
        status: 'Approved',
        reviewedByDiscordId: reviewer.id,
        reviewedAt: new Date(),
      },
    }),
  ]);

  const guildMember = await reviewer.guild.members.fetch(request.submittedByDiscordId).catch(() => null);
  if (guildMember) {
    await updateMemberVisuals(guildMember, {
      ign,
      playerId: request.member.playerId,
      alliance,
      inState3220,
      notes: request.member.notes ?? undefined,
    });
  }

  await logAudit('verification_approved', reviewer.id, request.submittedByDiscordId, {
    requestId: request.id,
    reviewerId: reviewer.id,
  });
  await logMemberEvent(client, 'Verification Approved', 'A moderator approved a pending verification request.', [
    { name: 'Reviewer', value: `<@${reviewer.id}>`, inline: true },
    { name: 'Member', value: `<@${request.submittedByDiscordId}>`, inline: true },
    { name: 'IGN', value: ign, inline: true },
    { name: 'Player ID', value: request.member.playerId, inline: true },
  ]);

  const targetMember = await reviewer.guild.members.fetch(request.submittedByDiscordId).catch(() => null);
  if (targetMember) {
    await targetMember.send(`Your verification for ${ign} has been approved. You now have access to State 3220.`).catch(() => undefined);
  }

  return request;
}

export async function denyRequest(client: Client, requestId: string, reviewer: GuildMember, reason?: string) {
  const request = await prisma.verificationRequest.findUnique({
    where: { id: requestId },
    include: { member: true },
  });

  if (!request) {
    throw new UserFacingError('Pending verification request not found.');
  }

  if (request.status !== 'Pending') {
    throw new UserFacingError('This verification request has already been resolved.');
  }

  await prisma.verificationRequest.update({
    where: { id: request.id },
    data: {
      status: 'Denied',
      reviewedByDiscordId: reviewer.id,
      reviewedAt: new Date(),
      denialReason: reason ?? null,
    },
  });

  await logAudit('verification_denied', reviewer.id, request.submittedByDiscordId, {
    requestId: request.id,
    reviewerId: reviewer.id,
    reason: reason ?? null,
  });
  await logMemberEvent(client, 'Verification Denied', 'A moderator denied a pending verification request.', [
    { name: 'Reviewer', value: `<@${reviewer.id}>`, inline: true },
    { name: 'Member', value: `<@${request.submittedByDiscordId}>`, inline: true },
    { name: 'Reason', value: reason ?? 'No reason provided', inline: false },
  ]);

  const targetMember = await reviewer.guild.members.fetch(request.submittedByDiscordId).catch(() => null);
  if (targetMember) {
    await targetMember.send(reason ? `Your verification was denied. Reason: ${reason}` : 'Your verification was denied by a moderator.').catch(() => undefined);
  }

  return request;
}
