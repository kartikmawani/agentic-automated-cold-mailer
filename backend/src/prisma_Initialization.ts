import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";

// 1. Locate the user's home directory (e.g., ~/.mcp-outreach)
const configDir = path.join(os.homedir(), ".mcp-outreach");

// 2. Ensure ~/.mcp-outreach directory exists on disk
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// 3. Construct absolute path to dev.db inside home directory
const dbPath = path.join(configDir, "dev.db");

// 4. Initialize SQLite adapter with the global home path
const databaseAdapter = new PrismaBetterSqlite3({
  url: `file:${dbPath}`,
});

// 5. Export shared Prisma client instance
export const prisma = new PrismaClient({
  adapter: databaseAdapter,
  log: ["error"],
});