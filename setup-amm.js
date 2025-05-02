// setup-amm.js
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Load token details
const tokenDetails = JSON.parse(fs.readFileSync('token-details.json', 'utf8'));

// Define pool parameters
const POOL_SOL = 1000;   // Initial SOL in the pool
const POOL_TOKEN = 1000000; // Initial Token in the pool (1M NURO)
const K = POOL_SOL * POOL_TOKEN; // Constant product

// Create initial AMM state
const initialState = {
  solAmount: POOL_SOL,
  tokenAmount: POOL_TOKEN,
  k: K,
  lastUpdated: new Date().toISOString(),
  tokenMint: tokenDetails.mintAddress,
  tokenSymbol: tokenDetails.symbol,
  initialPrice: POOL_SOL / POOL_TOKEN
};

// Save to file
fs.writeFileSync('amm-pool-state.json', JSON.stringify(initialState, null, 2));

// Initialize database with AMM pool
async function setupDatabase() {
  try {
    console.log('Setting up AMM pool in database...');
    
    // Create or update pool state
    await prisma.poolState.upsert({
      where: { id: 'main_pool' },
      update: {
        solAmount: POOL_SOL,
        tokenAmount: POOL_TOKEN, 
        k: K,
        currentPrice: POOL_SOL / POOL_TOKEN,
        tradingVolume: 0,
        tradingVolume24h: 0,
        priceHistory: JSON.stringify([]),
        trades: JSON.stringify([]),
        lastUpdated: new Date()
      },
      create: {
        id: 'main_pool',
        solAmount: POOL_SOL,
        tokenAmount: POOL_TOKEN,
        k: K,
        currentPrice: POOL_SOL / POOL_TOKEN,
        tradingVolume: 0,
        tradingVolume24h: 0,
        priceHistory: JSON.stringify([]),
        trades: JSON.stringify([]),
        lastUpdated: new Date()
      }
    });
    
    // Create market state record
    await prisma.marketState.create({
      data: {
        price: POOL_SOL / POOL_TOKEN,
        liquidity: POOL_SOL * 2,
        volume24h: 0,
        transactions24h: 0,
        priceChange24h: 0,
        volatility: 0.05,
        type: 'AMM',
        data: {
          solReserve: POOL_SOL,
          tokenReserve: POOL_TOKEN,
          price: POOL_SOL / POOL_TOKEN
        },
        timestamp: new Date()
      }
    });
    
    // Create statistics record
    await prisma.simulationStats.upsert({
      where: { id: 'stats' },
      update: {},
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
    
    console.log('Database setup completed');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup
setupDatabase()
  .then(() => {
    console.log(`AMM initialized with ${POOL_SOL} SOL and ${POOL_TOKEN} ${tokenDetails.symbol} tokens`);
    console.log(`Initial token price: ${initialState.initialPrice.toFixed(8)} SOL per ${tokenDetails.symbol}`);
    console.log(`Initial SOL price: ${(POOL_TOKEN / POOL_SOL).toFixed(2)} ${tokenDetails.symbol} per SOL`);
    console.log('AMM state saved to amm-pool-state.json and database');
  });
