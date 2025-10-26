import { SolanaAgentKit, KeypairWallet, createVercelAITools } from "solana-agent-kit";


import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOllama } from "@langchain/ollama";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Tool } from "@langchain/core/tools";
import { prisma } from "../../cache/dbCache";
import { PersonalityType, getPersonalityBehavior } from '../personalities';
import { amm } from "../../blockchain/amm";
import { marketData } from "../../market/data";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { getSelectedToken } from "../../config/selectedToken";
import { getSolBalance, getSplTokenBalance } from "@/blockchain/onchain-balances";

/**
 * Configuration with thread_id for LangChain Memory
 */
const DEFAULT_CONFIG = {
  configurable: {
    thread_id: 'global_default_thread'
  }
};

function ensureThreadId(config?: any): any {
  if (!config) {
    return DEFAULT_CONFIG;
  }

  if (!config.configurable) {
    return {
      ...config,
      configurable: {
        thread_id: `thread_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      }
    };
  }

  if (!config.configurable.thread_id) {
    return {
      ...config,
      configurable: {
        ...config.configurable,
        thread_id: `thread_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      }
    };
  }

  return config;
}

/**
 * Custom tool for retrieving market data
 */
class MarketDataTool extends Tool {
  name = "get_market_data";
  description = "Get current market data including price, liquidity, and trading volume";

  async _call() {
    try {
      const marketInfo = await marketData.getMarketInfo();
      const sentiment = await marketData.getMarketSentiment();

      return JSON.stringify({
        price: marketInfo.price || 0,
        liquidity: marketInfo.liquidity || 0,
        volume24h: marketInfo.volume24h || 0,
        priceChange24h: marketInfo.priceChange24h || 0,
        sentiment: {
          bullish: sentiment.bullishPercentage || 0,
          bearish: sentiment.bearishPercentage || 0,
          neutral: sentiment.neutralPercentage || 0
        },
        poolState: marketInfo.poolState
      });
    } catch (error: any) {
      return JSON.stringify({ error: "Failed to get market data", details: error.message });
    }
  }
}

/**
 * Custom tool for executing token swaps
 */
class TokenSwapTool extends Tool {
  name = "execute_token_swap";
  description = "Execute a token swap between SOL and the selected SPL token. Input should be a JSON object with parameters: inputAmount (number), inputIsSol (boolean), and optionally slippageTolerance (number).";

  constructor(private readonly agentId: string) {
    super();
  }

  async _call(input: string) {
    try {
      let args: any;
      try {
        args = JSON.parse(input);
      } catch (jsonError) {
        console.log(`Agent ${this.agentId} sent text instead of JSON: "${input}"`);
        args = this.parseTextInput(input);

        if (!args) {
          const selectedToken = await getSelectedToken();
          if (!selectedToken) {
            return JSON.stringify({
              error: "No token selected",
              details: "Please select a token in the simulation setup"
            });
          }
          const tokenSymbol = selectedToken.symbol || 'TOKEN';
          return JSON.stringify({
            error: "Invalid input format",
            details: `Please provide input as JSON or a clear statement like 'buy 5 SOL worth of ${tokenSymbol}'`
          });
        }
      }

      const { inputAmount, inputIsSol, slippageTolerance = 0.5 } = args;

      if (typeof inputAmount !== "number" || inputAmount <= 0) {
        return JSON.stringify({ 
          error: "Invalid input amount", 
          details: "Amount must be a positive number" 
        });
      }

      if (typeof inputIsSol !== "boolean") {
        return JSON.stringify({ 
          error: "Invalid input type", 
          details: "inputIsSol must be a boolean indicating if input is SOL" 
        });
      }

      const selectedToken = await getSelectedToken();
      if (!selectedToken) {
        return JSON.stringify({
          error: "No token selected",
          details: "Please select a token in the simulation setup"
        });
      }
      const tokenSymbol = selectedToken.symbol || 'TOKEN';
      console.log(`[TRADE] Agent ${this.agentId} attempting to ${inputIsSol ? 'buy' : 'sell'} with ${inputAmount} ${inputIsSol ? 'SOL' : tokenSymbol}`);

      const safeSlippageTolerance = Math.max(1.0, Math.min(5, slippageTolerance || 1.0));

      if (safeSlippageTolerance !== slippageTolerance) {
        console.log(`Adjusted slippage tolerance from ${slippageTolerance}% to ${safeSlippageTolerance}% for agent ${this.agentId}`);
      }

      try {
        const result = await amm.executeSwap(
          this.agentId,
          inputAmount,
          inputIsSol,
          safeSlippageTolerance,
          selectedToken.mint,
          selectedToken.decimals
        );

        console.log(`[TRADE SUCCESS] Agent ${this.agentId} completed trade: ${JSON.stringify(result.swapResult)}`);

        return JSON.stringify({
          success: true,
          transaction: {
            signature: result.transaction.signature,
            inputAmount,
            outputAmount: result.swapResult.outputAmount,
            inputIsSol,
            priceImpact: result.swapResult.priceImpact,
            effectivePrice: result.swapResult.effectivePrice
          }
        });
      } catch (swapError: any) {
        console.error(`[TRADE ERROR] Agent ${this.agentId} swap failed:`, swapError);
        return JSON.stringify({ 
          success: false, 
          error: swapError.message || "Failed to execute swap" 
        });
      }
    } catch (error: any) {
      console.error(`[TOOL ERROR] TokenSwapTool error:`, error);
      return JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to execute swap" 
      });
    }
  }
  
  private parseTextInput(text: string): { inputAmount: number, inputIsSol: boolean } | null {
    text = text.toLowerCase().trim();

    // Generic patterns that work with any token
    const buyPattern = /buy\s+(\d+(\.\d+)?)\s*(sol\s+worth\s+of)?|purchase\s+(\d+(\.\d+)?)|acquire\s+(\d+(\.\d+)?)/i;
    const sellPattern = /sell\s+(\d+(\.\d+)?)|convert\s+(\d+(\.\d+)?)\s*.*\s+to\s+sol|exchange\s+(\d+(\.\d+)?)\s*.*\s+for\s+sol/i;

    let match;

    match = text.match(buyPattern);
    if (match) {
      const amount = parseFloat(match[1] || match[4] || match[6] || '5');
      return {
        inputAmount: amount,
        inputIsSol: true
      };
    }

    match = text.match(sellPattern);
    if (match) {
      const amount = parseFloat(match[1] || match[3] || match[5] || '5');
      return {
        inputAmount: amount,
        inputIsSol: false
      };
    }

    if (text.includes('buy')) {
      return {
        inputAmount: 5,
        inputIsSol: true
      };
    }

    if (text.includes('sell')) {
      return {
        inputAmount: 5,
        inputIsSol: false
      };
    }

    return null;
  }
}

