import { ChannelType, PermissionsBitField, type Client } from 'discord.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { UserFacingError } from '../utils/errors.js';

async function ensureRoleExists(client: Client, roleId: string, label: string) {
  if (!roleId) {
    return;
  }

  const guild = await client.guilds.fetch(config.guildId);
  const role = await guild.roles.fetch(roleId);
  if (!role) {
    throw new UserFacingError(`${label} role is missing from the guild configuration.`);
  }
}

async function ensureTextChannel(client: Client, channelId: string, label: string) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new UserFacingError(`${label} channel is missing or not a text channel.`);
  }
}

export async function validateStartupConfiguration(client: Client) {
  const guild = await client.guilds.fetch(config.guildId);
  const botMember = await guild.members.fetchMe();

  const requiredPermissions = [
    PermissionsBitField.Flags.ManageRoles,
    PermissionsBitField.Flags.ManageNicknames,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.EmbedLinks,
  ];

  if (!botMember.permissions.has(requiredPermissions)) {
    throw new UserFacingError('The bot is missing one or more required Discord permissions.');
  }

  await ensureRoleExists(client, config.verifiedRoleId, 'Verified');
  await Promise.all(Object.entries(config.allianceRoleIds).map(([name, roleId]) => ensureRoleExists(client, roleId, name)));
  await ensureTextChannel(client, config.reviewChannelId, 'verification-review');
  await ensureTextChannel(client, config.memberLogChannelId, 'member-log');
  await ensureTextChannel(client, config.botLogChannelId, 'bot-logs');

  logger.info({ guildId: guild.id }, 'Startup configuration validated');
}
