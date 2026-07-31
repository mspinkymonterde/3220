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
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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
      const prompt = `Write a unique, sweet, and highly creative birthday greeting for a gamer named ${member.ign} in State 3220 of Whiteout Survival. 
IMPORTANT: Make every message completely different and unpredictable! Do not follow a formula. 
Vary your wording, tone, and themes. Keep it natural, sweet, and personal (2-4 short sentences). Wish them a happy birthday in real life, and add a nice note about playing together for a long time. 
Use 1 to 3 emojis maximum. Do NOT mention any alliances. Do NOT mention Discord tags.`;
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9 }, // Higher temperature for more variety
      });
      const aiGreeting = result.response.text().trim();

      const messageContent = `🎉 Happy Birthday ${mention}! 🎂\n\n> ${aiGreeting.replace(/\n/g, '\n> ')}`;
      await channel.send({ content: messageContent });
    } catch (error) {
      logger.error({ error, memberId: member.id }, 'CRITICAL: Gemini AI failed to generate the birthday message. Using fallback.');
      // Fallback message if AI fails
      await channel.send({ content: `🎉 Happy Birthday ${mention}! 🎂 Hope you have an awesome day!` });
    }
  }
}