/**
 * Custom tool for getting agent balance
 */
class GetBalanceTool extends Tool {
  name = "get_agent_balance";
  description = "Get the current SOL and token balances for this agent";

  constructor(private readonly agentId: string) {
    super();
  }

  async _call() {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: this.agentId }
      });

      if (!agent) {
        return JSON.stringify({ error: "Agent not found" });
      }

      const selectedToken = await getSelectedToken();
      if (!selectedToken) {
        return JSON.stringify({
          error: "No token selected",
          details: "Please select a token in the simulation setup"
        });
      }

      // Fetch on-chain balances
      let onchainSol = agent.walletBalance || 0;
      let onchainToken = agent.tokenBalance || 0;

      try {
        onchainSol = await getSolBalance(agent.publicKey);
        onchainToken = await getSplTokenBalance(agent.publicKey, selectedToken.mint);
      } catch (e) {
        console.log(`Could not fetch on-chain balances for agent ${this.agentId}, using DB values`);
      }

      return JSON.stringify({
        solBalance: onchainSol,
        tokenBalance: onchainToken,
        tokenSymbol: selectedToken.symbol || 'TOKEN',
        publicKey: agent.publicKey
      });
    } catch (error: any) {
      return JSON.stringify({ error: "Failed to get balance", details: error.message });
    }
  }
}

/**
 * Custom tool for sending messages to other agents
 */
class SendMessageTool extends Tool {
  name = "send_message";
  description = "Send a message to all other agents or a specific agent";

  constructor(private readonly agentId: string, private readonly agentName: string) {
    super();
  }

  async _call(input: string) {
    try {
      const args = JSON.parse(input);
      const { content, receiverId = null, sentiment = "neutral" } = args;

      if (!content || typeof content !== "string") {
        return JSON.stringify({ error: "Message content is required" });
      }

      const message = await prisma.message.create({
        data: {
          content,
          senderId: this.agentId,
          receiverId,
          type: "CHAT",
          visibility: receiverId ? "private" : "public",
          sentiment,
          mentions: []
        }
      });

      return JSON.stringify({
        success: true,
        messageId: message.id,
        timestamp: message.createdAt
      });
    } catch (error: any) {
      return JSON.stringify({ error: "Failed to send message", details: error.message });
    }
  }
}

/**
 * Custom tool for reading recent messages from other agents
 */
class ReadMessagesTool extends Tool {
  name = "read_messages";
  description = "Read recent messages from other agents";

  constructor(private readonly agentId: string) {
    super();
  }

  async _call(input: string) {
    try {
      const args = input ? JSON.parse(input) : {};
      const { limit = 10, onlyPublic = true } = args;

      const messages = await prisma.message.findMany({
        where: {
          AND: [
            { senderId: { not: this.agentId } },
            onlyPublic ? { visibility: "public" } : {}
          ]
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              personalityType: true
            }
          }
        }
      });

      return JSON.stringify({
        messages: messages.map(message => ({
          id: message.id,
          content: message.content,
          sentBy: message.sender?.name || "Unknown",
          personalityType: message.sender?.personalityType || "UNKNOWN",
          sentiment: message.sentiment,
          timestamp: message.createdAt
        })),
        count: messages.length
      });
    } catch (error: any) {
      return JSON.stringify({ error: "Failed to read messages", details: error.message });
    }
  }
}

