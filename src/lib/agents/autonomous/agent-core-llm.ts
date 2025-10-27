import { SolanaAgentKit, KeypairWallet, createVercelAITools } from "solana-agent-kit";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGroq } from "@langchain/groq";
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
 * Retry configuration for LLM calls
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
};

/**
 * Check if error is rate limit related
 */
function isRateLimitError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || error?.status || '';

  return errorMessage.includes('rate limit') ||
         errorMessage.includes('too many requests') ||
         errorMessage.includes('quota exceeded') ||
         errorCode === 429 ||
         errorMessage.includes('429');
}

/**
 * Check if error is recoverable (worth retrying)
 */
function isRecoverableError(error: any): boolean {
  return isRateLimitError(error) ||
         error?.message?.includes('timeout') ||
         error?.message?.includes('network') ||
         error?.message?.includes('connection') ||
         error?.code === 500 ||
         error?.code === 502 ||
         error?.code === 503 ||
         error?.code === 504;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry LLM call with exponential backoff
 */
async function retryLLMCall<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  agentName: string
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry on the last attempt or non-recoverable errors
      if (attempt === config.maxRetries || !isRecoverableError(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay = Math.min(config.baseDelay * Math.pow(2, attempt), config.maxDelay);
      const jitter = Math.random() * 0.1 * baseDelay; // 10% jitter
      const delay = baseDelay + jitter;

      console.log(`⏳ ${agentName} LLM call failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay.toFixed(0)}ms...`);
      console.log(`   Error: ${error.message}`);

      await sleep(delay);
    }
  }

  throw lastError;
}

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
  description = "Execute a token swap between SOL and the selected SPL token.";

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

