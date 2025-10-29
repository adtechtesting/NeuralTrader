import { NextRequest, NextResponse } from 'next/server';
import { getAllSplBalances, getSolBalance } from '@/blockchain/onchain-balances';
import { getPrice } from '@/services/market';

type WalletToken = {
  mint: string;
  symbol?: string;
  decimals: number;
  uiAmount: number;
  priceUsd: number | null;
};

export async function POST(req: NextRequest) {
  try {
    const { pubkey } = await req.json();
    if (!pubkey) {
      return NextResponse.json({ error: 'missing pubkey' }, { status: 400 });
    }

    const [sol, spl] = await Promise.all([
      getSolBalance(pubkey),
      getAllSplBalances(pubkey)
    ]);

    const solMint = 'So11111111111111111111111111111111111111112';
    const solPrice = await getPrice(solMint).catch(() => null);

    const items: WalletToken[] = await Promise.all(spl.map(async t => {
      const price = await getPrice(t.mint).catch(() => null);
      return {
        mint: t.mint,
        decimals: t.decimals,
        uiAmount: t.uiAmount,
        priceUsd: price
      };
    }));

    items.unshift({
      mint: solMint,
      symbol: 'SOL',
      decimals: 9,
      uiAmount: sol,
      priceUsd: solPrice
    });

    return NextResponse.json(items);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


