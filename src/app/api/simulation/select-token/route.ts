import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/cache/dbCache';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;
    
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 400 });
    }

    // Only store the mint address - we'll fetch live data from Jupiter when needed
    const mintAddress = token.id;

    await prisma.simulationConfig.upsert({
      where: { key: 'selected_token' },
      update: { value: JSON.stringify({ mint: mintAddress }) },
      create: { key: 'selected_token', value: JSON.stringify({ mint: mintAddress }) }
    });

    console.log(`✅ Selected token saved: ${token.symbol} (${token.name}) - Mint: ${mintAddress}`);
    console.log(`💡 Live data will be fetched from Jupiter on each request`);

    return NextResponse.json({ 
      success: true, 
      mint: mintAddress,
      message: 'Token selected. Live data will be fetched from Jupiter.'
    });
  } catch (e: any) {
    console.error('Error saving selected token:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


