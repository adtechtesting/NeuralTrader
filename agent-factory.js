// agent-factory.js - Script to generate multiple agents and store them in the database
// This works with the Solana Agent Kit for blockchain interaction

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { Keypair, Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Ensure bs58 encoding/decoding is available
const encode = bs58.encode || (bs58.default && bs58.default.encode);
const decode = bs58.decode || (bs58.default && bs58.default.decode);

if (!encode || !decode) {
  console.error('bs58 encode/decode functions are not available. Please check your bs58 package.');
  process.exit(1);
}

// Load configuration from files
const tokenDetails = JSON.parse(fs.readFileSync('token-details.json', 'utf8'));
const funderAddress = tokenDetails.ownerAddress;
let funderPrivateKey = null;

// Try to load funder key from environment or file
if (process.env.FUNDER_PRIVATE_KEY) {
  funderPrivateKey = process.env.FUNDER_PRIVATE_KEY;
  console.log('Using funder key from environment variables');
} else if (fs.existsSync('./funder-key.json')) {
  try {
    funderPrivateKey = JSON.parse(fs.readFileSync('./funder-key.json', 'utf8')).privateKey;
    console.log('Using funder key from funder-key.json');
  } catch (error) {
    console.error('Error reading funder-key.json:', error);
  }
}

// Connect to Solana (local validator by default)
const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8899", "confirmed");

// Import personality definitions for the new system
const PERSONALITIES = {
  CONSERVATIVE: { 
    description: "Conservative trader who prefers stable assets and minimal risk", 
    percentage: 20, 
    maxFunding: 25, 
    minFunding: 5,
    // Communication preferences
    messageFrequency: 0.3,        // Posts less frequently
    socialInfluence: 0.4,         // Lower social influence
    emotionalVolatility: 0.2,     // Very stable emotions
    contraryOpinionRate: 0.2,     // Rarely disagrees with consensus
    technicalLanguageLevel: 0.5,  // Moderate technical language
    riskTolerance: 0.2,           // Very low risk tolerance
    tradeFrequency: 0.3           // Trades infrequently
  },
  MODERATE: { 
    description: "Moderate trader who takes balanced approach to risk and reward", 
    percentage: 30, 
    maxFunding: 30, 
    minFunding: 10,
    // Communication preferences
    messageFrequency: 0.5,        // Average posting frequency
    socialInfluence: 0.5,         // Moderate influence
    emotionalVolatility: 0.5,     // Moderate emotions
    contraryOpinionRate: 0.3,     // Sometimes contrarian
    technicalLanguageLevel: 0.5,  // Moderate technical language
    riskTolerance: 0.5,           // Medium risk tolerance
    tradeFrequency: 0.5           // Trades with medium frequency
  },
  AGGRESSIVE: { 
    description: "Aggressive trader who seeks high returns and is willing to take risks", 
    percentage: 20, 
    maxFunding: 50, 
    minFunding: 15,
    // Communication preferences
    messageFrequency: 0.8,        // Posts very frequently
    socialInfluence: 0.7,         // High social influence
    emotionalVolatility: 0.7,     // More emotional
    contraryOpinionRate: 0.4,     // Sometimes disagrees
    technicalLanguageLevel: 0.5,  // Moderate technical language
    riskTolerance: 0.9,           // High risk tolerance
    tradeFrequency: 0.8           // Trades frequently
  },
  TREND_FOLLOWER: { 
    description: "Trend follower who follows market momentum", 
    percentage: 15, 
    maxFunding: 40, 
    minFunding: 10,
    // Communication preferences
    messageFrequency: 0.6,        // Moderately frequent posts
    socialInfluence: 0.6,         // Moderate influence
    emotionalVolatility: 0.4,     // Less emotional
    contraryOpinionRate: 0.2,     // Follows consensus
    technicalLanguageLevel: 0.7,  // More technical language
    riskTolerance: 0.6,           // Medium-high risk tolerance
    tradeFrequency: 0.7           // Trades frequently when trends appear
  },
  CONTRARIAN: { 
    description: "Contrarian who tends to go against market trends", 
    percentage: 15, 
    maxFunding: 35, 
    minFunding: 15,
    // Communication preferences
    messageFrequency: 0.6,        // Moderately frequent posts
    socialInfluence: 0.5,         // Moderate influence
    emotionalVolatility: 0.5,     // Moderate emotions
    contraryOpinionRate: 0.9,     // Highly contrarian
    technicalLanguageLevel: 0.6,  // Moderate technical language
    riskTolerance: 0.7,           // Medium-high risk tolerance
    tradeFrequency: 0.6           // Moderate trade frequency
  }
};

// Occupation types and distributions
const OCCUPATIONS = {
  JOB_PROFESSIONAL: 10,
  BUSINESS_OWNER: 20,
  FULL_TIME_TRADER: 40,
  COLLEGE_STUDENT: 10,
  RETIREE: 10,
  INSTITUTIONAL: 5,
  INFLUENCER: 5,
};

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

// Generate a random occupation based on distributions
function generateOccupation() {
  const occupationsArray = [];
  Object.entries(OCCUPATIONS).forEach(([occupation, percentage]) => {
    for (let i = 0; i < percentage; i++) {
      occupationsArray.push(occupation);
    }
  });
  return occupationsArray[Math.floor(Math.random() * occupationsArray.length)];
}

// Generate a random funding amount based on personality
function generateFundingAmount(personalityType) {
  const { minFunding, maxFunding } = PERSONALITIES[personalityType];
  return minFunding + Math.random() * (maxFunding - minFunding);
}

// Generate a wallet for the agent
function generateWallet() {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toString();
  const privateKey = encode(keypair.secretKey);
  return { publicKey, privateKey };
}

// Store the NURO token in database if not already there
async function storeTokenInDB() {
  try {
    const existingToken = await prisma.token.findUnique({
      where: { mintAddress: tokenDetails.mintAddress }
    });
    
    if (existingToken) {
      console.log('Token already exists in the database');
      return existingToken;
    }
    
    const token = await prisma.token.create({
      data: {
        name: tokenDetails.name,
        symbol: tokenDetails.symbol,
        decimals: tokenDetails.decimals,
        mintAddress: tokenDetails.mintAddress
      }
    });
    
    console.log('Token stored in database');
    return token;
  } catch (error) {
    console.error('Error storing token in database:', error);
    throw error;
  }
}

// Fund an agent with SOL
async function fundAgent(recipientPublicKey, amountInSol) {
  try {
    if (!funderPrivateKey) {
      throw new Error("Funder private key not found");
    }
    
    // Convert base58 private key to Keypair
    const funderSecretKey = decode(funderPrivateKey);
    const funderKeypair = Keypair.fromSecretKey(funderSecretKey);
    
    console.log(`Funding ${recipientPublicKey} with ${amountInSol} SOL from ${funderKeypair.publicKey.toString()}`);
    
    // Get recent blockhash for transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    
    // Create transaction for SOL transfer
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: funderKeypair.publicKey,
        toPubkey: new PublicKey(recipientPublicKey),
        lamports: Math.floor(amountInSol * LAMPORTS_PER_SOL)
      })
    );
    
    // Set transaction properties
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = funderKeypair.publicKey;
    
    // Sign and send transaction
    const signature = await connection.sendTransaction(transaction, [funderKeypair]);
    
    // Wait for confirmation
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, "confirmed");
    
    console.log(`Funding successful with signature: ${signature}`);
    
    // Record transaction in database
    await prisma.transaction.create({
      data: {
        signature,
        amount: amountInSol,
        fromAgentId: null, // Funding transaction, no agent as source
        toAgentId: null, // Recipient will be set later
        status: 'CONFIRMED',
        type: 'funding',
        createdAt: new Date(),
        confirmedAt: new Date()
      }
    });
    
    return { success: true, signature, amount: amountInSol };
  } catch (error) {
    console.error(`Error funding agent ${recipientPublicKey}:`, error);
    
    // Record failed transaction in database
    try {
      await prisma.transaction.create({
        data: {
          signature: `failed_${Date.now()}`,
          amount: amountInSol,
          fromAgentId: null,
          toAgentId: null,
          status: 'FAILED',
          type: 'funding',
          createdAt: new Date()
        }
      });
    } catch (dbError) {
      console.error('Error recording failed transaction:', dbError);
    }
    
    return { success: false, error: error.message };
  }
}

