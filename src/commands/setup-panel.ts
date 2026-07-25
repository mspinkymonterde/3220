import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../services/command-registry.js';
import { postOrRestoreVerificationPanel } from '../services/verification-panel-service.js';
import { hasModeratorAccess } from '../utils/permissions.js';
import { UserFacingError } from '../utils/errors.js';

export const setupPanelCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('setup-panel')
    .setDescription('Post the verification panel in the current channel.'),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      throw new UserFacingError('This command can only be used in a server.');
    }

    if (!hasModeratorAccess(interaction.member)) {
      throw new UserFacingError('You do not have permission to set up the verification panel.');
    }

    if (!interaction.channel || !interaction.channel.isTextBased()) {
      throw new UserFacingError('Please use this command in a text channel.');
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await postOrRestoreVerificationPanel(interaction.client, interaction.channelId);
    await interaction.editReply({ content: 'Verification panel posted in this channel.' });
  },
};
