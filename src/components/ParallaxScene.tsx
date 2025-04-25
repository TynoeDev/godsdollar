import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  fetchTopCoins, 
  fetchTrendingCoins,
  fetchCoinData,
  searchCryptocurrencies,
  formatPrice, 
  formatPriceChange,
  formatCompactNumber,
  openMoonPayWidget,
  getCryptoImageUrl,
  type CoinData,
  type TrendingCoin
} from '@/services/cryptoService';
import { useMediaQuery } from 'react-responsive'; 
import FogBackground from './FogBackground'; 

const ParallaxScene = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [topCoins, setTopCoins] = useState<CoinData[]>([]);
  const [displayedCoins, setDisplayedCoins] = useState<CoinData[]>([]);
  const [trendingCoins, setTrendingCoins] = useState<TrendingCoin[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null);
  const [selectedCoinDetails, setSelectedCoinDetails] = useState<CoinData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<CoinData[]>([]);
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [topCoinsData, trendingCoinsData] = await Promise.all([
          fetchTopCoins('usd', 20),
          fetchTrendingCoins()
        ]);
        
        setTopCoins(topCoinsData);
        setDisplayedCoins(topCoinsData.slice(0, 5)); 
        setTrendingCoins(trendingCoinsData);
        
        if (topCoinsData.length > 0 && !selectedCoin) {
          setSelectedCoin(topCoinsData[0]);
        }
      } catch (error) {
        console.error('Error fetching cryptocurrency data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    const intervalId = setInterval(fetchData, 60000);
    return () => clearInterval(intervalId);
  }, [selectedCoin]);

  useEffect(() => {
    if (!selectedCoin) return;
    
    const fetchSelectedCoinDetails = async () => {
      try {
        const coinDetails = await fetchCoinData(selectedCoin.id);
        if (coinDetails) {
          setSelectedCoinDetails(coinDetails);
        }
      } catch (error) {
        console.error(`Error fetching details for ${selectedCoin.name}:`, error);
      }
    };
    
    fetchSelectedCoinDetails();
  }, [selectedCoin]);
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setDisplayedCoins(topCoins.slice(0, 5));
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await searchCryptocurrencies(searchQuery);
      
      const searchedCoins = await Promise.all(
        results.slice(0, 5).map(async (item) => {
          const existingCoin = topCoins.find(coin => coin.id === item.id);
          if (existingCoin) return existingCoin;
          
          const coinData = await fetchCoinData(item.id);
          return coinData || {
            id: item.id,
            symbol: item.symbol,
            name: item.name,
            image: item.thumb || getCryptoImageUrl(item.id),
            current_price: 0,
            price_change_percentage_24h: 0,
            market_cap: 0,
            market_cap_rank: item.market_cap_rank || 0,
            total_volume: 0
          };
        })
      );
      
      const validResults = searchedCoins.filter(coin => coin !== null) as CoinData[];
      setDisplayedCoins(validResults);
      
      if (validResults.length > 0 && (!selectedCoin || !validResults.find(coin => coin.id === selectedCoin.id))) {
        setSelectedCoin(validResults[0]);
      }
    } catch (error) {
      console.error('Error searching cryptocurrencies:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      
      setMousePosition({ x, y });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  const handleSelectCoin = (coin: CoinData) => {
    setSelectedCoin(coin);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-screen min-h-screen bg-[#141529] z-10",
        isMobile 
          ? "overflow-y-auto overflow-x-hidden px-4 pb-16" 
          : "overflow-y-hidden overflow-x-hidden"
      )}
    >
      {/* LAYER 1: Background elements */}
      <div className={cn(
        "absolute inset-0 z-0",
        isMobile ? "h-[200vh]" : ""
      )}>
        <FogBackground 
          color="#141529" 
          near={1.5} 
          far={4} 
        />
        
        {/* Background gradient - slowest movement */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-[#141529] via-[#1A1A3A] to-[#0F0F20] opacity-70"
          style={{
            transform: `translate(${mousePosition.x * -5}px, ${mousePosition.y * -5}px)`,
          }}
        />
        
        {/* Grid overlay - medium-slow movement */}
        <div 
          className="absolute inset-0 bg-[url('/images/background.png')] opacity-15"
          style={{
            backgroundSize: '100%',
            backgroundRepeat: 'repeat',
            transform: `translate(${mousePosition.x * -12}px, ${mousePosition.y * -12}px)`,
          }}
        />
      </div>

      {/* Mobile-only scrollable container with proper padding */}
      {isMobile && (
        <div className="relative z-30 pt-6">
          {/* Floating Coin Image - Top centered on mobile */}
          {selectedCoin && (
            <div className="w-24 h-24 mx-auto mb-6">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-blue-400/30 shadow-lg shadow-blue-500/20 animate-pulse-slow">
                <img src={selectedCoin.image} alt={selectedCoin.name} className="w-full h-full object-cover" />
              </div>
              <style>
                {`
                  @keyframes pulse-slow {
                    0%, 100% {
                      transform: scale(1) translateY(0px);
                      box-shadow: 0 0 15px 2px rgba(59, 130, 246, 0.3);
                    }
                    50% {
                      transform: scale(1.05) translateY(-5px);
                      box-shadow: 0 0 25px 5px rgba(59, 130, 246, 0.5);
                    }
                  }
                  .animate-pulse-slow {
                    animation: pulse-slow 3s ease-in-out infinite;
                  }
                `}
              </style>
            </div>
          )}
          
          {/* Coin Details - First widget */}
          <div className="w-full max-w-[400px] mx-auto mb-8">
            <div className="bg-[#181632]/80 border border-blue-900/30 backdrop-blur-md p-5 rounded-lg shadow-lg flex flex-col transition-all w-full">
              <h3 className="text-blue-300 text-lg mb-2 pb-2 border-b border-blue-900/30">Coin Details</h3>
              
              {selectedCoin && (
                <div className="w-full">
                  <div className="text-white text-2xl font-bold px-0 py-2">
                    {selectedCoin.name}
                  </div>
                  <div className="flex justify-between items-center mt-2 px-0">
                    <span className="text-gray-400 text-sm">Price:</span>
                    <span className="text-white text-md">{formatPrice(selectedCoin.current_price)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 px-2">
                    <span className="text-gray-300 text-sm font-medium">24h Change:</span>
                    <span className={`text-md font-semibold ${selectedCoin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPriceChange(selectedCoin.price_change_percentage_24h)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2 px-2">
                    <span className="text-gray-300 text-sm font-medium">Market Cap:</span>
                    <span className="text-white text-md font-semibold">${formatCompactNumber(selectedCoin.market_cap)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 px-2">
                    <span className="text-gray-300 text-sm font-medium">Volume (24h):</span>
                    <span className="text-white text-md font-semibold">${formatCompactNumber(selectedCoin.total_volume)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 px-2">
                    <span className="text-gray-300 text-sm font-medium">Rank:</span>
                    <span className="text-white text-md font-semibold">#{selectedCoin.market_cap_rank}</span>
                  </div>
                  
                  <button 
                    onClick={() => openMoonPayWidget({
                      apiKey: import.meta.env.VITE_MOONPAY_API_KEY || '',
                      currencyCode: selectedCoin.symbol.toLowerCase(),
                      colorCode: '#8a2be2'
                    })}
                    className="w-full bg-violet-600 text-white py-3 px-4 rounded-xl text-sm font-medium hover:bg-violet-700 mt-4"
                  >
                    Buy {selectedCoin.symbol.toUpperCase()}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Logo - Centered with proper spacing between widgets */}
          <div className="w-[100%] mx-auto mb-8 -mt-8"> {/* Added negative top margin to lift it up */}
            <div className="flex flex-col items-center">
              {/* GOD'S text */}
              <div className="relative">
                <img
                  src="/images/gods.png"
                  alt="GOD'S"
                  className="w-full h-auto max-w-full"
                />
              </div>

              {/* DOLLAR text */}
              <div className="relative -mt-4">
                <img
                  src="/images/dollar-text.png"
                  alt="DOLLAR"
                  className="w-full h-auto max-w-full"
                />
              </div>
            </div>
          </div>
          
          {/* CA Address - Below logo with proper spacing */}
          <div className="w-full max-w-[400px] mx-auto mb-20">
            <div className="bg-transparent py-2 px-2 text-center w-full">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-30"></div>
                <div className="relative bg-[#1E1A45]/60 border border-blue-500/20 backdrop-blur-md rounded-lg p-3">
                  <div className="flex items-center justify-center flex-wrap">
                    <span className="text-blue-300 text-sm font-semibold mr-2 mb-1">CA:</span>
                    <span className="text-white text-sm font-medium tracking-wider break-all w-full mb-2">
                      HwQPzaohHzmx8X3nL3nSCfwVGLwQcsMEritEoqTBpump
                    </span>
                    <button
                      className="text-xs bg-transparent hover:bg-blue-700/30 text-blue-300 py-1 px-3 rounded border border-blue-500/30 transition-all"
                      onClick={() => {
                        navigator.clipboard.writeText("HwQPzaohHzmx8X3nL3nSCfwVGLwQcsMEritEoqTBpump");
                        const btn = document.activeElement as HTMLElement;
                        if (btn) {
                          const originalText = btn.innerText;
                          btn.innerText = "Copied!";
                          btn.classList.add("bg-blue-700/50", "text-white");
                          setTimeout(() => {
                            btn.innerText = originalText;
                            btn.classList.remove("bg-blue-700/50", "text-white");
                          }, 2000);
                        }
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Market Overview - With proper spacing */}
          <div className="w-full max-w-[400px] mx-auto mb-8">
            <div className="bg-[#181632]/80 border border-blue-900/30 backdrop-blur-md p-5 rounded-lg shadow-lg transition-all w-full">
              <h3 className="text-blue-300 text-lg mb-2 pb-2 border-b border-blue-900/30">Market Overview</h3>
              
              {/* Search input */}
              <div className="flex mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search..."
                  className="w-full bg-[#131136] text-white border-none py-2 px-3 text-sm focus:outline-none"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="w-[80px] bg-blue-600 text-white text-sm font-medium transition-colors"
                >
                  {isSearching ? '...' : 'Search'} 
                </button>
              </div>
              
              {/* Scrollable list - slightly taller on mobile */}
              <div className="max-h-[200px] overflow-y-auto custom-scrollbar pb-1">
                {isLoading || isSearching ? (
                  <div className="animate-pulse space-y-3 px-1">
                    <div className="h-8 bg-[#131136] w-full"></div>
                    <div className="h-8 bg-[#131136] w-full"></div>
                    <div className="h-8 bg-[#131136] w-full"></div>
                    <div className="h-8 bg-[#131136] w-full"></div>
                  </div>
                ) : displayedCoins.length > 0 ? (
                  displayedCoins.map(coin => (
                    <div 
                      key={coin.id} 
                      onClick={() => handleSelectCoin(coin)}
                      className={`flex items-center justify-between py-2 px-1 cursor-pointer ${
                        selectedCoin?.id === coin.id ? 'bg-[#131136]/70' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="w-6 h-6 mr-2 bg-gray-700/30 rounded-full overflow-hidden flex items-center justify-center text-sm">
                          <img 
                            src={coin.image} 
                            alt={coin.name} 
                            className="w-5 h-5 object-contain" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent) {
                                parent.innerHTML = `<span class="text-white font-bold">${coin.symbol.charAt(0).toUpperCase()}</span>`;
                              }
                            }}
                          />
                        </div>
                        <span className="text-white font-medium text-sm">{coin.symbol.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-white text-sm mr-3">${formatPrice(coin.current_price)}</span>
                        <span className={`text-sm ${coin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPriceChange(coin.price_change_percentage_24h)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                    No results found
                  </div>
                )}
              </div>
              
              <div className="text-gray-400 text-xs flex justify-between pt-2 mt-1">
                <span>{searchQuery ? 'Search Results' : 'Market Prices'}</span>
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          {/* Price Range - With proper spacing */}
          <div className="w-full max-w-[400px] mx-auto mb-8">
            <div className="bg-[#1E1A45]/60 border border-blue-500/20 backdrop-blur-md p-5 rounded-xl overflow-hidden shadow-lg w-full">
              <h3 className="text-blue-300 text-xl font-medium mb-4">Price Range (24h)</h3>
              {isLoading ? (
                <div className="w-full h-32 rounded-xl bg-gray-700/50 animate-pulse mb-2"></div>
              ) : selectedCoin ? (
                <div className="w-full mb-2">
                  <div className="flex justify-between items-center text-xs text-gray-300 mb-2 px-3">
                    <div>Low: {formatPrice(selectedCoin.low_24h || selectedCoin.current_price * 0.9)}</div>
                    <div>High: {formatPrice(selectedCoin.high_24h || selectedCoin.current_price * 1.1)}</div>
                  </div>
                  
                  <div className="relative h-8 bg-gray-700/30 rounded-lg overflow-hidden mb-4">
                    <div className="absolute bottom-0 left-0 h-full w-1 bg-red-500"></div>
                    
                    <div 
                      className="absolute bottom-0 h-full w-1 bg-white"
                      style={{ 
                        left: `${selectedCoin.high_24h && selectedCoin.low_24h 
                          ? ((selectedCoin.current_price - (selectedCoin.low_24h || 0)) / 
                            ((selectedCoin.high_24h || selectedCoin.current_price * 1.1) - (selectedCoin.low_24h || selectedCoin.current_price * 0.9)) * 100)
                          : 50}%` 
                      }}
                    ></div>
                    
                    <div className="absolute bottom-0 right-0 h-full w-1 bg-green-500"></div>
                    
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-purple-500/20 to-green-500/20"></div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Current</span>
                      <span className="text-white text-sm font-medium">{formatPrice(selectedCoin.current_price)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">24h Change</span>
                      <span className={`text-sm font-medium ${selectedCoin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPriceChange(selectedCoin.price_change_percentage_24h)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-white/10">
                    <div className="text-center text-sm text-violet-300 font-medium">
                      {selectedCoin.price_change_percentage_24h >= 0 ? 'Bullish' : 'Bearish'} over the last 24 hours
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-32 rounded-xl bg-gray-700/50 mb-2 flex items-center justify-center">
                  <span className="text-sm text-gray-400">Select a coin to view data</span>
                </div>
              )}
            </div>
          </div>

          {/* Ardock/ABI Info - With proper spacing */}
          <div className="w-full max-w-[400px] mx-auto mb-8">
            <div className="bg-[#1E1A45]/60 border border-blue-500/20 backdrop-blur-md p-5 rounded-xl shadow-lg w-full">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16">
                  {/* SVG Icon */}
                  <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M50 10L90 30V70L50 90L10 70V30L50 10Z" stroke="#00D8FF" strokeWidth="2" fill="none" />
                    <path d="M30 40L50 30L70 40V60L50 70L30 60V40Z" stroke="#00D8FF" strokeWidth="2" fill="none" />
                    <path d="M10 30L50 10L90 30" stroke="#00D8FF" strokeWidth="2" />
                    <path d="M10 70L50 90L90 70" stroke="#00D8FF" strokeWidth="2" />
                    <path d="M50 10V90" stroke="#00D8FF" strokeWidth="2" opacity="0.5" />
                    <path d="M10 30V70" stroke="#00D8FF" strokeWidth="2" opacity="0.5" />
                    <path d="M90 30V70" stroke="#00D8FF" strokeWidth="2" opacity="0.5" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-white font-bold text-xl">Ardock</h3>
                  <p className="text-cyan-300 text-sm">ABI #1</p>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between items-center text-sm my-2">
                  <span className="text-gray-300 font-medium">Connected:</span>
                  <span className="text-white font-medium">{selectedCoin ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between items-center text-sm my-2">
                  <span className="text-gray-300 font-medium">Balance:</span>
                  <span className="text-white font-medium">0.00000918 BTC</span>
                </div>
                <div className="flex justify-between items-center text-sm my-2">
                  <span className="text-gray-300 font-medium">Transactions:</span>
                  <span className="text-white font-medium">#457</span>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="text-center">
                  <span className="text-cyan-300 font-medium block text-sm">Mystery Chests</span>
                  <p className="text-xs text-gray-300 mt-1">
                    Obtain mystical crates overflowing with game-changing rewards.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Fixed Social Media Links Bar for Mobile - Positioned at the top */}
          <div className="fixed top-2 left-0 right-0 z-50 px-4 flex justify-center">
            <div className="bg-[#1E1A45]/80 border border-blue-500/30 backdrop-blur-md py-2 px-3 rounded-full shadow-lg">
              <div className="flex items-center gap-3">
                {/* X (Twitter) */}
                <a 
                  href="https://x.com/godsdollar" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="transition-transform hover:scale-110"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                    </svg>
                  </div>
                </a>
                
                {/* Facebook */}
                <a 
                  href="https://facebook.com/godsdollar" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="transition-transform hover:scale-110"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"></path>
                    </svg>
                  </div>
                </a>
                
                {/* YouTube */}
                <a 
                  href="https://youtube.com/@godsdollar" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="transition-transform hover:scale-110"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-400 flex items-center justify-center shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path>
                    </svg>
                  </div>
                </a>
                
                {/* Instagram */}
                <a 
                  href="https://instagram.com/godsdollar" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="transition-transform hover:scale-110"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 via-pink-500 to-orange-500 flex items-center justify-center shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                </a>
                
                {/* Telegram */}
                <a 
                  href="https://t.me/godsdollar" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="transition-transform hover:scale-110"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                  </div>
                </a>
              </div>
            </div>
          </div>
          
          {/* Main social media widget section - Only shown when scrolling further down */}
          <div className="w-full max-w-[400px] mx-auto mb-12">
            <div className="bg-[#1E1A45]/60 border border-blue-500/20 backdrop-blur-md p-5 rounded-xl shadow-lg w-full">
              <h3 className="text-blue-300 text-lg font-medium mb-3 text-center">Join Our Community</h3>
              <p className="text-gray-300 text-xs text-center mb-3">
                Stay updated on the latest news and announcements about God's Dollar.
              </p>
              
              <button 
                onClick={() => window.open('https://t.me/godsdollar', '_blank')}
                className="w-full bg-blue-600/80 hover:bg-blue-500 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Join Our Telegram
              </button>
            </div>
          </div>
            
          {/* Main central figure placed at the bottom for mobile */} 
          <div className="w-full max-w-[500px] mx-auto mb-12">
            <img
              src="/images/main.png"
              alt="God Dollar Figure"
              className="w-full h-auto object-contain brightness-125 contrast-125"
            />
          </div>
        </div>
      )}

      {/* Desktop layout - Only shown when not mobile */}
      {!isMobile && (
        <>
          {/* LAYER 2: Main central figure - Desktop positioning */}
          <div className="absolute inset-0 z-10">
            <div
              className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[1200px] mb-[5%] flex justify-center"
              style={{
                transform: `translate(calc(-50% + ${mousePosition.x * 25}px), calc(10% + ${mousePosition.y * 25}px))`,
                marginBottom: '5%'
              }}
            >
              <img
                src="/images/main.png"
                alt="God Dollar Figure"
                className="w-full h-auto object-contain brightness-125 contrast-125 max-w-[1200px]"
              />
            </div>
          </div>

          {/* LAYER 3: UI Widgets and overlays - Desktop positioning */}
          <div
            className="absolute w-full h-full z-20 pointer-events-none"
          >
            {/* Floating Coin Image */}
            {selectedCoin && (
              <div
                className="absolute top-[8%] left-[8%] w-32 h-32 pointer-events-auto"
                style={{
                  transform: `translate(${mousePosition.x * 45}px, ${mousePosition.y * 45}px)`,
                  zIndex: 10
                }}
              >
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-blue-400/30 shadow-lg shadow-blue-500/20 animate-pulse-slow">
                  <img src={selectedCoin.image} alt={selectedCoin.name} className="w-full h-full object-cover" />
                </div>
                <style>
                  {`
                    @keyframes pulse-slow {
                      0%, 100% {
                        transform: scale(1) translateY(0px);
                        box-shadow: 0 0 15px 2px rgba(59, 130, 246, 0.3);
                      }
                      50% {
                        transform: scale(1.05) translateY(-5px);
                        box-shadow: 0 0 25px 5px rgba(59, 130, 246, 0.5);
                      }
                    }
                    .animate-pulse-slow {
                      animation: pulse-slow 3s ease-in-out infinite;
                    }
                  `}
                </style>
              </div>
            )}

            {/* Top left widget - Coin Details */}
            <div
              className="absolute top-[8%] left-[10%] w-[300px] pointer-events-auto"
              style={{
                transform: `translate(${mousePosition.x * 35}px, ${mousePosition.y * 35}px)`,
              }}
            >
              <div className="bg-[#181632]/80 border border-blue-900/30 backdrop-blur-md p-4 md:p-5 rounded-lg md:rounded-none shadow-lg flex flex-col transition-all w-full">
                <h3 className="text-blue-300 text-base md:text-lg mb-1 pb-2 border-b border-blue-900/30">Coin Details</h3>
                
                {selectedCoin && (
                  <div className="w-full">
                    <div className="text-white text-xl md:text-2xl font-bold px-0 py-1 md:py-2">
                      {selectedCoin.name}
                    </div>
                    <div className="flex justify-between items-center mt-1 md:mt-2 px-0">
                      <span className="text-gray-400 text-xs md:text-sm">Price:</span>
                      <span className="text-white text-sm md:text-md">{formatPrice(selectedCoin.current_price)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 md:mt-2 px-1 md:px-2">
                      <span className="text-gray-300 text-xs md:text-sm font-medium">24h Change:</span>
                      <span className={`text-sm md:text-md font-semibold ${selectedCoin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPriceChange(selectedCoin.price_change_percentage_24h)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1 md:mt-2 px-1 md:px-2">
                      <span className="text-gray-300 text-xs md:text-sm font-medium">Market Cap:</span>
                      <span className="text-white text-sm md:text-md font-semibold">${formatCompactNumber(selectedCoin.market_cap)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 md:mt-2 px-1 md:px-2">
                      <span className="text-gray-300 text-xs md:text-sm font-medium">Volume (24h):</span>
                      <span className="text-white text-sm md:text-md font-semibold">${formatCompactNumber(selectedCoin.total_volume)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 md:mt-2 px-1 md:px-2">
                      <span className="text-gray-300 text-xs md:text-sm font-medium">Rank:</span>
                      <span className="text-white text-sm md:text-md font-semibold">#{selectedCoin.market_cap_rank}</span>
                    </div>
                    
                    <button 
                      onClick={() => openMoonPayWidget({
                        apiKey: import.meta.env.VITE_MOONPAY_API_KEY || '',
                        currencyCode: selectedCoin.symbol.toLowerCase(),
                        colorCode: '#8a2be2'
                      })}
                      className="w-full bg-violet-600 text-white py-2 px-4 rounded-lg md:rounded-xl text-xs md:text-sm font-medium hover:bg-violet-700 mt-3 md:mt-4"
                    >
                      Buy {selectedCoin.symbol.toUpperCase()}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Top right widget - Market Overview */}
            <div
              className="absolute top-[8%] right-[10%] w-[300px] pointer-events-auto"
              style={{
                transform: `translate(${mousePosition.x * 28}px, ${mousePosition.y * 28}px)`,
              }}
            >
              <div className="bg-[#181632]/80 border border-blue-900/30 backdrop-blur-md p-4 md:p-5 rounded-lg md:rounded-none shadow-lg transition-all w-full">
                <h3 className="text-blue-300 text-base md:text-lg mb-1 pb-2 border-b border-blue-900/30">Market Overview</h3>
                
                {/* Search input - styled exactly like screenshot */}
                <div className="flex mb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search..."
                    className="w-full bg-[#131136] text-white border-none py-2 px-3 text-xs md:text-sm focus:outline-none"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="w-[70px] md:w-[80px] bg-blue-600 text-white text-xs md:text-sm font-medium transition-colors"
                  >
                    {isSearching ? '...' : 'Search'} 
                  </button>
                </div>
                
                {/* Scrollable list - adjust max-height? */}
                <div className="max-h-[150px] md:max-h-[190px] overflow-y-auto custom-scrollbar pb-1">
                  {isLoading || isSearching ? (
                    <div className="animate-pulse space-y-2 md:space-y-3 px-1">
                      <div className="h-6 md:h-8 bg-[#131136] w-full"></div>
                      <div className="h-6 md:h-8 bg-[#131136] w-full"></div>
                      <div className="h-6 md:h-8 bg-[#131136] w-full"></div>
                      <div className="h-6 md:h-8 bg-[#131136] w-full"></div>
                    </div>
                  ) : displayedCoins.length > 0 ? (
                    displayedCoins.map(coin => (
                      <div 
                        key={coin.id} 
                        onClick={() => handleSelectCoin(coin)}
                        className={`flex items-center justify-between py-1.5 md:py-2 px-1 cursor-pointer ${
                          selectedCoin?.id === coin.id ? 'bg-[#131136]/70' : ''
                        }`}
                      >
                        <div className="flex items-center">
                          <div className="w-5 h-5 md:w-6 md:h-6 mr-2 bg-gray-700/30 rounded-full overflow-hidden flex items-center justify-center text-xs md:text-sm">
                            <img 
                              src={coin.image} 
                              alt={coin.name} 
                              className="w-4 h-4 md:w-5 md:h-5 object-contain" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  parent.innerHTML = `<span class="text-white font-bold">${coin.symbol.charAt(0).toUpperCase()}</span>`;
                                }
                              }}
                            />
                          </div>
                          <span className="text-white font-medium text-xs md:text-sm">{coin.symbol.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-white text-xs md:text-sm mr-2 md:mr-3">${formatPrice(coin.current_price)}</span>
                          <span className={`text-xs md:text-sm ${coin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatPriceChange(coin.price_change_percentage_24h)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-24 md:h-32 text-gray-400 text-xs md:text-sm">
                      No results found
                    </div>
                  )}
                </div>
                
                <div className="text-gray-400 text-[10px] md:text-xs flex justify-between pt-2 mt-1">
                  <span>{searchQuery ? 'Search Results' : 'Market Prices'}</span>
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> {/* Shorter time format */}
                </div>
              </div>
            </div>

            {/* Bottom left widget - Price Range */}
            <div
              className="absolute bottom-[12%] left-[15%] w-[300px] pointer-events-auto"
              style={{
                transform: `translate(${mousePosition.x * 40}px, ${mousePosition.y * 40}px)`,
              }}
            >
              <div className="bg-[#1E1A45]/60 border border-blue-500/20 backdrop-blur-md p-4 md:p-5 rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-105 w-full">
                <h3 className="text-blue-300 text-lg md:text-xl font-medium mb-3 md:mb-4">Price Range (24h)</h3>
                {isLoading ? (
                  <div className="w-full h-24 md:h-32 rounded-xl bg-gray-700/50 animate-pulse mb-2"></div>
                ) : selectedCoin ? (
                  <div className="w-full mb-2">
                    <div className="flex justify-between items-center text-[10px] md:text-xs text-gray-300 mb-2 px-1 md:px-3">
                      <div>Low: {formatPrice(selectedCoin.low_24h || selectedCoin.current_price * 0.9)}</div>
                      <div>High: {formatPrice(selectedCoin.high_24h || selectedCoin.current_price * 1.1)}</div>
                    </div>
                    
                    <div className="relative h-6 md:h-8 bg-gray-700/30 rounded-lg overflow-hidden mb-3 md:mb-4">
                      <div className="absolute bottom-0 left-0 h-full w-1 bg-red-500"></div>
                      
                      <div 
                        className="absolute bottom-0 h-full w-1 bg-white"
                        style={{ 
                          left: `${selectedCoin.high_24h && selectedCoin.low_24h 
                            ? ((selectedCoin.current_price - (selectedCoin.low_24h || 0)) / 
                              ((selectedCoin.high_24h || selectedCoin.current_price * 1.1) - (selectedCoin.low_24h || selectedCoin.current_price * 0.9)) * 100)
                            : 50}%` 
                        }}
                      ></div>
                      
                      <div className="absolute bottom-0 right-0 h-full w-1 bg-green-500"></div>
                      
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-purple-500/20 to-green-500/20"></div>
                    </div>
                    
                    <div className="space-y-1 md:space-y-2 mb-3 md:mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 text-xs md:text-sm">Current</span>
                        <span className="text-white text-xs md:text-sm font-medium">{formatPrice(selectedCoin.current_price)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 text-xs md:text-sm">24h Change</span>
                        <span className={`text-xs md:text-sm font-medium ${selectedCoin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPriceChange(selectedCoin.price_change_percentage_24h)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-2 md:pt-3 border-t border-white/10">
                      <div className="text-center text-xs md:text-sm text-violet-300 font-medium">
                        {selectedCoin.price_change_percentage_24h >= 0 ? 'Bullish' : 'Bearish'} over the last 24 hours
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-24 md:h-32 rounded-xl bg-gray-700/50 mb-2 flex items-center justify-center">
                    <span className="text-xs md:text-sm text-gray-400">Select a coin to view data</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom right widget - Ardock/ABI Info */}
            <div
              className="absolute bottom-[12%] right-[15%] w-[300px] pointer-events-auto"
              style={{
                transform: `translate(${mousePosition.x * 35}px, ${mousePosition.y * 35}px)`,
              }}
            >
              <div className="bg-[#1E1A45]/60 border border-blue-500/20 backdrop-blur-md p-4 md:p-5 rounded-xl shadow-lg transition-transform hover:scale-105 w-full">
                <div className="flex items-center justify-center mb-3 md:mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16">
                    {/* SVG Icon */}
                    <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M50 10L90 30V70L50 90L10 70V30L50 10Z" stroke="#00D8FF" strokeWidth="2" fill="none" />
                      <path d="M30 40L50 30L70 40V60L50 70L30 60V40Z" stroke="#00D8FF" strokeWidth="2" fill="none" />
                      <path d="M10 30L50 10L90 30" stroke="#00D8FF" strokeWidth="2" />
                      <path d="M10 70L50 90L90 70" stroke="#00D8FF" strokeWidth="2" />
                      <path d="M50 10V90" stroke="#00D8FF" strokeWidth="2" opacity="0.5" />
                      <path d="M10 30V70" stroke="#00D8FF" strokeWidth="2" opacity="0.5" />
                      <path d="M90 30V70" stroke="#00D8FF" strokeWidth="2" opacity="0.5" />
                    </svg>
                  </div>
                  <div className="ml-3 md:ml-4 flex-1">
                    <h3 className="text-white font-bold text-lg md:text-xl">Ardock</h3>
                    <p className="text-cyan-300 text-xs md:text-sm">ABI #1</p>
                  </div>
                </div>
                
                <div className="mb-3 md:mb-4">
                  <div className="flex justify-between items-center text-xs md:text-sm my-1 md:my-2">
                    <span className="text-gray-300 font-medium">Connected:</span>
                    <span className="text-white font-medium">{selectedCoin ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs md:text-sm my-1 md:my-2">
                    <span className="text-gray-300 font-medium">Balance:</span>
                    <span className="text-white font-medium">0.00000918 BTC</span>
                  </div>
                  <div className="flex justify-between items-center text-xs md:text-sm my-1 md:my-2">
                    <span className="text-gray-300 font-medium">Transactions:</span>
                    <span className="text-white font-medium">#457</span>
                  </div>
                </div>
                
                <div className="mt-3 md:mt-4 pt-2 md:pt-3 border-t border-white/10">
                  <div className="text-center">
                    <span className="text-cyan-300 font-medium block text-xs md:text-sm">Mystery Chests</span>
                    <p className="text-[10px] md:text-xs text-gray-300 mt-1">
                      Obtain mystical crates overflowing with game-changing rewards.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Social Media Links Widget - Desktop positioning */}
            <div
              className="absolute bottom-[50%] left-[3%] w-[60px] pointer-events-auto"
              style={{
                transform: `translate(${mousePosition.x * 15}px, ${mousePosition.y * 15}px)`,
              }}
            >
              <div className="bg-[#1E1A45]/60 border border-blue-500/20 backdrop-blur-md p-3 rounded-xl shadow-lg transition-transform hover:scale-105 w-full">
                <div className="flex flex-col gap-6">
                  {/* X (Twitter) */}
                  <a 
                    href="https://x.com/godsdollar" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center transition-transform hover:scale-110"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                      </svg>
                    </div>
                  </a>
                  
                  {/* Facebook */}
                  <a 
                    href="https://facebook.com/godsdollar" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center transition-transform hover:scale-110"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"></path>
                      </svg>
                    </div>
                  </a>
                  
                  {/* YouTube */}
                  <a 
                    href="https://youtube.com/@godsdollar" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center transition-transform hover:scale-110"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-400 flex items-center justify-center shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path>
                      </svg>
                    </div>
                  </a>
                  
                  {/* Instagram */}
                  <a 
                    href="https://instagram.com/godsdollar" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center transition-transform hover:scale-110"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-700 via-pink-500 to-orange-500 flex items-center justify-center shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            {/* Central GOD'S DOLLAR logo - Desktop positioning */}
            <div className="absolute top-[10%] left-1/2 -translate-x-1/2 pointer-events-none z-20 flex flex-col items-center">
              {/* GOD'S text */}
              <div
                className="relative"
                style={{
                  transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * -15}px)`,
                }}
              >
                <img
                  src="/images/gods.png"
                  alt="GOD'S"
                  className="w-full h-auto max-w-[500px]" 
                />
              </div>

              {/* DOLLAR text */}
              <div
                className="relative -mt-10"
                style={{
                  transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * 15}px)`,
                }}
              >
                <img
                  src="/images/dollar-text.png"
                  alt="DOLLAR"
                  className="w-full h-auto max-w-[500px]"
                />
              </div>
            </div>

            {/* Central CA Address - Desktop positioning */}
            <div
              className="absolute top-[30%] left-1/2 transform -translate-x-1/2 pointer-events-auto"
              style={{
                transform: `translate(calc(-50% + ${mousePosition.x * 10}px), ${mousePosition.y * 15}px)`,
              }}
            >
              <div className="bg-transparent py-1 md:py-2 px-2 md:px-4 text-center w-full">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-30"></div>
                  <div className="relative bg-[#1E1A45]/60 border border-blue-500/20 backdrop-blur-md rounded-lg p-2 md:p-3">
                    <div className="flex items-center justify-center flex-wrap">
                      <span className="text-blue-300 text-xs md:text-sm font-semibold mr-1 md:mr-2">CA:</span>
                      <span className="text-white text-[10px] md:text-sm font-medium tracking-normal md:tracking-wider break-all md:break-normal">HwQPzaohHzmx8X3nL3nSCfwVGLwQcsMEritEoqTBpump</span>
                      <button
                        className="ml-2 md:ml-3 text-[10px] md:text-xs bg-transparent hover:bg-blue-700/30 text-blue-300 py-0.5 md:py-1 px-1.5 md:px-2 rounded border border-blue-500/30 transition-all mt-1 md:mt-0" // Add margin top on mobile if wrapped
                        onClick={() => {
                          navigator.clipboard.writeText("HwQPzaohHzmx8X3nL3nSCfwVGLwQcsMEritEoqTBpump");
                          const btn = document.activeElement as HTMLElement;
                          if (btn) {
                            const originalText = btn.innerText;
                            btn.innerText = "Copied!";
                            btn.classList.add("bg-blue-700/50", "text-white");
                            setTimeout(() => {
                              btn.innerText = originalText;
                              btn.classList.remove("bg-blue-700/50", "text-white");
                            }, 2000);
                          }
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ParallaxScene;
