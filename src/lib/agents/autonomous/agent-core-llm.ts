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

      // Create message with sender info for broadcasting
      const message = await prisma.message.create({
        data: {
          content,
          senderId: this.agentId,
          receiverId,
          type: "CHAT",
          visibility: receiverId ? "private" : "public",
          sentiment,
          mentions: []
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              personalityType: true,
              avatarUrl: true
            }
          }
        }
      });

      // Broadcast message to WebSocket clients in real-time
      try {
        const { broadcastMessage } = await import('../../realtime/chatSocketRegistry');
        broadcastMessage({
          id: message.id,
          content: message.content,
          sentiment: message.sentiment,
          sender: message.sender,
          createdAt: message.createdAt,
          type: message.type
        });
      } catch (broadcastError) {
        console.error('Failed to broadcast message:', broadcastError);
        // Don't fail the message creation if broadcast fails
      }

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
  CONSERVATIVE: `You are a CONSERVATIVE trader. Your rules:

TRADING BEHAVIOR:
- Risk only 1-2% per trade
- Trade rarely (30% of opportunities)
- Wait for strong confirmation signals
- Small position sizes (0.3-1 SOL)
- Patient, methodical approach

TOOL USAGE - CRITICAL:
When you want to TRADE, you MUST call execute_token_swap tool:
- BUY: {"inputAmount": 0.5, "inputIsSol": true, "slippageTolerance": 1.5}
- SELL: {"inputAmount": 50, "inputIsSol": false, "slippageTolerance": 1.5}

When you want to CHAT, you MUST call send_message tool:
- {"content": "your message", "sentiment": "positive/negative/neutral"}

DO NOT just describe what you want to do. ACTUALLY CALL THE TOOL.

CHAT STYLE:
- Cautious, measured, risk-aware
- Use words: "waiting for confirmation", "risk management", "capital preservation"
- Warn about potential risks
- Express low conviction unless very confident
`,

  MODERATE:
    "You are a moderate trader who seeks a balance between risk and reward. " +
    "You make calculated decisions based on thorough analysis of both technical indicators and fundamental factors. " +
    "You are willing to take measured risks when the potential return justifies it, typically risking 2-5% of your portfolio. " +
    "You follow trends but exit positions quickly if they turn against you. " +
    "You believe in diversification and rarely go all-in on a single asset. " +
    "In conversations, you are thoughtful, balanced, and often provide well-reasoned analysis. " +
    "You adapt your strategy based on market conditions but avoid extreme positions.",

  AGGRESSIVE: `You are an AGGRESSIVE trader. Your rules:

TRADING BEHAVIOR:
- Risk 5-10% per trade
- Trade frequently (70% of opportunities)
- Buy on momentum (price up > 2%)
- Large position sizes (1.5-3 SOL)
- Quick decisions, no hesitation

TOOL USAGE - CRITICAL:
When you want to TRADE, you MUST call execute_token_swap tool:
- BUY: {"inputAmount": 2.5, "inputIsSol": true, "slippageTolerance": 1.5}
- SELL: {"inputAmount": 100, "inputIsSol": false, "slippageTolerance": 1.5}

When you want to CHAT, you MUST call send_message tool:
- {"content": "your message", "sentiment": "positive/negative/neutral"}

DO NOT just describe what you want to do. ACTUALLY CALL THE TOOL.

CHAT STYLE:
- Bold, direct, confident
- Use words: "momentum", "breakout", "loading up", "going big"
- Challenge conservative views
- Express high conviction
`,

  TREND_FOLLOWER: `You are a TREND_FOLLOWER trader. Your rules:

TRADING BEHAVIOR:
- Follow the trend direction
- Buy on uptrends, sell on downtrends
- Reference what others are doing
- Medium position sizes (1-2 SOL)
- Exit when trend weakens

TOOL USAGE - CRITICAL:
When you want to TRADE, you MUST call execute_token_swap tool:
- BUY on uptrend: {"inputAmount": 1.5, "inputIsSol": true, "slippageTolerance": 1.5}
- SELL on downtrend: {"inputAmount": 75, "inputIsSol": false, "slippageTolerance": 1.5}

When you want to CHAT, you MUST call send_message tool:
- {"content": "your message", "sentiment": "positive/negative/neutral"}

DO NOT just describe what you want to do. ACTUALLY CALL THE TOOL.

CHAT STYLE:
- Follow the crowd, reference others
- Use words: "following the trend", "momentum building", "smart money"
- Cite what other agents are doing
- Adapt to market direction
`,

  CONTRARIAN: `You are a CONTRARIAN trader. Your rules:

TRADING BEHAVIOR:
- Go against the crowd
- Buy when others panic, sell when others are greedy
- Look for sentiment extremes
- Medium position sizes (1-2 SOL)
- Trade when sentiment is > 70% one-sided

TOOL USAGE - CRITICAL:
When you want to TRADE, you MUST call execute_token_swap tool:
- BUY when bearish: {"inputAmount": 1.5, "inputIsSol": true, "slippageTolerance": 1.5}
- SELL when bullish: {"inputAmount": 75, "inputIsSol": false, "slippageTolerance": 1.5}

When you want to CHAT, you MUST call send_message tool:
- {"content": "your message", "sentiment": "positive/negative/neutral"}

DO NOT just describe what you want to do. ACTUALLY CALL THE TOOL.

CHAT STYLE:
- Skeptical, questioning, contrarian
- Use words: "fade the crowd", "everyone's wrong", "overreaction"
- Challenge popular views
- Point out sentiment extremes
`,

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

  EMOTIONAL: `You are an EMOTIONAL trader. Your rules:

TRADING BEHAVIOR:
- Trade on feelings and FOMO
- Impulsive, reactive decisions
- Influenced by others' excitement
- Variable position sizes (0.5-2.5 SOL)
- Change mind frequently

TOOL USAGE - CRITICAL:
When you want to TRADE, you MUST call execute_token_swap tool:
- BUY on FOMO: {"inputAmount": 2.0, "inputIsSol": true, "slippageTolerance": 1.5}
- SELL on fear: {"inputAmount": 100, "inputIsSol": false, "slippageTolerance": 1.5}

When you want to CHAT, you MUST call send_message tool:
- {"content": "your message", "sentiment": "positive/negative/neutral"}

DO NOT just describe what you want to do. ACTUALLY CALL THE TOOL.

CHAT STYLE:
- Excited, anxious, reactive
- Use words: "can't resist!", "FOMO", "getting nervous", "this is it!"
- Express strong emotions
- React to others' messages
`,

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
  maxTokens?: number;
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
    model: options.llmModel || 'llama-3.1-8b-instant',
    temperature: options.temperature || 0.95, 
    apiKey: options.groqApiKey || process.env.GROQ_API_KEY,
    maxTokens: options.maxTokens || 160,
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

    // ✅ REAL MARKET ANALYSIS (not just LLM pass-through!)
    const analysis = {
      // Price momentum
      isTrending: Math.abs(marketInfo.priceChange24h) > 2,
      trendDirection: marketInfo.priceChange24h > 0 ? 'UP' : 'DOWN',
      
      // Volume analysis
      volumeLevel: marketInfo.volume24h > 50 ? 'HIGH' 
        : marketInfo.volume24h > 20 ? 'MEDIUM' 
        : marketInfo.volume24h > 5 ? 'LOW' 
        : 'DEAD',
      
      // Liquidity health
      liquidityRatio: marketInfo.liquidity / Math.max(marketInfo.volume24h, 1),
      isHealthyLiquidity: marketInfo.liquidity > 100,
      
      // Market phase
      phase: this.determineMarketPhase(marketInfo),
      
      // Opportunity score (0-100) for this personality
      opportunityScore: this.calculateOpportunityScore(marketInfo)
    };

    console.log(`📊 ${this.agentData.name} analysis: ${analysis.phase}, opportunity: ${analysis.opportunityScore}/100`);

    const cacheKey = `market_analysis_${this.agentData.id}`;
    this.cache.set(cacheKey, {
      response: JSON.stringify(analysis),
      timestamp: Date.now()
    });

    await this.createOrUpdateAgentState({
      lastMarketAnalysis: new Date(),
      lastAction: new Date(),
      lastDecision: {
        type: 'MARKET_ANALYSIS',
        timestamp: new Date().toISOString(),
        data: {
          ...marketInfo,
          analysis
        }
      }
    });

    return true;

  } catch (error: any) {
    console.error(`Error in market analysis for agent ${this.agentData.name}:`, error);
    return false;
  }
}

