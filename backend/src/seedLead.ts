import { PrismaClient } from "./generated/prisma/index.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import betterSqlite3 from "better-sqlite3";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 1. Instantiate the native driver pointing to your fresh local database asset path
const databaseStoragePath=path.resolve("prisma/dev.db");
const sqliteNativeDriver=new betterSqlite3(databaseStoragePath);

// 2. Initialize the Prisma 7 WebAssembly Bridge Adapter
const databaseAdapter=new PrismaBetterSqlite3(sqliteNativeDriver);
const prisma=new PrismaClient({ adapter: databaseAdapter });

const dirName=path.dirname(fileURLToPath(import.meta.url));
 
async function seedLocalDatabase(){
 
    console.error("Ingesting target lead metrics into local SQLite database...");
     const sourceLeadsPath=path.resolve(dirname,"../leads.json")
     if(!fs.existsSync(sourceLeadsPath)) {
        console.error("Ingestion halt source file missing")
        process.exit(1);
    }
    const sourceLeads=JSON.parse(fs.readFileSync(sourceLeadsPath,"utf-8 "));
     let ingestDataCount=0;
     let skippedDataCount=0;
     for(const lead of sourceLeads){
        const recordExists=await prisma.lead.findFirst({
            where:{
                companyName:lead.companyName,
                founderName:lead.founderName
            }
        })
        if(!recordExists){
            await prisma.lead.create({
                data:{
                    companyName:lead.companyName,
                    founderName:lead.founderName,
                     techStack:lead.techStack.join(","),
                     engineeringPainPoint:lead.engineeringPainPoint,
                     status:"PENDING"
                }
            })
            ingestDataCount++;
            else{
                skippedDataCount++;
            }
            console.error(`Sync Metrics -> New: ${ingestDataCount} | Skipped: ${skippedDataCount}`);
        }
    }
}
seedLocalDatabase()
.catch((err)=>{
    console.error("💥 Critical data injection crash occurred:",err);
    process.exit(1);
})
.finally(async ()=>{
    await prisma.$disconnect();
})