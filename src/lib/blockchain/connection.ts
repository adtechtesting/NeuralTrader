import { Connection, clusterApiUrl } from '@solana/web3.js';


const rpcUrl = process.env.RPC_URL || clusterApiUrl('devnet');

console.log(`Using Solana RPC URL: ${rpcUrl}`);


export const connection = new Connection(rpcUrl, 'confirmed');


export function getConnection(): Connection {
  return new Connection(rpcUrl, 'confirmed');
}

