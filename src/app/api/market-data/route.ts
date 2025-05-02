import { NextRequest, NextResponse } from 'next/server';
import { marketData } from '@/lib/market/data';
import { prisma } from '@/lib/cache/dbCache';
import { getCached, setCached } from '@/lib/cache/dbCache';

export const maxDuration = 60; // Increase timeout to 60 seconds

// Fallback market data
const FALLBACK_MARKET_DATA = {
  price: 0.001,
  liquidity: 2000,
  volume24h: 500,
  priceChange24h: 0.01,
  sentiment: {
    bullish: 0.6,
    bearish: 0.3,
    neutral: 0.1
  }
};

export async function GET(request: NextRequest) {
  try {
    // First, check if we have cached data
    const CACHE_KEY = 'market_data';
    const cachedData = getCached(CACHE_KEY);
    
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData.data,
        priceHistory: cachedData.priceHistory,
        cached: true
      });
    }
    
    // Try to get market data with a timeout
    let data;
    let sentiment;
    let usesFallback = false;
    
    try {
      // Use a Promise with timeout to avoid hanging
      const marketInfoPromise = marketData.getMarketInfo();
      const sentimentPromise = marketData.getMarketSentiment();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Market data query timed out')), 3000); // Increased timeout to 3s
      });
      
      // Run both queries in parallel with timeout
      const [marketInfo, marketSentiment] = await Promise.all([
        Promise.race([marketInfoPromise, timeoutPromise]),
        Promise.race([sentimentPromise, timeoutPromise.catch(() => ({
          bullishPercentage: 0.5,
          bearishPercentage: 0.3,
          neutralPercentage: 0.2
        }))])
      ]);
      
      data = marketInfo;
      sentiment = marketSentiment;
    } catch (dataError) {
      console.log("Could not get market data from database, using fallback");
      usesFallback = true;
      
      // Use fallback data
      data = { ...FALLBACK_MARKET_DATA };
      sentiment = {
        bullishPercentage: 0.5,
        bearishPercentage: 0.3,
        neutralPercentage: 0.2
      };
    }
    
    // Get price history from database or generate sample data
    let priceHistory = [];
    
    try {
      if (!usesFallback) {
        // Try to get from MarketState table with timeout
        const historyPromise = prisma.marketState.findFirst({
          orderBy: { timestamp: 'desc' }
        });
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Price history query timed out')), 3000); // Increased timeout to 3s
        });
        
        const marketState = await Promise.race([historyPromise, timeoutPromise]);
        
        if (marketState && marketState.historicalPrices) {
          // Parse historical prices from JSON
          priceHistory = Array.isArray(marketState.historicalPrices) 
            ? marketState.historicalPrices 
            : [];
        }
      }
    } catch (historyError) {
      console.error('Error fetching price history, generating synthetic data');
    }
    
    // If no price history found or using fallback, generate sample data
    if (priceHistory.length === 0) {
      const now = new Date();
      const basePrice = data.price || 0.001;
      
      // Generate data points for the last 24 hours
      for (let i = 0; i < 24; i++) {
        const time = new Date(now.getTime() - (24 - i) * 60 * 60 * 1000).toISOString();
        // Add some randomness to the price
        const randomFactor = 1 + (Math.random() * 0.1 - 0.05); // ±5% variation
        const price = basePrice * randomFactor * (1 + i/200); // Slight upward trend
        
        priceHistory.push({ time, price });
      }
    }
    
    // Add the current price as the latest data point
    priceHistory.push({
      time: new Date().toISOString(),
      price: data.price || 0.001
    });
    
    // Prepare the response data
    const responseData = {
      data: [{
        price: data.price || 0.001,
        timestamp: new Date().toISOString(),
        volume24h: data.volume24h || 0,
        priceChange24h: data.priceChange24h || 0,
        sentiment: {
          bullish: sentiment.bullishPercentage || 0.5,
          bearish: sentiment.bearishPercentage || 0.3,
          neutral: sentiment.neutralPercentage || 0.2
        }
      }],
      priceHistory
    };
    
    // Cache the result for a longer time (60 seconds) to reduce database load
    setCached(CACHE_KEY, responseData, 60000); // Increased to 60 seconds
    
    return NextResponse.json({
      success: true,
      ...responseData,
      usesFallback // Fixed variable name
    });
  } catch (error) {
    console.error('Error getting market data:', error);
    
    // Return fallback data even in case of errors
    const fallbackData = {
      data: [{
        ...FALLBACK_MARKET_DATA,
        timestamp: new Date().toISOString()
      }],
      priceHistory: Array(24).fill(0).map((_, i) => ({
        time: new Date(Date.now() - (24 - i) * 60 * 60 * 1000).toISOString(),
        price: FALLBACK_MARKET_DATA.price * (1 + i/200) // Slightly upward trend
      }))
    };
    
    return NextResponse.json({
      success: true,
      ...fallbackData,
      error: error instanceof Error ? error.message : String(error),
      usesFallback: true // Fixed variable name
    });
  }
}
