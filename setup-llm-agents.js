// Setup script for NeuralTrader with LLM-powered agents
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Define personalities for the agents
const PERSONALITIES = {
  CONSERVATIVE: { 
    description: "Conservative trader who prefers stable assets and minimal risk", 
    percentage: 20,
    messageFrequency: 0.3,
    socialInfluence: 0.4,
    emotionalVolatility: 0.2,
    contraryOpinionRate: 0.2,
    technicalLanguageLevel: 0.5,
    riskTolerance: 0.2,
    tradeFrequency: 0.3
  },
  MODERATE: { 
    description: "Moderate trader who takes balanced approach to risk and reward", 
    percentage: 30,
    messageFrequency: 0.5,
    socialInfluence: 0.5,
    emotionalVolatility: 0.5,
    contraryOpinionRate: 0.3,
    technicalLanguageLevel: 0.5,
    riskTolerance: 0.5,
    tradeFrequency: 0.5
  },
  AGGRESSIVE: { 
    description: "Aggressive trader who seeks high returns and is willing to take risks", 
    percentage: 20,
    messageFrequency: 0.8,
    socialInfluence: 0.7,
    emotionalVolatility: 0.7,
    contraryOpinionRate: 0.4,
    technicalLanguageLevel: 0.5,
    riskTolerance: 0.9,
    tradeFrequency: 0.8
  },
  TREND_FOLLOWER: { 
    description: "Trend follower who follows market momentum", 
    percentage: 15,
    messageFrequency: 0.6,
    socialInfluence: 0.6,
    emotionalVolatility: 0.4,
    contraryOpinionRate: 0.2,
    technicalLanguageLevel: 0.7,
    riskTolerance: 0.6,
    tradeFrequency: 0.7
  },
  CONTRARIAN: { 
    description: "Contrarian who tends to go against market trends", 
    percentage: 15,
    messageFrequency: 0.6,
    socialInfluence: 0.5,
    emotionalVolatility: 0.5,
    contraryOpinionRate: 0.9,
    technicalLanguageLevel: 0.6,
    riskTolerance: 0.7,
    tradeFrequency: 0.6
  }
};

// Occupation types
const OCCUPATIONS = [
  "Full-time Trader",
  "Business Owner",
  "Financial Analyst",
  "Software Developer",
  "Crypto Researcher",
  "Student",
  "Blockchain Engineer",
  "Institutional Investor",
  "Retiree",
  "Day Trader"
];

// First name and last name options for generating agent names
const FIRST_NAMES = [
  "Alex", "Bailey", "Casey", "Dana", "Ellis", "Finley", "Gray", "Harper", 
  "Indigo", "Jordan", "Kennedy", "Logan", "Morgan", "Noah", "Parker", 
  "Quinn", "Riley", "Sage", "Taylor", "Uriel", "Vale", "Winter", "Xen", 
  "Yuval", "Zion", "Ash", "Blake", "Cameron", "Drew", "Emery"
];

const LAST_NAMES = [
  "Adams", "Brooks", "Cohen", "Davis", "Evans", "Foster", "Garcia", "Hayes", 
  "Ingram", "Jones", "Kim", "Lee", "Moss", "Nolan", "Ortiz", "Patel", 
  "Quinn", "Roberts", "Singh", "Taylor", "Ueda", "Vargas", "Wong", 
  "Xu", "Yamamoto", "Zhang", "Jefferson", "Washington", "Monroe", "Jackson"
];

