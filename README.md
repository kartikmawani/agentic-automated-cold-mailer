# Autonomous Agentic Cold Mailer

An autonomous technical analysis and outbound engineering pipeline designed to bridge the gap between developer capabilities and active technology startup needs. The system scans targets, extracts deep context, matches technical profiles to scaling blocks, and uses strict LLM tool guardrails to orchestrate highly personalized cold pitches.

<div align="center">
  <img src="https://img.shields.io/badge/Pipeline-Autonomous_Agentic-blue?style=for-the-badge" alt="Pipeline Status">
</div>

---

## 📌 The Problem
Securing core engineering roles or specialized startup projects through traditional outreach is highly inefficient. Developers frequently struggle to:
* **Identify Active Engineering Pain Points:** Pinpointing the exact infrastructure struggles, technical debt, or framework bottlenecks a startup faces.
* **Avoid Generic Boilerplate:** Writing generic, copy-paste templates that founder inbox security layers immediately flag as spam.
* **Scale Contextual Outbound:** Researching team stacks, verifying inboxes, and mapping custom developer profiles takes hours per lead.

## 💡 The Solution
The Autonomous Agentic Cold Mailer acts as an automated **"Outreach Engine for Developers."** By routing processing queues through structured LLM validation layers, the system:
* Performs a **multi-source enrichment scan** of company and founder metadata.
* Evaluates **inbox validity and data confidence thresholds** to secure sender reputation.
* Synthesizes raw developer experience blueprints directly against the target's stack.
* Enforces **strict schema contracts via Anthropic Tool Use** to output deterministic, isolated email assets.
* Dispatches native, high-deliverability plain-text messages using the **Resend API**.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Data_Source [Persistence Tier]
        A[(SQLite DB)] --> B[Prisma 7 ORM]
    end

    subgraph Orchestration_Engine [Logic & Processing Queue]
        C[Pipeline Runner] --> D[Batch Coordinator]
        D --> E[p-limit Throttler]
        E --> F[Enrichment Service]
    end

    subgraph Intelligence_Layer [LLM Guardrail Layer]
        G[Profile Summarizer] --> H[llmGuarding Engine]
        H --> I[Anthropic SDK Client]
    end

    subgraph Transmission_Gateway [Delivery Services]
        J[Resend Integration] --> K[Target Founder Inbox]
## 🛠️ Design Decisions

* [cite_start]**Local-First Capability Profile Compression** [cite: 1691]
  [cite_start]Instead of relying on generic resume bullet points, the system automatically inspects local workspace project `README.md` files[cite: 1691]. [cite_start]It uses Groq (`llama-3.3-70b-versatile`) to compile a high-density **Developer Capabilities Matrix** outlining core stacks, architectural patterns, and real technical problems solved[cite: 1691].

* [cite_start]**Sequential Multi-Tier Lead Intelligence with Smart Fallbacks** [cite: 1692]
  The enrichment service executes a single-go pipeline:
  1. [cite_start]**Tavily API:** Performs semantic web searches to identify company founders and official domains[cite: 1693].
  2. [cite_start]**Groq API (`llama-3.1-8b-instant`):** Extracts founder names and engineering pain points into structured JSON[cite: 1694].
  3. [cite_start]**Hunter.io & Pattern Fallback:** Resolves verified email addresses[cite: 1695]. [cite_start]If Hunter limits are hit or data is throttled, an automated domain sanitizer and pattern matcher (`first_name@domain.com`) kicks in to guarantee 100% queue completion without pipeline halts[cite: 1695, 1696].

* [cite_start]**Schema Guardrails & Native JSON Output** [cite: 1697]
  [cite_start]To eliminate AI filler text and hallucinations, the draft generator (`llmGuarding.ts`) uses Groq’s native JSON mode (`response_format: { type: "json_object" }`)[cite: 1697]. [cite_start]This enforces a strict output contract (`SerializedOutreachDraft`) containing subject lines under 4 words, clean markdown body text, and detected technology tokens[cite: 1698].

* [cite_start]**Engineering "Meta-Pitch" Strategy** [cite: 1699]
  [cite_start]To maximize response rates from startup founders and CTOs, outreach emails are written as concise, peer-to-peer engineering demos[cite: 1699]. [cite_start]They state upfront that the email was dynamically researched and written by an autonomous agent, proving real-world AI engineering capability in the very first sentence[cite: 1700].

---

## 🛠️ Built With

### 🎨 Frontend & Browser Extension
![Chrome](https://img.shields.io/badge/Chrome_Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)
![Firefox](https://img.shields.io/badge/Firefox_Addon-FF7139?style=for-the-badge&logo=firefox-browser&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Manifest V3](https://img.shields.io/badge/Manifest_V3-000000?style=for-the-badge)

### 🧠 Backend & AI Pipeline
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_Llama_3.3-F05032?style=for-the-badge)
![Nodemailer](https://img.shields.io/badge/Nodemailer-007ACC?style=for-the-badge)

### 💾 Infrastructure, DB & Protocols
![SQLite](https://img.shields.io/badge/sqlite-%23003B57.svg?style=for-the-badge&logo=sqlite&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![MCP](https://img.shields.io/badge/Model_Context_Protocol-8E75B2?style=for-the-badge)

---

## 🚀 Getting Started

Follow these steps to set up and run the engine locally.

### Prerequisites
* **Node.js** (v18 or higher) & **npm**
* [cite_start]**Groq API Key** (Free at [console.groq.com](https://console.groq.com)) [cite: 1701]
* [cite_start]**Tavily Search API Key** (Free at [tavily.com](https://tavily.com)) [cite: 1701]
* [cite_start]**Hunter.io API Key** (Free at [hunter.io](https://hunter.io)) [cite: 1701]
* [cite_start]**Gmail Account & App Password** (Generated via Google Account Security) [cite: 1701]

### Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone [https://github.com/kartikmanwani/agentic-automated-cold-mailer.git](https://github.com/kartikmanwani/agentic-automated-cold-mailer.git)
   cd agentic-automated-cold-mailer/backend
    end

    B --- C
    F --- G
    I --- H
    H --- J
