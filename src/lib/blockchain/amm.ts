import { prisma } from '../cache/dbCache';
import { MarketState } from '@prisma/client';
import { marketData } from '../market/data'; // For market state update in executeSwap
import { getSolBalance, getSplTokenBalance } from '@/blockchain/onchain-balances';
import { getQuote } from '@/services/market';

/**
 * AMM (Automated Market Maker) implementation
 *
 * Implements a constant product market maker (x*y=k) for the token swap pool
 */
export const amm = {
  /**
   * Ensure market data and pool data are synchronized.
   * Call this periodically to keep the UI data in sync.
   */
  async syncMarketData() {
    try {
      console.log("Synchronizing market data with pool state...");

      // Get current pool state
      const pool = await this.getPoolState();

      if (!pool) {
        console.error("Cannot sync market data: Pool not found");
        return;
      }

      // Update the pool state with the latest price and timestamp
      const poolUpdates = {
        currentPrice: pool.solAmount / pool.tokenAmount,
        lastUpdated: new Date()
      };

      await this.updatePoolState(poolUpdates);

      // Force market data update for UI
      const { marketData } = await import('../market/data');
      await marketData.updateMarketState();

      console.log("Market data synchronized successfully");
      return true;
    } catch (error) {
      console.error("Error synchronizing market data:", error);
      return false;
    }
  },

  async bootstrapPool() {
    try {
      console.log("Checking if pool needs initialization...");

      // Check if pool exists
      const pool = await this.getPoolState();

      if (pool) {
        console.log("Pool already exists with:", {
          solAmount: pool.solAmount,
          tokenAmount: pool.tokenAmount,
          currentPrice: pool.currentPrice
        });
        return pool;
      }

      // Pool doesn't exist, create it with initial liquidity
      console.log("Creating new pool with initial liquidity");

      const initialSolAmount = 1000; // 1000 SOL
      const initialTokenAmount = 1000000; // 1,000,000 STORM tokens
      const initialPrice = initialSolAmount / initialTokenAmount; // Initial price

      const newPool = await prisma.poolState.create({
        data: {
          id: 'main_pool', // Make sure this matches the ID used in getPoolState()
          solAmount: initialSolAmount,
          tokenAmount: initialTokenAmount,
          k: initialSolAmount * initialTokenAmount, // Constant product
          currentPrice: initialPrice,
          tradingVolume: 0,
          tradingVolume24h: 0,
          highPrice24h: initialPrice,
          lowPrice24h: initialPrice,
          lastUpdated: new Date(),
          priceHistory: JSON.stringify([]),
          trades: JSON.stringify([])
        }
      });

      // Also create initial market state
      await prisma.marketState.create({
        data: {
          price: initialPrice,
          liquidity: initialSolAmount * 2, // Simple liquidity metric
          volume24h: 0,
          transactions24h: 0,
          priceChange24h: 0,
          volatility: 0.05,
          type: 'AMM',
          data: {
            solReserve: initialSolAmount,
            tokenReserve: initialTokenAmount,
            price: initialPrice
          }
        }
      });

      console.log("Pool initialized successfully with price:", initialPrice);
      return newPool;
    } catch (error) {
      console.error("Error bootstrapping pool:", error);
      throw error;
    }
  },

  async getPoolState() {
    return prisma.poolState.findFirst({
      where: { id: 'main_pool' }
    });
  },

  async getPoolStats() {
    const pool = await this.getPoolState();

    if (!pool) {
      return {
        solAmount: 0,
        tokenAmount: 0,
        currentPrice: 0,
        tradingVolume: 0,
        tradingVolume24h: 0,
        lastTradedAt: null
      };
    }

    return {
      solAmount: pool.solAmount,
      tokenAmount: pool.tokenAmount,
      currentPrice: pool.currentPrice,
      tradingVolume: pool.tradingVolume,
      tradingVolume24h: pool.tradingVolume24h,
      lastTradedAt: pool.lastTradedAt
    };
  },

  async updatePoolState(data: any) {
    return prisma.poolState.update({
      where: { id: 'main_pool' },
      data
    });
  },

  async calculateSwapAmount(inputAmount: number, inputIsSol: boolean) {
    const pool = await this.getPoolState();

    if (!pool) {
      throw new Error('Pool not initialized');
    }

    // Get current reserves from the pool
    const solReserve = pool.solAmount;
    const tokenReserve = pool.tokenAmount;

    // Calculate constant product k
    const k = solReserve * tokenReserve;

    // Calculate output amount based on constant product formula
    let outputAmount: number;

    if (inputIsSol) {
      // SOL to token swap
      const newSolReserve = solReserve + inputAmount;
      const newTokenReserve = k / newSolReserve;
      outputAmount = tokenReserve - newTokenReserve;
    } else {
      // Token to SOL swap
      const newTokenReserve = tokenReserve + inputAmount;
      const newSolReserve = k / newTokenReserve;
      outputAmount = solReserve - newSolReserve;
    }

    // Calculate price impact (percentage change in price)
    const priceImpact = this.calculatePriceImpact(
      solReserve,
      tokenReserve,
      inputAmount,
      inputIsSol
    );

    return {
      inputAmount,
      outputAmount,
      priceImpact,
      effectivePrice: inputAmount / outputAmount
    };
  },

  calculatePriceImpact(
    solReserve: number,
    tokenReserve: number,
    inputAmount: number,
    inputIsSol: boolean
  ): number {
    // Calculate initial price
    const initialPrice = solReserve / tokenReserve;

    // Calculate new reserves after swap
    let newSolReserve: number;
    let newTokenReserve: number;

    if (inputIsSol) {
      newSolReserve = solReserve + inputAmount;
      newTokenReserve = (solReserve * tokenReserve) / newSolReserve;
    } else {
      newTokenReserve = tokenReserve + inputAmount;
      newSolReserve = (solReserve * tokenReserve) / newTokenReserve;
    }

    // Calculate new price
    const newPrice = newSolReserve / newTokenReserve;

    // Calculate price impact percentage
    const priceImpact = Math.abs((newPrice - initialPrice) / initialPrice) * 100;

    return priceImpact;
  },

  async executeSwap(
    agentId: string,
    inputAmount: number,
    inputIsSol: boolean,
    slippageTolerance: number = 0.5, // Default 0.5%
    tokenMint?: string, // Selected SPL token mint for reference pricing
    tokenDecimals: number = 9 // Default decimals if not provided
  ) {
    try {
      // Get agent details
      const agent = await prisma.agent.findUnique({
        where: { id: agentId }
      });

      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Calculate swap result (simulation)
      const swapResult = await this.calculateSwapAmount(inputAmount, inputIsSol);

      // Eligibility checks using on-chain balances if tokenMint provided; fallback to DB balances
      if (tokenMint) {
        const [onchainSol, onchainSpl] = await Promise.all([
          getSolBalance(agent.publicKey),
          getSplTokenBalance(agent.publicKey, tokenMint)
        ]);
        if (inputIsSol) {
          if (onchainSol < inputAmount) throw new Error('Insufficient on-chain SOL balance');
        } else {
          if (onchainSpl < inputAmount) throw new Error('Insufficient on-chain SPL token balance');
        }
      } else {
        if (inputIsSol && agent.walletBalance < inputAmount) {
          throw new Error('Insufficient SOL balance');
        } else if (!inputIsSol && agent.tokenBalance < inputAmount) {
          throw new Error('Insufficient token balance');
        }
      }

      // Check price impact against slippage tolerance
      if (swapResult.priceImpact > slippageTolerance) {
        throw new Error(
          `Price impact (${swapResult.priceImpact.toFixed(2)}%) exceeds slippage tolerance (${slippageTolerance}%)`
        );
      }

      // Fetch reference quote from Jupiter (does not execute on-chain)
      let referenceQuote: any = null;
      try {
        if (tokenMint) {
          const solMint = 'So11111111111111111111111111111111111111112';
          const inputMint = inputIsSol ? solMint : tokenMint;
          const outputMint = inputIsSol ? tokenMint : solMint;
          const amountLamports = Math.round(inputAmount * 10 ** (inputIsSol ? 9 : tokenDecimals));
          referenceQuote = await getQuote(inputMint, outputMint, amountLamports, Math.round(slippageTolerance * 100));
        }
      } catch (e) {
        // ignore quote failures; simulation continues
      }

      // Get current pool state
      const pool = await this.getPoolState();
      if (!pool) {
        throw new Error('Pool not initialized');
      }

      // Update pool reserves based on the swap direction
      const newPool = await this.updatePoolState({
        solAmount: inputIsSol
          ? pool.solAmount + inputAmount
          : pool.solAmount - swapResult.outputAmount,
        tokenAmount: inputIsSol
          ? pool.tokenAmount - swapResult.outputAmount
          : pool.tokenAmount + inputAmount,
        tradingVolume: pool.tradingVolume + (inputIsSol ? inputAmount : swapResult.outputAmount),
        tradingVolume24h: pool.tradingVolume24h + (inputIsSol ? inputAmount : swapResult.outputAmount),
        lastTradedAt: new Date(),
        currentPrice: inputIsSol
          ? (pool.solAmount + inputAmount) / (pool.tokenAmount - swapResult.outputAmount)
          : (pool.solAmount - swapResult.outputAmount) / (pool.tokenAmount + inputAmount)
      });

      // Update agent balances accordingly
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          walletBalance: inputIsSol
            ? agent.walletBalance - inputAmount
            : agent.walletBalance + swapResult.outputAmount,
          tokenBalance: inputIsSol
            ? agent.tokenBalance + swapResult.outputAmount
            : agent.tokenBalance - inputAmount
        }
      });

      // Record the successful transaction (simulated signature)
      const transaction = await prisma.transaction.create({
        data: {
          signature: `simulated_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
          amount: inputIsSol ? inputAmount : swapResult.outputAmount,
          tokenAmount: inputIsSol ? swapResult.outputAmount : inputAmount,
          fromAgentId: agentId,
          status: 'CONFIRMED',
          type: inputIsSol ? 'SOL_TO_TOKEN' : 'TOKEN_TO_SOL',
          priceImpact: swapResult.priceImpact,
          details: {
            inputAmount,
            outputAmount: swapResult.outputAmount,
            inputIsSol,
            effectivePrice: swapResult.effectivePrice,
            poolSolReserve: newPool.solAmount,
            poolTokenReserve: newPool.tokenAmount,
            referenceQuote
          },
          confirmedAt: new Date()
        }
      });

      // Update trading statistics for the successful trade
      await prisma.trading.updateMany({
        where: { agentId },
        data: {
          totalTrades: { increment: 1 },
          successfulTrades: { increment: 1 },
          profitLoss: { increment: 0 } // Additional logic can be added for proper P&L calculation
        }
      });

      // Update market state to reflect the trade
      try {
        await marketData.updateMarketState();
        console.log("Market state updated after trade");
      } catch (marketError) {
        console.error("Error updating market state:", marketError);
        // Do not throw error; allow the trade to succeed even if market state update fails
      }

      return {
        success: true,
        transaction,
        swapResult
      };
    } catch (error) {
      console.error(`Swap error for agent ${agentId}:`, error);

      // Record failed transaction
      await prisma.transaction.create({
        data: {
          signature: `failed_swap_${Date.now()}`,
          amount: inputAmount,
          fromAgentId: agentId,
          status: 'FAILED',
          type: inputIsSol ? 'SOL_TO_TOKEN' : 'TOKEN_TO_SOL',
          details: {
            error: error instanceof Error ? error.message : String(error),
            inputAmount,
            inputIsSol
          }
        }
      });

      // Update trading statistics for failed trade
      await prisma.trading.updateMany({
        where: { agentId },
        data: {
          totalTrades: { increment: 1 },
          failedTrades: { increment: 1 }
        }
      });

      throw error;
    }
  }
};