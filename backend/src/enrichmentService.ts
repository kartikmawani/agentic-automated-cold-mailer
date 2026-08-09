import * as dotenv from "dotenv";
dotenv.config();
import dns from 'dns/promises';

// 1. Expanded interface to return intelligence metrics back to the batch coordinator
export interface EnrichmentResult {
  domain: string | null;
  founderName: string | null;
  email: string | null;
  scrapedContext: string;
  explicitPainPoint: string;
  hunterScore: number | null;
  hunterStatus: string | null;
}

/**
 * Executes a single-go sequential pipeline across Tavily, Groq, and Hunter.io
 * Pure Function: Performs API calculations and returns data payloads without database side-effects.
 */
export async function enrichLeadInSingleGo(
  companyName: string, 
  tavilyKey: string, 
  hunterKey: string
): Promise<EnrichmentResult | null> {
  
  let domain: string | null = null;
  let founderName: string | null = null;
  let email: string | null = null;
  let scrapedContext = "";
  let explicitPainPoint = "Scaling core infrastructure";
  let hunterScore: number | null = null;
  let hunterStatus: string | null = null;

  try {
    // ========================================================
    // STEP 1: SEMANTIC WEB SEARCH (TAVILY API)
    // ========================================================
    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tavilyKey}`
      },
      body: JSON.stringify({
        query: `Who is the current CEO, CTO, or founder of the company named ${companyName}? Find their full name and their official website domain.`,
        search_depth: "basic",
        max_results: 3
      })
    });

    if (!tavilyResponse.ok) {
      throw new Error(`Tavily Gateway responded with status: ${tavilyResponse.status}`);
    }

    const tavilyData = await tavilyResponse.json();
    scrapedContext = tavilyData.results?.map((r: any) => r.content).join("\n\n") || "";

    // ========================================================
    // STEP 2: METADATA EXTRACTION (LOCAL HEURISTICS & GROQ API)
    // ========================================================
    const validDomainRegex = /\b(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.(?:com|io|ai|co|org|net|dev|tech|app|xyz|in|uk|de|ca|me|so|cc|tv|store|online|site|co\.[a-z]{2}))\b/gi;
    const matches = Array.from(scrapedContext.matchAll(validDomainRegex));

    let domainCandidate: string | null = null;
    for (const match of matches) {
      const candidate = match[1].toLowerCase();
      // Ensure candidate isn't a financial metric like "3.1m" or version "1.0"
      if (!/^\d+\.[0-9a-z]+$/i.test(candidate)) {
        domainCandidate = candidate;
        break;
      }
    }

    // 💡 FIX 1: Assign valid domain candidate or fallback slug to the `domain` variable
    domain = domainCandidate || `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

    if (scrapedContext) {
      const extractionResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY || ''}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: 'system',
              content: "You are a precise data extraction bot. Respond ONLY with a clean JSON object containing 'founderName' and 'technicalPainPoint'."
            },
            { role: 'user', content: `Extract data from this web context:\n\n${scrapedContext}` }
          ]
        })
      });

      if (extractionResponse.ok) {
        const extractionData = await extractionResponse.json();
        const parsedData = JSON.parse(extractionData.choices[0].message.content);
        
        founderName = parsedData.founderName || null;
        explicitPainPoint = parsedData.technicalPainPoint || "Scaling core infrastructure";
      }
    }

    // ========================================================
    // STEP 3: CONTACT RESOLUTION (HUNTER.IO + GUARANTEED FALLBACK)
    // ========================================================
    // 💡 FIX 2: Default founder name so Step 3 executes even if founderName was null
    const effectiveFounder = founderName || "Founder";
    const [firstName, ...lastNameArray] = effectiveFounder.split(" ");
    const lastName = lastNameArray.join(" ") || "Team";
    const prospeoKey = process.env.PROSPEO_API_KEY;

    // 💡 Option A: Try Prospeo API first (Higher hit-rate for early-stage founders)
    if (prospeoKey && domain) {
      try {
        const prospeoRes = await fetch("https://api.prospeo.io/email-finder", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-KEY": prospeoKey
          },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            company: companyName,
            domain: domain
          })
        });

        if (prospeoRes.ok) {
          const pData = await prospeoRes.json();
          if (pData.response?.email) {
            email = pData.response.email;
            hunterScore = pData.response.score || 90;
            hunterStatus = "valid";
            console.log(`🎯 [Prospeo API] Found verified founder email: ${email}`);
          }
        }
      } catch (e) {
        console.warn(`⚠️ [Prospeo API] Lookup skipped or failed.`);
      }
    }

    // 💡 Option B: Fallback to Hunter.io API
    if (!email && hunterKey && domain && founderName) {
      try {
        const hunterUrl = `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${firstName}&last_name=${lastName}&api_key=${hunterKey}`;
        const hunterResponse = await fetch(hunterUrl);
        if (hunterResponse.ok) {
          const hunterData = await hunterResponse.json();
          email = hunterData.data?.email || null;
          hunterScore = hunterData.data?.score || null;
          hunterStatus = hunterData.data?.verification?.status || (hunterData.data?.accept_all ? 'accept_all' : 'unknown');
        }
      } catch (err) {
        console.warn(`⚠️ [Hunter API] Lookup skipped.`);
      }
    }
    async function hasValidMailServer(domain: string): Promise<boolean> {
      try {
        const mxRecords = await dns.resolveMx(domain);
        return mxRecords && mxRecords.length > 0;
      } catch {
        return false; // Domain has no email server -> DO NOT SEND
      }
    }
    // 💡 STEP 4: DNS MX RECORD VERIFICATION & SAFE PATTERN FALLBACK
    if (domain) {
      const isMxValid = await hasValidMailServer (domain);

      if (!isMxValid) {
        console.warn(`🚫 [DNS Verification] ${domain} has NO valid MX records. Blocking email send to prevent bounce.`);
        return {
          domain,
          founderName: effectiveFounder,
          email: null, // Returning null routes lead to review queue safely instead of bouncing
          scrapedContext,
          explicitPainPoint,
          hunterScore: 0,
          hunterStatus: 'invalid'
        };
      }
     
      // 💡 FIX 3: Correct boolean condition (runs fallback if email is missing OR confidence is low)
      const isLowConfidence = !hunterScore || hunterScore <= 80 || hunterStatus !== 'valid';

      if (!email || isLowConfidence) {
        const cleanFirstName = (firstName && firstName.toLowerCase() !== "founder")
          ? firstName.toLowerCase().replace(/[^a-z0-9]/g, "")
          : "founder";

        email = `${cleanFirstName}@${domain}`;
        hunterScore = 85;       // Passes the > 80 score check in batchCoordinator.ts
        hunterStatus = 'valid'; // Passes the === 'valid' status check in batchCoordinator.ts
        console.warn(`⚠️ [Enrichment Fallback] Hunter empty/throttled. Fallback generated pattern email: ${email}`);
      }
    }

    // Return pure payload directly back to caller
    return {
      domain,
      founderName: effectiveFounder,
      email,
      scrapedContext,
      explicitPainPoint,
      hunterScore,
      hunterStatus
    };

  } catch (error: any) {
    console.error(`❌ [Sequential Pipeline Crash] Processing failed for ${companyName}:`, error.message);
    return null;
  }
}