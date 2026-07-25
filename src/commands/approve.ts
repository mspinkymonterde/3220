import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../services/command-registry.js';
import { approveRequest } from '../services/verification-service.js';
import { hasModeratorAccess } from '../utils/permissions.js';
import { UserFacingError } from '../utils/errors.js';

export const approveCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('approve')
    .setDescription('Approve a pending verification request.')
    .addStringOption((option) => option.setName('request_id').setDescription('Request ID').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      throw new UserFacingError('This command can only be used in a server.');
    }

    const member = interaction.member;
    if (!hasModeratorAccess(member)) {
      throw new UserFacingError('You do not have permission to approve verification requests.');
    }

    const requestId = interaction.options.getString('request_id', true);
    await approveRequest(interaction.client, requestId, member);
    await interaction.reply({ content: `Verification request ${requestId} approved.`, flags: MessageFlags.Ephemeral });
  },
};
