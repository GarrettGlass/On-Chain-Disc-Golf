/**
 * Bitcoin Price Service
 * Fetches BTC/USD price from mempool.space with caching
 * Designed for minimal resource usage on mobile
 */

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes - plenty fresh for a disc golf app

interface PriceCache {
  usd: number;
  timestamp: number;
}

let cachedPrice: PriceCache | null = null;

/**
 * Get current BTC price in USD
 * Uses mempool.space as primary source (Bitcoin-native, reliable)
 * Returns cached value if fresh, otherwise fetches new price
 */
export const getBtcPrice = async (): Promise<number | null> => {
  // Return cached if still fresh
  if (cachedPrice && Date.now() - cachedPrice.timestamp < CACHE_DURATION) {
    console.log('💰 Using cached BTC price:', cachedPrice.usd);
    return cachedPrice.usd;
  }

  try {
    console.log('💰 Fetching BTC price from mempool.space...');
    const response = await fetch('https://mempool.space/api/v1/prices', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.USD && typeof data.USD === 'number') {
      cachedPrice = {
        usd: data.USD,
        timestamp: Date.now()
      };
      console.log('💰 BTC price updated:', data.USD);
      return data.USD;
    }

    throw new Error('Invalid price data');
  } catch (error) {
    console.warn('💰 Price fetch failed:', error);
    
    // Return stale cache if available (better than nothing)
    if (cachedPrice) {
      console.log('💰 Using stale cached price:', cachedPrice.usd);
      return cachedPrice.usd;
    }
    
    return null;
  }
};

/**
 * Convert satoshis to USD string
 * @param sats - Amount in satoshis
 * @param btcPrice - Current BTC price in USD
 * @returns Formatted USD string (e.g., "$0.67")
 */
export const satsToUsd = (sats: number, btcPrice: number): string => {
  const btc = sats / 100_000_000;
  const usd = btc * btcPrice;
  
  // Format based on amount
  if (usd < 0.01) {
    return `$${usd.toFixed(4)}`;
  } else if (usd < 1) {
    return `$${usd.toFixed(3)}`;
  } else if (usd < 100) {
    return `$${usd.toFixed(2)}`;
  } else {
    return `$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

/**
 * Get the age of the cached price
 * @returns Human readable string or null if no cache
 */
export const getCacheAge = (): string | null => {
  if (!cachedPrice) return null;
  
  const ageMs = Date.now() - cachedPrice.timestamp;
  const ageSec = Math.floor(ageMs / 1000);
  
  if (ageSec < 60) return `${ageSec}s ago`;
  const ageMin = Math.floor(ageSec / 60);
  return `${ageMin}m ago`;
};