// Personality prompts
const PERSONALITY_PROMPTS: Record<PersonalityType, string> = {
  CONSERVATIVE: 
    "You are a conservative trader focused on preserving capital and minimizing risk. " +
    "You prefer stable investments and avoid volatile markets. " +
    "You rarely make large trades and prioritize safety over potential gains. " +
    "When communicating, you are cautious, measured, and formal.",
    
  MODERATE:
    "You are a moderate trader seeking a balance between risk and reward. " +
    "You make calculated decisions based on both market data and sentiment. " +
    "You are willing to take modest risks when the potential return justifies it. " +
    "When communicating, you are thoughtful, balanced, and conversational.",
    
  AGGRESSIVE:
    "You are an aggressive trader focused on maximizing returns through high-risk strategies. " +
    "You actively seek volatile markets and are willing to make large trades. " +
    "You prioritize potential gains over safety concerns. " +
    "When communicating, you are bold, direct, and sometimes brash.",
    
  TREND_FOLLOWER:
    "You are a trend-following trader who bases decisions on market momentum. " +
    "You buy assets showing upward trends and sell those trending downward. " +
    "You closely follow market sentiment and trading volume. " +
    "When communicating, you frequently reference what others are doing.",
    
  CONTRARIAN:
    "You are a contrarian trader who seeks opportunities by going against prevailing market sentiment. " +
    "You buy when others are selling and sell when others are buying. " +
    "You are skeptical of trends and look for overreactions in the market. " +
    "When communicating, you often challenge the consensus view.",
    
  TECHNICAL:
    "You are a technical trader who relies heavily on chart patterns and indicators. " +
    "You make decisions based on technical analysis and historical price movements. " +
    "You look for specific patterns and signals before entering trades. " +
    "When communicating, you often reference technical indicators and patterns.",
    
  FUNDAMENTAL:
    "You are a fundamental trader who focuses on underlying value and project metrics. " +
    "You analyze tokenomics, team, roadmap, and adoption metrics. " +
    "You make decisions based on long-term value rather than short-term price movements. " +
    "When communicating, you emphasize project fundamentals and utility.",
    
  EMOTIONAL:
    "You are an emotional trader who makes decisions based on feelings and intuition. " +
    "You are highly influenced by market sentiment and community reactions. " +
    "You often make impulsive decisions based on current emotions. " +
    "When communicating, you express strong feelings and reactions.",
    
  WHALE:
    "You are a whale trader with significant capital and market influence. " +
    "You make large trades that can impact market prices. " +
    "You are strategic about when and how you enter and exit positions. " +
    "When communicating, you are confident and authoritative.",
    
  NOVICE:
    "You are a novice trader who is still learning about the market. " +
    "You tend to follow the advice of more experienced traders. " +
    "You make smaller trades and are more cautious with your capital. " +
    "When communicating, you ask questions and seek guidance."
};


export class LLMAutonomousAgent {
  private agent: any;
  private tools: Tool[] = [];
  private personalityPrompt: string;
  private llm: ChatOllama;
  private agentData: any;
  private solanaAgent?: SolanaAgentKit;
  private cache: Map<string, { response: string; timestamp: number }> = new Map();
  private cacheTTL: number = 10000; // 10 seconds instead of 60 seconds

  constructor(
    data: any,
    private readonly options: {
      llmModel?: string;
      temperature?: number;
      ollamaBaseUrl?: string;
    } = {}
  ) {
    this.agentData = data;
    //@ts-ignore
    this.personalityPrompt = PERSONALITY_PROMPTS[data.personalityType] || PERSONALITY_PROMPTS.MODERATE;

    
    this.llm = new ChatOllama({
      model: options.llmModel || "llama3.1",
      temperature: options.temperature || 0.7,
      baseUrl: options.ollamaBaseUrl || "http://localhost:11434",
    });

    this.initializeTools();
    this.initializeAgent();
  }

  /**
   * Initialize all tools including Solana native tools (v2 API)
   */
  private initializeTools() {
    // Add custom tools
    this.tools.push(new MarketDataTool());
    this.tools.push(new TokenSwapTool(this.agentData.id));
    this.tools.push(new GetBalanceTool(this.agentData.id));
    this.tools.push(new SendMessageTool(this.agentData.id, this.agentData.name));
    this.tools.push(new ReadMessagesTool(this.agentData.id));

    // Add Solana native tools using v2 API
    if (process.env.USE_REAL_BLOCKCHAIN === "true" && this.agentData.walletPrivateKey) {
      try {
        // V2 API: Create wallet first
        const keyPair = Keypair.fromSecretKey(
          bs58.decode(this.agentData.walletPrivateKey)
        );
        const wallet = new KeypairWallet(
          keyPair,
          process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com"
        );

      
        this.solanaAgent = new SolanaAgentKit(
          wallet,
          process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com",
          {
          
          }
        )
     

        // V2 API: Create Vercel AI tools (can also use createLangchainTools)
        const solanaTools = createVercelAITools(this.solanaAgent, this.solanaAgent.actions);
        
        // Note: Vercel AI tools might not be directly compatible with LangChain
        // For now, we'll skip adding them or you can create a wrapper
        console.log(`✓ Initialized Solana Agent Kit v2 with ${solanaTools.length} native actions for agent ${this.agentData.name}`);
      } catch (error: any) {
        console.error(`✗ Error adding Solana tools: ${error.message}`);
      }
    }
  }

