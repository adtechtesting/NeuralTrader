import { Connection, clusterApiUrl } from '@solana/web3.js';

// Use the provided RPC URL or default to the public testnet endpoint
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl('testnet');

// Create and export the connection instance
export const connection = new Connection(rpcUrl, 'confirmed');

// Helper function to get a fresh connection if needed
export function getConnection(): Connection {
  return new Connection(rpcUrl, 'confirmed');
}
