import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { commands } from './services/command-registry.js';

async function main() {
  const rest = new REST({ version: '10' }).setToken(config.botToken);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
    body: commands.map((command) => command.data.toJSON()),
  });

  console.log(`Registered ${commands.length} slash commands.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
