import { PublicKey } from "@solana/web3.js";
import { connection } from "./connection";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

// Function to request an airdrop of SOL using the Solana CLI
export async function requestAirdrop(publicKey: string, amount: number = 1) {
  try {
    // Convert string public key to PublicKey object
    const key = new PublicKey(publicKey);
    
    // Get initial balance for comparison later
    const initialBalance = await connection.getBalance(key);
    console.log(`Initial balance: ${initialBalance / 1000000000} SOL`);
    
    console.log(`Requesting ${amount} SOL airdrop to ${publicKey}...`);
    
    // Use the Solana CLI command directly
    const command = `solana airdrop ${amount} ${publicKey} --url http://localhost:8899`;
    console.log(`Executing command: ${command}`);
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error(`Command stderr: ${stderr}`);
      throw new Error(`CLI error: ${stderr}`);
    }
    
    console.log(`Command stdout: ${stdout}`);
    
    // Wait a bit for the airdrop to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check the balance to verify the airdrop was successful
    const newBalance = await connection.getBalance(key);
    console.log(`New balance: ${newBalance / 1000000000} SOL`);
    
    if (newBalance <= initialBalance) {
      throw new Error("Airdrop did not increase the wallet balance");
    }
    
    return {
      success: true,
      amount,
      initialBalance: initialBalance / 1000000000,
      newBalance: newBalance / 1000000000,
      output: stdout
    };
  } catch (error) {
    console.error("Error requesting airdrop:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
