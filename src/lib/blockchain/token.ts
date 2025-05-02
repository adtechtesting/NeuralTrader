import { Keypair, PublicKey } from "@solana/web3.js";
import * as bs58 from "bs58";
import { connection } from "./connection";
import { SolanaAgentKit } from "solana-agent-kit";

// Function to deploy a new token using SolanaAgentKit's direct method
export async function deployToken(
  privateKeyBase58: string,
  tokenName: string,
  tokenSymbol: string,
  decimals: number = 9
) {
  try {
    console.log("Creating SolanaAgentKit instance...");
    
    // Create the Solana Agent Kit instance directly
    const solanaKit = new SolanaAgentKit(
      privateKeyBase58,
      process.env.NEXT_PUBLIC_RPC_URL!,
      {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      }
    );
    
    console.log("Deploying token...");
    
    // Determine decimals and initial supply
    const decimalValue = parseInt(String(decimals));
    // Calculate initial supply (e.g., 1,000,000 tokens with proper decimal adjustment)
    const initialSupply = 1000000 * Math.pow(10, decimalValue);
    
    console.log(`Deploying with: name=${tokenName}, symbol=${tokenSymbol}, decimals=${decimalValue}, initialSupply=${initialSupply}`);
    
    try {
      // Use the direct deployToken method from the kit
      const result = await solanaKit.deployToken(
        tokenName,           // name
        "https://example.com/token.json", // uri
        tokenSymbol,         // symbol
        decimalValue,        // decimals
        {                    // optional authorities
          mintAuthority: null,      // by default, deployer account
          freezeAuthority: null,    // by default, deployer account
          updateAuthority: undefined, // by default, deployer account
          isMutable: true          // by default, true
        },
        BigInt(Math.floor(initialSupply))  // Ensure it's a valid integer before converting to BigInt
      );
      
      console.log("Token deployed successfully:", result);
      
      // Return the token address
      return {
        success: true,
        mintAddress: result.mint.toString(),
        response: `Token ${tokenName} (${tokenSymbol}) deployed successfully with mint address: ${result.mint.toString()}`
      };
    } catch (deployError) {
      console.error("Deployment error:", deployError);
      throw new Error(`Token deployment failed: ${deployError.message}`);
    }
  } catch (error) {
    console.error("Error deploying token:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
