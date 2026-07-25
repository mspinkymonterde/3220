import { Interaction, InteractionReplyOptions, MessageFlags } from 'discord.js';
import { commandMap } from '../services/command-registry.js';
import { denyRequest, approveRequest } from '../services/verification-service.js';
import { logger } from '../logger.js';
import { UserFacingError } from '../utils/errors.js';
import { hasModeratorAccess } from '../utils/permissions.js';
import { buildVerificationModal, extractVerificationInput, verificationModalId, verificationOpenButtonId } from '../services/verification-form.js';
import { submitVerification } from '../services/verification-service.js';

export async function handleInteractionCreate(interaction: Interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commandMap.get(interaction.commandName);
      if (!command) {
        throw new UserFacingError('Unknown command.');
      }

      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === verificationOpenButtonId) {
        await interaction.showModal(buildVerificationModal());
        return;
      }

      if (!interaction.inCachedGuild()) {
        await interaction.reply({ content: 'This control can only be used in a server.', flags: MessageFlags.Ephemeral });
        return;
      }

      const member = interaction.member;
      if (!hasModeratorAccess(member)) {
        await interaction.reply({ content: 'You do not have permission to use these controls.', flags: MessageFlags.Ephemeral });
        return;
      }

      const requestId = interaction.message.embeds[0]?.footer?.text || interaction.message.id;
      if (interaction.customId === 'verification:approve') {
        await approveRequest(interaction.client, requestId, member);
        await interaction.reply({ content: `Verification request ${requestId} approved.`, flags: MessageFlags.Ephemeral });
        return;
      }

      if (interaction.customId === 'verification:deny') {
        await denyRequest(interaction.client, requestId, member, 'Denied through review buttons.');
        await interaction.reply({ content: `Verification request ${requestId} denied.`, flags: MessageFlags.Ephemeral });
        return;
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId !== verificationModalId) {
        return;
      }

      if (!interaction.inCachedGuild()) {
        await interaction.reply({ content: 'This form can only be used in a server.', flags: MessageFlags.Ephemeral });
        return;
      }

      const input = extractVerificationInput(interaction);
      const response = await submitVerification(interaction.client, interaction.member, input);
      await interaction.reply(response.reply);
      return;
    }
  } catch (error) {
    logger.error({ error }, 'Interaction failed');
    const response: InteractionReplyOptions = {
      content: error instanceof UserFacingError ? error.message : 'An unexpected error occurred while processing the request.',
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(response).catch(() => undefined);
      } else {
        await interaction.reply(response).catch(() => undefined);
      }
    }
  }
}
