// src/client.ts
import { Anthropic } from "@anthropic-ai/sdk";
import {
  ContentBlockParam,
  MessageParam,
  Tool,
  ToolResultBlockParam,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages/messages.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Directly maps to your custom schema generator output block
import { PrismaClient, Lead } from "./generated/prisma/index.js";

import path from "node:path";
import dotenv from "dotenv";
import { generateStrictDraft } from "./llmGuarding.js";

dotenv.config();
const prisma = new PrismaClient();
const ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022";
const MAX_TOOL_TURNS = 10;

export class MCPOutreachOrchestrator {
  private mcp: Client;
  private _anthropic: Anthropic | null = null;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  constructor() {
    this.mcp = new Client(
      { name: "cold-mailer-orchestrator", version: "1.0.0" },
      { capabilities: {} }
    );
  }

  public get anthropicInstance(): Anthropic {
    return (this._anthropic ??= new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    }));
  }

  /**
   * Spawns the background server process over native Standard I/O streams
   */
  async connectToServer(serverScriptPath: string) {
    try {
      const isJs = serverScriptPath.endsWith(".js") || serverScriptPath.endsWith(".ts");
      const isPy = serverScriptPath.endsWith(".py");

      if (!isJs && !isPy) {
        throw new Error("Server initialization target must be a valid .ts, .js, or .py file.");
      }

      const command = isPy
        ? process.platform === "win32"
          ? "python"
          : "python3"
        : "npx";

      const args = isPy 
        ? [serverScriptPath] 
        : ["tsx", serverScriptPath];

      this.transport = new StdioClientTransport({ command, args });
      await this.mcp.connect(this.transport);

      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }));

      console.error("🔄 Connected to MCP Server. Registered Tools:", this.tools.map(({ name }) => name));
    } catch (e) {
      console.error("❌ Failed to bind to target MCP infrastructure server: ", e);
      throw e;
    }
  }

  /**
   * STAGE 1: Executes multi-turn tool calling verification sweeps inside the workspace
   */
  async gatherWorkspaceIntelligence(query: string): Promise<string> {
    const systemInstruction = `You are a world-class systems and full-stack engineer operating as an autonomous workspace analytics module.
Your goal is to inspect the user's local repositories using available tools to find exact architectural or code evidence matching their request.
Provide a clear, concrete breakdown of the engineering design choices, libraries, or patterns you discover.`;

    const messages: MessageParam[] = [{ role: "user", content: query }];

    let response = await this.anthropicInstance.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      system: systemInstruction,
      messages,
      tools: this.tools,
    });

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const toolUses = response.content.filter((block): block is ToolUseBlock => block.type === "tool_use");

      if (toolUses.length === 0) {
        const textBlock = response.content.find((b) => b.type === "text");
        return textBlock && textBlock.type === "text" ? textBlock.text : "";
      }

      const toolResults: ToolResultBlockParam[] = [];
      
      for (const toolUse of toolUses) {
        const toolArgs = toolUse.input as { [x: string]: unknown } | undefined;
        console.error(`⚙️ [Agent Call] Executing server tool: ${toolUse.name}`);

        const result = await this.mcp.callTool({
          name: toolUse.name,
          arguments: toolArgs,
        });

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result.content as ToolResultBlockParam["content"],
        });
      }

      messages.push({
        role: "assistant",
        content: response.content as unknown as ContentBlockParam[],
      });
      messages.push({ role: "user", content: toolResults });

      response = await this.anthropicInstance.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 1500,
        system: systemInstruction,
        messages,
        tools: this.tools,
      });
    }

    throw new Error(`Agent loop suspended: Reached maximum tool limit bounds of [${MAX_TOOL_TURNS}] turns.`);
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
      
      // Execute the decoupled tool extraction sequence
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
      const structuredResult = await generateStrictDraft(this.anthropicInstance, executionPrompt);

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
   * Closes open standard input/output connection handles
   */
  async cleanup() {
    if (this.mcp) {
      await this.mcp.close();
      console.error("🛑 Subprocess connections unmounted cleanly.");
    }
  }
}