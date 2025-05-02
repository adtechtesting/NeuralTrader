import { NextRequest, NextResponse } from 'next/server';
import { amm } from '@/lib/blockchain/amm';
import { prisma, dbCache } from '@/lib/cache/dbCache';
import * as fs from 'fs';
import * as path from 'path';

export const maxDuration = 60; // Increase timeout to 60 seconds

// Define the structure of the cached data
interface AMMStats {
  data: {
    solAmount: number;
    tokenAmount: number;
    currentPrice: number;
    tradingVolume: number;
    tradingVolume24h: number;
    lastTradedAt: string | null;
    highPrice24h: number;
    lowPrice24h: number;
  };
  transactions: Array<{
    id: string;
    type: string;
    amountSol: number;
    amountToken: number;
    confirmedAt: string;
    fromAgent: {
      name: string;
      personalityType: string;
    };
  }>;
}

// In-memory fallback data
const FALLBACK_DATA = {
  solAmount: 1000,
  tokenAmount: 1000000,
  currentPrice: 0.001,
  tradingVolume: 0,
  tradingVolume24h: 0,
  lastTradedAt: null,
  highPrice24h: 0.001,
  lowPrice24h: 0.001,
};

export async function GET(request: NextRequest) {
  try {
    // Check for cached data first (faster than querying the database)
    const CACHE_KEY = 'amm_stats_data';
    const cachedData = dbCache.get<AMMStats>(CACHE_KEY);

    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData.data,
        transactions: cachedData.transactions || [],
        cached: true,
      });
    }

    // Attempt to get AMM pool state with a timeout
    let data;
    let usesFallback = false;

    try {
      // Use Promise.race to enforce a timeout on amm.getPoolStats()
      const poolStatsPromise = amm.getPoolStats();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query timed out')), 3000) // 3s timeout
      );

      data = await Promise.race([poolStatsPromise, timeoutPromise]);
    } catch (poolError) {
      console.log('Could not get pool data from database, using fallback');
      usesFallback = true;

      try {
        // Try to read the initial pool state from a local JSON file
        const initialPoolPath = path.join(process.cwd(), 'amm-pool-state.json');
        if (fs.existsSync(initialPoolPath)) {
          const fileContent = fs.readFileSync(initialPoolPath, 'utf8');
          const initialPool = JSON.parse(fileContent);

          data = {
            solAmount: initialPool.solAmount || 1000,
            tokenAmount: initialPool.tokenAmount || 1000000,
            currentPrice: initialPool.initialPrice || 0.001,
            tradingVolume: 0,
            tradingVolume24h: 0,
            lastTradedAt: null,
            highPrice24h: initialPool.initialPrice || 0.001,
            lowPrice24h: initialPool.initialPrice || 0.001,
          };
        } else {
          // Use hardcoded fallback if file does not exist
          data = { ...FALLBACK_DATA };
        }
      } catch (fileError) {
        console.error('Error reading initial pool file, using hardcoded fallback values');
        data = { ...FALLBACK_DATA };
      }
    }

    // Get recent transactions (only if we got valid data from the pool)
    let transactions: AMMStats['transactions'] = [];
    if (!usesFallback) {
      try {
        // Use Promise.race to enforce a timeout on the transaction query
        const txPromise = prisma.transaction.findMany({
          where: { type: { in: ['SOL_TO_TOKEN', 'TOKEN_TO_SOL'] } },
          orderBy: { confirmedAt: 'desc' },
          take: 10, // Limiting the data size for performance
          include: {
            fromAgent: {
              select: {
                name: true,
                personalityType: true,
              },
            },
          },
        });

        const txTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Transaction query timed out')), 3000) // 3s timeout
        );
      //@ts-ignore
        transactions = await Promise.race([txPromise, txTimeoutPromise]);
      } catch (txError) {
        console.error('Error or timeout fetching transactions, returning empty array');
        transactions = [];
      }
    }

    // Cache the result for 60 seconds to lower the database load
    //@ts-ignore
    const responseData: AMMStats = { data, transactions };
    dbCache.set(CACHE_KEY, responseData, 60000);

    return NextResponse.json({
      success: true,
      data,
      transactions,
      usesFallback, // Indicates whether fallback data was used
    });
  } catch (error) {
    console.error('Error getting AMM stats:', error);

    // Return fallback data even if unexpected errors occur
    return NextResponse.json({
      success: true,
      data: { ...FALLBACK_DATA },
      transactions: [],
      error: error instanceof Error ? error.message : String(error),
      usesFallback: true,
    });
  }
}