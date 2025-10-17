import { prisma } from '@/lib/cache/dbCache';
import { searchToken } from '@/services/market';

export type SelectedToken = { 
  mint: string; 
  symbol?: string; 
  name?: string;
  decimals: number;
  usdPrice?: number;
  mcap?: number;
  liquidity?: number;
  holderCount?: number;
  isVerified?: boolean;
  icon?: string;
};

/**
 * Get selected token with LIVE data from Jupiter
 * Only stores mint address in DB, fetches fresh data on each call
 */
export async function getSelectedToken(): Promise<SelectedToken> {
  try {
    // Get stored mint address
    const row = await prisma.simulationConfig.findUnique({ 
      where: { key: 'selected_token' } 
    });
    
    let mint = 'So11111111111111111111111111111111111111112'; // Default to SOL
    
    if (row) {
      try {
        const parsed = JSON.parse(row.value);
        mint = parsed.mint || parsed; // Handle both {mint: "..."} and just "..."
      } catch {
        // If parsing fails, assume it's just the mint string
        mint = row.value;
      }
    }
    
    // Fetch LIVE data from Jupiter
    const liveData = await searchToken(mint);
    
    if (liveData) {
      return {
        mint: liveData.id || mint,
        symbol: liveData.symbol,
        name: liveData.name,
        decimals: liveData.decimals || 9,
        usdPrice: liveData.usdPrice,
        mcap: liveData.mcap,
        liquidity: liveData.liquidity,
        holderCount: liveData.holderCount,
        isVerified: liveData.isVerified,
        icon: liveData.icon
      };
    }
    
    // Fallback if Jupiter API fails
    return {
      mint,
      symbol: mint === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'TOKEN',
      name: mint === 'So11111111111111111111111111111111111111112' ? 'Solana' : 'Unknown',
      decimals: 9,
    };
  } catch (error) {
    console.error('Error getting selected token:', error);
    // Return SOL as fallback
    return {
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9,
    };
  }
}

