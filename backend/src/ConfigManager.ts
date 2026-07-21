import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from 'node:process';

// 1. The structural data contract your code must return
export interface AppConfig {
  anthropicApiKey: string;
  workspacePath: string;
}

// 2. The cross-platform global file target destination variables
const CONFIG_FILE_NAME = ".mcp-outreach.json";
const TARGET_CONFIG_PATH = path.join(os.homedir(), CONFIG_FILE_NAME);

/**
 * The Configuration Storage Wizard: Responsible for hydrating application keys.
 */
export async function initializeConfigWizard(): Promise<AppConfig> {
  
  // ==========================================
  // STEP 1: THE MEMORY CHECK (FIXED)
  // ==========================================
  if (fs.existsSync(TARGET_CONFIG_PATH)) {
    try {
      const rawData = fs.readFileSync(TARGET_CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(rawData);
      
      // Handle potential legacy field keys (ApiKey / Workspace) cleanly
      const anthropicApiKey = parsed.anthropicApiKey || parsed.ApiKey;
      const workspacePath = parsed.workspacePath || parsed.Workspace;

      if (anthropicApiKey && workspacePath) {
        return { anthropicApiKey, workspacePath };
      }
    } catch (error) {
      console.error("⚠️ Configuration file corrupted. Re-running setup wizard...");
    }
  }

  // ==========================================
  // STEP 2: THE TERMINAL BRIDGE
  // ==========================================
  const rl = readline.createInterface({ input, output });

  try {
    console.log("\n🚀 Welcome to MCP Cold Mailer Outreach Engine!");
    console.log("Let's configure your local-first agent environment.\n");

    let verifiedApiKey = "";
    let verifiedWorkspaceDir = "";

    // ==========================================
    // STEP 3: API VALIDATION LOOP (FIXED)
    // ==========================================
    let exit = 0;
    while (exit === 0) {
      verifiedApiKey = await rl.question("🔑 Enter your Anthropic API key (must start with 'sk-'): ");
      verifiedApiKey = verifiedApiKey.trim();
      
      if (verifiedApiKey.startsWith("sk-")) {
        exit = 1;
      } else {
        console.log("❌ Invalid format. Anthropic API keys must begin with 'sk-'. Try again.\n");
      }
    }
       
    // ==========================================
    // STEP 4: WORKSPACE VALIDATION LOOP (FIXED)
    // ==========================================
    exit = 0;
    while (exit === 0) {
      verifiedWorkspaceDir = await rl.question("📂 Enter the path to your workspace directory: ");
      verifiedWorkspaceDir = path.resolve(verifiedWorkspaceDir.trim());
         
      // Synchronous disk verification replaces the bug-prone truthy error object logic
      if (fs.existsSync(verifiedWorkspaceDir) && fs.statSync(verifiedWorkspaceDir).isDirectory()) {
        exit = 1;
      } else {
        console.log("❌ Target directory path does not exist or is not a folder. Try again.\n");
      }
    }
       
    // ==========================================
    // STEP 5: THE SECURITY SAVE (FIXED)
    // ==========================================
    const configurations: AppConfig = {
      anthropicApiKey: verifiedApiKey,
      workspacePath: verifiedWorkspaceDir
    };

    // Explicitly mapping exact keys and enforcing owner-only POSIX 0o600 permissions
    fs.writeFileSync(
      TARGET_CONFIG_PATH,
      JSON.stringify(configurations, null, 2),
      { encoding: "utf-8", mode: 0o600 }
    );

    console.log(`\n✅ Settings securely saved to: ${TARGET_CONFIG_PATH}\n`);

    return configurations;

  } finally {
    // ==========================================
    // STEP 6: THE CLEANUP GATE
    // ==========================================
    rl.close();
  }
}