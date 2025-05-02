import { NextRequest, NextResponse } from 'next/server';
import { generateWallet } from '@/lib/blockchain/wallet';

export async function POST(request: NextRequest) {
  try {
    // Generate a new wallet 
    const wallet = generateWallet();
    
    return NextResponse.json({
      success: true,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey
    });
  } catch (error) {
    console.error('Error creating wallet:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
