import { Connection, PublicKey } from '@solana/web3.js';

const RPC = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC, 'confirmed');

export async function getSolBalance(pubkey: string): Promise<number> {
  const lamports = await connection.getBalance(new PublicKey(pubkey));
  return lamports / 1e9;
}

export async function getSplTokenBalance(pubkey: string, mint: string): Promise<number> {
  const owner = new PublicKey(pubkey);
  const mintPk = new PublicKey(mint);
  const resp = await connection.getParsedTokenAccountsByOwner(owner, { mint: mintPk });
  const acc = resp.value[0]?.account.data.parsed.info.tokenAmount;
  return acc ? Number(acc.uiAmount) : 0;
}

export async function getAllSplBalances(pubkey: string): Promise<Array<{ mint: string; decimals: number; uiAmount: number }>> {
  const owner = new PublicKey(pubkey);
  const resp = await connection.getParsedTokenAccountsByOwner(owner, { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });
  return resp.value.map(v => {
    const info = v.account.data.parsed.info;
    return {
      mint: info.mint as string,
      decimals: info.tokenAmount.decimals as number,
      uiAmount: Number(info.tokenAmount.uiAmount) || 0
    };
  });
}


