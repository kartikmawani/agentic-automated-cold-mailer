import pLimit from "p-limit";
import OpenAI from "openai";
import { getTransporter } from "./transportConfig.js";
// 1. FIXED: Explicitly import both the worker function AND its data interface shape
import { enrichLeadInSingleGo } from "./enrichmentService.js";
import { generateStrictDraft } from "./llmGuarding.js";
; // Standardized file naming casing
import { prisma } from "./prisma_Initialization.js";
function getGroqClient() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not configured in process.env.");
    }
    return new OpenAI({
        apiKey,
        baseURL: "https://api.groq.com/openai/v1"
    });
}
/**
 * Worker Core: Processes a single lead record using the fast single-go pipeline.
 * Manages atomic row locking, multi-API coordination, and error state isolation.
 */
async function processSingleLead(lead, devProfile) {
    // STEP 1: Immediately lock the row status to block other parallel workers from grabbing it
    await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "PROCESSING" },
    });
    try {
        console.error(`⚙️ [Queue Engine] Processing row ID ${lead.id}: Enriching ${lead.companyName}...`);
        // STEP 2: Execute the unified sequential Tavily + Hunter.io intelligence gathering chain
        const enrichment = await enrichLeadInSingleGo(lead.companyName, process.env.TAVILY_API_KEY || "", process.env.HUNTER_API_KEY || "");
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
            const senderName = "Kartik Manwani";
            const hydratedPrompt = `
You are an expert developer relations copywriter crafting a concise, peer-to-peer engineering "meta-pitch" cold email.

### SENDER & RECIPIENT METRICS:
- Sender Name: ${senderName}
- Target Company: ${lead.companyName}
- Target Founder/CTO: ${enrichment.founderName || 'Founder'}
- Target Tech/Pain Point: ${enrichment.explicitPainPoint || "Scaling backend systems"}
- Sender Capabilities Blueprint: 
${devProfile}

### SENDER KEY PROJECTS TO HIGHLIGHT:
- Autonomous Agentic Mailer (TypeScript, Groq LLM, Tavily Search, SQLite)
- OpenSource-Helper (AI-powered codebase analyzer automating repo AST reviews & docs via GitHub REST API)
- 16-Bit Stack-Based Virtual Machine (Custom 16-bit VM built in C with custom ISA opcodes, segmented memory, call stack frame handling, and two-pass assembler)

### STRICT EMAIL COMPOSITION RULES:
1. **Hook (Line 1 - Full Transparency)**: State upfront that an autonomous agent built by ${senderName} dynamically researched ${lead.companyName} and drafted this email.
2. **Projects Highlight (Lines 2-3)**: Highlight that beyond agentic tooling, ${senderName} engineered **OpenSource-Helper** (an AI codebase analyzer) and a **custom 16-bit stack-based VM in C** (with custom ISA and assembler).
3. **Value / Bridge**: Relate these systems/AI tools to the CTO/founder's work scaling ${lead.companyName}'s infrastructure.
4. **Call To Action (CTA)**: Single low-friction ask offering a 2-minute look at the open-source code or architecture.
5. **Sign-off**: Always sign off cleanly as "Best, ${senderName}".
6. **Length & Tone**: Strictly under 95 words total. Conversational, technical, and developer-to-developer. No corporate buzzwords.

### REQUIRED JSON OUTPUT FORMAT:
Return ONLY a valid JSON object matching this schema:
{
  "subjectLine": "lowercase, conversational subject under 4 words (e.g., '${lead.companyName.toLowerCase()} + agent demo')",
  "emailBody": "complete email body text formatted in markdown",
  "detectedTechStack": ["array", "of", "detected", "tech", "tokens"]
}
`;
            const groqClient = getGroqClient();
            const draftResult = await generateStrictDraft(groqClient, hydratedPrompt);
            const outboundEmailCopy = `Subject: ${draftResult.subjectLine}\n\n${draftResult.emailBody}`;
            const transporter = getTransporter();
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
        }
        else {
            //   RISKY ZONE: Push to manual review instead of sending automatically
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
    }
    catch (error) {
        console.error(`  [Queue Exception] Pipeline fractured processing row ${lead.companyName}: ${error.message}`);
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
export async function orchestrateParallelBatch(devProfile // <-- Cleanly passed down from pipeline.ts
) {
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
    console.log(`  Concurrency Matrix Active: Allocating ${actionableLeads.length} leads down parallel paths...`);
    // STEP 2: Establish the hardware safety ceiling (Limit to 3 concurrent streams)
    const safetyCeiling = pLimit(3);
    // STEP 3: Map active entries directly down the throttled slots, passing the pre-built devProfile
    const workerPromises = actionableLeads.map((lead) => {
        return safetyCeiling(() => processSingleLead(lead, devProfile));
    });
    // STEP 4: Fire operations concurrently and block execution here
    const executionResults = await Promise.all(workerPromises);
    // STEP 5: Aggregate statistics reporting metadata
    const successes = executionResults.filter((res) => res === true).length;
    const failures = executionResults.length - successes;
    return {
        totalProcessed: executionResults.length,
        successCount: successes,
        failureCount: failures,
    };
}
