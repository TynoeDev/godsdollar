// TypeScript implementation based on compact-crypto.js
// Provides cryptocurrency data retrieval and display functionality with proper image handling

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Define interfaces for cryptocurrency data
export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h?: number; 
  low_24h?: number;
}

export interface TrendingCoin {
  item: {
    id: string;
    name: string;
    symbol: string;
    thumb: string;
    small: string;
    price_btc: number;
    score: number;
  };
}

// Define interface for currency options
export interface CurrencyOption {
  symbol: string;
  name: string;
}

// Interface for CoinGecko market data
interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h?: number;
  low_24h?: number;
}

// Interface for MoonPay currency data
interface MoonPayCurrency {
  code: string;
  name: string;
  logoUrl?: string;
  price?: number;
  change24Hour?: number;
  marketCap?: number;
  rank?: number;
  volume24Hour?: number;
  btcRate?: number;
}

// Interface for CoinGecko coin details
interface CoinGeckoDetailResponse {
  id: string;
  symbol: string;
  name: string;
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  market_cap_rank: number;
  market_data?: {
    current_price: Record<string, number>;
    price_change_percentage_24h: number;
    market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    high_24h: Record<string, number>;
    low_24h: Record<string, number>;
  };
}

// Interface for search result item
interface SearchResultItem {
  id: string;
  name: string;
  symbol: string;
  thumb?: string;
  small?: string;
  market_cap_rank?: number;
}

// Interface for CoinGecko trending response
interface TrendingResponse {
  coins: TrendingCoin[];
}

// Available currencies with their symbols
export const currencies: Record<string, CurrencyOption> = {
  'usd': { symbol: '$', name: 'US Dollar' },
  'eur': { symbol: '€', name: 'Euro' },
  'gbp': { symbol: '£', name: 'British Pound' },
  'jpy': { symbol: '¥', name: 'Japanese Yen' },
  'btc': { symbol: '₿', name: 'Bitcoin' },
  'eth': { symbol: 'Ξ', name: 'Ethereum' }
};

// Service configuration
const API_BASE_URL = 'https://api.coingecko.com/api/v3';
const MOONPAY_API_BASE_URL = 'https://api.moonpay.com/v3';
const COINGECKO_API_KEY = import.meta.env.VITE_COINGECKO_API_KEY || ''; // CoinGecko API key from env
const MOONPAY_API_KEY = import.meta.env.VITE_MOONPAY_API_KEY || ''; // MoonPay API key from env

// API rate limiting management
const API_BACKOFF_MS = 2000; // Backoff time when rate limited
const MAX_RETRIES = 3; // Maximum number of retries for API calls

// Type for cached API data
type CachedData<T> = { data: T; timestamp: number };

// Advanced caching system for images and API responses
class CryptoCache {
  private imageCache: Map<string, string> = new Map();
  private apiCache: Map<string, CachedData<unknown>> = new Map();
  private apiCallAttempts: Map<string, number> = new Map(); // Track API call attempts by coin ID
  private rateLimitedUntil: number = 0; // Timestamp until rate limit expires
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes by default
  private apiCooldown: number = 60 * 1000; // 1 minute cooldown between API calls for the same coin
  private coinBlacklist: Set<string> = new Set(); // Blacklist for problematic coin IDs

  // Set an image in the cache
  setImageUrl(coinId: string, url: string): void {
    this.imageCache.set(coinId.toLowerCase(), url);
  }

  // Get an image from the cache
  getImageUrl(coinId: string): string | undefined {
    return this.imageCache.get(coinId.toLowerCase());
  }

  // Set API data in the cache
  setApiData<T>(key: string, data: T): void {
    this.apiCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Get API data from the cache with type safety
  getApiData<T>(key: string): T | undefined {
    const cached = this.apiCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data as T;
    }
    return undefined;
  }

  // Check if we're rate limited
  isRateLimited(): boolean {
    return Date.now() < this.rateLimitedUntil;
  }

