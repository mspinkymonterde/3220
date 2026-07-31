import { Client, GatewayIntentBits, Partials } from 'discord.js';
import * as http from 'node:http';
import { handleInteractionCreate } from './events/interactionCreate.js';
import { handleReady } from './events/ready.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { prisma } from './db.js';

// Dummy HTTP server for Render's Web Service requirement
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is alive and running!\n');
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

import { initBirthdayService } from './services/birthday-service.js';

client.on('ready', async () => {
  await handleReady(client);
  await initBirthdayService(client);
});
client.on('interactionCreate', handleInteractionCreate);

async function main() {
  await prisma.$connect();
  
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    logger.info(`Dummy web server listening on port ${port} (for Render)`);
  });

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
