import { Tool } from "@langchain/core/tools";
import { prisma } from "../../cache/dbCache";
import { amm } from "../../blockchain/amm";
import { marketData } from "../../market/data";
import { getSelectedToken } from "../../config/selectedToken";
import { getSolBalance, getSplTokenBalance } from "@/blockchain/onchain-balances";

export class MarketDataTool extends Tool {
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


export class TokenSwapTool extends Tool {
  name = "execute_token_swap";
  description = "Execute a token swap between SOL and the selected SPL token. Input should be a JSON object with parameters: inputAmount (number), inputIsSol (boolean), and optionally slippageTolerance (number).";

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
          const selectedToken = await getSelectedToken();
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
      const tokenSymbol = selectedToken.symbol || 'TOKEN';
      console.log(`[TRADE] Agent ${this.agentId} attempting to ${inputIsSol ? 'buy' : 'sell'} with ${inputAmount} ${inputIsSol ? 'SOL' : tokenSymbol}`);

      const safeSlippageTolerance = Math.max(1.0, Math.min(5, slippageTolerance || 1.0));


      try {
        const result = await amm.executeSwap(
          this.agentId,
          inputAmount,
          inputIsSol,
          safeSlippageTolerance,
          selectedToken.mint,
          selectedToken.decimals
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


 
export class GetBalanceTool extends Tool {
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


export class SendMessageTool extends Tool {
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
export class ReadMessagesTool extends Tool {
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