  // Set rate limited flag with optional custom wait time in seconds
  setRateLimited(isLimited: boolean, waitTimeSeconds?: number): void {
    if (isLimited) {
      // If wait time is provided, use it; otherwise default to 5 minutes
      const waitTimeMs = waitTimeSeconds ? waitTimeSeconds * 1000 : 5 * 60 * 1000;
      this.rateLimitedUntil = Date.now() + waitTimeMs;
      console.warn(`CoinGecko API rate limited. Will pause API calls for ${waitTimeSeconds || 300} seconds.`);
    } else {
      this.rateLimitedUntil = 0;
    }
  }

  // Add a coin to blacklist to avoid further API calls
  addToBlacklist(coinId: string): void {
    this.coinBlacklist.add(coinId.toLowerCase());
    console.log(`Added ${coinId} to API call blacklist`);
  }

  // Check if a coin is blacklisted
  isBlacklisted(coinId: string): boolean {
    return this.coinBlacklist.has(coinId.toLowerCase());
  }

  // Check if we should try an API call for this coin
  shouldTryApiCall(coinId: string): boolean {
    // Don't try if globally rate limited or if coin is blacklisted
    if (this.isRateLimited() || this.isBlacklisted(coinId.toLowerCase())) {
      return false;
    }
    
    const lastAttempt = this.apiCallAttempts.get(coinId.toLowerCase());
    // If we've never tried, or it's been more than the cooldown period
    if (!lastAttempt || (Date.now() - lastAttempt > this.apiCooldown)) {
      return true;
    }
    return false;
  }

  // Mark that we've attempted an API call for this coin
  markApiCallAttempt(coinId: string): void {
    this.apiCallAttempts.set(coinId.toLowerCase(), Date.now());
  }

  // Clear expired items from cache
  clearExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.apiCache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.apiCache.delete(key);
      }
    }
  }
}

// Initialize cache
const cache = new CryptoCache();

// Default placeholder image path
const DEFAULT_PLACEHOLDER = '/public/placeholder.svg';

