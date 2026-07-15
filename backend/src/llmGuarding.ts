// src/llmGuardrails.ts
import Anthropic from "@anthropic-ai/sdk";
import { email } from "zod";

// ==========================================
// 1. THE STRICT OUTPUT TYPE CONTRACT
// ==========================================
// Objective: Define exactly what data properties the rest of your application 
// expects to receive after Claude finishes its execution loop.
export interface SerializedOutreachDraft {
  subjectLine: string;
  emailBody: string;
  detectedTechStack: string[];
}

// ==========================================
// 2. THE ANTHROPIC TOOL SCHEMA DEFINITION
// ==========================================
// Objective: Structure the raw JSON Schema object that tells Claude exactly 
// what keys, data types, and required fields it must output.
// Docs: Anthropic Tool Use -> Defining Tools (JSON Schema format)
export const OUTREACH_TOOL_SCHEMA: Anthropic.Tool = {
  name: "save_outreach_draft",
  description: "Structures the compiled engineering analysis and email draft parameters cleanly.",
  strict:true,
  input_schema: {
    type: "object",
    properties: {
        subjectLine:{type:"string"},
      // 🚨 TASK 1: Define the 'subjectLine' property metadata here
      // 🚨 TASK 2: Define the 'emailBody' property metadata here
         emailBody:{type:"string"},
         detectedTechStack:{
            type:"array",
            items:{type:"string"}
         }
      // 🚨 TASK 3: Define the 'detectedTechStack' string array property metadata here
    },
    
    // 🚨 TASK 4: Explicitly enforce that all three properties are mandatory
    required: ["subjectLine","emailBody","detectedTechStack"] 
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
   const client=new Anthropic({apiKey});
   const response= await client.messages.create({
    model:"claude-opus-4.6" ,
    max_tokens:1024,
    tool_choice:{type:"tool",name:"save_outreach_draft"},
    messages:[{role:"user",content:"Generate Specialize email  draft for particular company "}]
   })
     
    
  // Objective: Invoke the Anthropic messages creation stream. Pass the prompt, 
  // inject your OUTREACH_TOOL_SCHEMA, and apply a strict 'tool_choice' parameter
  // to force the model to ONLY speak through that tool.
  // Docs: Anthropic Tool Use -> Forcing Tool Use (tool_choice parameter)
  


  // ==========================================
  // STEP 2: THE TYPE GUARD CHECK
  // ==========================================
  // Objective: Look at the API response content blocks array. Verify programmatically
  // that the model actually returned a 'tool_use' block, not a text block.
  // Docs: Anthropic API Reference -> Message Content Blocks Array Types
  
      let  data;
     for(const block of response.content){
      if(block.type=="tool_use"){
       data=block.input as SerializedOutreachDraft
    }
    }
  // ==========================================
  // STEP 3: DATA EXTRACTION & CASTING
  // ==========================================
  // Objective: Pull the raw 'input' arguments object out of the tool use block,
  // cast it safely to your SerializedOutreachDraft type interface, and return it.
  // Docs: TypeScript Type Assertions (as keyword)
  if(!data){
    throw new Error("Data is not available")
  }
  
  return {
    subjectLine:data.subjectLine,
    emailBody:data.emailBody,
    detectedTechStack:data.detectedTechStack
  };
} 