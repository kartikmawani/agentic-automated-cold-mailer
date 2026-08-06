// src/client.ts
import OpenAI from "openai";
import { Lead } from "./generated/prisma/index.js";
import { prisma } from "./prisma_Initialization.js";
import dotenv from "dotenv";
import { generateStrictDraft } from "./llmGuarding.js";

dotenv.config();
 

export class MCPOutreachOrchestrator {
  private _groq: OpenAI | null = null;

  public get groqInstance(): OpenAI {
    return (this._groq ??= new OpenAI({
      apiKey:process.env.GROQ_API_KEY || "",
      baseURL: "https://api.groq.com/openai/v1"
    }));
  }
  /**
   * Bypasses the background server process execution to run in high-speed direct mode
   */
  async connectToServer(serverScriptPath: string) {
    // Structural signature preserved to avoid breaking pipeline.ts invocation workflows
    console.error("🚀 MCP Server bypass active. Operating in high-speed database profile mode.");
  }

  /**
   * STAGE 1: Instantly retrieves high-density capability data from the local database
   */
  async gatherWorkspaceIntelligence(query: string): Promise<string> {
    console.error("⚡ [Direct Mode] Fetching pre-compiled capability summary from database...");
    
    // Fetch the high-density capability blueprint built by profileSummarizer in Phase 1
    const userProfile = await prisma.user.findUnique({
      where: { id: "default_user" }
    });

    if (!userProfile || !userProfile.capabilitiesSummary) {
      throw new Error("Capabilities profile missing from database. Run profile generation first.");
    }

    return userProfile.capabilitiesSummary;
  }

  /**
   * STAGE 2: Drives the full extraction, guarded design execution, and database persistence
   */
  async processSingleLead(lead: Lead, workspacePath: string): Promise<boolean> {
    try {
      // 1. Advance transaction flag state to isolate runtime operations
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "PROCESSING" }
      });

      // Safe evaluation fallback formatting for nullable database attributes
      const targetsTechStack = lead.techStack ?? "General Software Infrastructure";
      const targetedPainPoint = lead.engineeringPainPoint ?? "Scaling application features under traffic load";
      const recipientName = lead.founderName ?? "Founder";

      console.error(`🔍 [Stage 1] Scanning active codebase for points mapping to: ${lead.companyName}`);
      
      const engineeringQuery = `Scan my workspace root at "${workspacePath}". Find structural configurations, dependencies, implementation patterns, or custom system designs relevant to a target company stack running: ${targetsTechStack}.`;
      
      // Execute the high-speed database extraction sequence (Signature preserved)
      const workspaceContextInsight = await this.gatherWorkspaceIntelligence(engineeringQuery);

      console.error(`🛡️ [Stage 2] Committing prompt parameters down the forced tool guardrail...`);

      const executionPrompt = `
You are a technical outreach engine writing a highly personalized cold email pitch.
Recipient: ${recipientName}, operating at ${lead.companyName}
Target Stack Matrix: ${targetsTechStack}
Scaling Friction Target: "${targetedPainPoint}"

Here is the exact architectural and framework proof harvested from my active local repositories:
${workspaceContextInsight}

Construct the cold outreach layout using your available formatting tools.
CRITICAL DIRECTIONS:
1. Speak engineer-to-engineer. Focus directly on their runtime context or architectural constraints.
2. Never introduce generic corporate marketing fluff or boilerplate text.
3. Use the 'save_outreach_draft' tool parameter execution block to output your results.
      `.trim();

      // Fire payload down the rigid JSON type contract
      const structuredResult = await generateStrictDraft(this.groqInstance, executionPrompt);

      // Concatenate the structural parts clearly since Lead stores drafts inside a single string field
      const compiledDraft = `Subject: ${structuredResult.subjectLine}\n\n${structuredResult.emailBody}`;

      // 2. Commit completed status parameters straight to the SQLite table
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "READY_TO_SEND",
          finalDraft: compiledDraft,
          errorMessage: null
        }
      });

      console.error(`✅ Execution successful. Committed production email structures for: ${lead.companyName}`);
      return true;

    } catch (err: any) {
      console.error(`❌ Automation lifecycle processing broken for ${lead.companyName}: ${err.message}`);
      
      // Mark record as broken to prevent database deadlock states
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "FAILED",
          errorMessage: err.message
        }
      });
      
      return false;
    }
  }

  /**
   * Closes open handles cleanly without throwing errors if transport is unmounted
   */
  async cleanup() {
    // Safe evaluation teardown to keep pipeline lifecycle calls operational
    console.error("🛑 Direct execution tracking handles closed cleanly.");
  }
}