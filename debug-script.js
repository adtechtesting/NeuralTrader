// debug-setup.js
// Basic script to help debug environment issues

const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
// Use the default export from bs58
const bs58 = require('bs58').default;
const fs = require('fs');
const { Buffer } = require('buffer');
require('dotenv').config({ path: '.env.local' });

// For debugging unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function debugSetup() {
  try {
    console.log('🔍 Starting debug script...');

    // Check environment variables
    console.log('Checking environment variables...');
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpcUrl) {
      throw new Error('NEXT_PUBLIC_RPC_URL is not set in .env.local');
    }
    console.log(`✅ RPC URL: ${rpcUrl}`);

    // Test connection to Solana
    console.log('Testing connection to Solana...');
    const connection = new Connection(rpcUrl, 'confirmed');
    const version = await connection.getVersion();
    console.log(`✅ Connected to Solana! Version: ${JSON.stringify(version)}`);

    // Check admin keypair
    console.log('Checking admin keypair...');
    const adminPrivateKey = process.env.SOLANA_PRIVATE_KEY;
    if (!adminPrivateKey) {
      throw new Error('SOLANA_PRIVATE_KEY not found in environment');
    }
    
    // Test decoding the private key
    let secretKey;
    try {
      if (adminPrivateKey.length > 88) {
        console.log('Detected Base64 encoded key');
        secretKey = Buffer.from(adminPrivateKey, 'base64');
      } else {
        console.log('Attempting to decode as Base58');
        secretKey = bs58.decode(adminPrivateKey);
      }
      
      console.log(`Secret key length: ${secretKey.length} bytes`);
      if (secretKey.length !== 64) {
        throw new Error(`Invalid private key length: ${secretKey.length}. Expected 64 bytes.`);
      }
      
      const adminKeypair = Keypair.fromSecretKey(secretKey);
      console.log(`✅ Admin Public Key: ${adminKeypair.publicKey.toBase58()}`);
      
      // Check balance
      const balance = await connection.getBalance(adminKeypair.publicKey);
      console.log(`✅ Admin balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    } catch (error) {
      console.error('❌ Error processing private key:', error);
      throw error;
    }
    
    // Check token details
    console.log('Checking token details file...');
    try {
      const tokenDetails = JSON.parse(fs.readFileSync('token-details.json', 'utf8'));
      console.log('✅ Token details loaded:');
      console.log(`  - Name: ${tokenDetails.name}`);
      console.log(`  - Symbol: ${tokenDetails.symbol}`);
      console.log(`  - Mint: ${tokenDetails.mintAddress}`);
      console.log(`  - Decimals: ${tokenDetails.decimals}`);
      
      // Verify mint exists on chain
      const mintPubkey = new PublicKey(tokenDetails.mintAddress);
      const mintInfo = await connection.getAccountInfo(mintPubkey);
      if (!mintInfo) {
        console.warn('⚠️ Token mint account not found on chain!');
      } else {
        console.log('✅ Token mint account exists on chain.');
      }
    } catch (error) {
      console.error('❌ Error checking token details:', error);
      throw error;
    }
    
    // Check required node modules
    console.log('Checking required node modules...');
    let modulesOk = true;
    
    try {
      require('@solana/web3.js');
      console.log('✅ @solana/web3.js is installed');
    } catch (e) {
      console.error('❌ @solana/web3.js is missing');
      modulesOk = false;
    }
    
    try {
      require('@solana/spl-token');
      console.log('✅ @solana/spl-token is installed');
    } catch (e) {
      console.error('❌ @solana/spl-token is missing');
      modulesOk = false;
    }
    
    try {
      require('@solana/buffer-layout');
      console.log('✅ @solana/buffer-layout is installed');
    } catch (e) {
      console.error('❌ @solana/buffer-layout is missing');
      modulesOk = false;
    }
    
    try {
      // Try to access TokenSwapProgram public key
      const tokenSwapProgramId = new PublicKey('SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8');
      const programInfo = await connection.getAccountInfo(tokenSwapProgramId);
      if (!programInfo) {
        console.warn('⚠️ TokenSwap program not found on chain! Make sure you are on the right network.');
      } else {
        console.log('✅ TokenSwap program exists on chain.');
      }
    } catch (error) {
      console.error('❌ Error checking TokenSwap program:', error);
    }

    console.log('🎯 Debug completed successfully!');
  } catch (error) {
    console.error('❌ Debug failed with error:', error);
    process.exit(1);
  }
}

// Run the debug function
debugSetup().catch(err => {
  console.error('❌ Final Error:', err);
  process.exit(1);
});

