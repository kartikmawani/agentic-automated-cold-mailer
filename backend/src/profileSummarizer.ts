import OpenAI from "openai";

export interface SummarizeProfileOptions {
  apiKey: string;
  rawReadmeContent: string;
}

/**
 * Sends raw project README data to Claude to extract a dense developer capability summary.
 * Designed to minimize tokens and drop filler setup data while preserving core engineering meat.
 * 
 * @param options - Object containing the API key and combined README text
 * @returns A promise that resolves to the high-density Markdown summary string
 */
export async function generateDeveloperSummary({
  apiKey,
  rawReadmeContent
}: SummarizeProfileOptions): Promise<string> {
  if (!apiKey) {
    throw new Error("Groq API Key is required for profile summarization.");
  }
  // 1. Initialize the  Groq Client
  const groq = new OpenAI({ 
    apiKey: apiKey,
    baseURL: "https://api.groq.com/openai/v1" });

    

  // 2. The highly targeted extraction system prompt
  const systemPrompt = `
You are a technical recruiting agent. Analyze the attached project README files and create a high-density "Developer Capability Profile". 

Discard installation steps, boilerplate code, local setup instructions, deployment URLs, and markdown badges. 
Focus strictly on extracting:
1. Core Tech Stack: Languages, frameworks, databases, and key libraries.
2. Architecture & Systems: How things connect (e.g., WebSockets, microservices, state management).
3. Real Problems Solved: The exact technical hurdles these projects overcome (e.g., custom state persistence, high-frequency rendering).
4. Concrete Features: Specific, impressive elements built from scratch.

Keep the final output under 400 words, structured in highly dense markdown list format. Do not add intro or outro conversational filler text.
  `.trim();

  try {
    // 3. Fire the request to Claude
    //max_tokens: 1000, 
    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0.1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here are my project README files to process:\n\n${rawReadmeContent}` }
      ]
    });
    // 4. Extract and validate the text payload safely
    return response.choices[0]?.message?.content || "";

    
  } catch (error) {
    console.error('Error in profile summarization service pipeline:', error);
    throw error;
  }
}