// Helper function to get cryptocurrency images with fallbacks and caching
export const getCryptoImageUrl = (code: string): string => {
  if (!code) return DEFAULT_PLACEHOLDER;
  
  const coinId = code.toLowerCase();
  
  // Check if we have a cached image URL
  const cachedUrl = cache.getImageUrl(coinId);
  if (cachedUrl) {
    return cachedUrl;
  }
  
  // Special case for Gods Dollar
  if (coinId === 'godd') {
    const url = '/src/images/main.png';
    cache.setImageUrl(coinId, url);
    return url;
  }
  
  // Prioritize local images for common cryptocurrencies
  // Expanded collection of common crypto icons
  const localImageMap: Record<string, string> = {
    // Core cryptocurrencies
    btc: '/src/images/crypto/bitcoin.png',
    eth: '/src/images/crypto/ethereum.png',
    sol: '/src/images/crypto/solana.png',
    usdc: '/src/images/crypto/usdc.png',
    usdt: '/src/images/crypto/tether.png',
    bnb: '/src/images/crypto/binance.png',
    xrp: '/src/images/crypto/xrp.png',
    ada: '/src/images/crypto/cardano.png',
    doge: '/src/images/crypto/dogecoin.png',
    dot: '/src/images/crypto/polkadot.png',
    link: '/src/images/crypto/chainlink.png',
    avax: '/src/images/crypto/avalanche.png',
    shib: '/src/images/crypto/shiba.png',
    
    // When code is a symbol, provide mapping to common IDs
    'bitcoin': '/src/images/crypto/bitcoin.png',
    'ethereum': '/src/images/crypto/ethereum.png',
    'solana': '/src/images/crypto/solana.png',
    'usd-coin': '/src/images/crypto/usdc.png',
    'tether': '/src/images/crypto/tether.png',
    'binancecoin': '/src/images/crypto/binance.png',
    'ripple': '/src/images/crypto/xrp.png',
    'cardano': '/src/images/crypto/cardano.png',
    'dogecoin': '/src/images/crypto/dogecoin.png',
    'polkadot': '/src/images/crypto/polkadot.png',
    'chainlink': '/src/images/crypto/chainlink.png',
    'avalanche-2': '/src/images/crypto/avalanche.png',
    'shiba-inu': '/src/images/crypto/shiba.png',
    'wrapped-bitcoin': '/src/images/crypto/bitcoin.png', // Use BTC image for WBTC
    'staked-ether': '/src/images/crypto/ethereum.png', // Use ETH image for stETH
    'wrapped-steth': '/src/images/crypto/ethereum.png', // Use ETH image for wstETH
  };
  
  // Check if we have a local image for this cryptocurrency
  if (localImageMap[coinId]) {
    const url = localImageMap[coinId];
    cache.setImageUrl(coinId, url);
    return url;
  }
  
  // Try to fetch from CoinGecko using their standard API image format
  // CoinGecko uses numerical IDs for coin images, so we need to try multiple approaches
  
  // First approach: For known popular coins, use established IDs
  const knownImageMapping: Record<string, { id: number, name: string }> = {
    'bitcoin': { id: 1, name: 'bitcoin' },
    'ethereum': { id: 279, name: 'ethereum' },
    'tether': { id: 325, name: 'tether' },
    'binancecoin': { id: 825, name: 'binance-coin' },
    'ripple': { id: 44, name: 'xrp' },
    'solana': { id: 16116, name: 'solana' },
    'cardano': { id: 2010, name: 'cardano' },
    'staked-ether': { id: 8085, name: 'staked-ether' },
    'dogecoin': { id: 5, name: 'dogecoin' },
    'tron': { id: 1958, name: 'tron' },
    'polkadot': { id: 6636, name: 'polkadot' },
    'chainlink': { id: 1975, name: 'chainlink' },
    'wrapped-bitcoin': { id: 3717, name: 'wrapped-bitcoin' },
    'shiba-inu': { id: 5994, name: 'shiba-inu' },
    'avalanche-2': { id: 12559, name: 'avalanche-2' },
    'uniswap': { id: 12504, name: 'uniswap' },
    'stellar': { id: 512, name: 'stellar' },
  };
  
  // Try the known mapping first
  if (knownImageMapping[coinId]) {
    const mapping = knownImageMapping[coinId];
    const url = `https://assets.coingecko.com/coins/images/${mapping.id}/small/${mapping.name}.png`;
    
    // Cache the URL we're attempting to use
    cache.setImageUrl(coinId, url);
    
    return url;
  }
  
  // For other coins, try a series of fallback approaches
    // Approach 1: Use direct image URLs from CoinGecko's public CDN instead of API
  // This avoids hitting rate limits on the API itself
  
  // For CoinGecko's CDN, we'll try a few common patterns for image URLs
  const cdnUrl1 = `https://assets.coingecko.com/coins/images/search_fallback/${coinId}.png`;
  const cdnUrl2 = `https://assets.coingecko.com/coins/images/search_fallback/${coinId.replace(/-/g, '_')}.png`;
  
  // We'll only use the API as a last resort, and we'll do it intelligently
  // to avoid hitting rate limits
  if (COINGECKO_API_KEY && cache.shouldTryApiCall(coinId)) {
    // Use a dedicated cache check to limit API calls
    // Using a more optimized API call with limited data to reduce response size
    const apiCoinUrl = `https://pro-api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;
    
    // We don't want to expose this implementation logic to the client directly
    // Use a more robust approach with headers and proper error handling
    const tryFetchCoinData = async () => {
      try {
        // Skip known problematic coins
        const problemCoins = ['fartcoin', 'zerebro', 'grass', 'pepe', 'official-trump', 'dogwifcoin', 'deep', 
                             'pi-network', 'the-open-network', 'leo-token', 'mantra-dao', 'zora', 'sui', 'ondo-finance'];
        if (problemCoins.includes(coinId)) {
          console.log(`Skipping API call for known problematic coin: ${coinId}`);
          // Add to blacklist for future reference
          cache.addToBlacklist(coinId);
          return null;
        }
        
        // Mark that we've tried an API call for this coin to avoid repeating failed requests
        cache.markApiCallAttempt(coinId);
        
        const response = await fetch(apiCoinUrl, {
          headers: {
            'x-cg-pro-api-key': COINGECKO_API_KEY,
            'Accept': 'application/json'
          }
        });
        
        if (response.status === 429) {
          console.warn('Rate limited by CoinGecko API, will use fallback images');
          
          // Get the reset time from headers or use default
          const resetTime = response.headers.get('x-ratelimit-reset');
          const waitTime = resetTime ? parseInt(resetTime) : 60; // default to 60 seconds if no header is present
          console.warn(`Rate limit reached, waiting for ${waitTime} seconds before retrying`);
          
          // Set a global rate limit flag for the exact time specified by the API
          cache.setRateLimited(true, waitTime);
          return null;
        }
        
        // Handle 400/404 errors gracefully for invalid coin IDs
        if (response.status === 400 || response.status === 404) {
          console.log(`Coin ID not found in CoinGecko: ${coinId}`);
          // Add to blacklist to avoid future API calls
          cache.addToBlacklist(coinId);
          return null;
        }
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        if (data && data.image && data.image.small) {
          const imageUrl = data.image.small;
          cache.setImageUrl(coinId, imageUrl);
          return imageUrl;
        }
      } catch (error) {
        console.warn(`Error fetching coin data for ${coinId}`, error);
        // If we get consistent errors for this coin, blacklist it
        cache.addToBlacklist(coinId);
      }
      return null;
    };
    
    // Start the fetch but don't wait for it - only if we're not currently rate limited
    if (!cache.isRateLimited()) {
      tryFetchCoinData().catch(console.error);
    }
  }
  
  // Approach 2: Use standard coingecko image path patterns
  // Pattern 1: Direct fallback approach based on ID
  const url = `https://assets.coingecko.com/coins/images/1000/small/${coinId}.png?1684385264`;
  
  // Cache the URL we're attempting to use
  cache.setImageUrl(coinId, url);
  
  // Create and preload an image to check if it exists
  const img = new Image();
  img.src = url;
  
  // If image fails to load, try a fallback approach
  img.onerror = () => {
    // Pattern 2: Try another common CoinGecko format
    const fallbackUrl = `https://assets.coingecko.com/coins/images/search_fallback/${coinId}.png`;
    
    // Test this fallback URL
    const fallbackImg = new Image();
    fallbackImg.src = fallbackUrl;
    
    fallbackImg.onerror = () => {
      // Pattern 3: Try yet another format with the coin name
      const altFallbackUrl = `https://assets.coingecko.com/coins/images/search_fallback/${coinId.replace('-', '_')}.png`;
      const altFallbackImg = new Image();
      altFallbackImg.src = altFallbackUrl;
      
      altFallbackImg.onerror = () => {
        // If all attempts fail, generate a letter-based placeholder
        const letter = coinId.charAt(0).toUpperCase();
        const svgPlaceholder = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%23555'/%3E%3Ctext x='16' y='22' font-size='18' text-anchor='middle' fill='white'%3E${letter}%3C/text%3E%3C/svg%3E`;
        
        console.warn(`Failed to load image for ${coinId}, using SVG placeholder`);
        cache.setImageUrl(coinId, svgPlaceholder);
      };
      
      altFallbackImg.onload = () => {
        cache.setImageUrl(coinId, altFallbackUrl);
      };
    };
    
    fallbackImg.onload = () => {
      cache.setImageUrl(coinId, fallbackUrl);
    };
  };
  
  img.onload = () => {
    // If the first attempt worked, update cache (no action needed)
  };
  
  return url;
};

// Format price with appropriate precision
export const formatPrice = (price: number): string => {
  if (price === undefined || price === null) return '$0';
  
  if (price >= 1000) {
    return `$${(price).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else {
    return `$${price.toFixed(6)}`;
  }
};

// Format price change with sign
export const formatPriceChange = (change: number): string => {
  if (change === undefined || change === null) return '0%';
  
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};

// Format number with compact representation (K, M, B, T)
export const formatCompactNumber = (num: number): string => {
  if (num === undefined || num === null) return '0';
  
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  
  return num.toFixed(2);
};

// Get currency symbol based on currency code
export const getCurrencySymbol = (currency: string): string => {
  return currencies[currency]?.symbol || currency.toUpperCase() + ' ';
};

// MoonPay specific functions for on-ramp integration
export interface MoonPayWidgetOptions {
  apiKey: string;
  currencyCode?: string;
  baseCurrencyCode?: string;
  baseCurrencyAmount?: number;
  email?: string;
  walletAddress?: string;
  colorCode?: string;
  redirectURL?: string;
  showOnlyCurrencies?: string[];
  language?: string;
}

// Convert internal coin ID to MoonPay currency code
export const getMoonPayCurrencyCode = (coinId: string): string => {
  // Map common CoinGecko IDs to MoonPay currency codes
  const moonPayCodeMap: Record<string, string> = {
    'bitcoin': 'btc',
    'ethereum': 'eth',
    'litecoin': 'ltc',
    'bitcoin-cash': 'bch',
    'dogecoin': 'doge',
    'ripple': 'xrp',
    'cardano': 'ada',
    'polkadot': 'dot',
    'solana': 'sol',
    'avalanche-2': 'avax',
    // Add more mappings as needed
  };
  
  // Return the mapped code or default to the original ID
  return moonPayCodeMap[coinId] || coinId;
};

// Create a MoonPay widget URL for buying cryptocurrencies
export const createMoonPayWidgetURL = (options: MoonPayWidgetOptions): string => {
  const baseURL = 'https://buy.moonpay.com';
  const urlParams = new URLSearchParams();
  
  // Required parameter
  urlParams.append('apiKey', options.apiKey);
  
  // Optional parameters
  if (options.currencyCode) urlParams.append('currencyCode', options.currencyCode);
  if (options.baseCurrencyCode) urlParams.append('baseCurrencyCode', options.baseCurrencyCode);
  if (options.baseCurrencyAmount) urlParams.append('baseCurrencyAmount', options.baseCurrencyAmount.toString());
  if (options.email) urlParams.append('email', options.email);
  if (options.walletAddress) urlParams.append('walletAddress', options.walletAddress);
  if (options.colorCode) urlParams.append('colorCode', options.colorCode);
  if (options.redirectURL) urlParams.append('redirectURL', options.redirectURL);
  if (options.showOnlyCurrencies) urlParams.append('showOnlyCurrencies', options.showOnlyCurrencies.join(','));
  if (options.language) urlParams.append('language', options.language);

  return `${baseURL}?${urlParams.toString()}`;
};

// Open MoonPay widget in a new window
export const openMoonPayWidget = (options: MoonPayWidgetOptions): Window | null => {
  const url = createMoonPayWidgetURL(options);
  return window.open(url, '_blank', 'width=600,height=600');
};

// Helper function to handle CoinGecko API rate limiting
async function fetchWithRetry<T>(
  url: string, 
  options: AxiosRequestConfig = {}, 
  retries = 0
): Promise<T> {
  try {
    // Add CoinGecko API key to the headers if not already present
    const headers = {
      ...(options.headers || {}),
      'x-cg-api-key': COINGECKO_API_KEY,
    };
    
    // Create new options with updated headers
    const enhancedOptions = {
      ...options,
      headers
    };
    
    const response: AxiosResponse<T> = await axios.get(url, enhancedOptions);
    return response.data;
  } catch (error) {
    // Check if it's a rate limit error (429)
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      if (retries < MAX_RETRIES) {
        console.warn(`Rate limited by CoinGecko API. Retrying in ${API_BACKOFF_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, API_BACKOFF_MS));
        return fetchWithRetry<T>(url, options, retries + 1);
      }
    }
    throw error;
  }
}