// Initialize pool state in the database
async function initializePoolState() {
  try {
    // Check if pool already exists in the PoolState table
    const existingPool = await prisma.poolState.findUnique({
      where: { id: 'main_pool' }
    });
    
    if (existingPool) {
      console.log('AMM pool already initialized in database');
      return existingPool;
    }
    
    // Initial pool values
    const solAmount = 1000;       // 1000 SOL
    const tokenAmount = 1000000;  // 1,000,000 NURO tokens
    const initialPrice = solAmount / tokenAmount;
    const currentTime = Date.now();
    
    // Create initial pool state
    const pool = await prisma.poolState.create({
      data: {
        id: 'main_pool', // Use a consistent ID for the main pool
        solAmount: solAmount,
        tokenAmount: tokenAmount,
        k: solAmount * tokenAmount,
        currentPrice: initialPrice,
        tradingVolume: 0,
        tradingVolume24h: 0,
        highPrice24h: initialPrice,
        lowPrice24h: initialPrice,
        lastTradedAt: new Date(),
        lastUpdated: new Date(),
        priceHistory: JSON.stringify([{ 
          time: currentTime, 
          price: initialPrice 
        }]),
        trades: JSON.stringify([]),
        cacheVersion: 1
      }
    });
    
    // Also create market state entry for backward compatibility
    await prisma.marketState.create({
      data: {
        price: initialPrice,
        liquidity: solAmount,
        volume24h: 0,
        transactions24h: 0,
        priceChange24h: 0,
        volatility: 0.05,
        timestamp: new Date(),
        type: 'AMM',
        data: {
          solReserve: solAmount,
          tokenReserve: tokenAmount,
          k: solAmount * tokenAmount,
          lastPrice: initialPrice
        },
        cacheVersion: 1
      }
    });
    
    console.log(`AMM pool initialized with ${solAmount} SOL and ${tokenAmount} tokens`);
    console.log(`Initial price: ${initialPrice} SOL per token`);
    
    return pool;
  } catch (error) {
    console.error('Error initializing pool state:', error);
    throw error;
  }
}

