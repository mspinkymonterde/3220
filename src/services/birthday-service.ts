import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

let isInitialized = false;

export async function initBirthdayService(client: Client) {
  if (isInitialized) return;
  isInitialized = true;

  if (!config.geminiApiKey || !config.birthdayChannelId) {
    logger.warn('Birthday service is disabled because GEMINI_API_KEY or BIRTHDAY_CHANNEL_ID is not set.');
    return;
  }

  // Run every day at 00:00 UTC
  cron.schedule('0 0 * * *', async () => {
    try {
      await processBirthdays(client);
    } catch (error) {
      logger.error({ error }, 'Failed to process birthdays in cron job');
    }
  }, {
    timezone: "UTC"
  });

  logger.info('Birthday service initialized and cron job scheduled.');
}

export async function processBirthdays(client: Client) {
  const today = new Date();
  const month = String(today.getUTCMonth() + 1).padStart(2, '0');
  const day = String(today.getUTCDate()).padStart(2, '0');
  const todayStr = `${month}-${day}`;

  const membersWithBirthday = await prisma.member.findMany({
    where: { birthday: todayStr },
  });

  if (membersWithBirthday.length === 0) {
    return;
  }

  const channel = await client.channels.fetch(config.birthdayChannelId) as TextChannel;
  if (!channel || !channel.isTextBased()) {
    logger.error('Birthday channel not found or is not a text channel.');
    return;
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  let guild;
  try {
    guild = await client.guilds.fetch(config.guildId);
  } catch (error) {
    logger.error('Failed to fetch guild for birthday service');
  }

  for (const member of membersWithBirthday) {
    let mention = `<@${member.discordId}>`;
    if (guild) {
      try {
        await guild.members.fetch(member.discordId);
      } catch (error) {
        // Member is not in the server, fallback to text mention
        mention = `@${member.username}`;
      }
    }

    try {
      const prompt = `Write a short, fun, and unique birthday greeting for a gamer named ${member.ign} (who is in the ${member.alliance} alliance in state ${member.stateNumber}). Keep it under 2 sentences and use emojis. Don't mention discord tags.`;
      const result = await model.generateContent(prompt);
      const aiGreeting = result.response.text().trim();

      const messageContent = `🎉 Happy Birthday ${mention}! 🎂\n> ${aiGreeting}`;
      await channel.send({ content: messageContent });
    } catch (error) {
      logger.error({ error, memberId: member.id }, 'Failed to generate or send birthday message for member.');
      // Fallback message if AI fails
      await channel.send({ content: `🎉 Happy Birthday ${mention}! 🎂 Hope you have an awesome day!` });
    }
  }
}
