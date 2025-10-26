import { NextRequest, NextResponse } from 'next/server';
import { amm } from '@/lib/blockchain/amm';

export async function GET(request: NextRequest) {
  try {
   
    const [dbPoolState, memoryPoolState] = await Promise.all([
      amm.getPoolState(),
      Promise.resolve(amm.getPoolStateMemory())
    ]);

   
    const currentState = memoryPoolState && memoryPoolState.lastUpdate > 0
      ? memoryPoolState
      : dbPoolState;

    if (!currentState) {
      return NextResponse.json({
        error: 'Pool not initialized',
        poolState: memoryPoolState
      }, { status: 404 });
    }

   
    if (currentState && 'error' in currentState && currentState.error) {
      return NextResponse.json({
        success: true,
        poolState: {
          db: null,
          memory: memoryPoolState,
          current: currentState
        }
      });
    }

  
    return NextResponse.json({
      success: true,
      poolState: {
        // Database state
        db: dbPoolState ? {
          solAmount: dbPoolState.solAmount,
          tokenAmount: dbPoolState.tokenAmount,
          currentPrice: dbPoolState.currentPrice,
          tradingVolume: dbPoolState.tradingVolume,
          tradingVolume24h: dbPoolState.tradingVolume24h,
          lastTradedAt: dbPoolState.lastTradedAt,
          highPrice24h: dbPoolState.highPrice24h,
          lowPrice24h: dbPoolState.lowPrice24h
        } : null,

        memory: memoryPoolState,

        current: {
          solReserve: 'solReserve' in currentState ? currentState.solReserve : ('solAmount' in currentState ? currentState.solAmount : 0),
          tokenReserve: 'tokenReserve' in currentState ? currentState.tokenReserve : ('tokenAmount' in currentState ? currentState.tokenAmount : 0),
          lastPrice: 'lastPrice' in currentState ? currentState.lastPrice : ('currentPrice' in currentState ? currentState.currentPrice : 0),
          totalLiquidity: 'totalLiquidity' in currentState ? currentState.totalLiquidity : 0,
          volume24h: 'volume24h' in currentState ? currentState.volume24h : ('tradingVolume24h' in currentState ? currentState.tradingVolume24h : 0),
          lastUpdate: 'lastUpdate' in currentState ? currentState.lastUpdate : (currentState as any).lastUpdated?.getTime() || Date.now()
        }
      }
    });

  } catch (error) {
    console.error('Error fetching pool state:', error);
    return NextResponse.json({
      error: 'Failed to fetch pool state',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
