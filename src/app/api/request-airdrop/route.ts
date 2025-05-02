import { NextRequest, NextResponse } from 'next/server';
import { requestAirdrop } from '@/lib/blockchain/faucet';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicKey, amount } = body;
    
    // Validate input
    if (!publicKey) {
      return NextResponse.json(
        { success: false, error: 'Public key is required' },
        { status: 400 }
      );
    }
    
    // Request the airdrop
    const result = await requestAirdrop(publicKey, amount || 1);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in airdrop API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
