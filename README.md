
# NeuralTrader

A sophisticated simulation of an autonomous AI-powered trading ecosystem where hundreds of LLM-powered AI agents interact,communicate with each other and marketplace to trade a custom token (NURO) in the Solana environment or decentralized marketplace.

---

## Overview

NeuralTrader creates a self-sustaining virtual economy where AI agents with unique personalities, trading strategies, and communication styles trade tokens using realistic market dynamics, without requiring human intervention.

This simulation demonstrates how AI agents can form emergent behaviors in financial markets, showcasing group dynamics, price discovery mechanisms, and social influence in trading.

---

## Live Demo  

- https://neural-trader.vercel.app/

---

## Problem ?
 
- Traditional simulators use hard-coded bots which do not adapt to new market conditions ,cannot communicate with other traders ,no social behaviors which results to fomo and emotional decision making in market.  
- In the market , human traders are very limited which struggles to large amount of data ,especially across multiple assets.
- Current AMM lacks social layers they just focus on how pool works but they fail to capture how news spread accross a market or sentiment shifts 

---

## Solution Why NeuralTrader

- It not just a bot based market simulator It's ecosystem where large number of ai agents built with LangChain which will trade a NURO custom token on decentralized exchange built on on-chain AMM simulation.
- Market decision will based on market signals ,agent communication.
- Each agent have different personality , behavior ,risk profile and strategy 
- Agents communicate, learn, and evolve strategies using LangChain reasoning + OpenAI LLMs, forming a dynamic, self-adjusting market. 
- All actions happen on-chain using the Solana Agent Kit: simulated liquidity pool behavior , fast transactions ,market-sentiment-informed decision making


NeuralTrader is more than just a simulation — it's a sandbox for the future of DeFi. A place where intelligent agents evolve, influence one another, and drive real economic behavior in a programmable financial world.
It's a step toward AI-native trading protocols and autonomous crypto economies.

---

## Key Features

- **Autonomous AI Agents**: 500+ unique agents with different personalities, risk tolerances, and trading strategies  
- **Realistic Market Mechanism**: Automated Market Maker (AMM) that simulates a decentralized exchange with proper pricing, slippage, and liquidity dynamics  
- **Agent Communication**: Agents share information and react to market movements through a public chat system  
- **Real-time Monitoring**: Visualization of market data, trading activities, and agent interactions  
- **Configurable Simulation**: Adjust parameters like number of agents, agent personalities, and simulation speed  
- **Agent-Test/Create**:Connect Solana wallet and Create a test ai agent or request airdop in Devnet mode and  actively working on enabling agent creation using different LLM providers

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
- **recharts**  

---

## Prerequisites

- Node.js 
- OpenAI API key  

---

## Project Setup

### 1. Clone the repository

```bash
git clone https://github.com/Anantdadhich/NeuralTrader.git
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

## Deploy Trading token ans Setup AI Agents

### Deploy Trading Token

This creates the NURO token on the simulated blockchain:

```bash
node deploy-token-script.js
```

### Create LLM Agents

Create 50 AI agents with various personalities:

```bash
node setup-llm-agents.js 50   
```

--- 

## ScreenShots 
  - https://github.com/Anantdadhich/NeuralTrader/tree/main/screenshots

    As you see how the market changes in the ss below, due to openai api limits and costs it caused errors now but to run(locally) you can use your openai api key and simulate with market analysis in solana environment.
    ![alt text](screenshots/data.png)
    ![alt text](screenshots/data2.png)

---

## Future Reference 

NeuralTrader is currently running in a local simulation mode, using the Solana Agent Kit and OpenAI API to power autonomous trading of the custom NURO token  .

Due to OpenAI API rate limits and associated costs, the mainnet deployment is on hold. Once better API access is available, we plan to fully deploy the simulation to Solana mainnet, enabling real token trades and deeper agent interactions and To run this project simulation, you need an OpenAI API key.

Also users will be able to create AI agents using different LLM providers (such as OpenAI, Gemini, Claude, etc.), making the ecosystem more modular and extensible based on the user's preference or performance of the model.

This project was built for Solana Breakout, and further development is ongoing to expand agent intelligence, real market integration, and research-grade analytics and solving so many issues still happening .
 
---

## Contributing

Contributors are most welcome  To get started:

Fork the repository

Create a new branch 

Install dependencies and implement your changes

Submit a Pull Request 

---

## Built By

- **Adtech**

