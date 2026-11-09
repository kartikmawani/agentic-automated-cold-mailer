Summary:

File:profileSummarizer,Pipeline.ts

Workflow:Original intend of this part is to generate and save summary of user and afterwards it won't be generated again,this summary will 
         be used but right now it is in pipeline.ts and that's where the problem lies each time ingesting comany name  route will be called 
         developer summary will be created and that is the problem,so it has to be changed but below implementation of profileSummarize will go as intended
         with some improvements.

         prfileSummarizer checks api key if it is  available then it makes api call,api  key is added as a parmaneter using .env file 
           Question-: can't we just use api key  through .env in the function itself,why creating a parameter.

           
            export interface SummarizeProfileOptions {
            apiKey: string;
            rawReadmeContent: string;
            }
            
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
                
                return response.choices[0]?.message?.content || "";
            
            } catch (error) {
                console.error('Error in profile summarization service pipeline:', error);
                throw error;
            }
            }

            Credibility of prompt is skeptic.
            Groq api key has very few parameter need to be checked.
            Since it an api call it should have-:
             AbortController,
             Retry with exponential backoff+jitter,
             Rate Limiting,
             Circuit breaker.

             Improvement-:Readme data has been dumped on api call,need to use token strategy otherwise this call will cose so much token.

             async function extractRepo(workspacePath: string, projectName: string): Promise<string> {
                        const projectRoot = path.resolve(workspacePath, projectName);
                        const readmePath = path.resolve(projectRoot, "README.md");

                        try {
                            await fs.access(readmePath);
                            const content = await fs.readFile(readmePath, "utf-8");
                            return JSON.stringify({ source: "README.md", content: content.substring(0, 15000) });
                        } catch {
                            console.warn(`⚠️ No README found for [${projectName}]. Checking core entry files...`);
                        }

                        let entryFile = "";
                        const packageJsonPath = path.join(projectRoot, "package.json");
                        try {
                            const pkgRaw = await fs.readFile(packageJsonPath, "utf-8");
                            const pkg = JSON.parse(pkgRaw);
                            if (pkg.main) entryFile = pkg.main;
                        } catch {}

                        const commonEntryPoints = ["src/server.ts", "src/index.ts", "server.ts", "index.js", "src/main.ts"];
                        if (!entryFile) {
                            for (const point of commonEntryPoints) {
                            try {
                                await fs.access(path.join(projectRoot, point));
                                entryFile = point;
                                break;
                            } catch {}
                            }
                        }

                        if (entryFile) {
                            try {
                            const content = await fs.readFile(path.join(projectRoot, entryFile), "utf-8");
                            return JSON.stringify({ source: entryFile, content: content.substring(0, 12000) });
                            } catch (err: any) {
                            console.error(`❌ Failed to read entry file: ${err.message}`);
                            }
                        }

                        const files = await fs.readdir(projectRoot);
                        return JSON.stringify({ source: "directory_structure", availableFiles: files });
                        }

                    This code implements raw code extraction from folders.It runs in the loop for each project to give 
                    readme content that content will then sent to the groq ai for summary generation..It checks folder readme if it is their
                    then sends huge data chunk to ai.approx 45k words to ai for summary generation.If Readme doesn't exist then it checks for 
                    package.json if it exists then it will packge.json data to ai,if neither of them works then it checks commonentrypoints
                    and sends data from those commonEntryPoint
                    
                    Question-:Isn't this a naive approach,this implementation does not allow any other tech stack for instance Springboot they don't 
                    have those commonEntryPoint,so this approach should be robust.

                    Orchastrate parallel batch will be called after generating developer summary.
