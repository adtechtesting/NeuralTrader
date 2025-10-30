# NeuralTrader

A sophisticated simulation of an autonomous AI-powered trading ecosystem where 100+ of LLM-powered AI agents interact and communicate with each other and the marketplace to trade a  tokens in the Solana environment or decentralized marketplace.

---

## Overview

NeuralTrader creates a self-sustaining virtual economy where AI agents with diverse personalities, trading strategies, and communication styles trade tokens on Solana — all without requiring human intervention.

This simulation demonstrates how AI agents can form emergent behaviors in financial markets, showcasing group dynamics, price discovery mechanisms, and social influence in trading.

---

## Live Demo

* [https://neuraltrader.vercel.app/](https://neuraltrader.vercel.app/)

* [Demo (YouTube)](https://www.youtube.com/watch?v=Lnkh2iFqRb8) 

---

## Problem

* **Before**: Traditional simulators used hard-coded bots that didn’t adapt to market conditions, couldn’t communicate, and lacked social behaviors.
* **Before**: Human traders struggled with large amounts of data across multiple assets.
* **Before**: No agent interaction or social trading layer with different personalities and strategies.

---

## Solution - Why NeuralTrader

NeuralTrader transforms traditional simulations into a living, autonomous trading ecosystem —
where hundreds of AI agents, powered by ASI Alliance + LangChain + Groq, reason, debate, and trade in real time on Solana.

- Autonomous Intelligence: Each agent is self-governing, reasoning with LLMs, and communicating through ASI:One chat protocol.

- Social Market Layer: Agents influence each other through discussions and sentiment shifts, mimicking real market psychology.

- Decentralized Trading Simulation: Agents use Jupiter API and Solana Agent Kit to create and trade within simulated liquidity pools.

- Emergent Behavior: Market trends form naturally from agent interaction — not predefined logic.

- Agentverse Ready: All agents can be deployed, tracked, and discovered via the ASI Agentverse registry.

- Knowledge-Enhanced Reasoning:  Optional MeTTa Knowledge Graph for context‑aware decisions.

🧠 NeuralTrader is more than a simulator — it’s a glimpse into the future of decentralized, autonomous financial systems.

---

## Key Features

* **🤖 Autonomous AI Agents**: 100+ agents spawned via scripts with configurable personalities, behaviors, and balance allocations.
* **Token Selection Workflow**: Choose any token via Jupiter API, then agents launch a SOL + token liquidity pool and trade against it for realistic price impact.
* **📊 Realistic Market Mechanism**: Custom AMM replicates DEX mechanics—pricing, slippage, pool rebalancing, and constant-product maths.
* **💬 Advanced Agent Communication**: Personality-aware social layer where agents broadcast insights, banter, and sentiment cues before trading.
* **📈 Real-time Monitoring**: Candlesticks, liquidity charts, sentiment gauges, and transaction feeds update continuously.
* **⚙️ Configurable Simulation**: Tune agent counts, personality mix, rate limits, liquidity, and simulation cadence from the dashboard.
* **🔧 Agent Creation**: Provision agents via Solana wallet scripts (Devnet) with optional ASI Agentverse enrollment.
* **🧠 Multi-LLM Support**: Mix Groq, ASI:One, OpenAI, and Ollama models per agent or phase for resilience.
* **🎭 Personality System**: 10+ distinct archetypes (Aggressive, Whale, Fundamental, Technical, etc.) with bespoke prompts and risk rules.
* **🔄 Tool Integration**: Strict schema enforcement for market analysis, send_message, and execute_swap tools keeps agents reliable.

NeuralTrader is built in collaboration with the ASI Alliance ecosystem — leveraging ASI:One for agent communication, the Agentverse registry for deployment, and optional MeTTa Knowledge Graph integration for reasoning enhancement. This ensures full compliance with Fetch.ai Innovation Lab and ASI challenge standards  


For more visit notion link. 
 [Notion](https://www.notion.so/NeuralTrader-1f40e6ce809b80fc80ebf2e08677770f?source=copy_link)  

---

## Innovation Lab Agent Directory for Hackathon Submission

![tag](https://img.shields.io/badge/innovationlab-3D8BD3)
![tag](https://img.shields.io/badge/hackathon-5F43F1)

Agent created on **ASI Agentverse Profile** — you can visit it below:

* **Agent Name:** NeuralTrader
* **Agent Address:** `agent1qgcnuxzu3nwe4mrgseqf084vcmejhjz0lrq5vfxwsl6p44t7vy74c4er20p`

[![tag](https://img.shields.io/badge/visit-agentverse.ai-blue)](https://agentverse.ai/agents/details/agent1qgcnuxzu3nwe4mrgseqf084vcmejhjz0lrq5vfxwsl6p44t7vy74c4er20p/profile)

---

## Tech Stack

* **Next.js** – React framework for the web interface
* **TypeScript** – Type-safe JavaScript development
* **Prisma (ORM)** – Database management and migrations
* **Solana Agent Kit** – Blockchain integration and trading automation
* **Jupiter API** – Token discovery, quotes, and liquidity references
* **PostgreSQL (Neon.tech)** – Cloud database hosting
* **LangChain** – LLM orchestration and tool management
* **Groq API** – Primary high-throughput LLM provider
* **ASI:One / Agentverse** – ASI Innovation Lab agents for reasoning + social skills 
* **OpenAI & Ollama (optional)** – Additional LLM backends per agent profile
* **Recharts** – Real-time data visualizations

---

## Prerequisites

* Node.js 18+
* Groq API key (default LLM provider)
* ASI Agentverse API key (for Innovation Lab agents)
* PostgreSQL database (Neon.tech recommended)
* Optional: OpenAI API key or Ollama for additional LLM flavours

---

## Project Setup

### 1. Clone the repository

```bash
git clone https://github.com/Anantdadhich/NeuralTrader.git
cd NeuralTrader
```

### 2. Install dependencies

```bash
pnpm install
# or
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
DATABASE_URL=postgresql://..........
GROQ_API_KEY=your_groq_api_key_here
NEXT_PUBLIC_RPC_URL=http://localhost:8899
RPC_URL=https://api.devnet.solana.com

# Optional: Enable real blockchain integration
USE_REAL_BLOCKCHAIN=false
AGENTVERSE_API_KEY=
AGENTVERSE_URL=
METTA_KNOWLEDGE_GRAPH_URL=
METTA_API_KEY=
```

---

## Database Setup with Prisma

### Generate Prisma client

```bash
npx prisma generate
npx prisma db push
```

### Create initial database structure

```bash
npx prisma migrate dev --name init
```

---

## Future Reference

NeuralTrader currently operates in an enhanced simulation, using Solana Agent Kit, Jupiter routing, Groq, and ASI Agentverse agents to drive autonomous trading of selected tokens.

**Ongoing Development:**

* End-to-end mainnet trading with real liquidity provisioning
* Additional multi-LLM profiles (OpenAI, Claude, Gemini) for specialised personas
* Advanced analytics and research-grade market metrics
* Reinforcement learning loops for agent evolution
* ML-driven trade forecasting and risk hedging modules

To run this project locally, you need at minimum a Groq API key and ASI Agentverse credentials.

---

## Built By

* **Adtech**

---

### Built for the **Solana CypherHunk Hackathon**
