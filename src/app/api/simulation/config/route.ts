import { NextResponse } from 'next/server';
import { getSelectedToken } from '@/lib/config/selectedToken';

export async function GET() {
  try {
    const selectedToken = await getSelectedToken();
    
    return NextResponse.json({
      selectedToken: {
        mint: selectedToken.mint,
        symbol: selectedToken.symbol,
        name: selectedToken.name,
        decimals: selectedToken.decimals,
        usdPrice: selectedToken.usdPrice,
        mcap: selectedToken.mcap,
        liquidity: selectedToken.liquidity,
        holderCount: selectedToken.holderCount,
        isVerified: selectedToken.isVerified
      }
    });
  } catch (error: any) {
    console.error('Error fetching simulation config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch simulation config', details: error.message },
      { status: 500 }
    );
  }
}
