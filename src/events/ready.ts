import type { Client } from 'discord.js';
import { logger } from '../logger.js';
import { validateStartupConfiguration } from '../services/startup-service.js';
import { postOrRestoreVerificationPanel } from '../services/verification-panel-service.js';

export async function handleReady(client: Client) {
  await validateStartupConfiguration(client);
  await postOrRestoreVerificationPanel(client).catch((error) => {
    logger.warn({ error }, 'Unable to restore verification panel');
  });
  logger.info({ user: client.user?.tag }, 'Bot is ready');
}
