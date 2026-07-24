import pLimit from "p-limit";
import {resend} from "./resendConfig.js"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import betterSqlite3 from "better-sqlite3";
import path from "node:path";
import fs from "node:fs"
// 1. FIXED: Explicitly import both the worker function AND its data interface shape
import { enrichLeadInSingleGo, EnrichmentResult } from "./enrichmentService.js";
import { generateOutreachEmail } from "./outReachEngine.js"; // Standardized file naming casing
import {generateDeveloperSummary} from "./profileSummarizer.js"

// Import from the generated client (see prisma/schema.prisma generator output).
import { PrismaClient, Lead } from "./generated/prisma/index.js";

// ==========================================
// PRISMA 7 ENGINE INTERACTION INITIALIZATION
// ==========================================
const databaseStoragePath = path.resolve("prisma/dev.db");
const sqliteNativeDriver = new betterSqlite3(databaseStoragePath);
const databaseAdapter = new PrismaBetterSqlite3({ url: `file:${databaseStoragePath}` });
const prisma = new PrismaClient({ adapter: databaseAdapter });

interface BatchSummary {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

// ==========================================
// RUNTIME CONCURRENT EXECUTION CORE
// ==========================================

/**
 * Worker Core: Processes a single lead record using the fast single-go pipeline.
 * Manages atomic row locking, multi-API coordination, and error state isolation.
 */
async function processSingleLead(lead: Lead,devProfile:string): Promise<boolean> {
  // STEP 1: Immediately lock the row status to block other parallel workers from grabbing it
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: "PROCESSING" },
  });

  try {
    console.error(`⚙️ [Queue Engine] Processing row ID ${lead.id}: Enriching ${lead.companyName}...`);

    // STEP 2: Execute the unified sequential Tavily + Hunter.io intelligence gathering chain
    const enrichment: EnrichmentResult | null = await enrichLeadInSingleGo(
      lead.companyName,
      process.env.TAVILY_API_KEY || "",
      process.env.HUNTER_API_KEY || ""
    );

    // Defensive Check: If enrichment fails or email data can't be safely resolved
    if (!enrichment || !enrichment.email) {
      console.error(`⚠️ [Queue Engine] High-confidence email missing for ${lead.companyName}. Shifting to review queue.`);
      await prisma.lead.update({
        where: { id: lead.id },
        data: { 
          status: enrichment?.email ? "REQUIRES_MANUAL_REVIEW" : "FAILED_NO_CONTACT_FOUND",
          founderName: enrichment?.founderName || null,
          domain: enrichment?.domain || null
        },
      });
      return false;
    }

    // STEP 3: Validate Hunter quality parameters securely using the explicit imported interface types
    const isHighConfidence = enrichment.hunterScore !== null && enrichment.hunterScore > 80;
    const isValidInbox = enrichment.hunterStatus === 'valid';

    if (isHighConfidence && isValidInbox) {
      // 🟢 SAFE ZONE: Generate cold pitch copy using your Claude writer module
       
      
      console.error(`✍️ [Queue Engine] Generating high-context outreach copy targeting: ${enrichment.founderName}`);
      const outboundEmailCopy = await generateOutreachEmail(
        enrichment.founderName || "Founder",
        lead.companyName,
        enrichment.scrapedContext,
        devProfile
    );
      const { data, error } = await resend.emails.send({
        from: process.env.SENDER_EMAIL || 'onboarding@resend.dev',
        to: [enrichment.email], // Target address found via Hunter/Tavily
        subject: `Engineering query regarding ${lead.companyName}`,
        text: outboundEmailCopy, // Plain-text format matches natural, non-templated typing
      });
    
      if (error) {
        console.error(`Transmission failure for ${lead.companyName}:`, error.message);
        
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            finalDraft: outboundEmailCopy,
            status: "FAILED_DELIVERY"
          }
        });
         
      }
    
      // 3. Mark row as safely delivered on successful network response
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          finalDraft: outboundEmailCopy,
          status: "SENT",
          //enrichedAt: new Date()
        }
      });
    
      console.log(`Success! Delivery receipt ID registered: ${data?.id}`);
    
      // await prisma.lead.update({
      //   where: { id: lead.id },
      //   data: {
      //     founderName: enrichment.founderName,
      //     domain: enrichment.domain,
      //     email: enrichment.email,
      //     techStack: enrichment.explicitPainPoint, // Stores pain points natively
      //     finalDraft: outboundEmailCopy,
      //     status: "READY_TO_SEND", // Clear for CLI transmission approval loops
      //     errorMessage: null
      //   }
      // });
      return true;
    
    } else {
      // 🟡 RISKY ZONE: Push to manual review instead of generating lower quality drafts automatically
      console.error(`🟡 [Queue Engine] Lead ${lead.companyName} flagged as risky context (Score: ${enrichment.hunterScore}). Routing to review queue.`);
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          founderName: enrichment.founderName,
          domain: enrichment.domain,
          email: enrichment.email,
          techStack: enrichment.explicitPainPoint,
          status: "REQUIRES_MANUAL_REVIEW" 
        }
      });
      return false;
    }

  } catch (error: any) {
    console.error(`❌ [Queue Exception] Pipeline fractured processing row ${lead.companyName}: ${error.message}`);

    // If an external API timeout or breakdown occurs, preserve the stack trace logs for debugging
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
 * Batch Orchestrator: Dispatches concurrent processing pools across all pending queue leads
 */
export async function orchestrateParallelBatch(
   
  devProfile: string // <-- Cleanly passed down from pipeline.ts
): Promise<BatchSummary> {
  
  // STEP 1: Query the database for leads needing attention
  const actionableLeads = await prisma.lead.findMany({
    where: {
      status: { in: ["PENDING_ENRICHMENT", "PENDING", "FAILED"] },
    },
  });

  if (actionableLeads.length === 0) {
    console.log("✨ No actionable leads found in queue.");
    return { totalProcessed: 0, successCount: 0, failureCount: 0 };
  }

  console.log(`📈 Concurrency Matrix Active: Allocating ${actionableLeads.length} leads down parallel paths...`);

  // STEP 2: Establish the hardware safety ceiling (Limit to 3 concurrent streams)
  const safetyCeiling = pLimit(3);

  // STEP 3: Map active entries directly down the throttled slots, passing the pre-built devProfile
  const workerPromises = actionableLeads.map((lead: Lead) => {
    return safetyCeiling(() => processSingleLead(lead, devProfile));
  });

  // STEP 4: Fire operations concurrently and block execution here
  const executionResults = await Promise.all(workerPromises);

  // STEP 5: Aggregate statistics reporting metadata
  const successes = executionResults.filter((res: boolean) => res === true).length;
  const failures = executionResults.length - successes;

  return {
    totalProcessed: executionResults.length,
    successCount: successes,
    failureCount: failures,
  };
}