// Fetch cryptocurrency data using robust error handling and caching
export const fetchTopCoins = async (currency: string = 'usd', limit: number = 6): Promise<CoinData[]> => {
  try {
    // Check cache first
    const cacheKey = `top_coins_${currency}_${limit}`;
    const cachedData = cache.getApiData<CoinData[]>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    // If no cached data, fetch from API with fallback strategy
    try {
      // First try CoinGecko API with the correct endpoints
      // Use the /coins/markets endpoint as recommended in the docs
      const params = {
        vs_currency: currency,
        order: 'market_cap_desc', // Sort by market cap descending
        per_page: limit,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h',
      };
      
      const data = await fetchWithRetry<CoinGeckoMarketData[]>(
        `${API_BASE_URL}/coins/markets`, 
        { params, timeout: 5000 }
      );
      
      const coins = data.map((coin: CoinGeckoMarketData) => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: getCryptoImageUrl(coin.id), // Use our enhanced image function
        current_price: coin.current_price,
        price_change_percentage_24h: coin.price_change_percentage_24h,
        market_cap: coin.market_cap,
        market_cap_rank: coin.market_cap_rank,
        total_volume: coin.total_volume,
        high_24h: coin.high_24h,
        low_24h: coin.low_24h,
      }));
      
      // Cache the results
      cache.setApiData<CoinData[]>(cacheKey, coins);
      return coins;
      
    } catch (coingeckoError) {
      console.warn('CoinGecko API failed, falling back to MoonPay API', coingeckoError);
      
      // Fallback to MoonPay if CoinGecko fails
      const response = await axios.get<MoonPayCurrency[]>(`${MOONPAY_API_BASE_URL}/currencies`, {
        headers: {
          'Authorization': `Api-Key ${MOONPAY_API_KEY}`
        },
        params: {
          type: 'crypto',
          limit,
        },
        timeout: 5000, // 5 seconds timeout
      });
      
      // Transform MoonPay API response
      const coins = response.data.map((coin: MoonPayCurrency) => ({
        id: coin.code,
        symbol: coin.code,
        name: coin.name,
        image: getCryptoImageUrl(coin.code),
        current_price: coin.price || 0,
        price_change_percentage_24h: coin.change24Hour || 0,
        market_cap: coin.marketCap || 0,
        market_cap_rank: coin.rank || 0,
        total_volume: coin.volume24Hour || 0,
      }));
      
      // Cache the results
      cache.setApiData<CoinData[]>(cacheKey, coins);
      return coins;
    }
  } catch (error) {
    console.error('Error fetching top coins, using fallback data:', error);
    return getFallbackCoins(); // Provide fallback data when all API calls fail
  }
};