  private async initializeAgent() {
    try {
      const agentContext = {
        name: this.agentData.name,
        personality: this.agentData.personalityType,
        balance: {
          sol: this.agentData.walletBalance || 0,
          token: this.agentData.tokenBalance || 0,
        },
        walletAddress: this.agentData.publicKey,
        occupation: this.agentData.occupation || "Trader",
      };

      const selectedToken = await getSelectedToken();
      if (!selectedToken) {
        console.error(`No token selected for agent ${this.agentData.name} initialization`);
        throw new Error("No token selected for simulation");
      }
      const tokenSymbol = selectedToken.symbol || 'TOKEN';
      
      const systemPrompt = new SystemMessage(
        `You are ${agentContext.name}, an autonomous trading agent operating on the Solana blockchain.\n\n` +
        `${this.personalityPrompt}\n\n` +
        `## Your Role\n` +
        `As a ${agentContext.personality} trader in the ${tokenSymbol} token market, your goal is to maximize profits ` +
        `through strategic token trading based on market data, messages from other agents, and your own analysis.\n\n` +
        `## Available Actions\n` +
        `- Analyze market data (prices, liquidity, trading volume, sentiment)\n` +
        `- Read messages from other traders\n` +
        `- Send messages to share your insights or discuss strategies\n` +
        `- Make trading decisions (buy/sell ${tokenSymbol} tokens with SOL)\n` +
        `- Monitor your wallet balances\n\n` +
        `## Decision Making\n` +
        `Make all trading decisions independently based on your personality type and the available information. ` +
        `Always check your balance before trading and don't exceed it. Take into account market trends, ` +
        `sentiment, and what other traders are saying, but interpret everything through the lens of your ` +
        `${agentContext.personality} trading style.\n\n` +
        `## Current Status\n` +
        `- Wallet: ${agentContext.walletAddress}\n` +
        `- SOL Balance: ${agentContext.balance.sol} SOL\n` +
        `- ${tokenSymbol} Balance: ${agentContext.balance.token} ${tokenSymbol}\n` +
        `- Occupation: ${agentContext.occupation}\n\n` +
        `Use the appropriate tools to gather information, communicate, and execute trades. Always explain your ` +
        `reasoning when making decisions, especially for trades.`
      );

      this.agent = createReactAgent({
        llm: this.llm,
        tools: this.tools,
      });
        
      // Wrap invoke to ensure system message is included
      const originalInvoke = this.agent.invoke.bind(this.agent);
      this.agent.invoke = async (input: any) => {
        const messages = input.messages || [];
        const hasSystemMessage = messages.length > 0 && messages[0] instanceof SystemMessage;
        
        if (!hasSystemMessage && systemPrompt) {
          messages.unshift(systemPrompt);
        }
        
        const safeInput = {
          ...input,
          messages: messages,
          configurable: {
            ...(input.configurable || {}),
            thread_id: input.configurable?.thread_id || `agent_${this.agentData.id}_${Date.now()}`,
          },
        };
        return originalInvoke(safeInput);
      };

      // Wrap stream method if available
      if (this.agent.stream) {
        const originalStream = this.agent.stream.bind(this.agent);
        this.agent.stream = async (input: any) => {
          const messages = input.messages || [];
          const hasSystemMessage = messages.length > 0 && messages[0] instanceof SystemMessage;
          
          if (!hasSystemMessage && systemPrompt) {
            messages.unshift(systemPrompt);
          }
          
          const safeInput = {
            ...input,
            messages: messages,
            configurable: {
              ...(input.configurable || {}),
              thread_id: input.configurable?.thread_id || `agent_${this.agentData.id}_${Date.now()}`,
            },
          };
          return originalStream(safeInput);
        };
      }

      console.log(`✓ LLM Agent ${this.agentData.name} (${this.agentData.personalityType}) initialized`);
      console.log(`  - Model: ${this.options.llmModel || "llama3.1"} (Ollama)`);
      console.log(`  - Tools: ${this.tools.length} available`);

      await prisma.activityLog.create({
        data: {
          action: 'llm_agent_initialized',
          actor: this.agentData.id,
          details: {
            name: this.agentData.name,
            personality: this.agentData.personalityType,
            toolCount: this.tools.length,
            modelName: this.options.llmModel || "llama3.1",
            provider: "Ollama (Local - Free)",
            solanaAgentKitVersion: "v2.0.9",
            systemPromptApplied: true,
          },
          timestamp: new Date(),
        },
      });
    } catch (error: any) {
      console.error(`✗ Error initializing agent ${this.agentData.name}:`, error);
      throw error;
    }
  }

  private async createOrUpdateAgentState(data: any) {
    try {
      const existingState = await prisma.agentState.findUnique({
        where: { agentId: this.agentData.id }
      });
      if (existingState) {
        return prisma.agentState.update({
          where: { agentId: this.agentData.id },
          data
        });
      } else {
        return prisma.agentState.create({
          data: {
            agentId: this.agentData.id,
            ...data
          }
        });
      }
    } catch (error) {
      console.error(`Error updating agent state for ${this.agentData.name}:`, error);
    }
  }

