// This file provides mock data that mimics the CoinGecko API
// Used to avoid API rate limiting and connection issues

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

// Mock data for top coins
const mockTopCoins: CoinData[] = [
  {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    current_price: 57832.45,
    price_change_percentage_24h: 2.34,
    market_cap: 1134578945623,
    market_cap_rank: 1,
    total_volume: 32456789012
  },
  {
    id: "ethereum",
    symbol: "eth",
    name: "Ethereum",
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    current_price: 2947.83,
    price_change_percentage_24h: 1.56,
    market_cap: 354789012345,
    market_cap_rank: 2,
    total_volume: 15678901234
  },
  {
    id: "binancecoin",
    symbol: "bnb",
    name: "Binance Coin",
    image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    current_price: 567.23,
    price_change_percentage_24h: -0.78,
    market_cap: 87654321098,
    market_cap_rank: 3,
    total_volume: 2345678901
  },
  {
    id: "solana",
    symbol: "sol",
    name: "Solana",
    image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    current_price: 143.56,
    price_change_percentage_24h: 3.45,
    market_cap: 56789012345,
    market_cap_rank: 4,
    total_volume: 4567890123
  },
  {
    id: "cardano",
    symbol: "ada",
    name: "Cardano",
    image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
    current_price: 0.48,
    price_change_percentage_24h: -1.23,
    market_cap: 16789012345,
    market_cap_rank: 5,
    total_volume: 789012345
  },
  {
    id: "godsdollar",
    symbol: "godd",
    name: "Gods Dollar",
    image: "/src/images/main.png",
    current_price: 2.75,
    price_change_percentage_24h: 5.67,
    market_cap: 12345678901,
    market_cap_rank: 6,
    total_volume: 123456789
  }
];

// Mock data for trending coins
const mockTrendingCoins: TrendingCoin[] = [
  {
    item: {
      id: "pepe",
      name: "Pepe",
      symbol: "PEPE",
      thumb: "https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg",
      small: "https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg",
      price_btc: 0.00000004675,
      score: 1,
    }
  },
  {
    item: {
      id: "dogwifhat",
      name: "dogwifhat",
      symbol: "WIF",
      thumb: "https://assets.coingecko.com/coins/images/33835/large/wif.jpeg",
      small: "https://assets.coingecko.com/coins/images/33835/large/wif.jpeg",
      price_btc: 0.0000104,
      score: 2,
    }
  },
  {
    item: {
      id: "floki",
      name: "FLOKI",
      symbol: "FLOKI",
      thumb: "https://assets.coingecko.com/coins/images/16746/large/FLOKI.png",
      small: "https://assets.coingecko.com/coins/images/16746/large/FLOKI.png",
      price_btc: 0.0000003475,
      score: 3,
    }
  },
  {
    item: {
      id: "godsdollar",
      name: "Gods Dollar",
      symbol: "GODD",
      thumb: "/src/images/main.png",
      small: "/src/images/main.png",
      price_btc: 0.0000456,
      score: 4,
    }
  }
];

// Mock API functions with the same interface as the original service
export const fetchTopCoins = async (
  currency: string = 'usd',
  limit: number = 6
): Promise<CoinData[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return the specified number of coins
  return mockTopCoins.slice(0, limit);
};

export const fetchCoinData = async (
  coinId: string,
  currency: string = 'usd'
): Promise<CoinData | null> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Find the requested coin
  const coin = mockTopCoins.find(c => c.id === coinId);
  return coin || null;
};

export const fetchTrendingCoins = async (): Promise<TrendingCoin[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return mockTrendingCoins;
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
