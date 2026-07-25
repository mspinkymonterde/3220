import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../services/command-registry.js';
import { prisma } from '../db.js';
import { buildProfileEmbed } from '../utils/embeds.js';
import { UserFacingError } from '../utils/errors.js';

export const lookupIdCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('lookup-id')
    .setDescription('Look up a member profile by Player ID.')
    .addStringOption((option) => option.setName('player_id').setDescription('Player ID').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const playerId = interaction.options.getString('player_id', true);
    const member = await prisma.member.findUnique({ where: { playerId } });

    if (!member) {
      throw new UserFacingError('No member was found for that Player ID.');
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
