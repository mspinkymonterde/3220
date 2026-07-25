import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type BaseMessageOptions,
  type Client,
  type Message,
  type TextBasedChannel,
} from 'discord.js';
import { prisma } from '../db.js';
import { logger } from '../logger.js';
import { UserFacingError } from '../utils/errors.js';
import { verificationOpenButtonId } from './verification-form.js';

const settingKey = 'verification_panel_state';

interface PanelState {
  channelId: string;
  messageId: string;
}

function buildPanelPayload() {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle('State 3220 Verification')
        .setDescription(
          'Welcome to State 3220. Tap the button below to open the verification form. After you submit, the bot will verify your member information and either approve you automatically or send you to moderator review.',
        )
        .setColor(0xe74c3c),
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(verificationOpenButtonId)
          .setLabel('Open Form')
          .setStyle(ButtonStyle.Danger),
      ),
    ],
  };
}

async function loadPanelState(): Promise<PanelState | null> {
  const record = await prisma.botSetting.findUnique({ where: { key: settingKey } });
  if (!record) {
    return null;
  }

  try {
    return JSON.parse(record.value) as PanelState;
  } catch {
    return null;
  }
}

async function savePanelState(state: PanelState) {
  await prisma.botSetting.upsert({
    where: { key: settingKey },
    create: { key: settingKey, value: JSON.stringify(state) },
    update: { value: JSON.stringify(state) },
  });
}

async function fetchTextChannel(client: Client, channelId: string): Promise<TextBasedChannel> {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    throw new UserFacingError('The verification panel channel is missing or not a text channel.');
  }

  return channel;
}

async function sendToChannel(channel: TextBasedChannel, payload: BaseMessageOptions): Promise<Message<true>> {
  try {
    // @ts-expect-error – TextBasedChannel.send always returns Message<true> in a guild context
    return await channel.send(payload) as Message<true>;
  } catch (error) {
    logger.error({ error, channelId: (channel as { id?: string }).id }, 'Failed to send verification panel');
    throw new UserFacingError(
      'Could not post the panel. Make sure the bot has **Send Messages** and **Embed Links** permissions in this channel.',
    );
  }
}

export async function postOrRestoreVerificationPanel(client: Client, channelId?: string): Promise<Message<true> | null> {
  const saved = await loadPanelState();
  const targetChannelId = channelId ?? saved?.channelId;

  if (!targetChannelId) {
    logger.warn('No verification panel channel configured. Use /setup-panel in a welcome channel to create one.');
    return null;
  }

  const channel = await fetchTextChannel(client, targetChannelId);
  const payload = buildPanelPayload();

  if (saved?.channelId === targetChannelId && saved?.messageId) {
    const existing = await channel.messages.fetch(saved.messageId).catch(() => null);
    if (existing) {
      try {
        await existing.edit(payload);
        return existing as Message<true>;
      } catch (error) {
        logger.warn({ error }, 'Failed to edit existing panel message, will repost');
      }
    }
  }

  const sent = await sendToChannel(channel, payload);
  await savePanelState({ channelId: channel.id, messageId: sent.id });
  return sent;
}
