import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../services/command-registry.js';
import { UserFacingError } from '../utils/errors.js';
import { config } from '../config.js';
import { processBirthdays } from '../services/birthday-service.js';

export const testBirthdaysCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('test-birthdays')
    .setDescription('Manually trigger the birthday announcement check (Admins only).'),
  async execute(interaction: ChatInputCommandInteraction) {
    // Check permissions
    const memberRoles = interaction.member?.roles;
    let hasPermission = false;
    
    if (interaction.guild && interaction.user.id === interaction.guild.ownerId) {
        hasPermission = true;
    } else if (Array.isArray(memberRoles)) {
        hasPermission = memberRoles.some(role => 
            config.ownerRoleIds.includes(role) || config.moderatorRoleIds.includes(role)
        );
    } else if (memberRoles && 'cache' in memberRoles) {
        hasPermission = memberRoles.cache.some(role => 
            config.ownerRoleIds.includes(role.id) || config.moderatorRoleIds.includes(role.id)
        );
    }

    if (!hasPermission) {
        throw new UserFacingError('You do not have permission to use this command.');
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await processBirthdays(interaction.client);
      await interaction.editReply({ content: 'Successfully triggered the birthday check! If anyone has a birthday today (UTC time), it should have been announced in the channel.' });
    } catch (error) {
      console.error('Failed to test birthdays', error);
      throw new UserFacingError('Failed to trigger the birthday check.');
    }
  },
};
