import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { SolanaAgentKit, KeypairWallet } from "solana-agent-kit";

// Function to deploy a new token using SolanaAgentKit's direct method
export async function deployToken(
  privateKeyBase58: string,
  tokenName: string,
  tokenSymbol: string,
  decimals: number = 9
) {
  try {
    console.log("Creating SolanaAgentKit instance...");
    
    // Decode the private key and create a wallet compatible with SolanaAgentKit
    const decodedKey = bs58.decode(privateKeyBase58);
    const keypair = Keypair.fromSecretKey(decodedKey);
    const wallet = new KeypairWallet(
      keypair,
      process.env.NEXT_PUBLIC_RPC_URL!
    );

    // Create the Solana Agent Kit instance directly
    const solanaKit = new SolanaAgentKit(
      wallet,
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
      //@ts-ignore
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
        //@ts-ignore
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
      throw new Error(`Token deployment failed: ${deployError}`);
    }
  } catch (error) {
    console.error("Error deploying token:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