// Fetch trending cryptocurrencies with robust error handling
export const fetchTrendingCoins = async (): Promise<TrendingCoin[]> => {
  try {
    // Check cache first
    const cacheKey = 'trending_coins';
    const cachedData = cache.getApiData<TrendingCoin[]>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    // Try CoinGecko API first with the /search/trending endpoint
    try {
      const response = await fetchWithRetry<TrendingResponse>(`${API_BASE_URL}/search/trending`);
      
      // Cache the results
      cache.setApiData<TrendingCoin[]>(cacheKey, response.coins);
      
      // Enhance with better images
      return response.coins.map((coin: TrendingCoin) => ({
        item: {
          ...coin.item,
          thumb: getCryptoImageUrl(coin.item.id),
          small: getCryptoImageUrl(coin.item.id)
        }
      }));
      
    } catch (coingeckoError) {
      console.warn('CoinGecko trending API failed, falling back to MoonPay API', coingeckoError);
      
      // Fallback to MoonPay if CoinGecko fails
      const response = await axios.get<MoonPayCurrency[]>(`${MOONPAY_API_BASE_URL}/currencies`, {
        headers: {
          'Authorization': `Api-Key ${MOONPAY_API_KEY}`
        },
        params: {
          type: 'crypto',
          sort: 'popularity',
          limit: 4
        }
      });
      
      // Transform MoonPay API response to match TrendingCoin interface
      const trendingCoins = response.data.map((coin: MoonPayCurrency, index: number) => ({
        item: {
          id: coin.code,
          name: coin.name,
          symbol: coin.code.toUpperCase(),
          thumb: getCryptoImageUrl(coin.code),
          small: getCryptoImageUrl(coin.code),
          price_btc: coin.btcRate || 0,
          score: index + 1,
        }
      }));
      
      // Cache the results
      cache.setApiData<TrendingCoin[]>(cacheKey, trendingCoins);
      return trendingCoins;
    }
  } catch (error) {
    console.error('Error fetching trending coins, using fallback data:', error);
    return getFallbackTrendingCoins(); // Provide fallback data when all API calls fail
  }
};

