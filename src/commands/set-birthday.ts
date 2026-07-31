import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../services/command-registry.js';
import { prisma } from '../db.js';
import { UserFacingError } from '../utils/errors.js';
import { config } from '../config.js';

export const setBirthdayCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('set-birthday')
    .setDescription('Set a member\'s birthday (MM-DD format).')
    .addStringOption((option) => 
        option.setName('month')
            .setDescription('Birth month (01-12)')
            .setRequired(true)
            .setMinLength(2)
            .setMaxLength(2)
    )
    .addStringOption((option) => 
        option.setName('day')
            .setDescription('Birth day (01-31)')
            .setRequired(true)
            .setMinLength(2)
            .setMaxLength(2)
    )
    .addUserOption((option) => 
        option.setName('user')
            .setDescription('User to set birthday for (Admins only)')
            .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const month = interaction.options.getString('month', true);
    const day = interaction.options.getString('day', true);
    const targetUser = interaction.options.getUser('user');
    
    // Validate date format roughly
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new UserFacingError('Invalid month. Please enter a value between 01 and 12.');
    }
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      throw new UserFacingError('Invalid day. Please enter a value between 01 and 31.');
    }

    const birthdayStr = `${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    let discordIdToUpdate = interaction.user.id;

    if (targetUser && targetUser.id !== interaction.user.id) {
        // Only admins/moderators can set someone else's birthday
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
            throw new UserFacingError('You do not have permission to set another user\'s birthday.');
        }
        discordIdToUpdate = targetUser.id;
    }

    let member = await prisma.member.findUnique({ where: { discordId: discordIdToUpdate } });

    if (!member) {
      let discordUser = null;
      let discordMember = null;
      try {
        discordUser = await interaction.client.users.fetch(discordIdToUpdate);
        if (interaction.guild) {
          discordMember = await interaction.guild.members.fetch(discordIdToUpdate).catch(() => null);
        }
      } catch (e) {}

      if (discordUser) {
        let userAlliance = 'Visitor';
        if (discordMember) {
          for (const [key, roleId] of Object.entries(config.allianceRoleIds)) {
            if (roleId && discordMember.roles.cache.has(roleId)) {
              if (key !== 'Visitor') {
                userAlliance = key;
                break;
              }
            }
          }
        }

        member = await prisma.member.create({
          data: {
            discordId: discordUser.id,
            username: discordUser.username,
            ign: discordUser.username,
            playerId: `dummy-${discordUser.id}`,
            alliance: userAlliance as any,
            stateNumber: 3220,
            verified: false,
            birthday: birthdayStr,
          }
        });
      } else {
        throw new UserFacingError(`No profile is stored for <@${discordIdToUpdate}> and their Discord account could not be found.`);
      }
    } else {
      await prisma.member.update({
        where: { discordId: discordIdToUpdate },
        data: { birthday: birthdayStr },
      });
    }

    await interaction.reply({
      content: `Successfully set birthday for <@${discordIdToUpdate}> to **${birthdayStr}**!`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
