/*import { prisma } from '../cache/dbCache';
import { EventEmitter } from 'events';

// Event emitter for market events
const eventEmitter = new EventEmitter();

export const marketEvents = eventEmitter;

// Market data service
export const marketData = {
  async getMarketInfo() {
    try {
      const marketState = await prisma.marketState.findFirst({
        orderBy: {
          timestamp: 'desc'
        }
      });
  
      const poolState = await prisma.poolState.findFirst({
        where: { id: 'main_pool' }
      });
  
      return {
        price: marketState?.price || 0,
        liquidity: marketState?.liquidity || 0,
        volume24h: marketState?.volume24h || 0,
        priceChange24h: marketState?.priceChange24h || 0,
        poolState: poolState || null
      };
    } catch (error) {
      console.error('Error fetching market info:', error);
      return {
        price: 0,
        liquidity: 0,
        volume24h: 0,
        priceChange24h: 0,
        poolState: null
      };
    }
  },

  async getMarketSentiment() {
    // Analyze recent messages to determine sentiment
    const recentMessages = await prisma.message.findMany({
      take: 50,
      where: {
        sentiment: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  
    let bullish = 0;
    let bearish = 0;
  
    recentMessages.forEach(message => {
      if (message.sentiment === 'positive') bullish++;
      if (message.sentiment === 'negative') bearish++;
    });
  
    const totalSentiment = bullish + bearish;
    
    return {
      bullishPercentage: totalSentiment > 0 ? bullish / totalSentiment : 0.5,
      bearishPercentage: totalSentiment > 0 ? bearish / totalSentiment : 0.5,
      neutralPercentage: totalSentiment > 0 ? 1 - ((bullish + bearish) / totalSentiment) : 0,
      messageCount: recentMessages.length
    };
  },

  async updateMarketState() {
    try {
      console.log("Updating market state from pool data...");
      
      // Get current pool state
      const poolState = await prisma.poolState.findFirst({
        where: { id: 'main_pool' }
      });
  
      if (!poolState) {
        console.error("Cannot update market state: Pool not found");
        return null;
      }
  
      // Get previous market state for comparison
      const previousState = await prisma.marketState.findFirst({
        orderBy: { timestamp: 'desc' }
      });
  
      // Calculate price from pool reserves
      const price = poolState.solAmount / poolState.tokenAmount;
      
      // Calculate 24h price change (or default to 0)
      const priceChange24h = previousState ? 
        ((price - previousState.price) / previousState.price) * 100 : 0;
      
      // Get recent transactions for volume calculation
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const recentTransactions = await prisma.transaction.findMany({
        where: {
          confirmedAt: {
            gte: oneDayAgo
          },
          status: 'CONFIRMED'
        }
      });
      
      // Calculate 24h trading volume
      const volume24h = recentTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      
      // Count successful transactions
      const transactions24h = recentTransactions.length;
      
      console.log(`Updating market data: price=${price}, volume24h=${volume24h}`);
      
      // Create market state record
      const marketState = await prisma.marketState.create({
        data: {
          price,
          liquidity: poolState.solAmount * 2, // Simple liquidity metric
          volume24h,
          transactions24h,
          priceChange24h,
          volatility: 0.05 + Math.random() * 0.05, // Small random component
          type: 'AMM',
          data: {
            solReserve: poolState.solAmount,
            tokenReserve: poolState.tokenAmount,
            price,
            lastUpdate: new Date().toISOString()
          }
        }
      });
  
      // Emit market update event
      eventEmitter.emit('market_update', {
        price,
        timestamp: new Date(),
        volume24h,
        priceChange24h
      });
  
      console.log("Market state updated successfully");
      return marketState;
    } catch (error) {
      console.error("Error updating market state:", error);
      return null;
    }
  },

  async getMarketSummary() {
    const marketInfo = await this.getMarketInfo();
    const sentiment = await this.getMarketSentiment();
  
    return {
      ...marketInfo,
      sentiment
    };
  }
};
*/

import { prisma } from '../cache/dbCache';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

// Define MarketState type using Prisma's generated type
type MarketState = Prisma.MarketStateGetPayload<{}>;

// Define MarketInfo interface
interface MarketInfo {
  price: number;
  liquidity: number;
  volume24h: number;
  priceChange24h: number;
  poolState: any; // Replace with PoolState type if available
}