// Get data for a specific coin with robust error handling
export const fetchCoinData = async (coinId: string, currency: string = 'usd'): Promise<CoinData | null> => {
  try {
    // Check cache first
    const cacheKey = `coin_${coinId}_${currency}`;
    const cachedData = cache.getApiData<CoinData>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    // Try CoinGecko API first
    try {
      const data = await fetchWithRetry<CoinGeckoDetailResponse>(`${API_BASE_URL}/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false
        }
      });
      
      const coinData: CoinData = {
        id: data.id,
        symbol: data.symbol,
        name: data.name,
        image: getCryptoImageUrl(data.id),
        current_price: data.market_data?.current_price[currency] || 0,
        price_change_percentage_24h: data.market_data?.price_change_percentage_24h || 0,
        market_cap: data.market_data?.market_cap[currency] || 0,
        market_cap_rank: data.market_cap_rank || 0,
        total_volume: data.market_data?.total_volume[currency] || 0,
        high_24h: data.market_data?.high_24h[currency] || 0,
        low_24h: data.market_data?.low_24h[currency] || 0
      };
      
      // Cache the results
      cache.setApiData<CoinData>(cacheKey, coinData);
      return coinData;
      
    } catch (coingeckoError) {
      console.warn(`CoinGecko API failed for ${coinId}, falling back to MoonPay API`, coingeckoError);
      
      // Fallback to MoonPay API
      const response = await axios.get<MoonPayCurrency>(`${MOONPAY_API_BASE_URL}/currencies/${coinId}`, {
        headers: {
          'Authorization': `Api-Key ${MOONPAY_API_KEY}`
        }
      });
      
      if (response.data) {
        const coin = response.data;
        const coinData: CoinData = {
          id: coin.code,
          symbol: coin.code,
          name: coin.name,
          image: getCryptoImageUrl(coin.code),
          current_price: coin.price || 0,
          price_change_percentage_24h: coin.change24Hour || 0,
          market_cap: coin.marketCap || 0,
          market_cap_rank: coin.rank || 0,
          total_volume: coin.volume24Hour || 0
        };
        
        // Cache the results
        cache.setApiData<CoinData>(cacheKey, coinData);
        return coinData;
      }
    }
    
    // If both APIs fail, return null
    return null;
  } catch (error) {
    console.error(`Error fetching coin ${coinId}:`, error);
    
    // For common coins, return fallback data
    const fallbackCoin = getFallbackCoins().find(coin => coin.id === coinId);
    return fallbackCoin || null;
  }
};

// Fallback data for when APIs fail
function getFallbackCoins(): CoinData[] {
  return [
    {
      id: "bitcoin",
      symbol: "btc",
      name: "Bitcoin",
      image: getCryptoImageUrl("bitcoin"),
      current_price: 57832.45,
      price_change_percentage_24h: 2.34,
      market_cap: 1134578945623,
      market_cap_rank: 1,
      total_volume: 32456789012,
      high_24h: 58950.25,
      low_24h: 56784.12
    },
    {
      id: "ethereum",
      symbol: "eth",
      name: "Ethereum",
      image: getCryptoImageUrl("ethereum"),
      current_price: 2947.83,
      price_change_percentage_24h: 1.56,
      market_cap: 354789012345,
      market_cap_rank: 2,
      total_volume: 15678901234,
      high_24h: 3025.75,
      low_24h: 2895.62
    },
    {
      id: "solana",
      symbol: "sol",
      name: "Solana",
      image: getCryptoImageUrl("solana"),
      current_price: 143.56,
      price_change_percentage_24h: 3.45,
      market_cap: 56789012345,
      market_cap_rank: 4,
      total_volume: 4567890123,
      high_24h: 148.92,
      low_24h: 139.45
    },
    {
      id: "cardano",
      symbol: "ada",
      name: "Cardano",
      image: getCryptoImageUrl("cardano"),
      current_price: 0.48,
      price_change_percentage_24h: -1.23,
      market_cap: 16789012345,
      market_cap_rank: 5,
      total_volume: 789012345,
      high_24h: 0.51,
      low_24h: 0.47
    },
    {
      id: "godsdollar",
      symbol: "godd",
      name: "Gods Dollar",
      image: getCryptoImageUrl("godsdollar"),
      current_price: 2.75,
      price_change_percentage_24h: 5.67,
      market_cap: 12345678901,
      market_cap_rank: 6,
      total_volume: 123456789,
      high_24h: 2.91,
      low_24h: 2.65
    }
  ];
}

function getFallbackTrendingCoins(): TrendingCoin[] {
  return [
    {
      item: {
        id: "bitcoin",
        name: "Bitcoin",
        symbol: "BTC",
        thumb: getCryptoImageUrl("bitcoin"),
        small: getCryptoImageUrl("bitcoin"),
        price_btc: 1,
        score: 1,
      }
    },
    {
      item: {
        id: "ethereum",
        name: "Ethereum",
        symbol: "ETH",
        thumb: getCryptoImageUrl("ethereum"),
        small: getCryptoImageUrl("ethereum"),
        price_btc: 0.051,
        score: 2,
      }
    },
    {
      item: {
        id: "solana",
        name: "Solana",
        symbol: "SOL",
        thumb: getCryptoImageUrl("solana"),
        small: getCryptoImageUrl("solana"),
        price_btc: 0.003,
        score: 3,
      }
    },
    {
      item: {
        id: "godsdollar",
        name: "Gods Dollar",
        symbol: "GODD",
        thumb: getCryptoImageUrl("godsdollar"),
        small: getCryptoImageUrl("godsdollar"),
        price_btc: 0.0000456,
        score: 4,
      }
    }
  ];
}

// Search for cryptocurrencies
export const searchCryptocurrencies = async (query: string): Promise<SearchResultItem[]> => {
  if (!query || query.trim() === '') {
    return [];
  }
  
  try {
    interface SearchResponse {
      coins: SearchResultItem[];
    }
    
    const response = await axios.get<SearchResponse>(`${API_BASE_URL}/search`, {
      params: { query: query }
    });
    
    if (response.data && response.data.coins) {
      return response.data.coins.slice(0, 15).map((coin: SearchResultItem) => ({
        ...coin,
        thumb: getCryptoImageUrl(coin.id),
        small: getCryptoImageUrl(coin.id)
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error searching cryptocurrencies:', error);
    return [];
  }
};

// Periodically clean up expired cache items
setInterval(() => {
  cache.clearExpired();
}, 60000); // Clean every minute

// Export default for easier importing
export default {
  fetchTopCoins,
  fetchCoinData,
  fetchTrendingCoins,
  formatPrice,
  formatPriceChange,
  getCryptoImageUrl,
  openMoonPayWidget,
  createMoonPayWidgetURL,
  searchCryptocurrencies
};
