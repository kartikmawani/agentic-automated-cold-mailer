 # Autonomous Agentic Cold Mailer

An autonomous technical analysis and outbound engineering pipeline designed to bridge the gap between developer capabilities and active technology startup needs. The system scans targets, extracts deep context, matches technical profiles to scaling blocks, and uses strict LLM tool guardrails to orchestrate highly personalized cold pitches.
 

## 🎬 Live Demo 
 ![Agentic Cold Mailer Demo]<img width="800" height="448" alt="AI_MAILER-ezgif com-video-to-gif-converter" src="https://github.com/user-attachments/assets/85a112ab-dbf5-4e71-b165-56716742eb72" />
## The Problem
Securing core engineering roles or specialized startup projects through traditional outreach is highly inefficient. Developers frequently struggle to:
* **Identify Active Engineering Pain Points:** Pinpointing the exact infrastructure struggles, technical debt, or framework bottlenecks a startup faces.
* **Avoid Generic Boilerplate:** Writing generic, copy-paste templates that founder inbox security layers immediately flag as spam.
* **Scale Contextual Outbound:** Researching team stacks, verifying inboxes, and mapping custom developer profiles takes hours per lead.

## The Solution
The Autonomous Agentic Cold Mailer acts as an automated **"Outreach Engine for Developers."** By routing processing queues through structured LLM validation layers, the system:
* Performs a **multi-source enrichment scan** of company and founder metadata.
* Evaluates **inbox validity and data confidence thresholds** to secure sender reputation.
* Synthesizes raw developer experience blueprints directly against the target's stack.
* Enforces **strict schema contracts via Groq / LLM Tool Schema** to output deterministic, isolated email assets.
* Dispatches native, high-deliverability plain-text messages using **Nodemailer and Gmail SMTP**.

---

## System Architecture

```mermaid
 flowchart LR

A[Target Company] --> B[Tavily Search]
B --> C[Groq Extraction]
C --> D[Hunter.io]
D --> E[Profile Enrichment]

F[README Analyzer] --> G[Capability Matrix]

E --> H[LLM Guardrails]
G --> H

H --> I[JSON Draft]
I --> J[Nodemailer]
J --> K[Founder Inbox]

L[(SQLite)]
L --> M[Prisma]
M --> E
 ```

## Design Decisions

* **Local-First Capability Profile Compression:** Instead of relying on generic resume bullet points, the system automatically inspects local workspace project `README.md` files. It uses Groq (`llama-3.3-70b-versatile`) to compile a high-density **Developer Capabilities Matrix** outlining core stacks, architectural patterns, and real technical problems solved.
* **Sequential Multi-Tier Lead Intelligence with Smart Fallbacks:** The enrichment service executes a single-go pipeline:
  * **Tavily API:** Performs semantic web searches to identify company founders and official domains.
  * **Groq API (`llama-3.1-8b-instant`):** Extracts founder names and engineering pain points into structured JSON.
  * **Hunter.io & Pattern Fallback:** Resolves verified email addresses. If Hunter limits are hit or data is throttled, an automated domain sanitizer and pattern matcher (`first_name@domain.com`) kicks in to guarantee 100% queue completion without pipeline halts.
* **Schema Guardrails & Native JSON Output:** To eliminate AI filler text and hallucinations, the draft generator (`llmGuarding.ts`) uses Groq’s native JSON mode (`response_format: { type: "json_object" }`). This enforces a strict output contract (`SerializedOutreachDraft`) containing subject lines under 4 words, clean markdown body text, and detected technology tokens.
* **Engineering "Meta-Pitch" Strategy:** To maximize response rates from startup founders and CTOs, outreach emails are written as concise, peer-to-peer engineering demos. They state upfront that the email was dynamically researched and written by an autonomous agent, proving real-world AI engineering capability in the very first sentence.

##  Built With
##  Frontend

![Chrome Extension](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
![Firefox Addon](https://img.shields.io/badge/Firefox-Addon-FF7139?style=for-the-badge&logo=firefoxbrowser&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

##  Backend & AI

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama%203.3%20%2F%203.1-F55036?style=for-the-badge&logo=groq&logoColor=white)
![Nodemailer](https://img.shields.io/badge/Nodemailer-009688?style=for-the-badge&logo=gmail&logoColor=white)

## Infrastructure & DB

![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Model Context Protocol](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-6C47FF?style=for-the-badge)

##  Getting Started

Follow these steps to set up and run the engine locally.

### Prerequisites
* Node.js (v18 or higher) & npm
* Groq API Key (Free at console.groq.com)
* Tavily Search API Key (Free at tavily.com)
* Hunter.io API Key (Free at hunter.io)
* Gmail Account & App Password (Generated via Google Account Security)

### Setup

* **1. Clone the Repository**
  ```bash
  git clone [https://github.com/kartikmanwani/agentic-automated-cold-mailer.git](https://github.com/kartikmanwani/agentic-automated-cold-mailer.git)
  cd agentic-automated-cold-mailer/backend
  npm install
  npm run build
  npm link
  ```
## 📦 Installation Guide

Choose the installation method that fits your workflow:

###  Install Globally via NPM (Recommended for Users)

If you simply want to run the tool globally on your system:

```bash
# Install globally from the official NPM registry
npm install -g agentic-cold-mailer
```

 