// Define MarketSentiment interface
interface MarketSentiment {
  bullishPercentage: number;
  bearishPercentage: number;
  neutralPercentage: number;
  messageCount: number;
}

// Define MarketStateData type for return value of updateMarketState
type MarketStateData = Prisma.MarketStateGetPayload<{}>;

// Event emitter for market events
const eventEmitter = new EventEmitter();

export const marketEvents = eventEmitter;

export const marketData = {
  async getMarketInfo(): Promise<MarketInfo> {
    try {
      const marketState = await prisma.marketState.findFirst({
        orderBy: {
          timestamp: 'desc'
        }
      });

      const poolState = await prisma.poolState.findFirst({
        where: { id: 'main_pool' }
      });

      return {
        price: marketState?.price || 0,
        liquidity: marketState?.liquidity || 0,
        volume24h: marketState?.volume24h || 0,
        priceChange24h: marketState?.priceChange24h || 0,
        poolState: poolState || null
      };
    } catch (error) {
      console.error('Error fetching market info:', error);
      return {
        price: 0,
        liquidity: 0,
        volume24h: 0,
        priceChange24h: 0,
        poolState: null
      };
    }
  },

  async getMarketSentiment(): Promise<MarketSentiment> {
    try {
      const recentMessages = await prisma.message.findMany({
        take: 50,
        where: {
          sentiment: {
            not: null
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      let bullish = 0;
      let bearish = 0;

      recentMessages.forEach(message => {
        if (message.sentiment === 'positive') bullish++;
        if (message.sentiment === 'negative') bearish++;
      });

      const totalSentiment = bullish + bearish;

      return {
        bullishPercentage: totalSentiment > 0 ? bullish / totalSentiment : 0.5,
        bearishPercentage: totalSentiment > 0 ? bearish / totalSentiment : 0.5,
        neutralPercentage: totalSentiment > 0 ? 1 - ((bullish + bearish) / totalSentiment) : 0,
        messageCount: recentMessages.length
      };
    } catch (error) {
      console.error('Error fetching market sentiment:', error);
      return {
        bullishPercentage: 0.5,
        bearishPercentage: 0.5,
        neutralPercentage: 0,
        messageCount: 0
      };
    }
  },

  async updateMarketState(): Promise<MarketStateData | null> {
    try {
      console.log("Updating market state from pool data...");

      const poolState = await prisma.poolState.findFirst({
        where: { id: 'main_pool' }
      });

      if (!poolState) {
        console.error("Cannot update market state: Pool not found");
        return null;
      }

      const previousState = await prisma.marketState.findFirst({
        orderBy: { timestamp: 'desc' }
      });

      const price = poolState.solAmount / poolState.tokenAmount;
      const priceChange24h = previousState
        ? ((price - previousState.price) / previousState.price) * 100
        : 0;

      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const recentTransactions = await prisma.transaction.findMany({
        where: {
          confirmedAt: {
            gte: oneDayAgo
          },
          status: 'CONFIRMED'
        }
      });

      const volume24h = recentTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const transactions24h = recentTransactions.length;

      console.log(`Updating market data: price=${price}, volume24h=${volume24h}`);

      const marketState = await prisma.marketState.create({
        data: {
          id: randomUUID(),
          price,
          liquidity: poolState.solAmount * 2,
          volume24h,
          transactions24h,
          priceChange24h,
          volatility: 0.05 + Math.random() * 0.05,
          type: 'AMM',
          data: {
            solReserve: poolState.solAmount,
            tokenReserve: poolState.tokenAmount,
            price,
            lastUpdate: new Date().toISOString()
          },
          timestamp: new Date(),
          cacheVersion: 1
          // Not setting historicalPrices since it's not computed
        }
      });

      eventEmitter.emit('market_update', {
        price,
        timestamp: new Date(),
        volume24h,
        priceChange24h
      });

      console.log("Market state updated successfully");
      return marketState;
    } catch (error) {
      console.error("Error updating market state:", error);
      return null;
    }
  },

  async getMarketSummary(): Promise<MarketInfo & { sentiment: MarketSentiment }> {
    const marketInfo = await this.getMarketInfo();
    const sentiment = await this.getMarketSentiment();

    return {
      ...marketInfo,
      sentiment
    };
  }
};