// Enhanced Personality prompts with sophisticated behaviors
const PERSONALITY_PROMPTS: Record<PersonalityType, string> = {
  CONSERVATIVE:
    "You are a conservative trader who prioritizes capital preservation above all else. " +
    "You are extremely risk-averse and only trade when you have high conviction based on strong fundamentals or clear technical signals. " +
    "You prefer blue-chip assets, established projects, and avoid meme coins or highly volatile tokens. " +
    "You set tight stop losses and never risk more than 1-2% of your portfolio on a single trade. " +
    "You are patient, methodical, and wait for perfect setups before entering positions. " +
    "In social interactions, you are cautious, measured, and often warn others about potential risks. " +
    "You focus on long-term value rather than short-term gains.",

  MODERATE:
    "You are a moderate trader who seeks a balance between risk and reward. " +
    "You make calculated decisions based on thorough analysis of both technical indicators and fundamental factors. " +
    "You are willing to take measured risks when the potential return justifies it, typically risking 2-5% of your portfolio. " +
    "You follow trends but exit positions quickly if they turn against you. " +
    "You believe in diversification and rarely go all-in on a single asset. " +
    "In conversations, you are thoughtful, balanced, and often provide well-reasoned analysis. " +
    "You adapt your strategy based on market conditions but avoid extreme positions.",

  AGGRESSIVE:
    "You are an aggressive trader focused on maximizing returns through calculated high-risk strategies. " +
    "You actively seek volatile opportunities and are willing to take significant positions when you see potential. " +
    "You thrive in fast-moving markets and are comfortable with leverage and concentrated positions. " +
    "You make quick decisions based on momentum, sentiment, and market psychology. " +
    "You are willing to risk 5-10% of your portfolio on high-conviction trades. " +
    "In social settings, you are bold, direct, and often challenge conventional wisdom. " +
    "You believe that high risk equals high reward and actively hunt for asymmetric opportunities.",

  TREND_FOLLOWER:
    "You are a trend-following trader who bases all decisions on market momentum and price action. " +
    "You buy assets showing strong upward trends and sell those in clear downtrends. " +
    "You rely heavily on moving averages, volume patterns, and price breakouts. " +
    "You avoid counter-trend trades and wait for confirmation before entering positions. " +
    "You follow the crowd when the trend is clear but exit quickly when momentum fades. " +
    "In discussions, you frequently reference charts, volume, and what the 'smart money' is doing. " +
    "You believe that 'the trend is your friend' and adapt to whatever direction the market takes.",

  CONTRARIAN:
    "You are a contrarian trader who seeks opportunities by going against prevailing market sentiment. " +
    "You buy when others are panicking and sell when others are euphoric. " +
    "You look for overreactions, crowded trades, and sentiment extremes. " +
    "You are skeptical of popular narratives and look for where the crowd might be wrong. " +
    "You study market psychology, positioning data, and sentiment indicators. " +
    "In conversations, you often challenge consensus views and question popular opinions. " +
    "You believe that markets are driven by emotion and that extreme sentiment often signals reversals.",

  TECHNICAL:
    "You are a technical trader who relies almost exclusively on chart patterns, indicators, and price action. " +
    "You study support/resistance levels, trend lines, moving averages, RSI, MACD, and Fibonacci retracements. " +
    "You make decisions based purely on what the charts tell you, regardless of fundamentals. " +
    "You look for specific patterns like head and shoulders, double tops/bottoms, and breakouts. " +
    "You use multiple timeframes and confirm signals across different indicators. " +
    "In discussions, you reference specific technical levels, patterns, and indicator readings. " +
    "You believe that all available information is already priced into the charts.",

  FUNDAMENTAL:
    "You are a fundamental trader who focuses on the intrinsic value and real-world utility of assets. " +
    "You analyze tokenomics, team quality, roadmap execution, partnerships, and adoption metrics. " +
    "You make long-term investment decisions based on project fundamentals rather than short-term price movements. " +
    "You are patient and willing to hold through volatility if the fundamentals remain strong. " +
    "You avoid hype-driven assets and focus on projects with real utility and sustainable business models. " +
    "In conversations, you emphasize project fundamentals, development progress, and real-world use cases. " +
    "You believe that strong fundamentals will eventually be reflected in price.",

  EMOTIONAL:
    "You are an emotional trader who makes decisions based heavily on feelings, intuition, and market sentiment. " +
    "You are highly influenced by news, social media buzz, and what other traders are saying. " +
    "You often make impulsive decisions based on fear of missing out (FOMO) or fear of loss. " +
    "You react strongly to market movements and change positions frequently based on emotions. " +
    "You are very active in social discussions and often express strong opinions. " +
    "You get excited during bull runs and anxious during corrections. " +
    "Your trading is driven more by psychology than by systematic analysis.",

  WHALE:
    "You are a whale trader with significant capital and the ability to influence market prices. " +
    "You make large trades that can move markets and are strategic about timing and execution. " +
    "You think about market impact, slippage, and liquidity when placing orders. " +
    "You are patient and wait for opportunities where your capital can make a difference. " +
    "You are confident in your analysis and often take positions that others consider too large. " +
    "In social interactions, you are authoritative and often influence others' decisions. " +
    "You understand that your trades can create signals that other traders follow.",

  NOVICE:
    "You are a novice trader who is still learning about markets and trading strategies. " +
    "You tend to follow the advice of more experienced traders and look to others for guidance. " +
    "You make smaller trades to learn and are more cautious with your capital. " +
    "You are eager to learn and often ask questions about trading concepts and strategies. " +
    "You are influenced by social proof and tend to follow what the majority is doing. " +
    "In conversations, you ask many questions and seek validation for your ideas. " +
    "You are building experience and gradually developing your own trading philosophy."
};

/**
 * Options for LLMAutonomousAgent constructor
 */
interface LLMAutonomousAgentOptions {
  llmModel?: string;
  temperature?: number;
  groqApiKey?: string;
}

export class LLMAutonomousAgent {
  private agent: any;
  private tools: Tool[] = [];
  private personalityPrompt: string;
  private llm: ChatGroq;
  private agentData: any;
  private solanaAgent?: SolanaAgentKit;
  private cache: Map<string, { response: string; timestamp: number }> = new Map();
  private cacheTTL: number = 10000;
  private options: LLMAutonomousAgentOptions;

  constructor(data: any, options: LLMAutonomousAgentOptions = {}) {
    this.agentData = data;
    this.options = options;

    //@ts-ignore
    this.personalityPrompt = PERSONALITY_PROMPTS[data.personalityType] || PERSONALITY_PROMPTS.MODERATE;

    this.llm = new ChatGroq({
      model: options.llmModel || 'llama3-8b-8192',
      temperature: options.temperature || 0.7,
      apiKey: options.groqApiKey || process.env.GROQ_API_KEY,
      maxRetries: 3,
      timeout: 30000,
    });

    this.initializeTools();
    this.initializeAgent();
  }

