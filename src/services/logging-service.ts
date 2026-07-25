import { ChannelType, EmbedBuilder, type Client, type TextChannel } from 'discord.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

async function getTextChannel(client: Client, channelId: string): Promise<TextChannel | null> {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    return null;
  }

  return channel;
}

export async function logMemberEvent(client: Client, title: string, description: string, fields: { name: string; value: string; inline?: boolean }[] = []) {
  const channel = await getTextChannel(client, config.memberLogChannelId);
  if (!channel) {
    logger.warn({ channelId: config.memberLogChannelId }, 'member-log channel unavailable');
    return;
  }

  try {
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor(0x3498db)
          .addFields(fields),
      ],
    });
  } catch (error) {
    logger.warn({ error, channelId: config.memberLogChannelId }, 'Failed to write member log');
  }
}

export async function logBotEvent(client: Client, title: string, description: string, fields: { name: string; value: string; inline?: boolean }[] = []) {
  const channel = await getTextChannel(client, config.botLogChannelId);
  if (!channel) {
    logger.warn({ channelId: config.botLogChannelId }, 'bot-logs channel unavailable');
    return;
  }

  try {
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor(0xe67e22)
          .addFields(fields),
      ],
    });
  } catch (error) {
    logger.warn({ error, channelId: config.botLogChannelId }, 'Failed to write bot log');
  }
}
