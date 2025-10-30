import { NextResponse } from 'next/server';
import { prisma } from '@/lib/cache/dbCache';
import { amm } from '@/lib/blockchain/amm';

export async function POST() {
  try {
    console.log('🔄 Resetting AMM pool...');

    // Delete existing pool
    await prisma.poolState.deleteMany({
      where: { id: 'main_pool' }
    });

    console.log('✅ Old pool deleted');

    // Bootstrap new pool with live price
    const newPool = await amm.bootstrapPool();

    return NextResponse.json({
      success: true,
      message: 'Pool reset successfully',
      pool: {
        solAmount: newPool.solAmount,
        tokenAmount: newPool.tokenAmount,
        currentPrice: newPool.currentPrice,
        k: newPool.k
      }
    });
  } catch (error) {
    console.error('❌ Pool reset error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset pool'
    }, { status: 500 });
  }
}
