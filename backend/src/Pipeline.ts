// src/pipeline.ts
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Clean Abstraction Imports (The Workers doing the heavy lifting)
import { seedLocalDatabase } from "./seedLead.js"; 
import { generateDeveloperSummary } from "./profileSummarizer.js";
import { orchestrateParallelBatch } from "./batchCordinator.js"; 

import { prisma } from "./prisma_Initialization.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 1. EXTRACT REPO UTILITY
 * Harvests raw README data, or falls back to entry point source code extraction.
 */
async function extractRepo(workspacePath: string, projectName: string): Promise<string> {
  const projectRoot = path.resolve(workspacePath, projectName);
  const readmePath = path.resolve(projectRoot, "README.md");

  try {
    await fs.access(readmePath);
    const content = await fs.readFile(readmePath, "utf-8");
    return JSON.stringify({ source: "README.md", content: content.substring(0, 15000) });
  } catch {
    console.warn(`⚠️ No README found for [${projectName}]. Checking core entry files...`);
  }

  let entryFile = "";
  const packageJsonPath = path.join(projectRoot, "package.json");
  try {
    const pkgRaw = await fs.readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(pkgRaw);
    if (pkg.main) entryFile = pkg.main;
  } catch {}

  const commonEntryPoints = ["src/server.ts", "src/index.ts", "server.ts", "index.js", "src/main.ts"];
  if (!entryFile) {
    for (const point of commonEntryPoints) {
      try {
        await fs.access(path.join(projectRoot, point));
        entryFile = point;
        break;
      } catch {}
    }
  }

  if (entryFile) {
    try {
      const content = await fs.readFile(path.join(projectRoot, entryFile), "utf-8");
      return JSON.stringify({ source: entryFile, content: content.substring(0, 12000) });
    } catch (err: any) {
      console.error(`❌ Failed to read entry file: ${err.message}`);
    }
  }

  const files = await fs.readdir(projectRoot);
  return JSON.stringify({ source: "directory_structure", availableFiles: files });
}

/**
 * 2. MAIN SYSTEM PIPELINE
 * Acts as the structural brain coordinating ingestion, local profiling, 
 * and delegating execution entirely to the imported batch engine.
 */
export async function runFullOutreachPipeline(): Promise<void> {
  try {
    // =========================================================
    // PHASE 0: DATABASE SEEDING
    // =========================================================
    await seedLocalDatabase();

    // Retrieve environment settings populated by the configuration wizard
    const workspacePath = process.env.WORKSPACE_PATH || "";
    const rawFolders = process.env.PROJECT_FOLDERS || "";
    const projectFolders = rawFolders.split(",").filter(Boolean);

    if (!workspacePath || projectFolders.length === 0) {
      throw new Error("Missing active workspace configurations. Run setup wizard first.");
    }

    // =========================================================
    // PHASE 1: "WHO YOU ARE" (Global Capabilities Profiling)
    // =========================================================
    console.log("⚡ Starting Step 1: Extracting raw repository insights...");
    let combinedWorkspaceContext = "";

    for (const folder of projectFolders) {
      const essence = await extractRepo(workspacePath, folder);
      combinedWorkspaceContext += `\n\n=== REPOSITORY: ${folder} ===\n${essence}\n`;
    }

    console.log("⚡ Starting Step 2: Compiling technical capability profile via Claude...");
    const devProfile = await generateDeveloperSummary({
      apiKey: process.env.GROQ_API_KEY || "",
      rawReadmeContent: combinedWorkspaceContext
    });

    console.log("✨ Finalized Developer Capabilities Matrix:\n", devProfile);
    await prisma.user.upsert({
      where: { id: "default_user" }, 
      update: {
        capabilitiesSummary: devProfile,
        updatedAt: new Date()
      },
      create: {
        id: "default_user",
        capabilitiesSummary: devProfile
      }
    });

    // =========================================================
    // PHASE 2: "WHO THE LEADS ARE" (Delegated to Batch Coordinator)
    // =========================================================
    console.log("⚡ Starting Step 3: Triggering concurrent lead generation engines...");
    
    // The pipeline doesn't care HOW things are processed here. 
    // It simply passes the devProfile and lets the coordinator handle pLimit, Tavily, Hunter, and Resend.
    const summary = await orchestrateParallelBatch(devProfile);

    console.log(`\n🎉 Pipeline execution completed!
    Processed: ${summary.totalProcessed}
    Successes: ${summary.successCount}
    Failures:  ${summary.failureCount}`);

  } catch (error: any) {
    console.error("💥 Critical breakdown inside the core outreach pipeline loop:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log("🛑 Global database systems closed smoothly.");
  }
}

// Self-executing conditional hook to run pipeline directly via terminal command
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullOutreachPipeline().catch((err) => {
    console.error("❌ Fatal unhandled lifecycle breakdown executed top-level closure:", err);
    process.exit(1);
  });
}