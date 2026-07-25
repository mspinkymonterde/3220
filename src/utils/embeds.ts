import { EmbedBuilder } from 'discord.js';
import type { VerificationInput } from '../types.js';

export function buildVerificationEmbed(input: VerificationInput, discordTag: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('New Verification Request')
    .setColor(input.inState3220 ? 0x2ecc71 : 0xf39c12)
    .addFields(
      { name: 'Discord', value: discordTag, inline: false },
      { name: 'IGN', value: input.ign, inline: true },
      { name: 'Player ID', value: input.playerId, inline: true },
      { name: 'Alliance', value: input.alliance, inline: true },
      { name: 'State 3220', value: input.inState3220 ? 'Yes' : 'No', inline: true },
      { name: 'Current State', value: input.inState3220 ? 'N/A' : input.currentState ?? 'Unknown', inline: true },
    );

  if (input.notes) {
    embed.addFields({ name: 'Additional Notes', value: input.notes, inline: false });
  }

  return embed;
}

export function buildProfileEmbed(profile: {
  discordTag: string;
  ign: string;
  playerId: string;
  alliance: string;
  stateNumber: number;
  verified: boolean;
  notes?: string | null;
  joinedDiscordAt?: Date | null;
  verifiedAt?: Date | null;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Member Profile')
    .setColor(profile.verified ? 0x2ecc71 : 0x95a5a6)
    .addFields(
      { name: 'Discord', value: profile.discordTag, inline: true },
      { name: 'IGN', value: profile.ign, inline: true },
      { name: 'Player ID', value: profile.playerId, inline: true },
      { name: 'Alliance', value: profile.alliance, inline: true },
      { name: 'State', value: String(profile.stateNumber), inline: true },
      { name: 'Verified', value: profile.verified ? 'Yes' : 'No', inline: true },
      { name: 'Joined Discord', value: profile.joinedDiscordAt?.toISOString() ?? 'Unknown', inline: false },
      { name: 'Verified Date', value: profile.verifiedAt?.toISOString() ?? 'Unknown', inline: false },
    )
    .setDescription(profile.notes ? profile.notes : 'No notes recorded.');
}