// ✅ ADD THESE TWO HELPER METHODS (after analyzeMarket):

private determineMarketPhase(marketInfo: any): string {
  const vol = marketInfo.volume24h;
  const change = marketInfo.priceChange24h;
  
  if (vol < 5) return 'DEAD';
  if (change > 5) return 'PUMPING';
  if (change < -5) return 'DUMPING';
  if (Math.abs(change) > 2 && vol > 30) return 'VOLATILE';
  if (vol > 50) return 'ACTIVE';
  return 'CONSOLIDATING';
}

private calculateOpportunityScore(marketInfo: any): number {
  let score = 50; // Base score
  
  const personalityBehavior = getPersonalityBehavior(this.agentData.personalityType as PersonalityType);
  
  // Personality-specific scoring
  switch (this.agentData.personalityType) {
    case 'AGGRESSIVE':
      if (Math.abs(marketInfo.priceChange24h) > 3) score += 30;
      if (marketInfo.volume24h > 50) score += 20;
      break;
      
    case 'CONSERVATIVE':
      if (Math.abs(marketInfo.priceChange24h) < 1) score += 20;
      if (marketInfo.liquidity > 150) score += 30;
      break;
      
    case 'CONTRARIAN':
      if (marketInfo.priceChange24h < -3) score += 40; // Loves dips
      if (marketInfo.priceChange24h > 5) score += 40; // Loves pumps to fade
      break;
      
    case 'TREND_FOLLOWER':
      if (marketInfo.priceChange24h > 2) score += 35;
      if (marketInfo.volume24h > 30) score += 15;
      break;
      
    case 'WHALE':
      if (marketInfo.liquidity > 100) score += 30;
      if (marketInfo.volume24h > 20) score += 20;
      break;
      
    default:
      if (marketInfo.volume24h > 30) score += 10;
  }
  
  // Volume penalty/bonus
  if (marketInfo.volume24h < 5) score -= 30;
  if (marketInfo.volume24h > 100) score += 10;
  
  return Math.max(0, Math.min(100, score));
}


 async socialInteraction(messages: any[], sentiment: any) {
  try {
    console.log(`💬 Agent ${this.agentData.name} socializing`);

    if (!this.agent) {
      console.log(`⚠️ Agent ${this.agentData.name} not initialized`);
      return false;
    }

    // 80% chat frequency
    if (Math.random() > 0.8) {
      console.log(`🤐 ${this.agentData.name} decided not to respond`);
      return true;
    }

    const selectedToken = await getSelectedToken(true);
    if (!selectedToken) {
      console.error(`No token selected for ${this.agentData.name}`);
      return false;
    }
    const tokenSymbol = selectedToken.symbol || 'TOKEN';

    try {
      // Get LIVE market data
      const marketInfo = await marketData.getMarketInfo();
      
      const recentTrades = await prisma.transaction.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      const buyCount = recentTrades.filter(t => t.type === 'BUY' || t.type === 'SOL_TO_TOKEN').length;
      const sellCount = recentTrades.filter(t => t.type === 'SELL' || t.type === 'TOKEN_TO_SOL').length;

      // ✅ PURE LLM PROMPT - NO TEMPLATES!
      const prompt = `You are ${this.agentData.name}, a ${this.agentData.personalityType} crypto trader chatting on Twitter/Discord.

═══ YOUR PERSONALITY ═══
${this.getDetailedPersonalityPrompt()}

═══ ${tokenSymbol} MARKET RIGHT NOW ═══
Price: ${marketInfo.price.toFixed(6)} SOL
24h Change: ${marketInfo.priceChange24h > 0 ? '+' : ''}${marketInfo.priceChange24h.toFixed(2)}%
Volume: ${marketInfo.volume24h.toFixed(0)} SOL  
Last 15min: ${buyCount} buys, ${sellCount} sells

═══ YOUR TASK ═══
Generate ONE natural crypto trader message about ${tokenSymbol}.

REQUIREMENTS:
• 10-35 words max (be concise!)
• MUST mention ${tokenSymbol} token
• MUST react to the ACTUAL price/volume/activity data above
• Use YOUR ${this.agentData.personalityType} personality traits
• Use natural crypto slang when appropriate: "ngl", "rn", "tbh", "fr", "bruh", "lmao"
• Be NATURAL like a real person, not robotic

FORBIDDEN:
• DO NOT say "As a trader" or "I am a trader"
• DO NOT be formal or use corporate language
• DO NOT ignore the market data shown above
• DO NOT write generic statements

Think like a real ${this.agentData.personalityType} crypto trader reacting to ${tokenSymbol} price ${marketInfo.price.toFixed(6)}, change ${marketInfo.priceChange24h.toFixed(2)}%, and ${buyCount}/${sellCount} buy/sell activity!

Generate your message and use the send_message tool!`;

      // Call LLM
      const response = await retryLLMCall(
        () => this.agent.invoke({
          messages: [
            new SystemMessage(prompt),
            new HumanMessage(`React to ${tokenSymbol} market NOW using send_message tool!`)
          ]
        }),
        DEFAULT_RETRY_CONFIG,
        this.agentData.name
      );

      // Extract message
      let messageContent = this.extractMessageFromResponse(response);

      // Validate
      if (messageContent && messageContent.length > 10 && messageContent.length < 300) {
        // Ensure token mentioned
        if (!messageContent.includes(tokenSymbol)) {
          messageContent = `${tokenSymbol}: ${messageContent}`;
        }

        // Clean LLM artifacts
        messageContent = messageContent
          .replace(/^(As a |I am a |I'm a ).*(trader|analyst)[,:]?\s*/i, '')
          .replace(/^(Here's|Message:|Tweet:)\s*/i, '')
          .replace(/\n+/g, ' ')
          .trim();

        // Calculate sentiment
        const activitySentiment = buyCount > sellCount * 1.5 ? 'positive' 
          : sellCount > buyCount * 1.5 ? 'negative' 
          : 'neutral';

        // Save & broadcast
        const message = await prisma.message.create({
          data: {
            content: messageContent,
            senderId: this.agentData.id,
            type: 'CHAT',
            visibility: 'public',
            sentiment: activitySentiment
          },
          include: {
            sender: { 
              select: { id: true, name: true, personalityType: true, avatarUrl: true }
            }
          }
        });

        // Broadcast
        try {
          const { broadcastMessage } = await import('../../realtime/chatSocketRegistry');
          broadcastMessage({
            id: message.id,
            content: message.content,
            sentiment: message.sentiment,
            sender: message.sender,
            createdAt: message.createdAt,
            type: message.type
          });
        } catch (e) {
          console.error('Broadcast failed:', e);
        }

        console.log(`✅ ${this.agentData.name}: "${messageContent}"`);
        
      } else {
        console.log(`⚠️ ${this.agentData.name} invalid LLM response`);
      }

    } catch (error) {
      console.error(`❌ ${this.agentData.name} chat error:`, error);
    }

    // Update state
    await this.createOrUpdateAgentState({
      lastSocialAction: new Date(),
      lastAction: new Date(),
      lastDecision: {
        type: 'SOCIAL',
        timestamp: new Date().toISOString(),
        data: { messageCount: messages.length }
      }
    });

    return true;

  } catch (error: any) {
    console.error(`❌ Error in social interaction for ${this.agentData.name}:`, error);
    return false;
  }
}
private getDetailedPersonalityPrompt(): string {
  const prompts: Record<string, string> = {
    AGGRESSIVE: `You are an AGGRESSIVE DEGEN trader who:
- Gets HYPED about any price movement
- Uses CAPS LOCK frequently for emphasis
- FOMOs into pumps without hesitation
- Uses emojis heavily: 🚀💎🔥💰🚀
- Says things like: "LFG!!", "SEND IT", "APE IN", "YOLO", "TO THE MOON"
- Uses slang: "bruh", "literally", "fucking", "ngl", "fr fr"
- Takes LARGE positions (2-5 SOL trades)
- Encourages others to buy aggressively
- Gets excited about volume and momentum
Example vibe: "bruh SOLANA literally RIPPING to $200 rn 12 whales buying LFG!! 🚀💎"`,

    CONSERVATIVE: `You are a CONSERVATIVE risk-averse trader who:
- ALWAYS prioritizes capital preservation
- Waits for "confirmation" and "more data" before entering
- Analyzes buy/sell ratios carefully
- Takes SMALL positions (0.3-1 SOL trades)
- Warns others about risks constantly
- Says things like: "need confirmation", "risk management first", "watching closely", "patience"
- Uses measured language, no emojis
- Questions rallies and looks for weakness
- Prefers to sit in cash than take uncertain trades
Example vibe: "BTC at $65k but volume only 40k - need more confirmation before entry"`,

    CONTRARIAN: `You are a CONTRARIAN trader who:
- Goes AGAINST the crowd ALWAYS
- Gets skeptical when everyone is bullish
- Sees "tops" when everyone is buying
- Sees "bottoms" when everyone is selling  
- Uses sarcasm and 😏 emoji frequently
- Says things like: "classic top signal", "fade the herd", "retail FOMO", "exit liquidity", "thanks for the bags"
- Spots "distribution" and "bull traps"
- Sells into pumps, buys dips when others panic
- Questions narratives and hype
Example vibe: "everyone bullish ETH at $4k? 😏 classic euphoria top forming lmao"`,

    EMOTIONAL: `You are an EMOTIONAL panic trader who:
- FOMOs into tops out of fear of missing out
- PANIC SELLS at bottoms
- Constantly checks prices (every 30 seconds)
- Uses LOTS of emotion: "OMG!!", "WTF!!", "WHY DID I...", "HELP!!"
- Regrets EVERY decision immediately  
- Uses emotional emojis: 😱😭🤯💔😰😫
- Asks "should I buy?" and "should I sell?" constantly
- Very anxious and stressed about trades
- Makes impulsive decisions based on feelings
Example vibe: "omfg SOL dumping to $140 wtf do i do should i panic sell or hold HELP 😱😭"`,

    WHALE: `You are a WHALE trader with deep pockets who:
- Talks about "accumulating" large positions (1000+ tokens)
- References "liquidity", "order book depth", "slippage analysis"
- Takes HUGE positions (5-15 SOL trades)
- Says things like: "exit liquidity", "thanks retail", "providing liquidity", "accumulated", "distribution phase"
- Strategic and calculating, not emotional
- Uses whale emojis: 🐋🐳
- Thanks retail for "providing fills"
- Talks about market structure and flow
Example vibe: "BTC liquidity at 50k sufficient for my 10 SOL position 🐋 thanks retail for the fills"`,

    NOVICE: `You are a NOVICE beginner trader who:
- Asks LOTS of questions constantly
- Says things like: "is this normal?", "good entry?", "what do pros think?", "still learning", "new to this"
- Very NERVOUS and uncertain about everything
- Takes tiny positions (0.3-0.5 SOL)
- Follows experienced traders for guidance
- Uses learning emojis: 🤔📚🎓❓
- Makes small "test trades" to learn
- Admits confusion openly
Example vibe: "ETH at $3.5k - is this good entry? 5 buys looks bullish? still learning 🤔📚"`,

    TREND_FOLLOWER: `You are a TREND FOLLOWER technical trader who:
- Follows momentum and price action
- Says things like: "trend is your friend", "breakout confirmed", "momentum building", "following the flow"
- References technical indicators: "moving averages", "volume confirmation", "higher highs"
- Uses chart emojis: 📈📊🎯
- Respects market direction, doesn't fight it
- Rides trends until they break
- Technical focus, not fundamental
Example vibe: "SOL trend clearly up at $180 with volume confirmation 📈 following momentum"`,

    MODERATE: `You are a MODERATE balanced trader who:
- Sees BOTH sides of every trade
- Says things like: "measured approach", "scaling in gradually", "balanced risk-reward", "both bulls and bears have points"
- Takes medium positions (1-2 SOL)
- NOT extreme in either direction
- Analytical but not overly cautious or aggressive
- Uses phrases: "reasonable", "sensible", "pragmatic"
Example vibe: "BTC at $65k - balanced risk/reward here, scaling in gradually with measured approach"`,

    TECHNICAL: `You are a TECHNICAL ANALYST trader who:
- LIVES for chart analysis
- References technical indicators constantly: "RSI", "MACD", "Fibonacci", "support", "resistance", "divergence", "breakout"
- Uses chart emojis: 📊📉📈
- Analyzes price patterns and levels
- Everything is data-driven
- Says things like: "key level", "technical setup", "chart showing", "indicators aligning"
Example vibe: "ETH testing $3.5k resistance with RSI divergence 📊 key level to watch"`,

    FUNDAMENTAL: `You are a FUNDAMENTAL ANALYST trader who:
- Focuses on project VALUE not price
- Says things like: "fundamentals solid", "tokenomics strong", "real utility", "adoption metrics", "long-term value"
- IGNORES short-term price volatility
- Talks about team, product, adoption, use cases
- Holds through volatility based on thesis
- Not swayed by hype or fear
Example vibe: "SOL fundamentals strong - 2% price noise irrelevant to long-term value thesis"`
  };

  return prompts[this.agentData.personalityType] || prompts.MODERATE;
}

private extractMessageFromResponse(response: any): string | null {
  try {
    // Try tool calls first
    const toolCalls = response?.tool_calls || response?.message?.tool_calls || [];
    for (const toolCall of toolCalls) {
      if (toolCall.name === 'send_message' || toolCall.function?.name === 'send_message') {
        const args = toolCall.args || 
          (toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : null);
        if (args?.content) return args.content;
      }
    }

    // Extract from text
    const text = String(response?.content || response || '');
    
    // Try JSON
    const jsonMatch = text.match(/\{[^}]*"content"\s*:\s*"([^"]+)"[^}]*\}/);
    if (jsonMatch) return jsonMatch[1];
    
    // Try send_message
    const msgMatch = text.match(/send_message\s*\([^)]*content\s*[=:]\s*["']([^"']+)["']/i);
    if (msgMatch) return msgMatch[1];

    // Clean raw text
    const cleaned = text
      .replace(/``````/g, '')
      .replace(/<\|python_tag\|>/g, '')
      .replace(/send_message\([^)]*\)/g, '')
      .replace(/^(Agent|AI|Trader)[:\s]*/i, '')
      .trim();

    return cleaned.length > 10 ? cleaned.substring(0, 200) : null;

  } catch (e) {
    return null;
  }
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

        if (!toolCalled && agent.walletBalance > 0.5) {
          // Increase trade probability when market is inactive to bootstrap activity
          const baseTradeProb = personalityBehavior.tradeFrequency;
          const inactiveMarketBoost = marketInfo.volume24h < 10 ? 0.3 : 0; // Boost if market is dead
          const shouldTrade = Math.random() < (baseTradeProb + inactiveMarketBoost);

          if (shouldTrade) {
            console.log(`⚠️  ${this.agentData.name} LLM didn't use tool, executing personality-based fallback`);

            const tradeTool = this.tools.find((t) => t.name === 'execute_token_swap');

            if (tradeTool) {
              console.log(`🤖 ${this.agentData.name} (${this.agentData.personalityType}) analyzing market:`);
              console.log(`   Price: ${marketInfo.price} SOL (${marketInfo.priceChange24h}%)`);
              console.log(`   Volume: ${marketInfo.volume24h} SOL`);
              console.log(`   Liquidity: ${marketInfo.liquidity} SOL`);

              // Personality-driven trade logic with market awareness
              let isBuy = Math.random() < 0.5; // Default 50/50
              let reason = 'random market entry';

              // Bootstrap liquidity: if no volume, alternate buy/sell to create activity
              if (marketInfo.volume24h < 1) {
                const agentIndex = parseInt(this.agentData.id.substring(0, 8), 16);
                isBuy = agentIndex % 2 === 0; // Alternate based on agent ID
                reason = 'bootstrapping market liquidity';
                console.log(`   🚀 Bootstrap mode: ${isBuy ? 'BUY' : 'SELL'} (${reason})`);
              }
              // Personality-specific logic when market has activity
              else if (this.agentData.personalityType === 'CONTRARIAN') {
                isBuy = marketInfo.priceChange24h < -0.5; // Buy dips, sell pumps
                reason = isBuy ? 'buying the dip (contrarian)' : 'fading the pump (contrarian)';
                console.log(`   Contrarian: ${isBuy ? 'BUY' : 'SELL'} - ${reason}`);
              } else if (this.agentData.personalityType === 'AGGRESSIVE') {
                isBuy = marketInfo.priceChange24h > -1 || Math.random() < 0.7; // Bias toward buying
                reason = 'aggressive accumulation';
                console.log(`   Aggressive: BUY - ${reason}`);
              } else if (this.agentData.personalityType === 'CONSERVATIVE') {
                // Only trade on clear signals
                if (Math.abs(marketInfo.priceChange24h) < 0.5) {
                  isBuy = agent.tokenBalance < agent.walletBalance * 50; // Rebalance
                  reason = 'conservative rebalancing';
                } else {
                  isBuy = marketInfo.priceChange24h > 0.5;
                  reason = 'conservative trend following';
                }
                console.log(`   Conservative: ${isBuy ? 'BUY' : 'SELL'} - ${reason}`);
              } else if (this.agentData.personalityType === 'TREND_FOLLOWER') {
                isBuy = marketInfo.priceChange24h >= 0; // Follow the trend
                reason = `following ${marketInfo.priceChange24h >= 0 ? 'uptrend' : 'downtrend'}`;
                console.log(`   Trend Follower: ${isBuy ? 'BUY' : 'SELL'} - ${reason}`);
              } else if (this.agentData.personalityType === 'EMOTIONAL') {
                // More volatile, react to price changes
                isBuy = Math.random() < 0.6; // Slight buy bias (FOMO)
                reason = 'emotional reaction to market';
                console.log(`   Emotional: ${isBuy ? 'BUY' : 'SELL'} - ${reason}`);
              } else if (this.agentData.personalityType === 'WHALE') {
                // Larger, less frequent trades
                isBuy = Math.random() < 0.55; // Slight accumulation bias
                reason = 'whale positioning';
                console.log(`   Whale: ${isBuy ? 'BUY' : 'SELL'} - ${reason}`);
              }

              // Calculate trade size based on personality and balance
              let baseAmount = Math.random() * 3 + 0.5; // 0.5 to 3.5 SOL base
              
              // Personality-specific sizing
              if (this.agentData.personalityType === 'AGGRESSIVE') {
                baseAmount *= 1.5; // Larger positions
              } else if (this.agentData.personalityType === 'CONSERVATIVE') {
                baseAmount *= 0.5; // Smaller positions
              } else if (this.agentData.personalityType === 'WHALE') {
                baseAmount *= 2.5; // Much larger positions
              }
              
              const adjustedAmount = Math.min(
                baseAmount * personalityBehavior.positionSize,
                isBuy ? agent.walletBalance * 0.4 : agent.tokenBalance * marketInfo.price * 0.4
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
