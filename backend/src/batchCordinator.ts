import pLimit from "p-limit";
import OpenAI from "openai";
import { transporter } from  "./transportConfig.js";
// 1. FIXED: Explicitly import both the worker function AND its data interface shape
import { enrichLeadInSingleGo, EnrichmentResult } from "./enrichmentService.js";
import { generateStrictDraft } from "./llmGuarding.js";; // Standardized file naming casing

// Import from the generated client (see prisma/schema.prisma generator output).
import { Lead } from "./generated/prisma/index.js";
import {prisma} from  "./prisma_Initialization.js";

// ==========================================
// PRISMA 7 ENGINE INTERACTION INITIALIZATION
// ==========================================
 

interface BatchSummary {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}
const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "",
  baseURL: "https://api.groq.com/openai/v1"
});
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
      console.error(` [Queue Engine] High-confidence email missing for ${lead.companyName}. Shifting to review queue.`);
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
       
       
      console.error(`Queue Engine] Generating high-context outreach copy targeting: ${enrichment.founderName}`);
      
      // A. Hydrate the structured target template for Claude's tool schema
      const hydratedPrompt = `
        Write a hyper-personalized email to the founder.
        
        STARTUP CONTEXT & PAIN POINTS:
        Company Name: ${lead.companyName}
        Founder Name: ${enrichment.founderName || "Founder"}
        Scraped Context: ${enrichment.scrapedContext}
        
        MY PORTFOLIO & TECHNICAL EXPERIENCE BLUEPRINT:
        ${devProfile}
        
        INSTRUCTIONS:
        - Subject line must be informal and short (under 4 words).
        - Match their engineering stack perfectly.
        - Conclude with a low-friction call to action asking for a brief technical synchronization chat.
      `;

      
      const draftResult = await generateStrictDraft(groqClient, hydratedPrompt);
      const outboundEmailCopy = `Subject: ${draftResult.subjectLine}\n\n${draftResult.emailBody}`;
 
      const info = await transporter.sendMail({
        from: process.env.SENDER_EMAIL,
        to: enrichment.email,
        subject: draftResult.subjectLine,
        text: outboundEmailCopy,
      });

      // D. Mark row as safely delivered and record all metadata in SQLite
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          founderName: enrichment.founderName,
          domain: enrichment.domain,
          email: enrichment.email,
          techStack: draftResult.detectedTechStack.join(", "),
          finalDraft: outboundEmailCopy,
          status: "SENT",
          enrichedAt: new Date()
        }
      });

      console.log(`Success! Email delivered via Gmail SMTP. Message ID: ${info.messageId}`);
      return true;
    
    } else {
      // 🟡 RISKY ZONE: Push to manual review instead of sending automatically
      console.error(`[Queue Engine] Lead ${lead.companyName} flagged as risky context (Score: ${enrichment.hunterScore}). Routing to review queue.`);
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