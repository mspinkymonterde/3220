import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { approveCommand } from '../commands/approve.js';
import { denyCommand } from '../commands/deny.js';
import { editProfileCommand } from '../commands/edit-profile.js';
import { lookupIdCommand } from '../commands/lookup-id.js';
import { lookupIgnCommand } from '../commands/lookup-ign.js';
import { profileCommand } from '../commands/profile.js';
import { setupPanelCommand } from '../commands/setup-panel.js';
import { importBirthdaysCommand } from '../commands/import-birthdays.js';
import { setBirthdayCommand } from '../commands/set-birthday.js';
import { testBirthdaysCommand } from '../commands/test-birthdays.js';
import { clearBirthdayCommand } from '../commands/clear-birthday.js';

export interface BotCommand {
  data: {
    name: string;
    toJSON(): unknown;
  };
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export const commands: BotCommand[] = [
  profileCommand,
  setupPanelCommand,
  approveCommand,
  denyCommand,
  lookupIdCommand,
  lookupIgnCommand,
  editProfileCommand,
  importBirthdaysCommand,
  setBirthdayCommand,
  testBirthdaysCommand,
  clearBirthdayCommand,
];

export const commandMap = new Map(commands.map((command) => [command.data.name, command] as const));