// Generate multiple agents
async function generateAgents(count, options = {}) {
  console.log(`Generating ${count} agents...`);
  
  // Store the NURO token in database if not already there
  await storeTokenInDB();
  
  // Initialize AMM pool if not already done
  await initializePoolState();
  
  // Count existing agents
  const existingCount = await prisma.agent.count();
  console.log(`Database already has ${existingCount} agents`);
  
  // Check funder wallet balance
  try {
    const funderBalance = await connection.getBalance(new PublicKey(funderAddress)) / LAMPORTS_PER_SOL;
    console.log(`Funder wallet balance: ${funderBalance.toFixed(2)} SOL`);
    
    if (funderBalance < count * 5) {
      console.warn(`Warning: Funder balance may be too low for ${count} agents. Consider reducing the number.`);
      if (!options.forceContinue) {
        const readline = require('readline').createInterface({
          input: process.stdin, 
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          readline.question('Continue anyway? (y/n): ', resolve);
        });
        
        readline.close();
        
        if (answer.toLowerCase() !== 'y') {
          console.log('Aborting agent generation.');
          return;
        }
      }
    }
  } catch (error) {
    console.error('Error checking funder balance:', error);
  }
  
  // Processing in batches for better performance and error handling
  const batchSize = options.batchSize || 10; // Increased default batch size for speed
  let successfullyFunded = 0;
  let totalFunded = 0;
  let failedToFund = 0;
  const personalityDistribution = {};
  const occupationDistribution = {};
  
  console.log(`Processing in batches of ${batchSize}`);
  
  // Process in batches
  for (let i = 0; i < count; i += batchSize) {
    const currentBatchSize = Math.min(batchSize, count - i);
    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1} (${i + 1}-${i + currentBatchSize} of ${count})...`);
    
    // Create agents in this batch
    const agentPromises = [];
    
    for (let j = 0; j < currentBatchSize; j++) {
      const personalityType = generatePersonalityType();
      const occupation = generateOccupation();
      const wallet = generateWallet();
      const fundingAmount = generateFundingAmount(personalityType);
      
      // Get personality details
      const personalityInfo = PERSONALITIES[personalityType];
      
      // Add to promises array
      agentPromises.push(
        (async () => {
          try {
            // Fund the agent
            console.log(`Funding agent with ${fundingAmount.toFixed(2)} SOL...`);
            const fundingResult = await fundAgent(wallet.publicKey, fundingAmount);
            
            // Create the agent in the database
            const agent = await prisma.agent.create({
              data: {
                name: generateAgentName(), // Use name field which exists in DB
                personalityType,
                personality: personalityType, // Required by existing schema
                occupation,
                publicKey: wallet.publicKey, // Use publicKey field which exists in DB
                walletPrivateKey: wallet.privateKey,
                walletBalance: fundingResult.success ? fundingAmount : 0,
                tokenBalance: 0, // Initially no tokens
                targetFunding: fundingAmount,
                actualFunding: fundingResult.success ? fundingAmount : 0,
                fundingSuccess: fundingResult.success,
                fundingSignature: fundingResult.success ? fundingResult.signature : null,
                active: true,
                avatarUrl: `/avatars/${personalityType.toLowerCase()}_${Math.floor(Math.random() * 10)}.png`,
                createdAt: new Date(),
                updatedAt: new Date(),
                messageFrequency: personalityInfo.messageFrequency,
                socialInfluence: personalityInfo.socialInfluence,
                emotionalVolatility: personalityInfo.emotionalVolatility,
                riskTolerance: personalityInfo.riskTolerance,
                tradeFrequency: personalityInfo.tradeFrequency,
                maxPositionSize: 0.25,
                contraryOpinionRate: personalityInfo.contraryOpinionRate || 0.3,
                technicalLanguageLevel: 0.5,
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
                    lastMarketAnalysis: null,
                    lastTradeDecision: null,
                    lastSocialAction: null,
                    lastDecision: { type: 'INITIAL', timestamp: new Date().toISOString() },
                    state: { status: 'INITIALIZED' },
                    contextData: JSON.stringify({
                      history: [],
                      state: 'INITIALIZED',
                      initialBalance: fundingAmount,
                      creationTime: new Date().toISOString()
                    })
                  }
                }
              }
            });
            
            // Update stats
            personalityDistribution[personalityType] = (personalityDistribution[personalityType] || 0) + 1;
            occupationDistribution[occupation] = (occupationDistribution[occupation] || 0) + 1;
            
            if (fundingResult.success) {
              successfullyFunded++;
              totalFunded += fundingAmount;
              console.log(`✅ Agent ${agent.name} created and funded with ${fundingAmount.toFixed(2)} SOL`);
              return { success: true, agent };
            } else {
              failedToFund++;
              console.log(`⚠️ Agent ${agent.name} created but funding failed: ${fundingResult.error}`);
              return { success: false, agent, error: fundingResult.error };
            }
          } catch (error) {
            console.error('Error creating agent:', error);
            return { success: false, error: error.message };
          }
        })()
      );
      
      // Shorter delay between agent creations
      if (j < currentBatchSize - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Wait for all agents in this batch
    const results = await Promise.allSettled(agentPromises);
    
    console.log(`Batch complete: ${results.filter(r => r.status === 'fulfilled' && r.value.success).length} successful, ${results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length} failed`);
    
    // Update simulation stats
    await prisma.simulationStats.upsert({
      where: { id: 'stats' },
      update: {
        totalAgents: existingCount + i + currentBatchSize,
        successfullyFunded,
        failedToFund,
        totalFunded,
        personalityDistribution,
        occupationDistribution,
        lastUpdated: new Date()
      },
      create: {
        id: 'stats',
        totalAgents: existingCount + i + currentBatchSize,
        successfullyFunded,
        failedToFund,
        totalFunded,
        personalityDistribution,
        occupationDistribution
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'agents_created',
        actor: 'agent_factory',
        details: {
          batchSize: currentBatchSize,
          successCount: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
          failCount: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length,
          personalityDistribution
        },
        timestamp: new Date()
      }
    });
    
    // Wait between batches
    if (i + currentBatchSize < count) {
      const waitTime = 2000; // Reduced wait time
      console.log(`Waiting ${waitTime/1000} seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  console.log(`\n===== Agent Generation Summary =====`);
  console.log(`Total agents created: ${count}`);
  console.log(`Successfully funded: ${successfullyFunded} (${(successfullyFunded/count*100).toFixed(1)}%)`);
  console.log(`Failed to fund: ${failedToFund}`);
  console.log(`Total SOL funded: ${totalFunded.toFixed(2)}`);
  console.log(`Personality distribution:`, personalityDistribution);
  
  return {
    totalAgents: existingCount + count,
    newAgents: count,
    successfullyFunded,
    failedToFund,
    totalFunded,
    personalityDistribution,
    occupationDistribution
  };
}

