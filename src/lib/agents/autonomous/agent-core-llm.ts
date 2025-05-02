import { SolanaAgentKit, createSolanaTools } from "solana-agent-kit";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Tool } from "@langchain/core/tools";
import { prisma } from "../../cache/dbCache";
import { PersonalityType } from "../personalities";
import { amm } from "../../blockchain/amm";
import { marketData } from "../../market/data";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as bs58 from "bs58";

/**
 * Create a fixed config with thread_id that works with LangChain Memory
 */
const DEFAULT_CONFIG = {
  configurable: {
    thread_id: 'global_default_thread'
  }
};

/**
 * Add thread_id to any config that might be missing it
 */
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
 * Custom tool for executing token swaps using only the internal AMM.
 * Improved handling of text inputs and JSON formats.
 */
class TokenSwapTool extends Tool {
  name = "execute_token_swap";
  description = "Execute a token swap between SOL and the NURO token. Input should be a JSON object with parameters: inputAmount (number), inputIsSol (boolean), and optionally slippageTolerance (number).";

  constructor(private readonly agentId: string) {
    super();
  }

  async _call(input: string) {
    try {
      // Attempt to parse JSON
      let args: any;
      try {
        args = JSON.parse(input);
      } catch (jsonError) {
        // If not valid JSON, attempt to parse as text
        console.log(`Agent ${this.agentId} sent text instead of JSON: "${input}"`);

        // Try to extract amount and direction from text
        args = this.parseTextInput(input);

        if (!args) {
          return JSON.stringify({ 
            error: "Invalid input format", 
            details: "Please provide input as JSON or a clear statement like 'buy 5 SOL worth of NURO'" 
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

      // Log the trade attempt with details
      console.log(`[TRADE] Agent ${this.agentId} attempting to ${inputIsSol ? 'buy' : 'sell'} with ${inputAmount} ${inputIsSol ? 'SOL' : 'NURO'}`);

      // Ensure slippage tolerance is reasonable (min 1%, max 5%)
      // Increased from 0.5% minimum to 1% to handle larger trades
      const safeSlippageTolerance = Math.max(1.0, Math.min(5, slippageTolerance || 1.0));

      // Log the adjustment if needed
      if (safeSlippageTolerance !== slippageTolerance) {
        console.log(`Adjusted slippage tolerance from ${slippageTolerance}% to ${safeSlippageTolerance}% for agent ${this.agentId}`);
      }

      // Execute swap using AMM with the safe slippage tolerance
      try {
        const result = await amm.executeSwap(
          this.agentId,
          inputAmount,
          inputIsSol,
          safeSlippageTolerance
        );

        // Log successful trade
        console.log(`[TRADE SUCCESS] Agent ${this.agentId} completed trade: ${JSON.stringify(result.swapResult)}`);

        // Return result
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
  
  /**
   * Parse natural language text to extract swap parameters.
   */
  private parseTextInput(text: string): { inputAmount: number, inputIsSol: boolean } | null {
    text = text.toLowerCase().trim();

    // Buy pattern (SOL -> NURO)
    const buyPattern = /buy\s+(\d+(\.\d+)?)\s*(sol\s+worth\s+of\s+)?nuro|purchase\s+(\d+(\.\d+)?)\s*(sol\s+worth\s+of\s+)?nuro|acquire\s+(\d+(\.\d+)?)\s*(sol\s+worth\s+of\s+)?nuro/i;

    // Sell pattern (NURO -> SOL)
    const sellPattern = /sell\s+(\d+(\.\d+)?)\s*nuro|convert\s+(\d+(\.\d+)?)\s*nuro\s+to\s+sol|exchange\s+(\d+(\.\d+)?)\s*nuro\s+for\s+sol/i;

    let match;

    // Check for buy patterns
    match = text.match(buyPattern);
    if (match) {
      // Extract the number - it could be in different capture groups depending on the pattern
      const amount = parseFloat(match[1] || match[4] || match[7] || '5'); // Default to 5 if no amount specified
      return {
        inputAmount: amount,
        inputIsSol: true // Buying NURO with SOL
      };
    }

    // Check for sell patterns
    match = text.match(sellPattern);
    if (match) {
      // Extract the number - it could be in different capture groups
      const amount = parseFloat(match[1] || match[3] || match[5] || '5'); // Default to 5 if no amount specified
      return {
        inputAmount: amount,
        inputIsSol: false // Selling NURO for SOL
      };
    }

    // Try simpler patterns if the above didn't match
    if (text.includes('buy') && text.includes('nuro')) {
      return {
        inputAmount: 5,
        inputIsSol: true
      };
    }

    if (text.includes('sell') && text.includes('nuro')) {
      return {
        inputAmount: 5,
        inputIsSol: false
      };
    }

    // Couldn't parse
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

      return JSON.stringify({
        solBalance: agent.walletBalance || 0,
        tokenBalance: agent.tokenBalance || 0,
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

      // Create message
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

      // Get messages
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
    "When communicating, you often challenge the consensus view."
};

/**
 * LLM-powered Autonomous Agent that uses Solana Agent Kit.
 * Memory usage has been removed from the initialization.
 */
export class LLMAutonomousAgent {
  private agent: any; // The React agent instance
  private tools: Tool[] = [];
  private personalityPrompt: string;
  private llm: ChatOpenAI;

  constructor(
    private readonly agentData: any,
    private readonly options: {
      llmModel?: string;
      temperature?: number;
    } = {}
  ) {
    this.personalityPrompt =
      PERSONALITY_PROMPTS[agentData.personalityType] || PERSONALITY_PROMPTS.MODERATE;

    // Set up LLM
    this.llm = new ChatOpenAI({
      modelName: options.llmModel || "gpt-4o",
      temperature: options.temperature || 0.7,
    });

    // Initialize tools
    this.initializeTools();

    // Create the agent
    this.initializeAgent();
  }

  /**
   * Initialize the custom tools for this agent.
   */
  private initializeTools() {
    // Add custom tools
    this.tools.push(new MarketDataTool());
    this.tools.push(new TokenSwapTool(this.agentData.id));
    this.tools.push(new GetBalanceTool(this.agentData.id));
    this.tools.push(new SendMessageTool(this.agentData.id, this.agentData.name));
    this.tools.push(new ReadMessagesTool(this.agentData.id));

    // Add Solana native tools if using real blockchain interaction
    if (process.env.USE_REAL_BLOCKCHAIN === "true" && this.agentData.walletPrivateKey) {
      try {
        const solanaKit = new SolanaAgentKit(
          this.agentData.walletPrivateKey,
          process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8899",
          process.env.OPENAI_API_KEY
        );
        const solanaTools = createSolanaTools(solanaKit);
        this.tools.push(...solanaTools);
        console.log(`Added ${solanaTools.length} Solana native tools for agent ${this.agentData.name}`);
      } catch (error: any) {
        console.error(`Error adding Solana tools: ${error.message}`);
      }
    }
  }

  /**
   * Initialize the React agent with tools and personality.
   */
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

      const systemPrompt = new SystemMessage(
        `You are ${agentContext.name}, an autonomous trading agent operating on the Solana blockchain.\n\n` +
        `${this.personalityPrompt}\n\n` +
        `## Your Role\n` +
        `As a ${agentContext.personality} trader in the NURO token market, your goal is to maximize profits ` +
        `through strategic token trading based on market data, messages from other agents, and your own analysis.\n\n` +
        `## Available Actions\n` +
        `- Analyze market data (prices, liquidity, trading volume, sentiment)\n` +
        `- Read messages from other traders\n` +
        `- Send messages to share your insights or discuss strategies\n` +
        `- Make trading decisions (buy/sell NURO tokens with SOL)\n` +
        `- Monitor your wallet balances\n\n` +
        `## Decision Making\n` +
        `Make all trading decisions independently based on your personality type and the available information. ` +
        `Always check your balance before trading and don't exceed it. Take into account market trends, ` +
        `sentiment, and what other traders are saying, but interpret everything through the lens of your ` +
        `${agentContext.personality} trading style.\n\n` +
        `## Current Status\n` +
        `- Wallet: ${agentContext.walletAddress}\n` +
        `- SOL Balance: ${agentContext.balance.sol} SOL\n` +
        `- NURO Balance: ${agentContext.balance.token} NURO\n` +
        `- Occupation: ${agentContext.occupation}\n\n` +
        `Use the appropriate tools to gather information, communicate, and execute trades. Always explain your ` +
        `reasoning when making decisions, especially for trades.`
      );

      this.agent = createReactAgent({
        llm: this.llm,
        tools: this.tools,
        systemMessage: systemPrompt,
      });

      // Wrap the invoke method to add a thread_id safely
      const originalInvoke = this.agent.invoke.bind(this.agent);
      this.agent.invoke = async (input: any) => {
        const safeInput = {
          ...input,
          configurable: {
            ...(input.configurable || {}),
            thread_id: input.configurable?.thread_id || `agent_${this.agentData.id}_${Date.now()}`,
          },
        };
        return originalInvoke(safeInput);
      };

      if (this.agent.stream) {
        const originalStream = this.agent.stream.bind(this.agent);
        this.agent.stream = async (input: any) => {
          const safeInput = {
            ...input,
            configurable: {
              ...(input.configurable || {}),
              thread_id: input.configurable?.thread_id || `agent_${this.agentData.id}_${Date.now()}`,
            },
          };
          return originalStream(safeInput);
        };
      }

      console.log(`LLM Agent ${this.agentData.name} (${this.agentData.personalityType}) initialized with ${this.tools.length} tools`);

      await prisma.activityLog.create({
        data: {
          action: 'llm_agent_initialized',
          actor: this.agentData.id,
          details: {
            name: this.agentData.name,
            personality: this.agentData.personalityType,
            toolCount: this.tools.length,
            modelName: this.options.llmModel || "gpt-3.5-turbo",
          },
          timestamp: new Date(),
        },
      });
    } catch (error: any) {
      console.error(`Error initializing agent ${this.agentData.name}:`, error);
      throw error;
    }
  }

  /**
   * Helper function to create or update agent state.
   */
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
      // Do not re-throw to avoid breaking the flow
    }
  }

  /**
   * Analyze the market and record analysis.
   */
  async analyzeMarket(marketInfo: any) {
    try {
      console.log(`Agent ${this.agentData.name} analyzing market`);

      const marketSummary =
        `Current market conditions:\n` +
        `- NURO token price: ${marketInfo.price} SOL\n` +
        `- 24h price change: ${marketInfo.priceChange24h}%\n` +
        `- 24h trading volume: ${marketInfo.volume24h} SOL\n` +
        `- Liquidity: ${marketInfo.liquidity} SOL\n` +
        `- Market sentiment: ${marketInfo.sentiment?.bullish > 0.5 ? 'Bullish' : 'Bearish'}\n`;

      const response = await this.agent.invoke({
        messages: [
          new HumanMessage(
            `${marketSummary}\n\n` +
            `Based on this market data and your trading style as a ${this.agentData.personalityType} trader, ` +
            `analyze the market and decide if you want to make any trades.`
          )
        ]
      });

      await this.createOrUpdateAgentState({
        lastMarketAnalysis: new Date(),
        lastAction: new Date(),
        lastDecision: {
          type: 'MARKET_ANALYSIS',
          timestamp: new Date().toISOString(),
          data: {
            marketInfo,
            analysis: response.toString()
          }
        }
      });

      return true;
    } catch (error: any) {
      console.error(`Error in market analysis for agent ${this.agentData.name}:`, error);
      return false;
    }
  }

  /**
   * Handle social interactions with other agents.
   */
  async socialInteraction(messages: any[], sentiment: any) {
    try {
      console.log(`Agent ${this.agentData.name} socializing`);

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

      const response = await this.agent.invoke({
        messages: [
          new HumanMessage(
            `Recent messages from other traders:\n${formattedMessages}\n\n` +
            `${marketSentiment}\n\n` +
            `Based on these messages and your personality as a ${this.agentData.personalityType} trader, ` +
            `decide if you want to respond. If yes, compose a message that reflects your trading style ` +
            `and perspective on the current market conditions.`
          )
        ]
      });

      await this.createOrUpdateAgentState({
        lastSocialAction: new Date(),
        lastAction: new Date(),
        lastDecision: {
          type: 'SOCIAL',
          timestamp: new Date().toISOString(),
          data: {
            messageCount: messages.length,
            response: response.toString()
          }
        }
      });

      return true;
    } catch (error: any) {
      console.error(`Error in social interaction for agent ${this.agentData.name}:`, error);
      return false;
    }
  }

  /**
   * Make trading decisions based on market data.
   */
  async makeTradeDecision(marketInfo: any) {
    try {
      console.log(`Agent ${this.agentData.name} making trade decision`);

      const agent = await prisma.agent.findUnique({
        where: { id: this.agentData.id }
      });
      if (!agent) {
        throw new Error(`Agent ${this.agentData.id} not found`);
      }

      const balanceInfo =
        `Your current balances:\n` +
        `- SOL: ${agent.walletBalance} SOL\n` +
        `- NURO tokens: ${agent.tokenBalance} NURO\n\n`;

      const marketSummary =
        `Current market conditions:\n` +
        `- NURO token price: ${marketInfo.price} SOL\n` +
        `- 24h price change: ${marketInfo.priceChange24h}%\n` +
        `- 24h trading volume: ${marketInfo.volume24h} SOL\n` +
        `- Liquidity: ${marketInfo.liquidity} SOL\n`;

      const response = await this.agent.invoke({
        messages: [
          new HumanMessage(
            `${balanceInfo}${marketSummary}\n\n` +
            `Based on your balance, the market conditions, and your trading style as a ` +
            `${this.agentData.personalityType} trader, decide if you want to:\n\n` +
            `1. Buy NURO tokens with SOL\n` +
            `2. Sell NURO tokens for SOL\n` +
            `3. Hold your current position\n\n` +
            `If you decide to trade, specify how much you want to buy or sell, ` +
            `and explain your reasoning.`
          )
        ]
      });

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
            decision: response.toString()
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
