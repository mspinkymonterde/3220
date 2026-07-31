import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../services/command-registry.js';
import { prisma } from '../db.js';
import { UserFacingError } from '../utils/errors.js';
import { config } from '../config.js';

export const clearBirthdayCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('clear-birthday')
    .setDescription('Clear a member\'s birthday so it is no longer announced.')
    .addUserOption((option) => 
        option.setName('user')
            .setDescription('User to clear birthday for (Admins only)')
            .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user');
    
    let discordIdToUpdate = interaction.user.id;

    if (targetUser && targetUser.id !== interaction.user.id) {
        // Only admins/moderators can clear someone else's birthday
        const memberRoles = interaction.member?.roles;
        let hasPermission = false;
        
        if (Array.isArray(memberRoles)) {
            hasPermission = memberRoles.some(role => 
                config.ownerRoleIds.includes(role) || config.moderatorRoleIds.includes(role)
            );
        } else if (memberRoles && 'cache' in memberRoles) {
            hasPermission = memberRoles.cache.some(role => 
                config.ownerRoleIds.includes(role.id) || config.moderatorRoleIds.includes(role.id)
            );
        }

        if (!hasPermission) {
            throw new UserFacingError('You do not have permission to clear another user\'s birthday.');
        }
        discordIdToUpdate = targetUser.id;
    }

    const member = await prisma.member.findUnique({ where: { discordId: discordIdToUpdate } });

    if (!member) {
      throw new UserFacingError(`No profile is stored for <@${discordIdToUpdate}> yet.`);
    }

    await prisma.member.update({
        where: { discordId: discordIdToUpdate },
        data: { birthday: null },
    });

    await interaction.reply({
      content: `Successfully cleared the birthday for <@${discordIdToUpdate}>!`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
