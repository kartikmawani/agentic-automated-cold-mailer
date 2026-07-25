import dotenv from "dotenv";
dotenv.config();
import express from 'express';
import cors from 'cors';
import { Request, Response } from 'express';
import { initializeConfigWizard } from "./ConfigManager.js";
import { runFullOutreachPipeline } from "./Pipeline.js"; // Adjust import if your file matches outreachPipeline.js

const app = express();
const PORT = 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ==========================================
// EXPRESS ROUTE ENDPOINTS
// ==========================================
app.post('/api/leads', async (req: Request, res: Response) => {
  try {
    const { companyName } = req.body;
    if (!companyName) {
      return res.status(400).json({
        message: 'companyName is not included in the request'
      });
    }

    // Hand off execution directly to your CPU/brain pipeline service file
    // This extracts repos, summarizes your profile, and kicks off the batch engine
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
    process.env.ANTHROPIC_API_KEY = config.anthropicApiKey;
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