// Main function
async function main() {
  try {
    // Check if funder key is available
    if (!funderPrivateKey) {
      console.log('Funder private key not found. Creating funder-key.json...');
      fs.writeFileSync('./funder-key.json', JSON.stringify({ 
        publicKey: funderAddress,
        privateKey: "" // User will need to manually add this
      }, null, 2));
      console.error('Please edit funder-key.json to add your private key, then run this script again.');
      return;
    }
    
    // Get agent count from command line
    const agentCount = process.argv[2] ? parseInt(process.argv[2]) : 10;
    
    // Get other options
    const forceContinue = process.argv.includes('--force');
    const batchSize = process.argv.includes('--batch') 
      ? parseInt(process.argv[process.argv.indexOf('--batch') + 1]) 
      : 10;
    
    const options = {
      forceContinue,
      batchSize
    };
    
    console.log(`Starting agent factory to create ${agentCount} agents...`);
    console.log(`Options: ${JSON.stringify(options)}`);
    
    // Generate the agents
    await generateAgents(agentCount, options);
    
    console.log("\nAgent generation complete!");
    console.log("You can now run the simulation with these agents.");
    
  } catch (error) {
    console.error('Error in agent factory:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Command line help
function showHelp() {
  console.log(`
Agent Factory - Create agents for NeuralTrader simulation

Usage:
  node agent-factory.js [count] [options]

Arguments:
  count                 Number of agents to create (default: 10)

Options:
  --force               Continue even if funder balance seems low
  --batch <size>        Number of agents to process in each batch (default: 10)
  --help                Display this help message
  --preset <name>       Use a preset config (balanced, aggressive, conservative)

Performance Tips:
  - Use larger batch sizes (20-50) for faster creation
  - Create agents in multiple smaller runs rather than one large run
  - Ensure your system has adequate memory for large agent counts
  - For 5000+ agents, run in batches of 1000

Examples:
  node agent-factory.js 100             Create 100 agents
  node agent-factory.js 50 --batch 20   Create 50 agents in batches of 20
  node agent-factory.js 5000 --force    Create 5000 agents even if balance is low
`);
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Run the factory
main();