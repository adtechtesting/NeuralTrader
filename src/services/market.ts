const JUP_PRICE = 'https://price.jup.ag/v6/price';
const JUP_QUOTE = 'https://quote-api.jup.ag/v6/quote';
const JUP_TOKENS_V2 = 'https://lite-api.jup.ag/tokens/v2';

export async function getPrice(mint: string): Promise<number | null> {
  try {
    // First try Jupiter Tokens V2 API for more reliable data
    const tokenInfo = await searchToken(mint);
    if (tokenInfo && tokenInfo.usdPrice) {
      return tokenInfo.usdPrice;
    }
    
    // Fallback to price API
    const url = `${JUP_PRICE}?ids=${encodeURIComponent(mint)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    const p = json.data?.[mint]?.price;
    return typeof p === 'number' ? p : null;
  } catch (e) {
    console.error('Error fetching price:', e);
    return null;
  }
}

export async function getQuote(inputMint: string, outputMint: string, amountLamports: number, slippageBps = 100): Promise<any> {
  try {
    const params = new URLSearchParams({
      inputMint, outputMint,
      amount: String(amountLamports),
      slippageBps: String(slippageBps)
    });
    const res = await fetch(`${JUP_QUOTE}?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Jupiter quote error ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('Error fetching quote:', e);
    throw e;
  }
}

/**
 * Search for token information using Jupiter Tokens V2 API
 */
export async function searchToken(query: string): Promise<any | null> {
  try {
    const url = `${JUP_TOKENS_V2}/search?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const tokens = await res.json();
    return tokens && tokens.length > 0 ? tokens[0] : null;
  } catch (e) {
    console.error('Error searching token:', e);
    return null;
  }
}

/**
 * Get verified tokens from Jupiter
 */
export async function getVerifiedTokens(): Promise<any[]> {
  try {
    const url = `${JUP_TOKENS_V2}/tag?query=verified`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Error fetching verified tokens:', e);
    return [];
  }
}

/**
 * Get top tokens by category
 */
export async function getTopTokens(category: 'toporganicscore' | 'toptraded' | 'toptrending', interval: '5m' | '1h' | '6h' | '24h' = '24h', limit: number = 50): Promise<any[]> {
  try {
    const url = `${JUP_TOKENS_V2}/${category}/${interval}?limit=${limit}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Error fetching top tokens:', e);
    return [];
  }
}

/**
 * Get recent tokens (first pool creation)
 */
export async function getRecentTokens(limit: number = 30): Promise<any[]> {
  try {
    const url = `${JUP_TOKENS_V2}/recent?limit=${limit}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Error fetching recent tokens:', e);
    return [];
  }
}

export async function getAnalytics(_mint: string) {
  // Optional Birdeye integration can be added here using BIRDEYE_API_KEY
  return null;
}


