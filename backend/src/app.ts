import dotenv from "dotenv";
dotenv.config();
import express from 'express';
import cors from 'cors';
import { Request, Response } from 'express';
import { initializeConfigWizard } from "./ConfigManager.js";
import { runFullOutreachPipeline } from "./Pipeline.js";  
import { prisma } from "./prisma_Initialization.js";

const app = express();
const PORT = 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());
 
app.post('/api/leads', async (req: Request, res: Response) => {
  try {
    const { companyName: rawCompanyName } = req.body;
    //rawCompanyName is the variable that has value which is companyName
    if (!rawCompanyName) {
      return res.status(400).json({
        message: 'companyName is not included in the request'
      });
    }

    // 💡 1. SANITIZE RAW EXTENSION DOM TEXT AT THE ENTRYPOINT
    // const companyName = rawCompanyName
    //   .split(/•|\||-|–|—/)[0] // Takes only text before bullet points, pipes, or dashes
    //   .replace(/\b(Actively Hiring|Early Stage|Seed|Series [A-Z]|\d+-\d+ Employees)\b/gi, "")
    //   .trim();
    const companyName = rawCompanyName
      .split(/Actively Hiring|•|\||-|–|—/i)[0] // Drops anything after "Actively Hiring", bullet points, or dashes
      .trim();
    const existingLead = await prisma.lead.findFirst({
      where: { companyName }
    });

    if (!existingLead) {
      await prisma.lead.create({
        data: {
          companyName: companyName,
          status: "PENDING_ENRICHMENT"
        }
      });
      console.log(` [Extension API] New lead added to SQLite: ${companyName}`);
    } else {
      console.log(`[Extension API] Lead already exists in queue: ${companyName}`);
    }

     
    await runFullOutreachPipeline();

    return res.status(202).json({
      message: 'Outreach pipeline sequence successfully initiated.',
      companyName: companyName
    });
    
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: "Error executing the outreach pipeline inside the backend",
      details: error.message
    });
  }
});

// ==========================================
// ASYNCHRONOUS SERVER BOOTSTRAPPER
// ==========================================
async function startServer() {
  try {
    // 1. Run the terminal-prompt setup wizard or read the cached home directory JSON file instantly
    const config = await initializeConfigWizard();

    // 2. Hydrate the parameters into process.env so your deep engineering services can read them
    process.env.GROQ_API_KEY = config.groqApiKey;
    process.env.WORKSPACE_PATH = config.workspacePath;
    process.env.PROJECT_FOLDERS = config.projectFolders.join(",");
    process.env.SENDER_EMAIL = config.senderEmail;

    console.log("⚡ System environment configurations successfully loaded into runtime memory.");

    // 3. Open the network port listener safely now that dependencies are satisfied
    app.listen(PORT, () => {
      console.log(`🚀 Server is successfully running on http://localhost:${PORT}`);
    });

  } catch (error: any) {
    console.error("💥 Critical breakdown during engine server initialization:", error.message);
    process.exit(1);
  }
}

// Execute the bootstrap runtime thread
startServer();