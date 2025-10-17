// Test script for LLM-powered agents
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ChatOpenAI } = require('@langchain/openai');

// Simplified test script since we can't directly import the TypeScript files

// Function to get selected token
async function getSelectedToken() {
  try {
    const config = await prisma.simulationConfig.findUnique({
      where: { key: 'selected_token' }
    });
    
    if (config && config.value) {
      return JSON.parse(config.value);
    }
    
    // Default to SOL if no token selected
    return {
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      name: 'Solana'
    };
  } catch (error) {
    console.log('Could not fetch selected token, using SOL');
    return {
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      name: 'Solana'
    };
  }
}

// Function to test an agent with the OpenAI API
async function testAgentWithLLM(agentId) {
  try {
    console.log(`\n=== Testing GPT-4 integration with agent ID: ${agentId} ===`);
    
    // Get selected token
    const selectedToken = await getSelectedToken();
    const tokenSymbol = selectedToken.symbol || 'TOKEN';
    console.log(`Using token: ${tokenSymbol}`);
    
    // Get agent data
    const agentData = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { state: true }
    });
    
    if (!agentData) {
      console.error(`Agent with ID ${agentId} not found.`);
      return false;
    }
    
    console.log(`Found agent: ${agentData.name} (${agentData.personalityType})`);
    
    // Initialize LangChain ChatOpenAI
    const llm = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || "gpt-4",
      temperature: 0.7,
    });
    
    // Create market analysis prompt
    const marketAnalysisPrompt = `
You are ${agentData.name}, a ${agentData.personalityType.toLowerCase()} trader on the Solana blockchain.
You have a balance of ${agentData.walletBalance || 0} SOL and ${agentData.tokenBalance || 0} ${tokenSymbol} tokens.

The current market conditions are:
- ${tokenSymbol} token price: 0.01 SOL
- 24h price change: +3.5%
- 24h trading volume: 5000 SOL
- Market sentiment: 60% bullish, 30% bearish, 10% neutral

Based on these conditions and your personality as a ${agentData.personalityType} trader, analyze the market and share your thoughts.
`;

    console.log(`\n> Testing market analysis with ${process.env.OPENAI_MODEL || 'gpt-4'}...`);
    
    // Call GPT-4
    const marketAnalysisResponse = await llm.invoke(marketAnalysisPrompt);
    console.log(`\n> Market Analysis Response:`);
    console.log(marketAnalysisResponse.content);
    
    // Save the decision to agent state
    await prisma.agentState.update({
      where: { agentId: agentData.id },
      data: {
        lastMarketAnalysis: new Date(),
        lastAction: new Date(),
        lastDecision: {
          type: 'MARKET_ANALYSIS',
          timestamp: new Date().toISOString(),
          data: {
            analysis: marketAnalysisResponse.content
          }
        }
      }
    });
    
    // Social interaction prompt
    const socialPrompt = `
You are ${agentData.name}, a ${agentData.personalityType.toLowerCase()} trader on the Solana blockchain.

Recent messages from other traders:
1. Market Bot (SYSTEM): "${tokenSymbol} token has seen increased volatility today."
2. Alex Smith (AGGRESSIVE): "I'm buying more ${tokenSymbol} tokens. Price is going to spike soon!"
3. Jamie Lee (CONSERVATIVE): "Too much risk in the market today. I'm holding for now."

Current market sentiment is 60% bullish, 30% bearish, 10% neutral.

Based on these messages and your personality as a ${agentData.personalityType} trader, would you like to respond to the chat? If yes, compose a message that reflects your trading style and perspective on the current market.
`;

    console.log(`\n> Testing social interaction...`);
    const socialResponse = await llm.invoke(socialPrompt);
    console.log(`\n> Social Interaction Response:`);
    console.log(socialResponse.content);
    
    // Save the social decision
    await prisma.agentState.update({
      where: { agentId: agentData.id },
      data: {
        lastSocialAction: new Date(),
        lastAction: new Date(),
        lastDecision: {
          type: 'SOCIAL',
          timestamp: new Date().toISOString(),
          data: {
            response: socialResponse.content
          }
        }
      }
    });
    
    // Trading decision prompt
    const tradingPrompt = `
You are ${agentData.name}, a ${agentData.personalityType.toLowerCase()} trader on the Solana blockchain.

Your current balances:
- SOL: ${agentData.walletBalance || 0} SOL
- ${tokenSymbol} tokens: ${agentData.tokenBalance || 0} ${tokenSymbol}

Current market conditions:
- ${tokenSymbol} token price: 0.01 SOL
- 24h price change: +3.5%
- 24h trading volume: 5000 SOL
- Liquidity: 20000 SOL

Based on your balance, the market conditions, and your trading style as a ${agentData.personalityType} trader, decide if you want to:

1. Buy ${tokenSymbol} tokens with SOL
2. Sell ${tokenSymbol} tokens for SOL
3. Hold your current position

If you decide to trade, specify exactly how much you want to buy or sell, and explain your reasoning.
`;

    console.log(`\n> Testing trading decision...`);
    const tradingResponse = await llm.invoke(tradingPrompt);
    console.log(`\n> Trading Decision Response:`);
    console.log(tradingResponse.content);
    
    // Save the trading decision
    await prisma.agentState.update({
      where: { agentId: agentData.id },
      data: {
        lastTradeDecision: new Date(),
        lastAction: new Date(),
        lastDecision: {
          type: 'TRADE',
          timestamp: new Date().toISOString(),
          data: {
            decision: tradingResponse.content
          }
        }
      }
    });
    
    // Check if the agent wants to trade
    const decisionText = tradingResponse.content;
    
    // Analyze for trading intent
    const buyMatch = decisionText.match(/buy\s+(\d+(\.\d+)?)\s+(sol|tokens)/i);
    const sellMatch = decisionText.match(/sell\s+(\d+(\.\d+)?)\s+(sol|tokens)/i);
    
    if (buyMatch) {
      console.log(`\n> Agent wants to BUY: ${buyMatch[1]} ${buyMatch[3]}`);
    } else if (sellMatch) {
      console.log(`\n> Agent wants to SELL: ${sellMatch[1]} ${sellMatch[3]}`);
    } else if (decisionText.toLowerCase().includes('hold')) {
      console.log(`\n> Agent has decided to HOLD current position`);
    } else {
      console.log(`\n> No clear trading decision detected`);
    }
    
    console.log("\n> Test completed successfully!");
    return true;
  } catch (error) {
    console.error("Error testing agent with LLM:", error);
    console.error(error.stack);
    return false;
  }
}

// Get the agent ID from command line or use the first agent from database
async function main() {
  try {
    let agentId = process.argv[2];
    
    // If no agent ID provided, get the first agent from database
    if (!agentId) {
      const firstAgent = await prisma.agent.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      
      if (firstAgent) {
        agentId = firstAgent.id;
        console.log(`Using the most recently created agent: ${firstAgent.name} (${firstAgent.id})`);
      } else {
        console.error("No agents found in the database. Please create agents first or provide an agent ID.");
        process.exit(1);
      }
    }
    
    // Test the agent
    await testAgentWithLLM(agentId);
  } catch (error) {
    console.error("Error in main function:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
main();