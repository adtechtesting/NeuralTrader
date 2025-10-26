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
  isFallback?: boolean; 
};

/**
 * Get selected token - ONLY use user's selection, no fallbacks
 * If Jupiter API fails, return null instead of switching tokens
 */
export async function getSelectedToken(): Promise<SelectedToken | null> {
  try {
    // Get stored token data
    const row = await prisma.simulationConfig.findUnique({
      where: { key: 'selected_token' }
    });

    let mint = 'So11111111111111111111111111111111111111112'; // Default to SOL only if no selection

    if (row) {
      try {
        const parsed = JSON.parse(row.value);

     
        if (parsed.mint && parsed.symbol && parsed.name) {
          mint = parsed.mint;

        
          const liveData = await searchToken(mint);

          if (liveData) {
            return {
              mint: liveData.id || mint,
              symbol: liveData.symbol || parsed.symbol,
              name: liveData.name || parsed.name,
              decimals: liveData.decimals || parsed.decimals || 9,
              usdPrice: liveData.usdPrice,
              mcap: liveData.mcap,
              liquidity: liveData.liquidity,
              holderCount: liveData.holderCount,
              isVerified: liveData.isVerified,
              icon: liveData.icon,
              isFallback: false
            };
          }

        
          console.log(`⚠️ Jupiter API failed for ${mint}, but using ONLY user's selected token`);
          return {
            mint: parsed.mint,
            symbol: parsed.symbol,
            name: parsed.name,
            decimals: parsed.decimals || 9,
            isFallback: true // Only indicate fallback mode, don't switch tokens
          };
        }
      } catch (parseError) {
        console.error('Error parsing stored token data:', parseError);
        // Don't return anything if we can't parse the user's selection
        return null;
      }
    }

    // Only return SOL if no token was ever selected
    return {
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9,
      isFallback: false
    };
  } catch (error) {
    console.error('Error getting selected token:', error);
   
    return null;
  }
}

