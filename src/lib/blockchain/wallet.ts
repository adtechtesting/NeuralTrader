import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

// Function to generate a new Solana wallet (keypair)
export function generateWallet() {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toString();
  const privateKey = bs58.encode(keypair.secretKey);

  return {
    publicKey,
    privateKey
  };
}

// Function to recover a wallet from a private key
export function walletFromPrivateKey(privateKeyBase58: string) {
  try {
    const secretKey = bs58.decode(privateKeyBase58);
    const keypair = Keypair.fromSecretKey(secretKey);
    
    return {
      publicKey: keypair.publicKey.toString(),
      privateKey: privateKeyBase58
    };
  } catch (error) {
    console.error("Error recovering wallet from private key:", error);
    throw error;
  }
}
