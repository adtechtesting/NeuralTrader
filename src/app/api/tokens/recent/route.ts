import { NextResponse } from 'next/server';
import { getRecentTokens } from '@/services/market';

export async function GET() {
  try {
    const tokens = await getRecentTokens(30);
    return NextResponse.json(tokens);
  } catch (e: any) {
    console.error('Error fetching recent tokens:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
