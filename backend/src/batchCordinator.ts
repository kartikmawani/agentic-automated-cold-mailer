// src/batchCoordinator.ts
import pLimit from "p-limit";
import { PrismaClient, Lead } from  "..//generated/prisma/index.js"; // Target your custom generation path
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import betterSqlite3 from "better-sqlite3";
import { MCPOutreachOrchestrator } from "./client.js";
import path from "node:path";

// ==========================================
// PRISMA 7 ENGINE INTERFACE INITIALIZATION
// ==========================================
const databaseStoragePath = path.resolve("prisma/dev.db");
const sqliteNativeDriver = new betterSqlite3(databaseStoragePath);
const databaseAdapter = new PrismaBetterSqlite3({url:"file:databaseStoragePath"});
const prisma = new PrismaClient({ adapter: databaseAdapter });

// Configure an explicit global tracking interface for metrics reporting
interface BatchSummary {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

// ==========================================
// RUNTIME PRODUCTION CONCURRENCY ENGINE
// ==========================================

/**
 * Worker Core: Responsible for processing a single lead record.
 * Handles database locking, context string assembly, and runtime error isolation.
 */
async function processSingleLead(
  lead: Lead,
  orchestrator: MCPOutreachOrchestrator
): Promise<boolean> {
  // STEP 1: Update the item's state to "PROCESSING" in the database to lock it from parallel workers
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: "PROCESSING" },
  });

  try {
    console.error(`⚙️ [Worker Engine] Launching multi-turn analysis loop for: ${lead.companyName}`);

    // STEP 2: Assemble the structured context string from the database record
    const engineeringQuery = `Draft an engineering-focused cold email pitch to ${lead.founderName}, the founder of ${lead.companyName}.
Their runtime tech stack: ${lead.techStack}.
Their current engineering scaling pain point: "${lead.engineeringPainPoint}".
Scan my workspace to discover a matching portfolio codebase.`;

    // Execute the heavy asynchronous agent reasoning loops and MCP tool execution layers
    const generatedEmailContent = await orchestrator.processQuery(engineeringQuery);

    // STEP 3: Update database status to "SUCCESS" and preserve the finalized markdown draft
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: "SUCCESS",
        finalDraft: generatedEmailContent,
        errorMessage: null, // Clear out legacy system error logs
      },
    });

    console.error(`✅ [Worker Engine] Successfully completed outbound draft processing for ${lead.companyName}`);
    return true;

  } catch (error: any) {
    console.error(`❌ [Worker Exception] Critical agent breakdown encountered on ${lead.companyName}: ${error.message}`);

    // STEP 4: Catch API rejections or timeouts, label row as "FAILED", and store the stack trace
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: "FAILED",
        errorMessage: error.message,
      },
    });

    return false;
  }
}

/**
 * Batch Coordinator: Evaluates the active database states, structures the parallel
 * processing arrays, and manages in-memory concurrency limits.
 */
export async function orchestrateParallelBatch(
  orchestrator: MCPOutreachOrchestrator
): Promise<BatchSummary> {
  
  // STEP 1: Query the SQLite database for records currently marked as "PENDING" or "FAILED"
  const actionableLeads = await prisma.lead.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
    },
  });

  if (actionableLeads.length === 0) {
    console.error("🏁 Queue State Check: Zero records match actionable operational requirements. Exiting batch loop.");
    return { totalProcessed: 0, successCount: 0, failureCount: 0 };
  }

  console.error(`📈 Pipeline Initialized: Distributing ${actionableLeads.length} records across concurrent threads...`);

  // STEP 2: Instantiate the p-limit concurrency boundary layer
  const safetyCeiling = pLimit(3); // Enforces a hard ceiling of 3 concurrent multi-turn LLM streams

  // STEP 3: Map the database records into an execution array of throttled promise slots
  const workerPromises = actionableLeads.map((lead: any) => {
    // Captures each task context but halts execution until a seat opens up in the active queue pool
    return safetyCeiling(() => processSingleLead(lead, orchestrator));
  });

  // STEP 4: Launch parallel operations and block here until the entire array resolves
  const executionResults = await Promise.all(workerPromises);

  // STEP 5: Aggregate the run analytics before unmounting the process
  const successes = executionResults.filter((result: boolean) => result === true).length;
  const failures = executionResults.length - successes;

  return {
    totalProcessed: executionResults.length,
    successCount: successes,
    failureCount: failures,
  };
}