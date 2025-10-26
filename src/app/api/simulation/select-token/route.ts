import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/cache/dbCache';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;
    
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 400 });
    }

    // ✅ FIX: Store complete token data instead of just mint address
    const tokenData = {
      mint: token.id,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      usdPrice: token.usdPrice,
      mcap: token.mcap,
      liquidity: token.liquidity,
      holderCount: token.holderCount,
      isVerified: token.isVerified,
      icon: token.icon,
      selectedAt: new Date().toISOString()
    };

    await prisma.simulationConfig.upsert({
      where: { key: 'selected_token' },
      update: { value: JSON.stringify(tokenData) },
      create: { key: 'selected_token', value: JSON.stringify(tokenData) }
    });

    console.log(`✅ Selected token saved: ${token.symbol} (${token.name}) - Mint: ${token.id}`);
    console.log(`💡 Complete token data stored for offline fallback`);

    return NextResponse.json({
      success: true,
      token: tokenData,
      message: 'Token selected with complete data stored for fallback.'
    });
  } catch (e: any) {
    console.error('Error saving selected token:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


