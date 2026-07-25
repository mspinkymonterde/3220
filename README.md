# State 3220 Discord Bot

Discord bot scaffold for the State 3220 community. It uses discord.js v14, Prisma, and SQLite locally with a clean path to PostgreSQL on Railway.

## Features

- Welcome-channel verification panel with an in-Discord form
- Automatic verification for members already in State 3220
- Moderator approval queue for transfers and external members
- Duplicate Player ID protection
- Profile lookup and editing commands
- Structured logging and guild/channel startup checks

## Verification Flow

Members use the verification panel in the welcome channel. They click `Open Form`, complete the modal inside Discord, and the bot verifies them automatically or sends the request to moderators if they are not in State 3220.

## Setup

1. Copy `.env.example` to `.env` and fill in the IDs and token.
2. Install dependencies with `npm install`.
3. Generate Prisma client with `npm run prisma:generate`.
4. Create the database with `npm run prisma:migrate`.
5. Register slash commands with `npm run register:commands`.
6. Start the bot with `npm run dev`.

After setup, run `/setup-panel` once in your welcome channel so the bot can post the verification panel.

## Scripts

- `npm run build` - TypeScript build
- `npm run dev` - Run the bot in watch mode
- `npm run start` - Run the compiled bot
- `npm run register:commands` - Register guild slash commands
- `npm run prisma:migrate` - Create or update local migrations
- `npm run prisma:generate` - Generate Prisma client

## Production Notes

Use `DATABASE_URL` for PostgreSQL on Railway in production and run `npm run prisma:deploy` during deployment.