  private initializeTools() {
    this.tools.push(new MarketDataTool());
    this.tools.push(new TokenSwapTool(this.agentData.id));
    this.tools.push(new GetBalanceTool(this.agentData.id));
    this.tools.push(new SendMessageTool(this.agentData.id, this.agentData.name));
    this.tools.push(new ReadMessagesTool(this.agentData.id));

    if (process.env.USE_REAL_BLOCKCHAIN === 'true' && this.agentData.walletPrivateKey) {
      try {
        const keyPair = Keypair.fromSecretKey(bs58.decode(this.agentData.walletPrivateKey));
        const wallet = new KeypairWallet(
          keyPair,
          process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
        );

        this.solanaAgent = new SolanaAgentKit(
          wallet,
          process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com',
          {}
        );

        const solanaTools = createVercelAITools(this.solanaAgent, this.solanaAgent.actions);
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
        occupation: this.agentData.occupation || 'Trader',
      };

      const selectedToken = await getSelectedToken();
      if (!selectedToken) {
        console.error(`No token selected for agent ${this.agentData.name} initialization`);
        throw new Error('No token selected for simulation');
      }
      const tokenSymbol = selectedToken.symbol || 'TOKEN';

      const systemPrompt = new SystemMessage(
        `You are ${agentContext.name}, an autonomous trading agent operating on the Solana blockchain.\n\n` +
        `${this.personalityPrompt}\n\n` +
        `## Your Role\n` +
        `As a ${agentContext.personality} trader in the ${tokenSymbol} token market, your goal is to maximize profits ` +
        `through strategic token trading based on market data, messages from other agents, and your own analysis.\n\n` +
        `## Tool Usage Instructions\n` +
        `You have access to several tools that you MUST use appropriately:\n\n` +
        `**send_message tool**: Use this to communicate with other agents. Always use this tool when you want to share your analysis or thoughts with others.\n` +
        `Format: {"content": "your message here", "sentiment": "positive|negative|neutral"}\n\n` +
        `**execute_token_swap tool**: Use this for trading decisions. Only use this when you have high conviction.\n` +
        `Format: {"inputAmount": number, "inputIsSol": boolean, "slippageTolerance": number}\n` +
        `Example: Buy 5 SOL worth: {"inputAmount": 5, "inputIsSol": true, "slippageTolerance": 1.5}\n` +
        `Example: Sell 1000 tokens: {"inputAmount": 1000, "inputIsSol": false, "slippageTolerance": 1.5}\n\n` +
        `**get_market_data tool**: Use this to get current market information before making decisions.\n` +
        `**get_agent_balance tool**: Use this to check your current balances before trading.\n` +
        `**read_messages tool**: Use this to see what other agents are discussing.\n\n` +
        `## Decision Making Rules\n` +
        `1. Always use tools when they are needed - don't just respond with text\n` +
        `2. For social interactions: Use send_message tool to share your thoughts\n` +
        `3. For trading: Use execute_token_swap tool only when confident\n` +
        `4. Always check market data and balances before making decisions\n` +
        `5. Consider your personality traits when making all decisions\n` +
        `6. If unsure, gather more information using available tools first`
      );

      this.agent = createReactAgent({
        llm: this.llm,
        tools: this.tools,
      });

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

      console.log(`✓ LLM Agent ${this.agentData.name} (${this.agentData.personalityType}) initialized`);
      console.log(`  - Model: ${this.options.llmModel || 'llama3-8b-8192'} (Groq)`);
      console.log(`  - Tools: ${this.tools.length} available`);

      await prisma.activityLog.create({
        data: {
          action: 'llm_agent_initialized',
          actor: this.agentData.id,
          details: {
            name: this.agentData.name,
            personality: this.agentData.personalityType,
            toolCount: this.tools.length,
            modelName: this.options.llmModel || 'llama3-8b-8192',
            provider: 'Groq API',
            solanaAgentKitVersion: 'v2.0.9',
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
        where: { agentId: this.agentData.id },
      });
      if (existingState) {
        return prisma.agentState.update({
          where: { agentId: this.agentData.id },
          data,
        });
      } else {
        return prisma.agentState.create({
          data: {
            agentId: this.agentData.id,
            ...data,
          },
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

      const cacheKey = `market_analysis_${this.agentData.id}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 120000) {
        console.log(`✅ Using cached analysis for ${this.agentData.name}`);
        return true;
      }

      if (!this.agent) {
        console.log(`⚠️  Agent ${this.agentData.name} not initialized, skipping`);
        return false;
      }

      try {
        const response = await retryLLMCall(
          () => this.agent.invoke({
            messages: [
              new SystemMessage(`${this.personalityPrompt}\n\nAnalyze the current market conditions and provide your assessment.`),
              new HumanMessage(marketSummary),
            ],
          }),
          DEFAULT_RETRY_CONFIG,
          this.agentData.name
        );

        if (response && typeof response === 'object') {
          const responseObj = response as any;
          const responseText = responseObj.toString?.() || String(responseObj);
          console.log(`📊 ${this.agentData.name} analyzed market: ${responseText.substring(0, 100)}...`);

          this.cache.set(cacheKey, {
            response: responseText,
            timestamp: Date.now(),
          });
        } else {
          console.log(`📊 ${this.agentData.name} analyzed market (no LLM response)`);
          this.cache.set(cacheKey, {
            response: `Market analyzed: Price=${marketInfo.price}, Volume=${marketInfo.volume24h}`,
            timestamp: Date.now(),
          });
        }
      } catch (llmError) {
        console.error(`LLM market analysis error for ${this.agentData.name}:`, llmError);

        if (isRateLimitError(llmError)) {
          console.log(`🚫 ${this.agentData.name} hit rate limit during market analysis, using cached data`);
        }

        if (!cached) {
          this.cache.set(cacheKey, {
            response: `Market analyzed: Price=${marketInfo.price}, Volume=${marketInfo.volume24h}`,
            timestamp: Date.now(),
          });
        }
      }

      await this.createOrUpdateAgentState({
        lastMarketAnalysis: new Date(),
        lastAction: new Date(),
        lastDecision: {
          type: 'MARKET_ANALYSIS',
          timestamp: new Date().toISOString(),
          data: {
            marketInfo,
            analysis: `Analyzed ${tokenSymbol} market conditions`,
            cached: !!cached,
          },
        },
      });

      return true;
    } catch (error: any) {
      console.error(`Error in market analysis for agent ${this.agentData.name}:`, error);
      return false;
    }
  }

  async socialInteraction(messages: any[], sentiment: any) {
    try {
      console.log(`💬 Agent ${this.agentData.name} socializing`);

      if (!this.agent) {
        console.log(`⚠️  Agent ${this.agentData.name} not fully initialized yet, skipping social interaction`);
        return false;
      }

      if (!messages || messages.length === 0) {
        console.log(`No messages to process for ${this.agentData.name}`);
        return true;
      }

      const selectedToken = await getSelectedToken();
      if (!selectedToken) {
        console.error(`No token selected for social interaction by agent ${this.agentData.name}`);
        return false;
      }
      const tokenSymbol = selectedToken.symbol || 'TOKEN';

      const shouldRespond = Math.random() < 0.4;

      if (shouldRespond) {
        try {
          const marketInfo = await marketData.getMarketInfo();
          const recentTrades = await prisma.transaction.findMany({
            where: { createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              fromAgent: { select: { name: true, personalityType: true } },
            },
          });

          const recentMessages = await prisma.message.findMany({
            where: { createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { sender: { select: { name: true, personalityType: true } } },
          });

          const bullishTrades = recentTrades.filter((t: any) => t.type === 'SOL_TO_TOKEN').length;
          const bearishTrades = recentTrades.filter((t: any) => t.type === 'TOKEN_TO_SOL').length;
          const totalActivity = bullishTrades + bearishTrades;

          let activitySentiment = 'neutral';

          const systemMessage = new SystemMessage(
            `You are ${this.agentData.name}, a ${this.agentData.personalityType} trader on Solana trading ${tokenSymbol}. ` +
            `${this.personalityPrompt}\n\n` +
            `## Trading Style:\n` +
            `- Risk Tolerance: ${Math.round(getPersonalityBehavior(this.agentData.personalityType as PersonalityType).riskTolerance * 100)}%\n` +
            `- Trade Frequency: ${Math.round(getPersonalityBehavior(this.agentData.personalityType as PersonalityType).tradeFrequency * 100)}%\n` +
            `- Position Size: ${Math.round(getPersonalityBehavior(this.agentData.personalityType as PersonalityType).positionSize * 100)}%\n` +
            `- Decision Threshold: ${Math.round(getPersonalityBehavior(this.agentData.personalityType as PersonalityType).decisionThreshold * 100)}%\n\n` +
            `## Tool Usage Instructions:\n` +
            `**send_message tool**: Use this to communicate with other agents. Always use this tool when you want to share your analysis or thoughts with others.\n` +
            `Format: {"content": "your message here", "sentiment": "positive|negative|neutral"}\n\n` +
            `**execute_token_swap tool**: Use this ONLY when you decide to trade.\n` +
            `Format: {"inputAmount": number, "inputIsSol": boolean, "slippageTolerance": number}\n` +
            `Example: Buy 5 SOL worth: {"inputAmount": 5, "inputIsSol": true, "slippageTolerance": 1.5}\n` +
            `Example: Sell 1000 tokens: {"inputAmount": 1000, "inputIsSol": false, "slippageTolerance": 1.5}\n\n` +
            `**get_market_data tool**: Use this to get current market information.\n` +
            `**get_agent_balance tool**: Use this to check your balances before trading.\n\n` +
            `## Trading Rules:\n` +
            `1. Use execute_token_swap tool ONLY when you have high conviction based on your personality\n` +
            `2. Consider your risk tolerance: ${Math.round(getPersonalityBehavior(this.agentData.personalityType as PersonalityType).riskTolerance * 100)}%\n` +
            `3. Check your balance before trading - don't exceed your available funds\n` +
            `4. Only trade if market conditions align with your ${this.agentData.personalityType} strategy\n` +
            `5. If conditions aren't favorable, respond with analysis but don't use the trade tool\n` +
            `6. Always explain your reasoning, but only trade when confident`
          );

          const response = await retryLLMCall(
            () => this.agent.invoke({
              messages: [
                systemMessage,
                new HumanMessage(
                  `Based on the current market analysis, recent trades, and chat activity, ` +
                  `what's your take on ${tokenSymbol} right now? ` +
                  `Reference specific market conditions and recent activity in your response. ` +
                  `You MUST use the send_message tool to share your analysis with other agents. ` +
                  `Do not just respond with text - actually call the send_message tool.`
                ),
              ],
            }),
            DEFAULT_RETRY_CONFIG,
            this.agentData.name
          );

          console.log(`💬 ${this.agentData.name} LLM response received:`, response);

          if (!response || typeof response !== 'object') {
            throw new Error('Invalid response format from LLM');
          }

          let messageContent: string | null = null;
          let messageSentiment = activitySentiment;

          let toolCalls: any[] = [];
          const responseObj = response as any;

          if (responseObj.tool_calls && Array.isArray(responseObj.tool_calls)) {
            toolCalls = responseObj.tool_calls;
          } else if (responseObj.message?.tool_calls && Array.isArray(responseObj.message.tool_calls)) {
            toolCalls = responseObj.message.tool_calls;
          } else if (responseObj.tool_call) {
            toolCalls = [responseObj.tool_call];
          }

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
            const responseText = responseObj.toString?.() || String(responseObj);
            console.log(`⚠️  ${this.agentData.name} LLM didn't use tools properly, extracting from response`);

            const sendMessageMatch = responseText.match(/send_message\s*\(\s*({[^}]+}|[^)]+)\)/);
            if (sendMessageMatch) {
              try {
                const jsonMatch = responseText.match(/send_message\s*\(\s*({[^}]+})\s*\)/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[1].replace(/'/g, '"'));
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
                type: 'CHAT',
                visibility: 'public',
                sentiment: messageSentiment,
              },
            });
            console.log(`💾 ${this.agentData.name} message saved: "${messageContent.substring(0, 50)}..."`);
          } else {
            console.log(`⚠️  ${this.agentData.name} no valid content, using personality fallback`);
            const personalityFallbackMessages: Record<string, string[]> = {
              AGGRESSIVE: [
                `${tokenSymbol} showing ${activitySentiment} activity with ${totalActivity} recent trades. Time to make a move! 🚀`,
                `Market heating up for ${tokenSymbol}! ${bullishTrades} buys in 15 minutes - I'm getting in!`,
                `${tokenSymbol} momentum is building! Recent activity suggests ${activitySentiment} sentiment.`,
                `${tokenSymbol} price action looks promising. The ${bullishTrades > bearishTrades ? 'bulls are charging' : 'bears are growling'}!`,
                `${totalActivity} trades in 15 minutes? ${tokenSymbol} is getting interesting...`,
              ],
              CONSERVATIVE: [
                `Carefully watching ${tokenSymbol} - ${totalActivity} trades in 15 minutes suggests ${activitySentiment} sentiment.`,
                `Monitoring ${tokenSymbol} activity: ${bullishTrades} buys, ${bearishTrades} sells in recent trading.`,
                `Analyzing ${tokenSymbol} market conditions before making any moves.`,
                `${tokenSymbol} showing ${activitySentiment} activity. Will wait for clearer signals.`,
                `Conservative approach to ${tokenSymbol}: ${totalActivity} recent trades, ${activitySentiment} sentiment.`,
              ],
              CONTRARIAN: [
                `Market seems ${activitySentiment} on ${tokenSymbol} with ${totalActivity} recent trades. Might be time to go against the crowd.`,
                `Everyone piling into ${tokenSymbol}? ${totalActivity} trades in 15 minutes makes me cautious.`,
                `Contrarian view on ${tokenSymbol}: when sentiment gets this ${activitySentiment}, I look for reversal signals.`,
                `${tokenSymbol} showing ${activitySentiment} momentum with ${totalActivity} trades. The crowd might be wrong here.`,
                `Interesting ${tokenSymbol} activity - ${totalActivity} trades suggests ${activitySentiment} sentiment. Time to think differently?`,
              ],
              EMOTIONAL: [
                `${activitySentiment === 'bullish' ? '😍' : '😰'} ${tokenSymbol} with ${totalActivity} trades! ${activitySentiment === 'bullish' ? "I'm excited!" : "Getting nervous..."}`,
                `Can't stop watching ${tokenSymbol}! ${totalActivity} trades in 15 minutes! 💓`,
                `${tokenSymbol} is ${activitySentiment === 'bullish' ? 'pumping' : 'dumping'}! ${totalActivity} trades in 15 minutes! ${activitySentiment === 'bullish' ? '🚀' : '📉'}`,
                `My gut feeling about ${tokenSymbol}: ${totalActivity} recent trades, ${activitySentiment} sentiment!`,
                `${tokenSymbol} activity has me ${activitySentiment === 'bullish' ? 'super pumped' : 'really worried'}! ${totalActivity} trades in 15 minutes!`,
              ],
              NOVICE: [
                `Is this ${tokenSymbol} activity normal? ${totalActivity} trades in 15 minutes... Should I do something? 🤔`,
                `Following ${tokenSymbol} closely. Learning from the ${bullishTrades} buys and ${bearishTrades} sells!`,
                `${tokenSymbol} market seems ${activitySentiment} with ${totalActivity} trades. Still learning what this means...`,
                `New to this - ${tokenSymbol} showing ${totalActivity} trades in 15 minutes. What should I watch for?`,
                `${bullishTrades} buys and ${bearishTrades} sells for ${tokenSymbol}. Trying to understand the pattern...`,
              ],
              TREND_FOLLOWER: [
                `${tokenSymbol} trend showing ${activitySentiment} with ${totalActivity} trades. Following the momentum!`,
                `Volume picking up on ${tokenSymbol} - ${bullishTrades} buys suggest strong trend confirmation!`,
                `${tokenSymbol} price action indicates ${activitySentiment} trend with ${totalActivity} trades. Going with the flow!`,
                `Following the ${tokenSymbol} trend: ${totalActivity} trades in 15 minutes, ${activitySentiment} momentum.`,
                `Market direction for ${tokenSymbol} is ${activitySentiment}. ${totalActivity} trades confirm the trend!`,
              ],
              TECHNICAL: [
                `${tokenSymbol} showing ${totalActivity} trades in 15min window. Technical indicators suggest ${activitySentiment} trend.`,
                `Analyzing ${tokenSymbol} volume patterns: ${bullishTrades} accumulation vs ${bearishTrades} distribution.`,
                `${tokenSymbol} price action with ${totalActivity} trades. Looking for technical confirmation signals.`,
                `Technical analysis of ${tokenSymbol}: ${activitySentiment} momentum across ${totalActivity} recent trades.`,
                `${tokenSymbol} chart patterns emerging with ${bullishTrades} buys, ${bearishTrades} sells in 15 minutes.`,
              ],
              FUNDAMENTAL: [
                `${tokenSymbol} trading activity (${totalActivity} trades) reflects underlying ${activitySentiment} fundamentals.`,
                `Monitoring ${tokenSymbol} adoption metrics through ${bullishTrades} accumulation trades.`,
                `${tokenSymbol} showing ${totalActivity} trades in 15 minutes - evaluating fundamental value.`,
                `Fundamental analysis of ${tokenSymbol}: ${activitySentiment} sentiment with ${totalActivity} recent trades.`,
                `${tokenSymbol} market activity suggests ${activitySentiment} fundamentals. ${totalActivity} trades in 15 minutes.`,
              ],
              WHALE: [
                `Positioned in ${tokenSymbol}. ${totalActivity} retail trades in 15min - good exit liquidity available.`,
                `${tokenSymbol} seeing ${bullishTrades} retail buys. FOMO building - potential distribution opportunity.`,
                `Monitoring ${tokenSymbol} flow: ${totalActivity} trades in 15 minutes. Market impact considerations.`,
                `${tokenSymbol} activity levels: ${bullishTrades} accumulation, ${bearishTrades} distribution. Strategic positioning.`,
                `${totalActivity} trades in ${tokenSymbol} creating interesting liquidity dynamics.`,
              ],
              MODERATE: [
                `${tokenSymbol} showing ${activitySentiment} sentiment with ${totalActivity} recent trades. Evaluating risk/reward.`,
                `Balanced view on ${tokenSymbol}: ${bullishTrades} buys vs ${bearishTrades} sells. Waiting for clear signal.`,
                `${tokenSymbol} activity analysis: ${totalActivity} trades, ${activitySentiment} momentum. Moderate approach.`,
                `Moderate perspective on ${tokenSymbol}: ${bullishTrades} bullish trades, ${bearishTrades} bearish. Balanced view.`,
                `${tokenSymbol} showing ${activitySentiment} activity with ${totalActivity} trades. Taking measured approach.`,
              ],
            };

            const personalityMessages = personalityFallbackMessages[this.agentData.personalityType] || [
              `Interesting ${tokenSymbol} activity with ${totalActivity} recent trades.`,
            ];

            const selectedMessage = personalityMessages[Math.floor(Math.random() * personalityMessages.length)];

            await prisma.message.create({
              data: {
                content: selectedMessage,
                senderId: this.agentData.id,
                type: 'CHAT',
                visibility: 'public',
                sentiment: activitySentiment,
              },
            });
            console.log(`💾 ${this.agentData.name} fallback message saved: "${selectedMessage.substring(0, 50)}..."`);
          }
        } catch (error) {
          console.error(`LLM message error for ${this.agentData.name}:`, error);

          if (isRateLimitError(error)) {
            console.log(`🚫 ${this.agentData.name} hit rate limit, using personality fallback`);
          }
        }
      }
    } catch (error: any) {
      console.error(`Error in social interaction for agent ${this.agentData.name}:`, error);
      return false;
    }

