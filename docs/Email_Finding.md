Summary-:

files-:enrichmentService,llmGuardings

Workflow-:enrichSingleLeadGo function is called  to find email of the lead and check it's credibility.This function parameter is lead.companyname and 
           return enrichmentResult interface.

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

                In try block tavily api call has been made which is lacking standard api techniques described in DevloperSummary.md Improvement.The
                response of the api is in the json format.which later is mapped and it performs some regex operation that try to get company lead name
                and their domain.

                ==>if (scrapedContext) {
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

                        This API call try to get founder name and technical pain point if the response is ok then the code extract data in json format
                         Improvement-:It is lacking api standard method discussed above.

                         ==>const effectiveFounder = founderName || "Founder";
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
                              AFTER GETTING founder name and painpoint enrichmentService call the prospeo api to find email of the founder by giivng 
                              first name,last name,companyname and domain of the company and expect founder email.If it gets the resposne then based on 
                              that response hunterScore has been set if the score available in prospeo then that will be the score otherwise 90 and 
                              hunter status will be valid.
                              Improvement-:It is lacking api standard method discussed above.

                              ==> if (!email && hunterKey && domain && founderName) {
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
                          IF EMAIL IS not found in prospeo then hunter will take responsibility and try to find email if hunter gets the email then based on 
                          the hunterScore they will proceed further.

                          ==>async function hasValidMailServer(domain: string): Promise<boolean> {
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
        HAS VALIDMXSERVER function is used to verify the domain it will check  for gmail,yahoo etc.It does not guarntee that the email is correct but ensure
        it's domain is correct.This action will be performed irrespective of the hunterScore.
         ==>const isLowConfidence = !hunterScore || hunterScore <= 80 || hunterStatus !== 'valid';
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
            IF THE HUNTERSCORE is less than 80 then it will perform a pattern based startup email generating method which has great chances of getting suitable 
            result the pattern joins the firstname of the lead and the domain of the company that makes the email and after this pattern it will set the 
            hunterScore 85 and will send the enrichmentResult.
            Improvement-:This file is lacking the centralized error middleware as welll.
                         lacking the standard api startegies.

            ENRICHMENTSERVICE gives the email of techlead and then that email goes into batchCordinator that perform some operation and final email content
            is generated in llmGuarding file.
            ==>export async function generateStrictDraft(
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
                        model: "openai/gpt-oss-20b",
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
        THIS FILE needs instance of OPENAI and prompt for draft.IF the file does not get the instance it creates that instance and after the creation
        It calls the opeAI with different setUp and different model with respect to the whole projecte and it fetches required data from the object and
        that response then send as the interface define in the top of the file which is SerializedOutput.
        Imrovement-:Make the project unified don't use differnet structure for api call.