import { NextResponse } from 'next/server';
import { getTopTokens } from '@/services/market';

export async function GET() {
  try {
    const tokens = await getTopTokens('toptrending', '24h', 50);
    return NextResponse.json(tokens);
  } catch (e: any) {
    console.error('Error fetching trending tokens:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
