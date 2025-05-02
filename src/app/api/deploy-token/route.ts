import { NextRequest, NextResponse } from 'next/server';
import { deployToken } from '@/lib/blockchain/token';
import { checkWalletBalance } from '@/lib/blockchain/balance';
import { walletFromPrivateKey } from '@/lib/blockchain/wallet';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenName, tokenSymbol, decimals, privateKey } = body;
    
    // Validate input
    if (!tokenName || !tokenSymbol) {
      return NextResponse.json(
        { success: false, error: 'Token name and symbol are required' },
        { status: 400 }
      );
    }
    
    if (!privateKey) {
      return NextResponse.json(
        { success: false, error: 'Private key is required' },
        { status: 400 }
      );
    }
    
    // Get the public key from the private key
    const wallet = walletFromPrivateKey(privateKey);
    
    // Check wallet balance
    console.log("Checking wallet balance for:", wallet.publicKey);
    const balanceResult = await checkWalletBalance(wallet.publicKey);
    
    if (!balanceResult.success) {
      return NextResponse.json({
        success: false,
        error: `Failed to check wallet balance: ${balanceResult.error}`
      });
    }
    
    // Ensure the wallet has sufficient funds (at least 0.1 SOL)
    //@ts-ignore
    if (balanceResult.balanceSOL < 0.1) {
      return NextResponse.json({
        success: false,
        error: `Insufficient balance: ${balanceResult.balanceSOL} SOL. Please fund the wallet with at least 0.1 SOL.`
      });
    }
    
    console.log("Wallet balance:", balanceResult.balanceSOL, "SOL");
    
    // Deploy the token using the provided private key
    const result = await deployToken(
      privateKey,
      tokenName,
      tokenSymbol,
      decimals || 9
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in token deployment API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
