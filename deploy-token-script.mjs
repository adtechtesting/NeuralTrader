// ES Module version of deploy-token-script
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync } from 'fs';
import { SolanaAgentKit } from 'solana-agent-kit';
import { Keypair, Connection } from '@solana/web3.js';

// Setup dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '.env.local') });

// Environment variables
const PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const RPC_URL = "https://api.testnet.solana.com";

if (!PRIVATE_KEY) {
  console.error("SOLANA_PRIVATE_KEY not set in .env.local");
  process.exit(1);
}

// Create a new instance of SolanaAgentKit
// Check the library documentation for the correct constructor parameters
const agent = SolanaAgentKit.create({
  privateKey: PRIVATE_KEY,
  rpcUrl: RPC_URL,
  openAiApiKey: OPENAI_API_KEY
});

async function deployToken() {
  try {
    console.log("Deploying token on testnet...");
    
    const result = await agent.deployToken(
      "my ai token",   // name
      "uri",           // metadata URI
      "token",         // symbol
      9,               // decimals
      {
        mintAuthority: null,       // default to deployer account
        freezeAuthority: null,     // default to deployer account
        updateAuthority: undefined, // default to deployer account
        isMutable: false           // set to false for immutability
      },
      1000000          // initial supply (1,000,000 tokens)
    );
    
    console.log("Token deployed successfully!");
    console.log("Token Mint Address:", result.mint.toString());
    
    // Save token details to a file
    const tokenData = {
      name: "my ai token",
      symbol: "token",
      decimals: 9,
      mintAddress: result.mint.toString(),
    };
    writeFileSync("token-details.json", JSON.stringify(tokenData, null, 2));
    console.log("Token details saved to token-details.json");
    
    return tokenData;
  } catch (error) {
    console.error("Error deploying token:", error);
    process.exit(1);
  }
}

// Run the deployment
deployToken();
