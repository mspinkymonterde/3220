import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../services/command-registry.js';
import { denyRequest } from '../services/verification-service.js';
import { hasModeratorAccess } from '../utils/permissions.js';
import { UserFacingError } from '../utils/errors.js';

export const denyCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('deny')
    .setDescription('Deny a pending verification request.')
    .addStringOption((option) => option.setName('request_id').setDescription('Request ID').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Optional denial reason').setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      throw new UserFacingError('This command can only be used in a server.');
    }

    const member = interaction.member;
    if (!hasModeratorAccess(member)) {
      throw new UserFacingError('You do not have permission to deny verification requests.');
    }

    const requestId = interaction.options.getString('request_id', true);
    const reason = interaction.options.getString('reason');
    await denyRequest(interaction.client, requestId, member, reason ?? undefined);
    await interaction.reply({ content: `Verification request ${requestId} denied.`, flags: MessageFlags.Ephemeral });
  },
};
