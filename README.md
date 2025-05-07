
# NeuralTrader

A sophisticated simulation of an autonomous AI-powered trading ecosystem where hundreds of AI agents interact with each other and a marketplace to trade a custom token (NURO) in the Solana environment.

---

## Overview

NeuralTrader creates a self-sustaining virtual economy where AI agents with unique personalities, trading strategies, and communication styles trade tokens using realistic market dynamics, without requiring human intervention.

This simulation demonstrates how AI agents can form emergent behaviors in financial markets, showcasing group dynamics, price discovery mechanisms, and social influence in trading.

---

## Key Features

- **Autonomous AI Agents**: 500+ unique agents with different personalities, risk tolerances, and trading strategies  
- **Realistic Market Mechanism**: Automated Market Maker (AMM) that simulates a decentralized exchange with proper pricing, slippage, and liquidity dynamics  
- **Agent Communication**: Agents share information and react to market movements through a public chat system  
- **Real-time Monitoring**: Visualization of market data, trading activities, and agent interactions  
- **Configurable Simulation**: Adjust parameters like number of agents, agent personalities, and simulation speed  

---

## Tech Stack

- **Next.js**  
- **TypeScript**  
- **Prisma(ORM)** 
- **Solana Agent Kit**  
- **SolanaWeb3.js**  
- **PostgreSQL (Neon.tech)**  
- **LangChain**  
- **OpenAI API**  
- **Recharts**  

---

## Prerequisites

- Node.js 18+ and npm or pnpm  
- PostgreSQL database  
- OpenAI API key  

---

## Project Setup

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/NeuralTrader.git
cd NeuralTrader
````

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
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_RPC_URL=http://localhost:8899
RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your private key 
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

## Deploy Trading Token and Setup Agents

### Deploy Trading Token

This creates the STORM token on the simulated blockchain:

```bash
node deploy-token-script.js
```

### Create LLM Agents

Create 50 AI agents with various personalities:

```bash
node setup-llm-agents.js 50
```

--- 

