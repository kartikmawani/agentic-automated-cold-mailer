import { PrismaClient } from "./generated/prisma/index.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 1. Instantiate the native driver pointing to your fresh local database asset path
const databaseStoragePath = path.resolve("prisma/dev.db");

// 2. FIXED: Passed both parameters cleanly to fulfill the constructor signature requirements
const databaseAdapter = new PrismaBetterSqlite3({ 
    url: `file:${databaseStoragePath}` 
  });
const prisma = new PrismaClient({ adapter: databaseAdapter });

const dirName = path.dirname(fileURLToPath(import.meta.url));
 
async function seedLocalDatabase() {
  console.error("Ingesting target lead metrics into local SQLite database...");
  
  // FIXED: Standardized variable identifier token parsing to match 'dirName'
  const sourceLeadsPath = path.resolve(dirName, "../leads.json");
  
  if (!fs.existsSync(sourceLeadsPath)) {
    console.error("Ingestion halt: source file missing");
    process.exit(1);
  }
  
  // FIXED: Strip out the trailing space character string bug from "utf-8"
  const sourceLeads = JSON.parse(fs.readFileSync(sourceLeadsPath, "utf-8"));
  let ingestDataCount = 0;
  let skippedDataCount = 0;
  
  for (const lead of sourceLeads) {
    const recordExists = await prisma.lead.findFirst({
      where: {
        companyName: lead.companyName,
        founderName: lead.founderName
      }
    });
    
    if (!recordExists) {
      await prisma.lead.create({
        data: {
          companyName: lead.companyName,
          founderName: lead.founderName,
          techStack: Array.isArray(lead.techStack) ? lead.techStack.join(",") : lead.techStack,
          engineeringPainPoint: lead.engineeringPainPoint,
          
          // ARCHITECTURAL OPTIMIZATION: Updated default seed state to PENDING_ENRICHMENT
          // This keeps seed variables synced directly with our automated background queue picker loop!
          status: "PENDING_ENRICHMENT" 
        }
      });
      ingestDataCount++;
    } else { // FIXED: Structured code brackets layout to close the validation check smoothly
      skippedDataCount++;
    }
    
    console.error(`Sync Metrics -> New: ${ingestDataCount} | Skipped: ${skippedDataCount}`);
  }
}

seedLocalDatabase()
  .catch((err) => {
    console.error("💥 Critical data injection crash occurred:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });