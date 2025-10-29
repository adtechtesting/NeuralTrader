import { prisma } from '../cache/dbCache';
import { marketData } from '../market/data';
import { getSolBalance, getSplTokenBalance } from '@/blockchain/onchain-balances';
import { getQuote } from '@/services/market';
import { randomUUID } from 'crypto';

export const amm = {
  poolState: {
    solReserve: 0,
    tokenReserve: 0,
    lastPrice: 0,
    totalLiquidity: 0,
    volume24h: 0,
    lastUpdate: 0
  },

  async syncMarketData() {
    try {
      console.log("Synchronizing market data with pool state...");
      const pool = await this.getPoolState();

      if (!pool) {
        console.error("Cannot sync market data: Pool not found");
        return;
      }

      this.poolState = {
        solReserve: pool.solAmount,
        tokenReserve: pool.tokenAmount,
        lastPrice: pool.solAmount / pool.tokenAmount,
        totalLiquidity: pool.solAmount + (pool.tokenAmount * (pool.solAmount / pool.tokenAmount)),
        volume24h: pool.tradingVolume24h,
        lastUpdate: Date.now()
      };

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

      const pool = await this.getPoolState();

      if (pool) {
        console.log("Pool already exists with:", {
          solAmount: pool.solAmount,
          tokenAmount: pool.tokenAmount,
          currentPrice: pool.currentPrice
        });
        return pool;
      }

      console.log("Creating new pool with initial liquidity");

      const initialSolAmount = 10000;
      const initialTokenAmount = 1000000;
      const initialPrice = initialSolAmount / initialTokenAmount;

      const newPool = await prisma.poolState.create({
        data: {
          id: 'main_pool',
          solAmount: initialSolAmount,
          tokenAmount: initialTokenAmount,
          k: initialSolAmount * initialTokenAmount,
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

      this.poolState = {
        solReserve: initialSolAmount,
        tokenReserve: initialTokenAmount,
        lastPrice: initialPrice,
        totalLiquidity: initialSolAmount + (initialTokenAmount * initialPrice),
        volume24h: 0,
        lastUpdate: Date.now()
      };

      console.log("Pool initialized successfully with price:", initialPrice);
      return newPool;
    } catch (error) {
      console.error("Error bootstrapping pool:", error);
      throw error;
    }
  },

  async getPoolState() {
    const pool = await prisma.poolState.findFirst({
      where: { id: 'main_pool' }
    });

    if (pool) {
      this.poolState = {
        solReserve: pool.solAmount,
        tokenReserve: pool.tokenAmount,
        lastPrice: pool.currentPrice,
        totalLiquidity: pool.solAmount + (pool.tokenAmount * pool.currentPrice),
        volume24h: pool.tradingVolume24h,
        lastUpdate: pool.lastUpdated?.getTime() || Date.now()
      };
    }

    return pool;
  },

  getPoolStateMemory() {
    return this.poolState;
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

    const solReserve = pool.solAmount;
    const tokenReserve = pool.tokenAmount;
    const k = solReserve * tokenReserve;

    let outputAmount: number;

    if (inputIsSol) {
      const newSolReserve = solReserve + inputAmount;
      const newTokenReserve = k / newSolReserve;
      outputAmount = tokenReserve - newTokenReserve;
    } else {
      const newTokenReserve = tokenReserve + inputAmount;
      const newSolReserve = k / newTokenReserve;
      outputAmount = solReserve - newSolReserve;
    }

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
    const initialPrice = solReserve / tokenReserve;

    let newSolReserve: number;
    let newTokenReserve: number;

    if (inputIsSol) {
      newSolReserve = solReserve + inputAmount;
      newTokenReserve = (solReserve * tokenReserve) / newSolReserve;
    } else {
      newTokenReserve = tokenReserve + inputAmount;
      newSolReserve = (solReserve * tokenReserve) / newTokenReserve;
    }

    const newPrice = newSolReserve / newTokenReserve;
    const priceImpact = Math.abs((newPrice - initialPrice) / initialPrice) * 100;

    return priceImpact;
  },

  async executeSwap(
    agentId: string,
    inputAmount: number,
    inputIsSol: boolean,
    slippageTolerance: number = 1.5,
    tokenMint?: string,
    tokenDecimals: number = 9
  ) {
    try {
      // Get agent
      const agent = await prisma.agent.findUnique({
        where: { id: agentId }
      });

      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Balance checks
      if (inputIsSol && agent.walletBalance < inputAmount) {
        throw new Error('Insufficient SOL balance');
      } else if (!inputIsSol && agent.tokenBalance < inputAmount) {
        throw new Error('Insufficient token balance');
      }

      // Calculate swap
      const swapResult = await this.calculateSwapAmount(inputAmount, inputIsSol);

      // Check slippage
      if (swapResult.priceImpact > slippageTolerance) {
        throw new Error(
          `Price impact (${swapResult.priceImpact.toFixed(2)}%) exceeds slippage tolerance (${slippageTolerance}%)`
        );
      }

      // Get current pool
      const pool = await this.getPoolState();
      if (!pool) {
        throw new Error('Pool not initialized');
      }

      // Calculate new reserves
      const oldPrice = pool.currentPrice;
      const newSolReserve = inputIsSol
        ? pool.solAmount + inputAmount
        : pool.solAmount - swapResult.outputAmount;
      const newTokenReserve = inputIsSol
        ? pool.tokenAmount - swapResult.outputAmount
        : pool.tokenAmount + inputAmount;
      const newPrice = newSolReserve / newTokenReserve;

      // ✅ Calculate SOL volume correctly
      const volumeInSOL = inputIsSol ? inputAmount : swapResult.outputAmount;

      console.log(`💰 ${inputIsSol ? 'BUY' : 'SELL'}: ${inputAmount.toFixed(2)} ${inputIsSol ? 'SOL' : 'tokens'} → ${swapResult.outputAmount.toFixed(2)} ${inputIsSol ? 'tokens' : 'SOL'}`);

      // ✅ Update pool with proper null handling
      await this.updatePoolState({
        solAmount: newSolReserve,
        tokenAmount: newTokenReserve,
        tradingVolume: pool.tradingVolume + volumeInSOL,
        tradingVolume24h: pool.tradingVolume24h + volumeInSOL,
        lastTradedAt: new Date(),
        currentPrice: newPrice,
        highPrice24h: Math.max(pool.highPrice24h || newPrice, newPrice), // ✅ Handle null
        lowPrice24h: Math.min(pool.lowPrice24h || newPrice, newPrice)    // ✅ Handle null
      });

      // Update in-memory state
      this.poolState = {
        solReserve: newSolReserve,
        tokenReserve: newTokenReserve,
        lastPrice: newPrice,
        totalLiquidity: newSolReserve + (newTokenReserve * newPrice),
        volume24h: pool.tradingVolume24h + volumeInSOL,
        lastUpdate: Date.now()
      };

      // Update agent balances
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

      // ✅ Create transaction with CORRECT schema fields
      const transaction = await prisma.transaction.create({
        data: {
          signature: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          amount: volumeInSOL, // SOL value
          tokenAmount: inputIsSol ? swapResult.outputAmount : inputAmount,
          fromAgentId: agentId, // ✅ Use fromAgentId, not agentId
          status: 'CONFIRMED',
          type: inputIsSol ? 'BUY' : 'SELL',
          priceImpact: swapResult.priceImpact,
          details: {
            inputAmount,
            outputAmount: swapResult.outputAmount,
            inputIsSol,
            effectivePrice: swapResult.effectivePrice,
            oldPrice,
            newPrice,
            volumeInSOL,
            side: inputIsSol ? 'BUY' : 'SELL', // Store in details
            price: newPrice // Store in details
          },
          confirmedAt: new Date()
        }
      });

      console.log(`✅ ${agent.name} ${inputIsSol ? 'BUY' : 'SELL'} executed: ${volumeInSOL.toFixed(4)} SOL @ ${newPrice.toFixed(8)} (impact: ${swapResult.priceImpact.toFixed(2)}%)`);

      // Update market state
      try {
        await marketData.updateMarketState();
      } catch (marketError) {
        console.error("Error updating market state:", marketError);
      }

      return {
        success: true,
        transaction,
        swapResult,
        newPrice,
        priceImpact: swapResult.priceImpact
      };
    } catch (error) {
      console.error(`❌ Swap error for agent ${agentId}:`, error);

      // Record failed transaction
      await prisma.transaction.create({
        data: {
          signature: `failed_${Date.now()}`,
          amount: inputAmount,
          fromAgentId: agentId,
          status: 'FAILED',
          type: inputIsSol ? 'BUY' : 'SELL',
          details: {
            error: error instanceof Error ? error.message : String(error),
            inputAmount,
            inputIsSol
          }
        }
      });

      throw error;
    }
  }
};
