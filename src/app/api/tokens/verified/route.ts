import { NextResponse } from 'next/server';
import { getVerifiedTokens } from '@/services/market';

export async function GET() {
  try {
    const tokens = await getVerifiedTokens();
    // Limit to top 50 verified tokens for better UX
    return NextResponse.json(tokens.slice(0, 50));
  } catch (e: any) {
    console.error('Error fetching verified tokens:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