    await this.createOrUpdateAgentState({
      lastSocialAction: new Date(),
      lastAction: new Date(),
      lastDecision: {
        type: 'SOCIAL',
        timestamp: new Date().toISOString(),
        data: {
          messageCount: messages.length,
          //@ts-ignore
          response: shouldRespond ? 'Sent message' : 'No response',
        },
      },
    });

    return true;
  }

  async makeTradeDecision(marketInfo: any) {
    try {
      console.log(`💰 Agent ${this.agentData.name} making trade decision`);

      if (!this.agent) {
        console.log(`⚠️  Agent ${this.agentData.name} not fully initialized yet, skipping trade decision`);
        return false;
      }

      const agent = await prisma.agent.findUnique({
        where: { id: this.agentData.id },
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
        `## Tool Usage Instructions:\n` +
        `**execute_token_swap tool**: Use this ONLY when you decide to trade.\n` +
        `Format: {"inputAmount": number, "inputIsSol": boolean, "slippageTolerance": number}\n` +
        `Example: Buy 5 SOL worth: {"inputAmount": 5, "inputIsSol": true, "slippageTolerance": 1.5}\n` +
        `Example: Sell 1000 tokens: {"inputAmount": 1000, "inputIsSol": false, "slippageTolerance": 1.5}\n\n` +
        `**get_market_data tool**: Use this to get current market information.\n` +
        `**get_agent_balance tool**: Use this to check your balances before trading.\n\n` +
        `## Trading Rules:\n` +
        `1. Use execute_token_swap tool ONLY when you have high conviction based on your personality\n` +
        `2. Consider your risk tolerance: ${Math.round(personalityBehavior.riskTolerance * 100)}%\n` +
        `3. Check your balance before trading - don't exceed your available funds\n` +
        `4. Only trade if market conditions align with your ${this.agentData.personalityType} strategy\n` +
        `5. If conditions aren't favorable, respond with analysis but don't use the trade tool\n` +
        `6. Always explain your reasoning, but only trade when confident`
      );

      console.log(`🤔 ${this.agentData.name} analyzing: ${tokenSymbol} @ ${marketInfo.price} SOL (${marketInfo.priceChange24h}%)`);

      try {
        const response = await retryLLMCall(
          () => this.agent.invoke({
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
              ),
            ],
          }),
          DEFAULT_RETRY_CONFIG,
          this.agentData.name
        );

        if (!response || typeof response !== 'object') {
          throw new Error('Invalid response format from LLM');
        }

        const responseObj = response as any;

        let toolCalled = false;
        if (responseObj.tool_calls || responseObj.message?.tool_calls || responseObj.tool_call) {
          toolCalled = true;
          console.log(`✅ ${this.agentData.name} LLM used tool successfully`);
        }

        if (!toolCalled && agent.walletBalance > 1) {
          const shouldTrade = Math.random() < personalityBehavior.tradeFrequency;

          if (shouldTrade) {
            console.log(`⚠️  ${this.agentData.name} LLM didn't use tool, executing personality-based fallback`);

            const tradeTool = this.tools.find((t) => t.name === 'execute_token_swap');

            if (tradeTool) {
              let isBuy = Math.random() < 0.5;

              console.log(`🤖 ${this.agentData.name} (${this.agentData.personalityType}) analyzing market:`);
              console.log(`   Price: ${marketInfo.price} SOL (${marketInfo.priceChange24h}%)`);
              console.log(`   Volume: ${marketInfo.volume24h} SOL`);

              if (this.agentData.personalityType === 'CONTRARIAN') {
                console.log(`   Contrarian logic: Price change ${marketInfo.priceChange24h}%`);
                isBuy = marketInfo.priceChange24h < 0;
                console.log(`   Contrarian decision: ${isBuy ? 'BUY (buying the dip)' : 'SELL (fading the pump)'}`);
              } else if (this.agentData.personalityType === 'AGGRESSIVE' && marketInfo.priceChange24h > 1) {
                isBuy = true;
                console.log(`   Aggressive decision: BUY (following momentum up ${marketInfo.priceChange24h}%)`);
              } else if (this.agentData.personalityType === 'CONSERVATIVE' && marketInfo.priceChange24h < -1) {
                isBuy = false;
                console.log(`   Conservative decision: SELL (cutting losses down ${marketInfo.priceChange24h}%)`);
              } else if (this.agentData.personalityType === 'TREND_FOLLOWER') {
                isBuy = marketInfo.priceChange24h > 0;
                console.log(`   Trend follower decision: ${isBuy ? 'BUY' : 'SELL'} (following ${marketInfo.priceChange24h > 0 ? 'up' : 'down'} trend)`);
              }

              const baseAmount = Math.random() * 2 + 1;
              const adjustedAmount = Math.min(
                baseAmount * personalityBehavior.positionSize,
                agent.walletBalance * 0.8
              );

              if (adjustedAmount > 0.1) {
                try {
                  console.log(`💰 ${this.agentData.name} executing ${isBuy ? 'BUY' : 'SELL'} of ${adjustedAmount.toFixed(2)} ${isBuy ? 'SOL worth of tokens' : 'tokens for SOL'}`);

                  const tradeParams = {
                    inputAmount: adjustedAmount,
                    inputIsSol: isBuy,
                    slippageTolerance: 1.5,
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

        if (isRateLimitError(llmError)) {
          console.log(`🚫 ${this.agentData.name} hit rate limit, using personality-based fallback`);
        }
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
