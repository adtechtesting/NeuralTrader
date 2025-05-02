import { connection } from "./connection";
import { PublicKey } from "@solana/web3.js";

export async function checkWalletBalance(publicKey: string) {
  try {
    const key = new PublicKey(publicKey);
    const balance = await connection.getBalance(key);
    
    return {
      success: true,
      balanceLamports: balance,
      balanceSOL: balance / 1_000_000_000 // Convert lamports to SOL
    };
  } catch (error) {
    console.error("Error checking wallet balance:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
