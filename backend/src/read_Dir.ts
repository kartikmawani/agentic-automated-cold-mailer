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
 