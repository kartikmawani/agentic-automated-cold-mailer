interface EnrichmentResult {
  domain: string | null;
  founderName: string | null;
  email: string | null;
  scrapedContext: string;
}

/**
 * Executes a single-go sequential pipeline across Tavily and Hunter.io
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

  try {
    // ========================================================
    // STEP 1: SEMANTIC WEB SEARCH (TAVILY API)
    // ========================================================
    // Ref: https://docs.tavily.com/documentation/api-reference/endpoint/search
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
    
    // Concatenate text blocks for your Claude context window later
    scrapedContext = tavilyData.results?.map((r: any) => r.content).join("\n\n") || "";

    // ========================================================
    // STEP 2: METADATA EXTRACTION (LOCAL HEURISTICS ENGINE)
    // ========================================================
    // We parse the text payload to find the name and domain. 
    // In your full build, you can pass 'scrapedContext' to a fast Claude turn,
    // but regex matching works well as an initial fallback guard:
    const domainMatch = scrapedContext.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)/);
    domain = domainMatch ? domainMatch[1] : `${companyName.toLowerCase().replace(/\s+/g, '')}.com`;

    // Let's assume your search string or extraction isolate a name target.
    // For this demonstration example, we locate a typical founder signature pattern:
    if (scrapedContext) {
        const extractionResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY || '',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022', // Use Haiku here for sub-second, cheap processing
            max_tokens: 200,
            temperature: 0,
            system: "You are a precise data extraction bot. Respond ONLY with a clean JSON object containing 'founderName' and 'technicalPainPoint'. If multiple founders exist, select the technical one (CTO/Lead Dev).",
            messages: [{ role: 'user', content: `Extract data from this web context:\n\n${scrapedContext}` }]
          })
        });
      
        const extractionData = await extractionResponse.json();
        const parsedData = JSON.parse(extractionData.content[0].text);
        
        founderName = parsedData.founderName || null;
        // Now you have the actual technical challenge to feed your pitch later!
        var explicitPainPoint = parsedData.technicalPainPoint || "Scaling core infrastructure";
      } // Placeholder: Replace with LLM extraction from scrapedContext

    // ========================================================
    // STEP 3: CONTACT RESOLUTION (HUNTER.IO EMAIL FINDER)
    // ========================================================
    // Ref: https://hunter.io/api-documentation
    if (founderName && domain) {
      const [firstName, ...lastNameArray] = founderName.split(" ");
      const lastName = lastNameArray.join(" ") || "Founder";

      // Hunter Email Finder uses a standard GET query sequence
      const hunterUrl = `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${firstName}&last_name=${lastName}&api_key=${hunterKey}`;
      
      const hunterResponse = await fetch(hunterUrl);
      
      if (hunterResponse.ok) {
        const hunterData = await hunterResponse.json();
        const email = hunterData.email;
        const confidence = hunterData.score; // The percentage check
       const status = hunterData.verification?.status; // 'valid', 'invalid', or 'accept_all'

        if (confidence > 80 && status === 'valid') {
         //   High confidence public data or verified unique inbox
         await prisma.lead.update({ data: { email, status: 'ENRICHED_READY_FOR_CLAUDE' } });
            }
             else if (status === 'accept_all' || confidence < 80) {
            // RISKY ZONE: Server is guessing or hitting a catch-all firewall
            await prisma.lead.update({ data: { email, status: 'REQUIRES_MANUAL_REVIEW' } });
            }
             else {
                // FAIL ZONE: Email bounces or is confirmed dead
                await prisma.lead.update({ data: { status: 'FAILED_NO_CONTACT_FOUND' } });
                }
            }
             else {
        console.warn(`⚠️ [Hunter API] Target domain resolution skipped or throttled: ${hunterResponse.status}`);
      }
    }

    return {
      domain,
      founderName,
      email,
      scrapedContext
    };

  } catch (error: any) {
    console.error(`❌ [Sequential Pipeline Crash] Processing failed for ${companyName}:`, error.message);
    return null;
  }
}