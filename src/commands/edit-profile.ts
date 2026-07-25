import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../services/command-registry.js';
import { prisma } from '../db.js';
import { hasModeratorAccess } from '../utils/permissions.js';
import { UserFacingError } from '../utils/errors.js';
import { validateAlliance, validateCurrentState, validateIgn, validateNotes, validatePlayerId } from '../utils/validators.js';

export const editProfileCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('edit-profile')
    .setDescription('Update a stored member profile.')
    .addUserOption((option) => option.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption((option) => option.setName('ign').setDescription('IGN').setRequired(false))
    .addStringOption((option) => option.setName('player_id').setDescription('Player ID').setRequired(false))
    .addStringOption((option) => option.setName('alliance').setDescription('Alliance').setRequired(false))
    .addStringOption((option) => option.setName('state').setDescription('State number').setRequired(false))
    .addBooleanOption((option) => option.setName('verified').setDescription('Verified status').setRequired(false))
    .addStringOption((option) => option.setName('notes').setDescription('Notes').setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      throw new UserFacingError('This command can only be used in a server.');
    }

    const member = interaction.member;
    if (!hasModeratorAccess(member)) {
      throw new UserFacingError('You do not have permission to edit member profiles.');
    }

    const targetUser = interaction.options.getUser('user', true);
    const existing = await prisma.member.findUnique({ where: { discordId: targetUser.id } });

    if (!existing) {
      throw new UserFacingError('No stored profile exists for that user.');
    }

    const ign = interaction.options.getString('ign');
    const playerId = interaction.options.getString('player_id');
    const alliance = interaction.options.getString('alliance');
    const state = interaction.options.getString('state');
    const verified = interaction.options.getBoolean('verified');
    const notes = interaction.options.getString('notes');

    const updateData = {
      ...(ign ? { ign: validateIgn(ign) } : {}),
      ...(playerId ? { playerId: validatePlayerId(playerId) } : {}),
      ...(alliance ? { alliance: validateAlliance(alliance) } : {}),
      ...(state ? { stateNumber: Number(validateCurrentState(state)) } : {}),
      ...(verified !== null ? { verified } : {}),
      ...(notes !== null ? { notes: validateNotes(notes) ?? null } : {}),
    };

    const updated = await prisma.member.update({
      where: { discordId: targetUser.id },
      data: updateData,
    });

    await interaction.reply({ content: `Profile for ${updated.ign} was updated.`, flags: MessageFlags.Ephemeral });
  },
};
