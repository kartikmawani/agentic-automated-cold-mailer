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

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Initialize environment tracking configurations
dotenv.config();

const ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022";
const MAX_TOOL_TURNS = 10;

// Reconstruct __dirname for native ES Module compliance
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MCPOutreachOrchestrator {
  private mcp: Client;
  private _anthropic: Anthropic | null = null;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  constructor() {
    // Initialize the decoupled MCP client container
    this.mcp = new Client(
      { name: "cold-mailer-orchestrator", version: "1.0.0" },
      { capabilities: {} }
    );
  }

  private get anthropic(): Anthropic {
    // Lazy-initialize the Anthropic engine instance when required
    return (this._anthropic ??= new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    }));
  }

  /**
   * Spawns the background server process over native Standard I/O streams
   * and dynamically extracts available capabilities/tools.
   */
  async connectToServer(serverScriptPath: string) {
    try {
      const isJs = serverScriptPath.endsWith(".js") || serverScriptPath.endsWith(".ts");
      const isPy = serverScriptPath.endsWith(".py");

      if (!isJs && !isPy) {
        throw new Error("Server initialization target must be a valid .ts, .js, or .py file.");
      }

      // Detect environmental runtimes to remain platform-agnostic
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

      // Runtime Tool Discovery Block
      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }));

      console.error(
        "🔄 Connected to MCP Server. Registered Tools:",
        this.tools.map(({ name }) => name)
      );
    } catch (e) {
      console.error("❌ Failed to bind to target MCP infrastructure server: ", e);
      throw e;
    }
  }

  /**
   * Executes a multi-turn tool calling reasoning loop with Claude.
   * Tracks context state and tool responses natively in memory.
   */
  async processQuery(query: string): Promise<string> {
    const systemInstruction = `You are a world-class, low-level systems and full-stack engineer operating as an autonomous technical outreach engine.
Your goal is to write a highly targeted, punchy cold email pitch to a startup founder.
CRITICAL CONSTRAINTS:
1. Speak engineer-to-engineer. Focus directly on their runtime issues or architecture constraints.
2. Never use generic corporate marketing fluff or AI filler blocks (e.g., "I hope this email finds you well", "As an enthusiastic student").
3. You must inspect the user's local workspace repositories using your available tools to find exact architectural or code evidence that aligns with their stack.
4. Output ONLY the clear, final email copy once your code verification is complete.`;

    const messages: MessageParam[] = [
      {
        role: "user",
        content: query,
      },
    ];

    // Frame Turn 0
    let response = await this.anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      system: systemInstruction,
      messages,
      tools: this.tools,
    });

    // Handle deep multi-turn agent execution blocks
    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const toolUses: ToolUseBlock[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          toolUses.push(block);
        }
      }

      // If the model decides it has gathered sufficient local context, return final text
      if (toolUses.length === 0) {
        const textBlock = response.content.find((b) => b.type === "text");
        return textBlock && textBlock.type === "text" ? textBlock.text : "";
      }

      const toolResults: ToolResultBlockParam[] = [];
      
      for (const toolUse of toolUses) {
        const toolArgs = toolUse.input as { [x: string]: unknown } | undefined;
        console.error(`⚙️ [Agent Call] Executing server tool: ${toolUse.name}`);

        // Invoke the local filesystem layer tool through the protocol bridge
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

      // Feed conversational history and execution results back into the context matrix
      messages.push({
        role: "assistant",
        content: response.content as unknown as ContentBlockParam[],
      });
      messages.push({ role: "user", content: toolResults });

      // Rerun evaluation model frame
      response = await this.anthropic.messages.create({
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
   * Loops through target leads array and drives the automated processing sequence.
   */
  async runOutreachPipeline() {
    const leadsPath = path.resolve(__dirname, "../leads.json");
    const workspacePath = process.env.WORKSPACE_PATH;

    if (!workspacePath) {
      throw new Error("WORKSPACE_PATH must be configured in your .env file.");
    }

    if (!fs.existsSync(leadsPath)) {
      throw new Error(`Target verification database file missing at: ${leadsPath}`);
    }

    const leads = JSON.parse(fs.readFileSync(leadsPath, "utf-8"));
    console.error(`📈 Pipeline Engaged: Processing ${leads.length} leads autonomously...\n`);

    for (const lead of leads) {
      console.error(`\n------------------------------------------------------------`);
      console.error(`🎯 Targeting: ${lead.companyName} | Founder: ${lead.founderName}`);
      console.error(`------------------------------------------------------------`);

      const engineeringQuery = `Draft an email to ${lead.founderName}, the founder of ${lead.companyName}.
Their runtime tech stack: ${lead.techStack.join(", ")}.
Their current engineering scaling pain point: "${lead.engineeringPainPoint}".
Analyze my local workspace root at "${workspacePath}" to discover a matching repository context to anchor the pitch.`;

      try {
        const finalDraft = await this.processQuery(engineeringQuery);
        
        // Print the final result directly to stdout for clean capture redirects
        console.log(`\n=== FINAL EMAIL DRAFT FOR ${lead.companyName.toUpperCase()} ===`);
        console.log(finalDraft);
        console.log(`================================================================\n`);
      } catch (err: any) {
        console.error(`❌ Automation processing failed for ${lead.companyName}: ${err.message}`);
      }
    }
  }

  async cleanup() {
    await this.mcp.close();
    console.error("🛑 Subprocess connections unmounted cleanly.");
  }
}

// --- SYSTEM ENTRYPOINT EXECUTION ---
async function main() {
  const serverScript = process.argv[2] || "src/server.ts";
  const orchestrator = new MCPOutreachOrchestrator();

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("❌ CRITICAL: ANTHROPIC_API_KEY is missing from the environment configuration.");
      process.exit(1);
    }

    // Connect to background process using runtime parameters
    await orchestrator.connectToServer(path.resolve(serverScript));
    
    // Fire the automatic pipeline loop
    await orchestrator.runOutreachPipeline();

  } catch (error) {
    console.error("💥 Critical lifecycle exception encountered during execution execution:", error);
    await orchestrator.cleanup();
    process.exit(1);
  } finally {
    await orchestrator.cleanup();
    process.exit(0);
  }
}

main();