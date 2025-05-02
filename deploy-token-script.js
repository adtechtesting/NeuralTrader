

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');
// Modified import to access the default export for bs58
const bs58 = require('bs58').default;

// Configuration
// Default RPC_URL is set to the local validator endpoint
const NETWORK_URL = process.env.RPC_URL || "http://127.0.0.1:8899";
const TOKEN_CONFIG = {
  name: "NURO",
  symbol: "$NURO",
  decimals: 9,
  initialSupply: 1000000,       // Much lower initial supply - just 1000 tokens
};

// Load wallet from private key
function loadWallet() {
  const privateKeyStr = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKeyStr) {
    console.error("❌ SOLANA_PRIVATE_KEY not set in .env.local");
    process.exit(1);
  }
  
  try {
    // Decode base58 private key
    const privateKeyBytes = bs58.decode(privateKeyStr);
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    console.error("❌ Error loading wallet:", error.message);
    process.exit(1);
  }
}

async function deployToken() {
  console.log(`🚀 Initializing token deployment on ${NETWORK_URL}...`);
  
  try {
    // Set up connection
    const connection = new Connection(NETWORK_URL, 'confirmed');
    
    // Load wallet
    const wallet = loadWallet();
    console.log(`📝 Using wallet: ${wallet.publicKey.toString()}`);
    
    // Check wallet balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Wallet balance: ${balance / 1e9} SOL`);
    
    if (balance < 10000000) { // 0.01 SOL minimum
      console.error("❌ Insufficient balance to pay for token creation. Need at least 0.01 SOL");
      process.exit(1);
    }
    
    console.log(`📝 Creating token with the following configuration:`);
    console.log(`   Name: ${TOKEN_CONFIG.name}`);
    console.log(`   Symbol: ${TOKEN_CONFIG.symbol}`);
    console.log(`   Decimals: ${TOKEN_CONFIG.decimals}`);
    console.log(`   Initial Supply: ${TOKEN_CONFIG.initialSupply}`);
    
    // Create new token mint
    console.log("⏳ Creating token mint...");
    const mint = await createMint(
      connection,           // connection
      wallet,               // payer
      wallet.publicKey,     // mint authority
      wallet.publicKey,     // freeze authority
      TOKEN_CONFIG.decimals // decimals
    );
    
    console.log(`✅ Token mint created: ${mint.toString()}`);
    
    // Create token account to hold balance
    console.log("⏳ Creating token account...");
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mint,
      wallet.publicKey
    );
    
    console.log(`✅ Token account created: ${tokenAccount.address.toString()}`);
    
    // Mint initial token supply
    console.log(`⏳ Minting ${TOKEN_CONFIG.initialSupply} tokens...`);
    
    // Calculate supply with decimals (1000 tokens with 9 decimals = 1000 * 10^9)
    const initialSupplyWithDecimals = BigInt(TOKEN_CONFIG.initialSupply) * BigInt(10 ** TOKEN_CONFIG.decimals);
    
    await mintTo(
      connection,
      wallet,
      mint,
      tokenAccount.address,
      wallet.publicKey,
      initialSupplyWithDecimals
    );
    
    console.log(`✅ Tokens minted successfully!`);
    
    // Save token details to a file
    const tokenData = {
      name: TOKEN_CONFIG.name,
      symbol: TOKEN_CONFIG.symbol,
      decimals: TOKEN_CONFIG.decimals,
      mintAddress: mint.toString(),
      tokenAccount: tokenAccount.address.toString(),
      ownerAddress: wallet.publicKey.toString(),
      network: NETWORK_URL.includes("testnet")
        ? "testnet"
        : NETWORK_URL.includes("devnet")
          ? "devnet"
          : "local",
      deploymentDate: new Date().toISOString()
    };
    
    const outputFile = "token-details.json";
    fs.writeFileSync(outputFile, JSON.stringify(tokenData, null, 2));
    console.log(`💾 Token details saved to ${outputFile}`);
    
    // Generate Solana Explorer links
    // For a local validator, there's no public explorer available
    const explorerBase = NETWORK_URL.includes("testnet")
      ? "https://explorer.solana.com/?cluster=testnet"
      : NETWORK_URL.includes("devnet")
        ? "https://explorer.solana.com/?cluster=devnet"
        : "Local Validator - no explorer available";
    
    console.log("\n🔎 Solana Explorer Links:");
    console.log(`   Token: ${explorerBase}&address=${mint.toString()}`);
    
    console.log("\n📋 Next steps:");
    console.log(`  1. Add token ${mint.toString()} to your wallet`);
    console.log("  2. Create liquidity pools if needed");
    console.log("  3. Share the token with your community");
    
    return tokenData;
  } catch (error) {
    console.error("❌ Error deploying token:", error);
    if (error.message.includes("timed out")) {
      console.error("Network connection timed out. This can happen on testnet/devnet. Try again or use a different RPC endpoint.");
    } else if (error.message.includes("insufficient funds")) {
      console.error("Your wallet doesn't have enough SOL to complete this transaction.");
    }
    process.exit(1);
  }
}

// Run the deployment
deployToken().then(() => {
  console.log("🎉 Deployment process completed");
}).catch(err => {
  console.error("Fatal error:", err);
});

