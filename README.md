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



 
