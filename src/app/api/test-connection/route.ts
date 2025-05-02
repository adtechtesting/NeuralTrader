import { NextResponse } from 'next/server';
import { connection } from '@/lib/blockchain/connection';

export async function GET() {
  try {
    // Fetch the current block height to test connection
    const blockHeight = await connection.getBlockHeight();
    
    // Return successful response with block height
    return NextResponse.json({ 
      status: 'success', 
      message: 'Successfully connected to Solana testnet',
      blockHeight 
    });
  } catch (error) {
    console.error('Error connecting to Solana:', error);
    
    // Return error response
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to connect to Solana testnet',
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
