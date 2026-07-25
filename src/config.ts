import dotenv from 'dotenv';
import { z } from 'zod';
import { alliances } from './types.js';

dotenv.config({ override: true });

const roleIdSchema = z.union([z.string().min(1, 'Role IDs must not be empty'), z.literal('')]);
const allianceRoleSchema = z.object({
  HEL: roleIdSchema,
  HLS: roleIdSchema,
  ZRO: roleIdSchema,
  MIT: roleIdSchema,
  Visitor: roleIdSchema,
});

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1),
  CLIENT_ID: z.string().min(1),
  GUILD_ID: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  WELCOME_CHANNEL_ID: z.string().default(''),
  OWNER_ROLE_IDS: z.string().default(''),
  MODERATOR_ROLE_IDS: z.string().default(''),
  VERIFIED_ROLE_ID: z.string().min(1),
  ALLIANCE_ROLE_IDS_JSON: z.string().min(1),
  REVIEW_CHANNEL_ID: z.string().min(1),
  MEMBER_LOG_CHANNEL_ID: z.string().min(1),
  BOT_LOG_CHANNEL_ID: z.string().min(1),
  LOG_LEVEL: z.string().default('info'),
});

const parsedEnv = envSchema.parse(process.env);
const allianceRoleIds = allianceRoleSchema.parse(JSON.parse(parsedEnv.ALLIANCE_ROLE_IDS_JSON) as Record<string, string>);

const parseCsv = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const config = {
  botToken: parsedEnv.BOT_TOKEN,
  clientId: parsedEnv.CLIENT_ID,
  guildId: parsedEnv.GUILD_ID,
  databaseUrl: parsedEnv.DATABASE_URL,
  welcomeChannelId: parsedEnv.WELCOME_CHANNEL_ID,
  ownerRoleIds: parseCsv(parsedEnv.OWNER_ROLE_IDS),
  moderatorRoleIds: parseCsv(parsedEnv.MODERATOR_ROLE_IDS),
  verifiedRoleId: parsedEnv.VERIFIED_ROLE_ID,
  allianceRoleIds,
  reviewChannelId: parsedEnv.REVIEW_CHANNEL_ID,
  memberLogChannelId: parsedEnv.MEMBER_LOG_CHANNEL_ID,
  botLogChannelId: parsedEnv.BOT_LOG_CHANNEL_ID,
  logLevel: parsedEnv.LOG_LEVEL,
  allowedAlliances: alliances,
} as const;
