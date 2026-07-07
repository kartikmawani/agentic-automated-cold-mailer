import {readdir} from "node:fs/promises";
import { z } from "zod";
server.tool({
    name:"portfolio_projects",
    "Scans the local workspace path and returns all software project directories available for context extraction.",
    {
        workspacePath:z.string().describe("The path to the workspace to scan for project directories."),
    },
    async({workspacePath}) =>{
        try{
        if(!workspacePath){
            return[
                {
                    name:"error",
                    response:"Please provide a valid workspace path to scan for project directories.",
                }
            ]
        }
        const items=await readdir(workspacePath,{withFileTypes:true});
        const project=items.filter(items.isDirectory() && !items.name.startsWith("."));
        
        console.error(`Located ${project.length} contexts asynchronously.`);
        return[
            type:"text",
            content:JSON.stringify({
                status:"success",
                projects:project.map(item=>item.name),
                error:null,
                2
            })
        ]
    }
    catch(error){
        console.error(`Error scanning workspace path: ${error}`);
        return[
            {
                 type:"text",
                 content:JSON.stringify({
                    status:"error",
                    projects:[],
                    error:`An error occurred while scanning the workspace path: ${error}`,
                 })
                 
            }
        ]
    }
    }
})
//for better token managment 
server.tool({
    "extract_repo",
    "Low-latency tool that prioritizes reading README.md for project capabilities. If missing, it auto-detects and reads the core execution entry file.",
    {
        workspacePath: z.string().describe("Absolute path to your development workspace folder."),
        projectName: z.string().describe("The name of the repository folder to analyze.")
      },
      async({workspacePath,projectName})=>{
           try{
            const projectRoot=path.resolve(workspacePath,projectName)
            const readmePath=path.resolve(projectRoot,"README.md")
            if(fs.existsSync(readmePath)){
                console.error();
                const content=await readFile(readmePath,"utf-8")
                return[
                    {
                        content: [{ type: "text", text: JSON.stringify({ source: "README.md", content: content.substring(0, 15000) }) }]
                    }
                ]
            }
           }
           // 2. Fallback: Auto-detect the core execution file
      console.error(`⚠️ No README found for ${projectName}. Executing entry-point auto-detection...`);
      let entryFile = "";

      // Check package.json to see where the app actually boots
      const packageJsonPath = path.join(projectRoot, "package.json");
      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(await readFile(packageJsonPath, "utf-8"));
        if (pkg.main) entryFile = pkg.main;
      }

      // Common fallback heuristics if package.json entry is missing or generic
      const commonEntryPoints = ["src/server.ts", "src/index.ts", "server.ts", "index.js", "src/main.ts"];
      if (!entryFile || !fs.existsSync(path.join(projectRoot, entryFile))) {
        const found = commonEntryPoints.find(file => fs.existsSync(path.join(projectRoot, file)));
        if (found) entryFile = found;
      }

      if (entryFile) {
        const absoluteEntryPath = path.join(projectRoot, entryFile);
        console.error(`🎯 Core file detected: ${entryFile}`);
        const content = await readFile(absoluteEntryPath, "utf-8");
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ 
              source: entryFile, 
              note: "Extracted entry-point code due to missing README.",
              content: content.substring(0, 12000) // Keep token window tight
            }) 
          }]
        };
      }
      // 4. Absolute Fallback: Just return the top-level directory layout so the AI can ask for a specific file
      const files = await readdir(projectRoot);
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({ 
            source: "directory_structure_only", 
            error: "No README or obvious core entry file found.",
            availableFiles: files 
          }) 
        }]
      };
      }
      catch (err: any) {
        console.error(`❌ Essence extraction failed: ${err.message}`);
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
})