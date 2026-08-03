import OpenAI from "openai";

// ==========================================
// 1. THE STRICT OUTPUT TYPE CONTRACT
// ==========================================
export interface SerializedOutreachDraft {
  subjectLine: string;
  emailBody: string;
  detectedTechStack: string[];
}

// ==========================================
// 2. THE GUARDRAIL EXECUTION ENGINE (GROQ)
// ==========================================
/**
 * Executes a guarded query against Groq using native JSON mode.
 * Enforces rigid JSON output, eliminating conversational filler text.
 */
export async function generateStrictDraft(
  clientOrKey: any, // Accepts an OpenAI/Groq client instance or fallback API key
  hydratedPrompt: string
): Promise<SerializedOutreachDraft> {

  // Reuse passed client or initialize a new Groq client
  const client = clientOrKey instanceof OpenAI
    ? clientOrKey
    : new OpenAI({
        apiKey: process.env.GROQ_API_KEY ||"",
        baseURL: "https://api.groq.com/openai/v1"
      });

  // ==========================================
  // STEP 1: FORCED JSON COMPLETION CALL
  // ==========================================
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a cold outreach generator. Respond ONLY with a valid JSON object matching this schema strictly:
{
  "subjectLine": "An informal, short subject line under 4 words.",
  "emailBody": "The complete markdown formatted body text of the cold outreach email.",
  "detectedTechStack": ["Array", "of", "framework", "tokens"]
}`
      },
      { role: "user", content: hydratedPrompt }
    ]
  });

  // ==========================================
  // STEP 2: DATA EXTRACTION & VALIDATION
  // ==========================================
  const rawContent = response.choices[0]?.message?.content;

  if (!rawContent) {
    throw new Error("❌ [Guardrail Failure] Groq completed execution without returning content.");
  }

  const parsedInput = JSON.parse(rawContent);

  return {
    subjectLine: parsedInput.subjectLine,
    emailBody: parsedInput.emailBody,
    detectedTechStack: parsedInput.detectedTechStack || []
  };
}