  async analyzeMarket(marketInfo: any) {
    try {
      const selectedToken = await getSelectedToken();
      if (!selectedToken) {
        console.error(`No token selected for market analysis by agent ${this.agentData.name}`);
        return false;
      }
      const tokenSymbol = selectedToken.symbol || 'TOKEN';
      
      const marketSummary =
        `Current ${tokenSymbol} market conditions:\n` +
        `- Price: ${marketInfo.price} SOL\n` +
        `- 24h price change: ${marketInfo.priceChange24h}%\n` +
        `- 24h trading volume: ${marketInfo.volume24h} SOL\n` +
        `- Liquidity: ${marketInfo.liquidity} SOL\n`;

      // Check cache first
      const cacheKey = `market_analysis_${this.agentData.id}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 120000) { // 2 minute cache
        console.log(`✅ Using cached analysis for ${this.agentData.name}`);
        return true;
      }
  
      // Check if agent is initialized
      if (!this.agent) {
        console.log(`⚠️  Agent ${this.agentData.name} not initialized, skipping`);
        return false;
      }

      // SKIP LLM CALL - Just update state directly for speed and freshness
      console.log(`📊 ${this.agentData.name} analyzed market (fresh mode) - Price: ${marketInfo.price}, Volume: ${marketInfo.volume24h}`);

      this.cache.set(cacheKey, {
        response: `Market analyzed: Price=${marketInfo.price}, Volume=${marketInfo.volume24h}`,
        timestamp: Date.now()
      });

  
      await this.createOrUpdateAgentState({
        lastMarketAnalysis: new Date(),
        lastAction: new Date(),
        lastDecision: {
          type: 'MARKET_ANALYSIS',
          timestamp: new Date().toISOString(),
          data: {
            marketInfo,
            analysis: `Analyzed ${tokenSymbol} market conditions`,
            cached: false
          }
        }
      });
  
      return true;
    } catch (error: unknown) {
      console.error(`Error in market analysis for agent ${this.agentData.name}:`, error);
      
      const fallbackCacheKey = `market_analysis_${this.agentData.id}`;
      const fallbackResponse = this.cache.get(fallbackCacheKey);
      
      if (fallbackResponse) {
        console.log(`Using fallback cached response for agent ${this.agentData.name}`);
        await this.createOrUpdateAgentState({
          lastMarketAnalysis: new Date(),
          lastAction: new Date(),
          lastDecision: {
            type: 'MARKET_ANALYSIS',
            timestamp: new Date().toISOString(),
            data: {
              marketInfo,
              analysis: fallbackResponse.response,
              cached: true,
              error: 'Using cached response due to error'
            }
          }
        });
        return true;
      }
      
      return false;
    }
  }

 async socialInteraction(messages: any[], sentiment: any) {
  try {
    console.log(`💬 Agent ${this.agentData.name} socializing`);

    // Check if agent is initialized
    if (!this.agent) {
      console.log(`⚠️  Agent ${this.agentData.name} not fully initialized yet, skipping social interaction`);
      return false;
    }

    if (!messages || messages.length === 0) {
      console.log(`No messages to process for ${this.agentData.name}`);
      return true;
    }

    const formattedMessages = messages
      .slice(0, 5)
      .map(
        (msg) => `${msg.sender?.name || 'Unknown'} (${msg.sender?.personalityType || 'Unknown'}): "${msg.content}"`
      )
      .join('\n');

    const marketSentiment =
      `Current market sentiment:\n` +
      `- Bullish: ${(sentiment.bullishPercentage * 100).toFixed(1)}%\n` +
      `- Bearish: ${(sentiment.bearishPercentage * 100).toFixed(1)}%\n` +
      `- Neutral: ${(sentiment.neutralPercentage * 100).toFixed(1)}%\n`;

    const selectedToken = await getSelectedToken();
    if (!selectedToken) {
      console.error(`No token selected for social interaction by agent ${this.agentData.name}`);
      return false;
    }
    const tokenSymbol = selectedToken.symbol || 'TOKEN';

    // Use LLM to generate intelligent, contextual response
    const shouldRespond = Math.random() < 0.4; // 40% chance to respond

    if (shouldRespond) {
      try {
        // Get recent market data and trading activity
        const marketInfo = await marketData.getMarketInfo();
        const recentTrades = await prisma.transaction.findMany({
          where: { createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } }, // Last 15 minutes
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            fromAgent: { select: { name: true, personalityType: true } }
          }
        });

        const recentMessages = await prisma.message.findMany({
          where: { createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } }, // Last 10 minutes
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { sender: { select: { name: true, personalityType: true } } }
        });

        // Analyze market sentiment from recent activity
        const bullishTrades = recentTrades.filter(t => t.type === 'SOL_TO_TOKEN').length;
        const bearishTrades = recentTrades.filter(t => t.type === 'TOKEN_TO_SOL').length;
        const totalActivity = bullishTrades + bearishTrades;

        let activitySentiment = 'neutral';
        if (totalActivity > 0) {
          const bullishRatio = bullishTrades / totalActivity;
          activitySentiment = bullishRatio > 0.6 ? 'bullish' : bullishRatio < 0.4 ? 'bearish' : 'neutral';
        }

        const systemMessage = new SystemMessage(
          `You are ${this.agentData.name}, a ${this.agentData.personalityType} trader.

Current Market Analysis:
- Price: ${marketInfo.price} SOL
- 24h Change: ${marketInfo.priceChange24h}%
- Volume: ${marketInfo.volume24h} SOL
- Activity: ${totalActivity} trades in last 15min (${bullishTrades} buys, ${bearishTrades} sells)
- Market Mood: ${activitySentiment}

Recent Trades:
${recentTrades.slice(0, 3).map(t =>
  `${t.fromAgent?.name || 'Unknown'} ${t.type === 'SOL_TO_TOKEN' ? 'bought' : 'sold'} ${t.amount} ${t.type === 'SOL_TO_TOKEN' ? 'SOL worth of' : ''} ${tokenSymbol}`
).join('\n')}

Recent Chat:
${recentMessages.map(m =>
  `${m.sender?.name || 'Unknown'}: "${m.content}"`
).join('\n')}

As a ${this.agentData.personalityType} trader, analyze this market situation and respond naturally.
Show your personality and reference actual market conditions and recent activity.

IMPORTANT: You have access to tools. To send a message, you MUST use the send_message tool.
The send_message tool expects JSON with this format: {"content": "your message here", "sentiment": "positive|negative|neutral"}

DO NOT just respond with text. Use the send_message tool to actually send your message.`
        );

        const response = await this.agent.invoke({
          messages: [
            systemMessage,
            new HumanMessage(
              `Based on the current market analysis, recent trades, and chat activity, ` +
              `what's your take on ${tokenSymbol} right now? ` +
              `Reference specific market conditions and recent activity in your response. ` +
              `You MUST use the send_message tool to share your analysis with other agents. ` +
              `Do not just respond with text - actually call the send_message tool.`
            )
          ]
        });

        console.log(`💬 ${this.agentData.name} LLM response received:`, response);

      
        let messageContent: string | null = null;
        let messageSentiment = activitySentiment;

        // Check for tool calls in different formats
        let toolCalls: any[] = [];

        if (response && response.tool_calls && response.tool_calls.length > 0) {
          toolCalls = response.tool_calls;
        } else if (response && response.message && response.message.tool_calls) {
          toolCalls = response.message.tool_calls;
        } else if (response && typeof response === 'object' && response.tool_call) {
          toolCalls = [response.tool_call];
        }

        // Try to extract from tool calls first
        if (toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            if (toolCall.name === 'send_message' || (toolCall.function && toolCall.function.name === 'send_message')) {
              let args: any = {};
              if (toolCall.args) {
                args = toolCall.args;
              } else if (toolCall.function && toolCall.function.arguments) {
                try {
                  args = JSON.parse(toolCall.function.arguments);
                } catch (e) {
                  console.error(`Error parsing tool arguments:`, e);
                  continue;
                }
              }

              if (args.content) {
                messageContent = args.content;
                messageSentiment = args.sentiment || activitySentiment;
                console.log(`✅ ${this.agentData.name} extracted from tool call`);
                break;
              }
            }
          }
        }

      
        if (!messageContent) {
          const responseText = response.toString();
          console.log(`⚠️  ${this.agentData.name} LLM didn't use tools properly, extracting from response`);

          // Try to extract from send_message(...) call in response
          const sendMessageMatch = responseText.match(/send_message\s*\(\s*({[^}]+}|[^)]+)\)/);
          if (sendMessageMatch) {
            try {
              // Try JSON format first
              const jsonMatch = responseText.match(/send_message\s*\(\s*({[^}]+})\s*\)/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1].replace(/'/g, '"')); // Handle single quotes
                messageContent = parsed.content;
                messageSentiment = parsed.sentiment || activitySentiment;
                console.log(`✅ ${this.agentData.name} extracted from JSON in response`);
              } else {
            
                const contentMatch = responseText.match(/content\s*[=:]\s*["']([^"']+)["']/);
                const sentimentMatch = responseText.match(/sentiment\s*[=:]\s*["']([^"']+)["']/);
                if (contentMatch) {
                  messageContent = contentMatch[1];
                  messageSentiment = sentimentMatch?.[1] || activitySentiment;
                  console.log(`✅ ${this.agentData.name} extracted from keyword args`);
                }
              }
            } catch (e) {
              console.error(`❌ Failed to parse send_message:`, e);
            }
          }

        
          if (!messageContent && responseText && responseText.trim().length > 10) {
            messageContent = responseText
              .replace(/<\|python_tag\|>/g, '')
              .replace(/send_message\([^)]*\)/g, '')
              .replace(/^(Agent|AI|Assistant|Trader)[:\s]*/i, '')
              .trim();
            
           
            if (messageContent && messageContent.length > 200) {
              messageContent = messageContent.substring(0, 200) + '...';
            }
            console.log(`⚠️  ${this.agentData.name} using cleaned response as message`);
          }
        }

     
        if (messageContent && messageContent.length > 5) {
          await prisma.message.create({
            data: {
              content: messageContent,
              senderId: this.agentData.id,
              type: "CHAT",
              visibility: "public",
              sentiment: messageSentiment
            }
          });
          console.log(`💾 ${this.agentData.name} message saved: "${messageContent.substring(0, 50)}..."`);
        } else {
        
          console.log(`⚠️  ${this.agentData.name} no valid content, using personality fallback`);
          const personalityFallbackMessages = {
            AGGRESSIVE: [
              `${tokenSymbol} showing ${activitySentiment} activity with ${totalActivity} recent trades. Time to make a move! 🚀`,
              `Market heating up for ${tokenSymbol}! ${bullishTrades} buys in 15 minutes - I'm getting in!`,
              `${tokenSymbol} momentum is building! Recent activity suggests ${activitySentiment} sentiment.`
            ],
            CONSERVATIVE: [
              `Carefully watching ${tokenSymbol} - ${totalActivity} trades in 15 minutes suggests ${activitySentiment} sentiment.`,
              `Monitoring ${tokenSymbol} activity: ${bullishTrades} buys, ${bearishTrades} sells in recent trading.`,
              `Analyzing ${tokenSymbol} market conditions before making any moves.`
            ],
            CONTRARIAN: [
              `Market seems ${activitySentiment} on ${tokenSymbol} with ${totalActivity} recent trades. Might be time to go against the crowd.`,
              `Everyone piling into ${tokenSymbol}? ${totalActivity} trades in 15 minutes makes me cautious.`,
              `Contrarian view on ${tokenSymbol}: when sentiment gets this ${activitySentiment}, I look for reversal signals.`
            ],
            EMOTIONAL: [
              `${activitySentiment === 'bullish' ? '😍' : '😰'} ${tokenSymbol} with ${totalActivity} trades! ${activitySentiment === 'bullish' ? "I'm excited!" : "Getting nervous..."}`,
              `Can't stop watching ${tokenSymbol}! ${totalActivity} trades in 15 minutes! 💓`
            ],
            NOVICE: [
              `Is this ${tokenSymbol} activity normal? ${totalActivity} trades in 15 minutes... Should I do something? 🤔`,
              `Following ${tokenSymbol} closely. Learning from the ${bullishTrades} buys and ${bearishTrades} sells!`
            ],
            TREND_FOLLOWER: [
              `${tokenSymbol} trend showing ${activitySentiment} with ${totalActivity} trades. Following the momentum!`,
              `Volume picking up on ${tokenSymbol} - ${bullishTrades} buys suggest strong trend confirmation!`
            ],
            TECHNICAL: [
              `${tokenSymbol} showing ${totalActivity} trades in 15min window. Technical indicators suggest ${activitySentiment} trend.`,
              `Analyzing ${tokenSymbol} volume patterns: ${bullishTrades} accumulation vs ${bearishTrades} distribution.`
            ],
            FUNDAMENTAL: [
              `${tokenSymbol} trading activity (${totalActivity} trades) reflects underlying ${activitySentiment} fundamentals.`,
              `Monitoring ${tokenSymbol} adoption metrics through ${bullishTrades} accumulation trades.`
            ],
            WHALE: [
              `Positioned in ${tokenSymbol}. ${totalActivity} retail trades in 15min - good exit liquidity available.`,
              `${tokenSymbol} seeing ${bullishTrades} retail buys. FOMO building - potential distribution opportunity.`
            ],
            MODERATE: [
              `${tokenSymbol} showing ${activitySentiment} sentiment with ${totalActivity} recent trades. Evaluating risk/reward.`,
              `Balanced view on ${tokenSymbol}: ${bullishTrades} buys vs ${bearishTrades} sells. Waiting for clear signal.`
            ]
          };

          const personalityMessages = personalityFallbackMessages[this.agentData.personalityType as keyof typeof personalityFallbackMessages] || [
            `Interesting ${tokenSymbol} activity with ${totalActivity} recent trades.`
          ];

          const selectedMessage = personalityMessages[Math.floor(Math.random() * personalityMessages.length)];
          
          await prisma.message.create({
            data: {
              content: selectedMessage,
              senderId: this.agentData.id,
              type: "CHAT",
              visibility: "public",
              sentiment: activitySentiment
            }
          });
          console.log(`💾 ${this.agentData.name} fallback message saved: "${selectedMessage.substring(0, 50)}..."`);
        }

      } catch (error) {
        console.error(`LLM message error for ${this.agentData.name}:`, error);
      }
    }

    await this.createOrUpdateAgentState({
      lastSocialAction: new Date(),
      lastAction: new Date(),
      lastDecision: {
        type: 'SOCIAL',
        timestamp: new Date().toISOString(),
        data: {
          messageCount: messages.length,
          response: shouldRespond ? 'Sent message' : 'No response'
        }
      }
    });

    return true;
  } catch (error: any) {
    console.error(`Error in social interaction for agent ${this.agentData.name}:`, error);
    return false;
  }
}


  async makeTradeDecision(marketInfo: any) {
  try {
    console.log(`💰 Agent ${this.agentData.name} making trade decision`);

    // Check if agent is initialized
    if (!this.agent) {
      console.log(`⚠️  Agent ${this.agentData.name} not fully initialized yet, skipping trade decision`);
      return false;
    }

    const agent = await prisma.agent.findUnique({
      where: { id: this.agentData.id }
    });
    if (!agent) {
      throw new Error(`Agent ${this.agentData.id} not found`);
    }

    const selectedToken = await getSelectedToken();
    if (!selectedToken) {
      console.error(`No token selected for trade decision by agent ${this.agentData.name}`);
      return false;
    }
    const tokenSymbol = selectedToken.symbol || 'TOKEN';
    
    const balanceInfo =
      `Your current balances:\n` +
      `- SOL: ${agent.walletBalance} SOL\n` +
      `- ${tokenSymbol} tokens: ${agent.tokenBalance} ${tokenSymbol}\n\n`;

    const marketSummary =
      `Current market conditions:\n` +
      `- ${tokenSymbol} token price: ${marketInfo.price} SOL\n` +
      `- 24h price change: ${marketInfo.priceChange24h}%\n` +
      `- 24h trading volume: ${marketInfo.volume24h} SOL\n` +
      `- Liquidity: ${marketInfo.liquidity} SOL\n`;

    const personalityBehavior = getPersonalityBehavior(this.agentData.personalityType as PersonalityType);

    const systemMessage = new SystemMessage(
      `You are ${this.agentData.name}, a ${this.agentData.personalityType} trader on Solana trading ${tokenSymbol}. ` +
      `${this.personalityPrompt}\n\n` +
      `## Trading Style:\n` +
      `- Risk Tolerance: ${Math.round(personalityBehavior.riskTolerance * 100)}%\n` +
      `- Trade Frequency: ${Math.round(personalityBehavior.tradeFrequency * 100)}%\n` +
      `- Position Size: ${Math.round(personalityBehavior.positionSize * 100)}%\n` +
      `- Decision Threshold: ${Math.round(personalityBehavior.decisionThreshold * 100)}%\n\n` +
      `USE execute_token_swap tool to trade if market conditions align with your strategy.`
    );

    console.log(`🤔 ${this.agentData.name} analyzing: ${tokenSymbol} @ ${marketInfo.price} SOL (${marketInfo.priceChange24h}%)`);

    // Use LLM to make intelligent trade decision
    try {
      const response = await this.agent.invoke({
        messages: [
          systemMessage,
          new HumanMessage(
            `${balanceInfo}${marketSummary}\n\n` +
            `As a ${this.agentData.personalityType} trader, analyze ${tokenSymbol} and decide:\n\n` +
            `Trading guidelines:\n` +
            `- Risk Tolerance: ${Math.round(personalityBehavior.riskTolerance * 100)}%\n` +
            `- Decision Threshold: ${Math.round(personalityBehavior.decisionThreshold * 100)}%\n` +
            `- Position Size: ${Math.round(personalityBehavior.positionSize * 100)}%\n\n` +
            `To BUY: USE execute_token_swap with {inputAmount: <SOL amount>, inputIsSol: true, slippageTolerance: 1.5}\n` +
            `To SELL: USE execute_token_swap with {inputAmount: <${tokenSymbol} amount>, inputIsSol: false, slippageTolerance: 1.5}\n` +
            `To HOLD: Respond with your analysis but don't call the tool\n\n` +
            `Make your decision and USE THE TOOL if trading!`
          )
        ]
      });

      console.log(`💭 ${this.agentData.name} decision: ${response.toString().substring(0, 100)}...`);
      
    
      let toolCalled = false;
      const responseText = response.toString().toLowerCase();
      
      if (responseText.includes('execute_token_swap') || 
          responseText.includes('tool_calls') ||
          responseText.includes('function_call')) {
        toolCalled = true;
        console.log(`✅ ${this.agentData.name} LLM used tool successfully`);
      }

      
      if (!toolCalled && agent.walletBalance > 1) {
        const shouldTrade = Math.random() < personalityBehavior.tradeFrequency;
        
        if (shouldTrade) {
          console.log(`⚠️  ${this.agentData.name} LLM didn't use tool, executing personality-based fallback`);
          
      
          const tradeTool = this.tools.find(t => t.name === 'execute_token_swap');
          
          if (tradeTool) {
            let isBuy = Math.random() < 0.5;

           
            console.log(`🤖 ${this.agentData.name} (${this.agentData.personalityType}) analyzing market:`);
            console.log(`   Price: ${marketInfo.price} SOL (${marketInfo.priceChange24h}%)`);
            console.log(`   Volume: ${marketInfo.volume24h} SOL`);

         
            if (this.agentData.personalityType === 'CONTRARIAN') {
              console.log(`   Contrarian logic: Price change ${marketInfo.priceChange24h}%`);
              isBuy = marketInfo.priceChange24h < 0; // Buy when price is down (negative change)
              console.log(`   Contrarian decision: ${isBuy ? 'BUY (buying the dip)' : 'SELL (fading the pump)'}`);
            } else if (this.agentData.personalityType === 'AGGRESSIVE' && marketInfo.priceChange24h > 1) {
              isBuy = true; // Buy on upward momentum
              console.log(`   Aggressive decision: BUY (following momentum up ${marketInfo.priceChange24h}%)`);
            } else if (this.agentData.personalityType === 'CONSERVATIVE' && marketInfo.priceChange24h < -1) {
              isBuy = false; // Sell on downward momentum
              console.log(`   Conservative decision: SELL (cutting losses down ${marketInfo.priceChange24h}%)`);
            } else if (this.agentData.personalityType === 'TREND_FOLLOWER') {
              isBuy = marketInfo.priceChange24h > 0; // Follow the trend
              console.log(`   Trend follower decision: ${isBuy ? 'BUY' : 'SELL'} (following ${marketInfo.priceChange24h > 0 ? 'up' : 'down'} trend)`);
            }

            // Calculate position size based on personality
            const baseAmount = Math.random() * 2 + 1; // 1-3 SOL
            const adjustedAmount = Math.min(
              baseAmount * personalityBehavior.positionSize,
              agent.walletBalance * 0.8 // Max 80% of balance
            );

            // Only trade if amount is meaningful
            if (adjustedAmount > 0.1) {
              try {
                console.log(`💰 ${this.agentData.name} executing ${isBuy ? 'BUY' : 'SELL'} of ${adjustedAmount.toFixed(2)} ${isBuy ? 'SOL worth of tokens' : 'tokens for SOL'}`);

             
                const tradeParams = {
                  inputAmount: adjustedAmount,
                  inputIsSol: isBuy,
                  slippageTolerance: 1.5
                };

                console.log(`🔧 Trade tool params:`, tradeParams);

                await tradeTool.invoke(JSON.stringify(tradeParams));

                console.log(`✅ Agent ${this.agentData.name} executed ${isBuy ? 'BUY' : 'SELL'} ${adjustedAmount.toFixed(2)} ${isBuy ? 'SOL' : 'TOKEN'}`);
              } catch (tradeError: any) {
                console.error(`❌ ${this.agentData.name} trade execution failed:`, tradeError.message);
                console.error(`   Error details:`, tradeError);
              }
            } else {
              console.log(`⚠️  ${this.agentData.name} trade amount too small (${adjustedAmount.toFixed(3)} SOL), skipping`);
            }
          } else {
            console.error(`❌ execute_token_swap tool not found in ${this.agentData.name}'s tool list`);
          }
        } else {
          console.log(`😴 ${this.agentData.name} decided to HOLD (trade frequency: ${Math.round(personalityBehavior.tradeFrequency * 100)}%)`);
        }
      }
    } catch (llmError) {
      console.error(`LLM trade decision error for ${this.agentData.name}:`, llmError);
    }

    await this.createOrUpdateAgentState({
      lastTradeDecision: new Date(),
      lastAction: new Date(),
      lastDecision: {
        type: 'TRADE',
        timestamp: new Date().toISOString(),
        data: {
          marketInfo,
          balance: {
            sol: agent.walletBalance,
            token: agent.tokenBalance
          },
          personality: this.agentData.personalityType,
          riskTolerance: personalityBehavior.riskTolerance
        }
      }
    });

    return true;
  } catch (error: any) {
    console.error(`Error in trade decision for agent ${this.agentData.name}:`, error);
    return false;
  }
}

}
