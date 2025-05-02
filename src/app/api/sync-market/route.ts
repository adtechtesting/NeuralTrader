// Create a new file at src/app/api/sync-market/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { amm } from '@/lib/blockchain/amm';
import { marketData } from '@/lib/market/data';
import { prisma } from '@/lib/cache/dbCache';
import { getCached, setCached } from '@/lib/cache/dbCache';

export async function GET(request: NextRequest) {
  try {
    // Force sync market data
    await amm.syncMarketData();
    
    // Invalidate all caches related to market data
    setCached('market_data', null, 0);
    setCached('amm_stats_data', null, 0);
    
    // Get latest data to return
    const pool = await amm.getPoolState();
    const marketState = await prisma.marketState.findFirst({
      orderBy: { timestamp: 'desc' }
    });
    
    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      pool: pool ? {
        currentPrice: pool.currentPrice,
        solAmount: pool.solAmount,
        tokenAmount: pool.tokenAmount,
        tradingVolume24h: pool.tradingVolume24h
      } : null,
      market: marketState ? {
        price: marketState.price,
        volume24h: marketState.volume24h,
        liquidity: marketState.liquidity
      } : null
    });
  } catch (error) {
    console.error('Error syncing market data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Full sync with force update
  try {
    // Get current pool state
    const pool = await amm.getPoolState();
    
    if (!pool) {
      return NextResponse.json(
        { success: false, error: 'Pool not found' },
        { status: 404 }
      );
    }
    
    // Calculate correct price
    const price = pool.solAmount / pool.tokenAmount;
    
    // Update pool current price
    await prisma.poolState.update({
      where: { id: 'main_pool' },
      data: {
        currentPrice: price,
        lastUpdated: new Date()
      }
    });
    
    // Create new market state record
    const marketState = await prisma.marketState.create({
      data: {
        price,
        liquidity: pool.solAmount * 2,
        volume24h: pool.tradingVolume24h,
        transactions24h: 0,
        priceChange24h: 0,
        type: 'AMM',
        data: {
          solReserve: pool.solAmount,
          tokenReserve: pool.tokenAmount,
          price
        }
      }
    });
    
    // Clear all caches
    setCached('market_data', null, 0);
    setCached('amm_stats_data', null, 0);
    
    return NextResponse.json({
      success: true,
      forceUpdated: true,
      pool: {
        currentPrice: price,
        solAmount: pool.solAmount,
        tokenAmount: pool.tokenAmount
      },
      market: {
        price: marketState.price,
        liquidity: marketState.liquidity,
        volume24h: marketState.volume24h
      }
    });
  } catch (error) {
    console.error('Error force syncing market data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
