import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../services/command-registry.js';
import { prisma } from '../db.js';

export const birthdaysCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('birthdays')
    .setDescription('View a list of all upcoming birthdays in the server.'),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    // Fetch all members with a birthday set
    const members = await prisma.member.findMany({
      where: {
        birthday: {
          not: null,
        },
      },
    });

    if (members.length === 0) {
      await interaction.editReply('No birthdays have been set yet!');
      return;
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate(); // 1-31

    // Map and calculate the next birthday date for each user
    const upcoming = members.map((m) => {
      const [mmStr, ddStr] = (m.birthday as string).split('-');
      const mm = parseInt(mmStr || '1', 10);
      const dd = parseInt(ddStr || '1', 10);

      // Determine if the birthday has already passed this year
      let year = currentYear;
      if (mm < currentMonth || (mm === currentMonth && dd < currentDay)) {
        year = currentYear + 1;
      }

      const dateObj = new Date(year, mm - 1, dd);

      return {
        member: m,
        dateObj,
        month: mm,
        day: dd,
        year,
      };
    });

    // Sort by the closest upcoming date
    upcoming.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // Take the top 15 upcoming birthdays
    const topUpcoming = upcoming.slice(0, 15);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Format the lines
    const descriptionLines = topUpcoming.map((u) => {
      const formattedDate = `${String(u.day).padStart(2, '0')} ${months[u.month - 1]} ${u.year}`;
      return `\`${formattedDate}\` • <@${u.member.discordId}>`;
    });

    const embed = new EmbedBuilder()
      .setTitle('🎂 Birthday List')
      .setColor(0xff69b4) // Nice pink color for birthdays
      .setDescription(descriptionLines.join('\n'));

    await interaction.editReply({ embeds: [embed] });
  },
};
