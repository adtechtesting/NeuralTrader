import { prisma } from '@/lib/cache/dbCache';

// Cache for selected token to reduce database hits
let cachedToken: any = null;
let cacheTime: number = 0;
const CACHE_TTL = 5000; // 5 seconds

export async function getSelectedToken(forceRefresh = false) {
  if (forceRefresh || !cachedToken || Date.now() - cacheTime > CACHE_TTL) {
    try {
      const row = await prisma.simulationConfig.findUnique({
        where: { key: 'selected_token' }
      });

      if (row?.value) {
        cachedToken = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        cacheTime = Date.now();
        console.log(`✅ Token refreshed: ${cachedToken.symbol}`);
      }
    } catch (error) {
      console.error('Error fetching token:', error);
    }
  }

  return cachedToken;
}

