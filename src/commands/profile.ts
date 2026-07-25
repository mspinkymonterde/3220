import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../services/command-registry.js';
import { prisma } from '../db.js';
import { buildProfileEmbed } from '../utils/embeds.js';
import { UserFacingError } from '../utils/errors.js';

export const profileCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Display a stored member profile.')
    .addUserOption((option) => option.setName('user').setDescription('User to inspect').setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const member = await prisma.member.findUnique({ where: { discordId: user.id } });

    if (!member) {
      throw new UserFacingError('No profile is stored for that user yet.');
    }

    await interaction.reply({
      embeds: [
        buildProfileEmbed({
          discordTag: `<@${user.id}>`,
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
