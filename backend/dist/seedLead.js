// src/seedLead.ts
import { PrismaClient } from "./generated/prisma/index.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// 1. Instantiate the native driver pointing to your fresh local database asset path
const databaseStoragePath = path.resolve("prisma/dev.db");
// 2. Passed both parameters cleanly to fulfill the constructor signature requirements
const databaseAdapter = new PrismaBetterSqlite3({
    url: `file:${databaseStoragePath}`
});
const prisma = new PrismaClient({ adapter: databaseAdapter });
const dirName = path.dirname(fileURLToPath(import.meta.url));
export async function seedLocalDatabase() {
    try {
        console.error("Ingesting target lead metrics into local SQLite database...");
        const sourceLeadsPath = path.resolve(dirName, "../leads.json");
        if (!fs.existsSync(sourceLeadsPath)) {
            console.error("Ingestion halt: source file missing");
            return;
        }
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
                        status: "PENDING_ENRICHMENT"
                    }
                });
                ingestDataCount++;
            }
            else {
                skippedDataCount++;
            }
            console.error(`Sync Metrics -> New: ${ingestDataCount} | Skipped: ${skippedDataCount}`);
        }
    }
    finally {
        // FIXED: Ensure connections disconnect safely when invoked externally as an imported module
        await prisma.$disconnect();
    }
}
// FIXED: Wrapped in an execution guard to prevent the script from auto-running upon being imported by pipeline.ts
if (import.meta.url === `file://${process.argv[1]}`) {
    seedLocalDatabase()
        .catch((err) => {
        console.error("💥 Critical data injection crash occurred:", err);
        process.exit(1);
    });
}
