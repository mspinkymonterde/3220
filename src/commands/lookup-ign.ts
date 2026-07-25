import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../services/command-registry.js';
import { prisma } from '../db.js';
import { buildProfileEmbed } from '../utils/embeds.js';
import { UserFacingError } from '../utils/errors.js';

export const lookupIgnCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('lookup-ign')
    .setDescription('Look up a member profile by IGN.')
    .addStringOption((option) => option.setName('ign').setDescription('IGN').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const ign = interaction.options.getString('ign', true);
    const member = await prisma.member.findFirst({ where: { ign } });

    if (!member) {
      throw new UserFacingError('No member was found for that IGN.');
    }

    await interaction.reply({
      embeds: [
        buildProfileEmbed({
          discordTag: `<@${member.discordId}>`,
          ign: member.ign,
          playerId: member.playerId,
          alliance: member.alliance,
          stateNumber: member.stateNumber,
          verified: member.verified,
          notes: member.notes,
          joinedDiscordAt: member.joinedDiscordAt,
          verifiedAt: member.verifiedAt,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};
