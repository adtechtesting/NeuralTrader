import { NextRequest, NextResponse } from 'next/server';
import { searchToken } from '@/services/market';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    const token = await searchToken(query);
    
    if (!token) {
      return NextResponse.json([]);
    }
    
    // Return as array for consistency with other endpoints
    return NextResponse.json([token]);
  } catch (e: any) {
    console.error('Error searching tokens:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
