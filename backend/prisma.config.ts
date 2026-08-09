import { defineConfig } from "@prisma/config";
import path from "path";
import os from "os";

// Resolve global database path (~/.mcp-outreach/dev.db)
const configDir = path.join(os.homedir(), ".mcp-outreach");
const dbPath = path.join(configDir, "dev.db");

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: `file:${dbPath}`,
  },
});