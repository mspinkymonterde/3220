import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../services/command-registry.js';
import { prisma } from '../db.js';
import { UserFacingError } from '../utils/errors.js';
import { config } from '../config.js';

export const importBirthdaysCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('import-birthdays')
    .setDescription('Bulk import birthdays from a CSV attachment (Admins only).')
    .addAttachmentOption((option) =>
      option
        .setName('csv')
        .setDescription('CSV file with format: username_or_id,MM-DD')
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    // Check permissions
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
        throw new UserFacingError('You do not have permission to use this command.');
    }

    const attachment = interaction.options.getAttachment('csv', true);

    if (!attachment.contentType?.includes('csv') && !attachment.name.endsWith('.csv')) {
      throw new UserFacingError('Please provide a valid CSV file.');
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const response = await fetch(attachment.url);
      const csvText = await response.text();
      
      const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      let updatedCount = 0;
      const notFoundIdentifiers: string[] = [];

      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 2) {
          const identifier = parts[0]?.trim();
          const birthday = parts[1]?.trim();

          if (identifier && birthday && birthday.match(/^\d{2}-\d{2}$/)) {
            // Find member by discordId or username
            const member = await prisma.member.findFirst({
              where: {
                OR: [
                  { discordId: identifier },
                  { username: { equals: identifier, mode: 'insensitive' } }
                ]
              }
            });

            if (member) {
              await prisma.member.update({
                where: { id: member.id },
                data: { birthday },
              });
              updatedCount++;
              let discordUser = null;
              let discordMember = null;
              try {
                if (identifier.match(/^\d{17,20}$/)) {
                  discordUser = await interaction.client.users.fetch(identifier);
                  if (interaction.guild) {
                    discordMember = await interaction.guild.members.fetch(identifier).catch(() => null);
                  }
                } else if (interaction.guild) {
                  const guildMembers = await interaction.guild.members.fetch({ query: identifier, limit: 1 });
                  discordMember = guildMembers.first();
                  discordUser = discordMember?.user;
                }
              } catch (e) {
                // Ignore fetch errors
              }

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

                // Create a placeholder profile
                await prisma.member.create({
                  data: {
                    discordId: discordUser.id,
                    username: discordUser.username,
                    ign: identifier,
                    playerId: `dummy-${discordUser.id}`,
                    alliance: userAlliance as any,
                    stateNumber: 3220,
                    verified: false,
                    birthday: birthday,
                  }
                });
                updatedCount++;
              } else {
                notFoundIdentifiers.push(identifier);
              }
            }
          }
        }
      }

      let replyContent = `Successfully updated birthdays for **${updatedCount}** members.`;
      if (notFoundIdentifiers.length > 0) {
        replyContent += `\nCould not find profiles for ${notFoundIdentifiers.length} users: ${notFoundIdentifiers.slice(0, 10).join(', ')}${notFoundIdentifiers.length > 10 ? '...' : ''}`;
      }

      await interaction.editReply({ content: replyContent });
    } catch (error) {
      console.error('Failed to process CSV', error);
      throw new UserFacingError('Failed to process the CSV file. Please check the format and try again.');
    }
  },
};
