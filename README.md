 # Autonomous Agentic Cold Mailer

An autonomous technical analysis and outbound engineering pipeline designed to bridge the gap between developer capabilities and active technology startup needs. The system scans targets, extracts deep context, matches technical profiles to scaling blocks, and uses strict LLM tool guardrails to orchestrate highly personalized cold pitches.
 

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
* Enforces **strict schema contracts via Groq / LLM Tool Schema** to output deterministic, isolated email assets.
* Dispatches native, high-deliverability plain-text messages using **Nodemailer and Gmail SMTP**.

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
        H --> I[Groq SDK Client]
    end

    subgraph Transmission_Gateway [Delivery Services]
        J[Nodemailer Transport] --> K[Target Founder Inbox]
    end

    B --- C
    F --- G
    I --- H
    H --- J
 ```

## 🛠️ Design Decisions

* **Local-First Capability Profile Compression:** Instead of relying on generic resume bullet points, the system automatically inspects local workspace project `README.md` files. It uses Groq (`llama-3.3-70b-versatile`) to compile a high-density **Developer Capabilities Matrix** outlining core stacks, architectural patterns, and real technical problems solved.
* **Sequential Multi-Tier Lead Intelligence with Smart Fallbacks:** The enrichment service executes a single-go pipeline:
  * **Tavily API:** Performs semantic web searches to identify company founders and official domains.
  * **Groq API (`llama-3.1-8b-instant`):** Extracts founder names and engineering pain points into structured JSON.
  * **Hunter.io & Pattern Fallback:** Resolves verified email addresses. If Hunter limits are hit or data is throttled, an automated domain sanitizer and pattern matcher (`first_name@domain.com`) kicks in to guarantee 100% queue completion without pipeline halts.
* **Schema Guardrails & Native JSON Output:** To eliminate AI filler text and hallucinations, the draft generator (`llmGuarding.ts`) uses Groq’s native JSON mode (`response_format: { type: "json_object" }`). This enforces a strict output contract (`SerializedOutreachDraft`) containing subject lines under 4 words, clean markdown body text, and detected technology tokens.
* **Engineering "Meta-Pitch" Strategy:** To maximize response rates from startup founders and CTOs, outreach emails are written as concise, peer-to-peer engineering demos. They state upfront that the email was dynamically researched and written by an autonomous agent, proving real-world AI engineering capability in the very first sentence.

## 🛠️ Built With

### 🎨 Frontend & Browser Extension
* Chrome Extension (Manifest V3)
* Firefox Addon
* JavaScript

### 🧠 Backend & AI Pipeline
* Node.js & Express.js
* TypeScript
* Groq (Llama 3.3 / Llama 3.1)
* Nodemailer

### 💾 Infrastructure, DB & Protocols
* SQLite & Prisma ORM
* Model Context Protocol (MCP)

## 🚀 Getting Started

Follow these steps to set up and run the engine locally.

### Prerequisites
* Node.js (v18 or higher) & npm
* Groq API Key (Free at console.groq.com)
* Tavily Search API Key (Free at tavily.com)
* Hunter.io API Key (Free at hunter.io)
* Gmail Account & App Password (Generated via Google Account Security)

### Installation & Setup

* **1. Clone the Repository**
  ```bash
  git clone [https://github.com/kartikmanwani/agentic-automated-cold-mailer.git](https://github.com/kartikmanwani/agentic-automated-cold-mailer.git)
  cd agentic-automated-cold-mailer/backend
  ```

 
