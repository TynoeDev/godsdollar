// MoonPay integration service
// Documentation: https://dashboard.moonpay.com/dashboard/on-ramp/integrate
import axios from 'axios';

// Keep the same interfaces to maintain compatibility with existing code
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

// Define interface for MoonPay currency response
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

// Helper function to get cryptocurrency images with fallbacks
const getCryptoImageUrl = (code: string): string => {
  // Special case for Gods Dollar
  if (code.toLowerCase() === 'godd') {
    return '/src/images/main.png';
  }
  
  // Map of common cryptocurrencies to local images (if you add local images to your project)
  const localImageMap: Record<string, string> = {
    btc: '/src/images/crypto/bitcoin.png',
    eth: '/src/images/crypto/ethereum.png',
    sol: '/src/images/crypto/solana.png',
    usdc: '/src/images/crypto/usdc.png',
    // Add more mappings as needed
  };
  
  // Check if we have a local image for this cryptocurrency
  if (localImageMap[code.toLowerCase()]) {
    return localImageMap[code.toLowerCase()];
  }
  
  // Fallback to a placeholder image to prevent network errors
  return '/public/placeholder.svg';
};

// Configuration
const MOONPAY_API_BASE_URL = 'https://api.moonpay.com/v3';
const MOONPAY_API_KEY = 'YOUR_MOONPAY_API_KEY'; // Replace with your actual MoonPay API key

// MoonPay API functions for fetching cryptocurrency data
export const fetchTopCoins = async (
  currency: string = 'usd',
  limit: number = 6
): Promise<CoinData[]> => {
  try {
    // Use MoonPay's currencies endpoint to get available cryptocurrencies
    const response = await axios.get<MoonPayCurrency[]>(`${MOONPAY_API_BASE_URL}/currencies`, {
      headers: {
        'Authorization': `Api-Key ${MOONPAY_API_KEY}`
      },
      params: {
        type: 'crypto',
        limit: limit,
      }
    });
    
    // Transform MoonPay API response to match our CoinData interface
    return response.data.map((coin: MoonPayCurrency) => ({
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
  } catch (error: unknown) {
    console.error('Error fetching top coins from MoonPay:', error);
    return [];
  }
};

export const fetchCoinData = async (
  coinId: string,
  currency: string = 'usd'
): Promise<CoinData | null> => {
  try {
    // Use MoonPay's API to get details for a specific currency
    const response = await axios.get<MoonPayCurrency>(`${MOONPAY_API_BASE_URL}/currencies/${coinId}`, {
      headers: {
        'Authorization': `Api-Key ${MOONPAY_API_KEY}`
      }
    });
    
    if (response.data) {
      const coin = response.data;
      return {
        id: coin.code,
        symbol: coin.code,
        name: coin.name,
        image: getCryptoImageUrl(coin.code),
        current_price: coin.price || 0,
        price_change_percentage_24h: coin.change24Hour || 0,
        market_cap: coin.marketCap || 0,
        market_cap_rank: coin.rank || 0,
        total_volume: coin.volume24Hour || 0,
      };
    }
    return null;
  } catch (error: unknown) {
    console.error(`Error fetching data for ${coinId} from MoonPay:`, error);
    return null;
  }
};

export const fetchTrendingCoins = async (): Promise<TrendingCoin[]> => {
  try {
    // Use MoonPay's API to get trending/featured currencies
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
    return response.data.map((coin: MoonPayCurrency, index: number) => ({
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
  } catch (error: unknown) {
    console.error('Error fetching trending coins from MoonPay:', error);
    return [];
  }
};

export const formatPrice = (price: number): string => {
  if (price >= 1000) {
    return `$${(price).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else {
    return `$${price.toFixed(6)}`;
  }
};

export const formatPriceChange = (change: number): string => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
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