// Generate a random name
function generateAgentName() {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${firstName} ${lastName}`;
}

// Generate a random personality type based on distributions
function generatePersonalityType() {
  const typesArray = [];
  Object.entries(PERSONALITIES).forEach(([type, info]) => {
    for (let i = 0; i < info.percentage; i++) {
      typesArray.push(type);
    }
  });
  return typesArray[Math.floor(Math.random() * typesArray.length)];
}

// Generate a random occupation
function generateOccupation() {
  return OCCUPATIONS[Math.floor(Math.random() * OCCUPATIONS.length)];
}

// Initialize the AMM pool
async function initializeAMM() {
  try {
    console.log('Setting up AMM pool...');
    
    // Check if pool already exists
    const existingPool = await prisma.poolState.findFirst({
      where: { id: 'main_pool' }
    });
    
    if (existingPool) {
      console.log('Pool already exists, updating...');
      // Update existing pool
      await prisma.poolState.update({
        where: { id: 'main_pool' },
        data: {
          solAmount: 10000,
          tokenAmount: 1000000,
          k: 10000 * 1000000,
          currentPrice: 0.01,
          tradingVolume: 0,
          tradingVolume24h: 0,
          highPrice24h: 0.01,
          lowPrice24h: 0.01,
          lastTradedAt: new Date(),
          priceHistory: JSON.stringify([]),
          trades: JSON.stringify([]),
          lastUpdated: new Date()
        }
      });
    } else {
      console.log('Creating new pool...');
      // Create new pool
      await prisma.poolState.create({
        data: {
          id: 'main_pool',
          solAmount: 10000,
          tokenAmount: 1000000,
          k: 10000 * 1000000,
          currentPrice: 0.01,
          tradingVolume: 0,
          tradingVolume24h: 0,
          highPrice24h: 0.01,
          lowPrice24h: 0.01,
          lastTradedAt: new Date(),
          priceHistory: JSON.stringify([]),
          trades: JSON.stringify([]),
          lastUpdated: new Date()
        }
      });
    }
    
    // Create initial market state
    await prisma.marketState.create({
      data: {
        price: 0.01,
        liquidity: 20000,
        volume24h: 0,
        transactions24h: 0,
        priceChange24h: 0,
        type: 'AMM',
        volatility: 0.05,
        data: {
          solReserve: 10000,
          tokenReserve: 1000000,
          price: 0.01
        },
        timestamp: new Date()
      }
    });
    
    // Create simulation stats record
    await prisma.simulationStats.upsert({
      where: { id: 'stats' },
      update: {
        totalAgents: 0,
        successfullyFunded: 0,
        failedToFund: 0,
        totalFunded: 0,
        personalityDistribution: {},
        occupationDistribution: {}
      },
      create: {
        id: 'stats',
        totalAgents: 0,
        successfullyFunded: 0,
        failedToFund: 0,
        totalFunded: 0,
        personalityDistribution: {},
        occupationDistribution: {}
      }
    });
    
    console.log('AMM pool setup completed successfully!');
    return true;
  } catch (error) {
    console.error('Error setting up AMM pool:', error);
    return false;
  }
}

// Create a test agent
async function createTestAgent() {
  try {
    // Generate random agent properties
    const name = generateAgentName();
    const personalityType = generatePersonalityType();
    const occupation = generateOccupation();
    const personality = PERSONALITIES[personalityType];
    
    // Generate a fake wallet
    const publicKey = `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const privateKey = `${Math.random().toString(36).substring(2, 30)}${Math.random().toString(36).substring(2, 30)}`;
    
    // Initial balance (1-10 SOL)
    const initialBalance = 1 + Math.random() * 9;
    
    console.log(`Creating agent: ${name} (${personalityType})`);
    
    // Create the agent
    const agent = await prisma.agent.create({
      data: {
        name,
        personalityType, 
        personality: personalityType,
        occupation,
        publicKey,
        walletPrivateKey: privateKey,
        walletBalance: initialBalance,
        tokenBalance: 0,
        active: true,
        messageFrequency: personality.messageFrequency,
        socialInfluence: personality.socialInfluence,
        emotionalVolatility: personality.emotionalVolatility,
        contraryOpinionRate: personality.contraryOpinionRate,
        technicalLanguageLevel: personality.technicalLanguageLevel,
        riskTolerance: personality.riskTolerance,
        tradeFrequency: personality.tradeFrequency,
        maxPositionSize: 0.3,
        // Create related records
        trading: {
          create: {
            totalTrades: 0,
            successfulTrades: 0,
            failedTrades: 0,
            profitLoss: 0
          }
        },
        state: {
          create: {
            lastAction: new Date(),
            state: { status: 'INITIALIZED' },
            contextData: JSON.stringify({
              history: [],
              initialBalance
            })
          }
        }
      }
    });
    
    console.log(`Created agent ${agent.name} with ${initialBalance.toFixed(2)} SOL`);
    return agent;
  } catch (error) {
    console.error('Error creating test agent:', error);
    return null;
  }
}

