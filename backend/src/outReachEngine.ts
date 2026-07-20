/**
 * Executes a single high-context API call to draft a personalized technical pitch.
 */
export async function generateOutreachEmail(
    founderName: string,
    companyName: string,
    companyContext: string,
    myPortfolioCapabilities: string
  ): Promise<string> {
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022', // Use Sonnet here for maximum writing precision
        max_tokens: 1000,
        temperature: 0.3, // Keeps the pitch professional and grounded
        system: `You are an elite full-stack engineer reaching out to startup founders. 
  Keep your copy short, direct, and completely devoid of generic corporate fluff. 
  Stitch the developer portfolio projects seamlessly to the startup's current technical struggles.`,
        messages: [
          {
            role: 'user',
            content: `Write a hyper-personalized email to ${founderName}, the leader at ${companyName}.
            
            STARTUP CONTEXT & PAIN POINTS:
            ${companyContext}
            
            MY PORTFOLIO & TECHNICAL EXPERIENCE BLUEPRINT:
            ${myPortfolioCapabilities}
            
            INSTRUCTIONS:
            - Subject line must be informal and short (under 4 words).
            - Match their engineering stack perfectly.
            - Conclude with a low-friction call to action asking for a brief technical synchronization chat.`
          }
        ]
      })
    });
  
    const data = await response.json();
    return data.content[0].text;
  }