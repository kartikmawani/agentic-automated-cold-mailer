#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  console.log("🚀 Launching Agentic Cold Mailer CLI...");

  // 1. Prisma 7 CLI automatically reads connection from prisma.config.ts
  try {
    execSync(`npx prisma db push --accept-data-loss`, {
      stdio: 'inherit'
    });
  } catch (err: any) {
    console.warn("⚠️ Database sync check warning, proceeding...", err?.message || err);
  }

  // 2. Dynamically import startServer after DB sync
  const { startServer } = await import('../app.js');
  await startServer();
}

bootstrap().catch((err) => {
  console.error("💥 Failed to boot CLI engine:", err);
  process.exit(1);
});