// Create multiple test agents
async function createTestAgents(count) {
  console.log(`Creating ${count} test agents...`);
  
  const personalityDistribution = {};
  const occupationDistribution = {};
  let totalFunded = 0;
  
  for (let i = 0; i < count; i++) {
    const agent = await createTestAgent();
    
    if (agent) {
      // Update distributions
      personalityDistribution[agent.personalityType] = (personalityDistribution[agent.personalityType] || 0) + 1;
      occupationDistribution[agent.occupation] = (occupationDistribution[agent.occupation] || 0) + 1;
      totalFunded += agent.walletBalance;
    }
    
    // Short delay between creations
    await new Promise(r => setTimeout(r, 100));
  }
  
  // Update simulation stats
  await prisma.simulationStats.upsert({
    where: { id: 'stats' },
    update: {
      totalAgents: count,
      successfullyFunded: count,
      failedToFund: 0,
      totalFunded,
      personalityDistribution,
      occupationDistribution,
      lastUpdated: new Date()
    },
    create: {
      id: 'stats',
      totalAgents: count,
      successfullyFunded: count,
      failedToFund: 0,
      totalFunded,
      personalityDistribution,
      occupationDistribution
    }
  });
  
  console.log('Agents created successfully!');
  return {
    totalAgents: count,
    personalityDistribution,
    occupationDistribution,
    totalFunded
  };
}

// Create an initial simulation
async function createSimulation() {
  try {
    // Check if a simulation already exists
    const existingSimulation = await prisma.simulation.findFirst({
      orderBy: { startedAt: 'desc' }
    });
    
    if (existingSimulation) {
      console.log('Simulation already exists, updating...');
      return await prisma.simulation.update({
        where: { id: existingSimulation.id },
        data: {
          status: 'READY',
          currentPhase: 'MARKET_ANALYSIS',
          startedAt: new Date(),
          configuration: {
            agentCount: await prisma.agent.count(),
            phaseDuration: 30000,
            speed: 1,
            maxAgentsPerPhase: 1000
          }
        }
      });
    } else {
      console.log('Creating new simulation...');
      return await prisma.simulation.create({
        data: {
          status: 'READY',
          currentPhase: 'MARKET_ANALYSIS',
          agentCount: await prisma.agent.count(),
          activeAgents: 0,
          startedAt: new Date(),
          configuration: {
            agentCount: await prisma.agent.count(),
            phaseDuration: 30000,
            speed: 1,
            maxAgentsPerPhase: 1000
          }
        }
      });
    }
  } catch (error) {
    console.error('Error creating simulation:', error);
    return null;
  }
}

// Main function
async function main() {
  console.log('Setting up NeuralTrader with LLM-powered agents...');
  
  // Initialize AMM
  console.log('\n=== Step 1: Initialize AMM Pool ===');
  const ammResult = await initializeAMM();
  if (!ammResult) {
    console.error('Failed to initialize AMM pool. Exiting.');
    process.exit(1);
  }
  
  // Create test agents
  console.log('\n=== Step 2: Create Test Agents ===');
  const numAgents = process.argv[2] ? parseInt(process.argv[2]) : 5;
  const agentsResult = await createTestAgents(numAgents);
  
  // Create simulation
  console.log('\n=== Step 3: Create Initial Simulation ===');
  const simulation = await createSimulation();
  if (simulation) {
    console.log(`Created simulation with ID: ${simulation.id}`);
  }
  
  console.log('\n=== Setup Complete! ===');
  console.log('You can now start the server with:');
  console.log('  npm run dev');
  console.log('\nVisit the monitoring dashboard at:');
  console.log('  http://localhost:3000/monitoring');
  console.log('\nTesting an individual agent:');
  console.log('  node test-llm-agent.js [optional-agent-id]');
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total agents: ${agentsResult.totalAgents}`);
  console.log(`Total SOL funded: ${agentsResult.totalFunded.toFixed(2)}`);
  console.log('Personality distribution:');
  Object.entries(agentsResult.personalityDistribution).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} (${(count/agentsResult.totalAgents*100).toFixed(1)}%)`);
  });
}

// Run setup
main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });