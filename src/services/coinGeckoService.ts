import axios from 'axios';

const BASE_URL = 'https://api.coingecko.com/api/v3';

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

export const fetchTopCoins = async (
  currency: string = 'usd',
  limit: number = 6
): Promise<CoinData[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/coins/markets`, {
      params: {
        vs_currency: currency,
        order: 'market_cap_desc',
        per_page: limit,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching top coins:', error);
    return [];
  }
};

export const fetchCoinData = async (
  coinId: string,
  currency: string = 'usd'
): Promise<CoinData | null> => {
  try {
    const response = await axios.get(`${BASE_URL}/coins/markets`, {
      params: {
        vs_currency: currency,
        ids: coinId,
        sparkline: false,
        price_change_percentage: '24h',
      },
    });
    return response.data[0] || null;
  } catch (error) {
    console.error(`Error fetching data for ${coinId}:`, error);
    return null;
  }
};

export const fetchTrendingCoins = async (): Promise<TrendingCoin[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/search/trending`);
    return response.data.coins || [];
  } catch (error) {
    console.error('Error fetching trending coins:', error);
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
