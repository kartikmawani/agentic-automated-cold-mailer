import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from 'node:process';

// 1. Updated structural data contract to hold project folders globally
export interface AppConfig {
  groqApiKey: string;
  workspacePath: string;
  projectFolders: string[];
  senderEmail:string;
}

// 2. Cross-platform global file target destination variables
const CONFIG_FILE_NAME = ".mcp-outreach.json";
const TARGET_CONFIG_PATH = path.join(os.homedir(), CONFIG_FILE_NAME);

/**
 * The Configuration Storage Wizard: Responsible for hydrating application keys and workspaces.
 */
export async function initializeConfigWizard(): Promise<AppConfig> {
  
  // ==========================================
  // STEP 1: THE MEMORY CHECK
  // ==========================================
  if (fs.existsSync(TARGET_CONFIG_PATH)) {
    try {
      const rawData = fs.readFileSync(TARGET_CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(rawData);
      
      const groqApiKey = parsed.groqApiKey || parsed.ApiKey;
      const workspacePath = parsed.workspacePath || parsed.Workspace;
      const projectFolders = parsed.projectFolders || [];
      const senderEmail=parsed.senderEmail||""

      if (groqApiKey && workspacePath && projectFolders.length > 0 && senderEmail) {
        return { groqApiKey, workspacePath, projectFolders, senderEmail };
      }
    } catch (error) {
      console.error("⚠️ Configuration file corrupted or out of date. Re-running setup wizard...");
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
    let verifiedProjectFolders: string[] = [];

    // ==========================================
    // STEP 3: API VALIDATION LOOP
    // ==========================================
    let exit = 0;
    while (exit === 0) {
      verifiedApiKey = await rl.question("🔑 Enter your Groq API key (starts with 'gsk_'):");
      verifiedApiKey = verifiedApiKey.trim();
      
      if (verifiedApiKey.startsWith("gsk_")) {
        exit = 1;
      } else {
        console.log("❌ Invalid format. Groq API keys must begin with 'gsk_'. Try again.\n");
      }
    }
       
    // ==========================================
    // STEP 4: WORKSPACE VALIDATION LOOP
    // ==========================================
    exit = 0;
    while (exit === 0) {
      verifiedWorkspaceDir = await rl.question("📂 Enter the absolute path to your main workspace directory: ");
      verifiedWorkspaceDir = path.resolve(verifiedWorkspaceDir.trim());
         
      if (fs.existsSync(verifiedWorkspaceDir) && fs.statSync(verifiedWorkspaceDir).isDirectory()) {
        exit = 1;
      } else {
        console.log("❌ Target directory path does not exist or is not a folder. Try again.\n");
      }
    }

    // ==========================================
    // STEP 5: PROJECT SELECTION & VALIDATION LOOP
    // ==========================================
    exit = 0;
    while (exit === 0) {
      console.log("\n📂 Let's locate the repositories you want to pitch from.");
      const rawFoldersInput = await rl.question("👉 Enter project folder names inside your workspace (comma-separated, e.g. chat-app, task-manager): ");
      
      // Parse, trim, and filter out empty items
      const selectedFolders = rawFoldersInput
        .split(",")
        .map(folder => folder.trim())
        .filter(folder => folder.length > 0);

      if (selectedFolders.length === 0) {
        console.log("❌ You must provide at least one project folder name to build your capabilities profile.\n");
        continue;
      }

      const missingFolders: string[] = [];

      // Confirm every directory typed actually exists under the workspace root path
      for (const folder of selectedFolders) {
        const fullPath = path.join(verifiedWorkspaceDir, folder);
        if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
          missingFolders.push(folder);
        }
      }

      if (missingFolders.length === 0) {
        verifiedProjectFolders = selectedFolders;
        exit = 1;
      } else {
        console.log(`\n❌ Error: The following folders could not be found inside [${verifiedWorkspaceDir}]:`);
        missingFolders.forEach(f => console.log(`  - ${f}`));
        console.log("Please confirm the directory names match exactly and try again.\n");
      }
    }
    // Add inside the initializeConfigWizard loop:
   let verifiedEmail = "";
     exit = 0;
    while (exit === 0) {
     verifiedEmail = await rl.question("✉️ Enter your verified Resend outbound email address: ");
     verifiedEmail = verifiedEmail.trim();
  
       if (verifiedEmail.includes("@")) {
             exit = 1;
          } else {
                  console.log("❌ Invalid email format. Try again.\n");
                }
             }
       
    // ==========================================
    // STEP 6: THE SECURITY SAVE
    // ==========================================
    const configurations: AppConfig = {
      groqApiKey: verifiedApiKey,
      workspacePath: verifiedWorkspaceDir,
      projectFolders: verifiedProjectFolders,
      senderEmail: verifiedEmail
    };

    fs.writeFileSync(
      TARGET_CONFIG_PATH,
      JSON.stringify(configurations, null, 2),
      { encoding: "utf-8", mode: 0o600 }
    );
     
    console.log(`\n✅ Settings securely saved to: ${TARGET_CONFIG_PATH}\n`);

    return configurations;

  } finally {
    // ==========================================
    // STEP 7: THE CLEANUP GATE
    // ==========================================
    rl.close();
  }
}

/**
 * Dynamically builds a developer capability profile on the fly
 * based on the saved application configuration payload.
 */
export function buildDynamicProfileFromSelection(
  workspacePath: string, 
  projectFolders: string[]
): string {
  
  if (!workspacePath || !projectFolders || projectFolders.length === 0) {
    return "# Developer Profile\n- General Full-Stack Engineer";
  }

  let compiledProfile = "# COMPILED DEVELOPER CAPABILITIES & PORTFOLIO BLUEPRINT\n\n";
  let loadedCount = 0;

  for (const folderName of projectFolders) {
    const readmePath = path.join(workspacePath, folderName.trim(), "README.md");

    if (fs.existsSync(readmePath)) {
      const readmeContent = fs.readFileSync(readmePath, "utf-8");
      
      compiledProfile += `## Project Focus: ${folderName}\n`;
      compiledProfile += `${readmeContent}\n\n`;
      compiledProfile += `<!-- END OF ${folderName} ARCHITECTURE -->\n\n`;
      loadedCount++;
    } else {
      console.warn(`⚠️ [Profile Builder] Skipping: Unable to locate README at ${readmePath}`);
    }
  }

  if (loadedCount === 0) {
    return "# Developer Profile\n- General Software Engineer\n- (No active repository project context provided)";
  }

  console.log(`🚀 Successfully read architectural frameworks from ${loadedCount} user repositories.`);
  return compiledProfile;
}