import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction,
} from 'discord.js';
import type { VerificationInput } from '../types.js';
import { UserFacingError } from '../utils/errors.js';
import { validateAlliance, validateBooleanChoice, validateCurrentState, validateIgn, validateNotes, validatePlayerId } from '../utils/validators.js';

export const verificationOpenButtonId = 'verification:open';
export const verificationModalId = 'verification:modal';

const fieldIds = {
  ign: 'verification:ign',
  playerId: 'verification:player_id',
  alliance: 'verification:alliance',
  inState3220: 'verification:in_state_3220',
  currentState: 'verification:current_state',
} as const;

function buildInput(customId: string, label: string, placeholder: string, required = true) {
  return new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setPlaceholder(placeholder)
    .setStyle(TextInputStyle.Short)
    .setRequired(required);
}

export function buildVerificationModal() {
  return new ModalBuilder()
    .setCustomId(verificationModalId)
    .setTitle('State 3220 Verification')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        buildInput(fieldIds.ign, 'In-game name', 'Example: Summer'),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        buildInput(fieldIds.playerId, 'Player ID', 'Example: 123456789'),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        buildInput(fieldIds.alliance, 'Alliance', 'HEL, HLS, ZRO, MIT, or Visitor'),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        buildInput(fieldIds.inState3220, 'Are you currently in State 3220?', 'Yes or No'),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        buildInput(fieldIds.currentState, 'Current State if not in State 3220', 'Example: 3198', false),
      ),
    );
}
export function extractVerificationInput(interaction: ModalSubmitInteraction): VerificationInput {
  const ign = validateIgn(interaction.fields.getTextInputValue(fieldIds.ign));
  const playerId = validatePlayerId(interaction.fields.getTextInputValue(fieldIds.playerId));
  const alliance = validateAlliance(interaction.fields.getTextInputValue(fieldIds.alliance));
  const inState3220 = validateBooleanChoice(interaction.fields.getTextInputValue(fieldIds.inState3220));
  const currentState = validateCurrentState(interaction.fields.getTextInputValue(fieldIds.currentState));

  if (!inState3220 && !currentState) {
    throw new UserFacingError('Current State is required when you are not in State 3220.');
  }

  return {
    ign,
    playerId,
    alliance,
    inState3220,
    currentState,
  };
}
