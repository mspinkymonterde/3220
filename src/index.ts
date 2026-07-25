import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { handleInteractionCreate } from './events/interactionCreate.js';
import { handleReady } from './events/ready.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { prisma } from './db.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

client.on('ready', async () => handleReady(client));
client.on('interactionCreate', handleInteractionCreate);

async function main() {
  await prisma.$connect();
  await client.login(config.botToken);
}

main().catch((error) => {
  if (error instanceof Error) {
    logger.error({ name: error.name, message: error.message, stack: error.stack }, 'Failed to start bot');
  } else {
    logger.error({ error }, 'Failed to start bot');
  }
  process.exitCode = 1;
});
