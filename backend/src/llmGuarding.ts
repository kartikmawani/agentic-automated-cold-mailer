import Anthropic from "@anthropic-ai/sdk";

// ==========================================
// 1. THE STRICT OUTPUT TYPE CONTRACT
// ==========================================
export interface SerializedOutreachDraft {
  subjectLine: string;
  emailBody: string;
  detectedTechStack: string[];
}

// ==========================================
// 2. THE ANTHROPIC TOOL SCHEMA DEFINITION
// ==========================================
export const OUTREACH_TOOL_SCHEMA: Anthropic.Tool = {
  name: "save_outreach_draft",
  description: "Structures the compiled engineering analysis and email draft parameters cleanly.",
  input_schema: {
    type: "object",
    properties: {
      subjectLine: { 
        type: "string", 
        description: "An informal, short subject line under 4 words." 
      },
      emailBody: { 
        type: "string", 
        description: "The complete markdown formatted body text of the cold outreach email." 
      },
      detectedTechStack: {
        type: "array",
        items: { type: "string" },
        description: "Array of framework tokens located inside their open scaling pain point descriptions."
      }
    },
    required: ["subjectLine", "emailBody", "detectedTechStack"] 
  }
};

// ==========================================
// 3. THE GUARDRAIL EXECUTION ENGINE
// ==========================================
/**
 * Executes a restricted tool invocation query against the Anthropic API layer.
 * Enforces a rigid JSON output format, eliminating conversational filler text.
 */
export async function generateStrictDraft(
  anthropicClient: Anthropic,
  hydratedPrompt: string
): Promise<SerializedOutreachDraft> {

  // ==========================================
  // STEP 1: THE FORCED TOOL CHOICE CALL
  // ==========================================
  // FIXED: Using the passed client instance directly, injecting tools, and utilizing hydratedPrompt
  const response = await anthropicClient.messages.create({
    model: "claude-3-5-sonnet-20241022", 
    max_tokens: 1500,
    tools: [OUTREACH_TOOL_SCHEMA], 
    tool_choice: { type: "tool", name: "save_outreach_draft" },
    messages: [{ role: "user", content: hydratedPrompt }]
  });

  // ==========================================
  // STEP 2: THE TYPE GUARD CHECK
  // ==========================================
  let extractedInput: any = null;

  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "save_outreach_draft") {
      extractedInput = block.input;
      break;
    }
  }

  // ==========================================
  // STEP 3: DATA EXTRACTION & VALIDATION
  // ==========================================
  if (!extractedInput) {
    throw new Error("❌ [Guardrail Failure] Claude completed execution without invoking the structured output tool.");
  }
  
  return {
    subjectLine: extractedInput.subjectLine,
    emailBody: extractedInput.emailBody,
    detectedTechStack: extractedInput.detectedTechStack
  };
}