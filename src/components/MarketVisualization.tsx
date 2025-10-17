'use client';

import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const COLORS = {
  price: '#8b5cf6', // Purple-500
  volume: '#34d399', // Green-400
  priceLine: 'rgba(139, 92, 246, 0.75)',
  grid: 'rgba(255, 255, 255, 0.1)',
  bullish: '#34d399', // Green-400
  bearish: '#f87171', // Red-400
  neutral: '#9ca3af', // Gray-400
};

// Define TypeScript interfaces
interface PricePoint {
  time: string;
  price: number;
  formattedTime?: string;
}

interface Sentiment {
  bullish: number;
  bearish: number;
  neutral: number;
}

interface MarketData {
  price: number;
  timestamp: string;
  volume24h: number;
  priceChange24h: number;
  sentiment: Sentiment;
}

interface APIData {
  success: boolean;
  data: MarketData[];
  priceHistory: PricePoint[];
  message?: string;
}

export default function MarketVisualization() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string>('TOKEN');
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [timeRange, setTimeRange] = useState('4h');
  const [filteredHistory, setFilteredHistory] = useState<PricePoint[]>([]);

  const fetchTokenSymbol = async () => {
    try {
      const response = await fetch('/api/simulation/config');
      const data = await response.json();
      if (data.selectedToken?.symbol) {
        setTokenSymbol(data.selectedToken.symbol);
      }
    } catch (err) {
      console.log('Could not fetch token symbol, using default');
    }
  };

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/market-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json() as APIData;

      if (data.success) {
        setMarketData(data.data || []);
        
     
        const formattedPriceHistory = (data.priceHistory || []).map((point: PricePoint) => ({
          time: point.time,
          price: point.price,
          formattedTime: formatTimeLabel(new Date(point.time))
        }));
        
        setPriceHistory(formattedPriceHistory);
        setError(null);
      } else {
        setError(data.message || 'Failed to load market data');
        useSampleData();
      }
    } catch (err) {
      console.error('Error fetching market data:', err);
    
      useSampleData();
    } finally {
      setLoading(false);
    }
  };


  const formatTimeLabel = (date: Date): string => {
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  
  const useSampleData = () => {
    const now = new Date();
    const samplePriceHistory: PricePoint[] = [];
    const basePrice = 0.001;

    for (let i = 0; i < 24; i++) {
      const time = new Date(now.getTime() - (24 - i) * 60 * 60 * 1000).toISOString();
      const date = new Date(time);
      const randomFactor = 1 + (Math.random() * 0.2 - 0.1); 
      const price = basePrice * randomFactor * (1 + i / 100);
      samplePriceHistory.push({ 
        time, 
        price,
        formattedTime: formatTimeLabel(date)
      });
    }
    
    setPriceHistory(samplePriceHistory);

    setMarketData([
      {
        price: samplePriceHistory[samplePriceHistory.length - 1].price,
        timestamp: now.toISOString(),
        volume24h: 1000 * Math.random(),
        priceChange24h: 5 * (Math.random() * 2 - 1), 
        sentiment: {
          bullish: 0.6,
          bearish: 0.3,
          neutral: 0.1,
        },
      },
    ]);
  };

  useEffect(() => {
    if (priceHistory.length === 0) return;
    
    let filtered = [...priceHistory];
    const now = new Date();
    
    if (timeRange === '1h') {
      filtered = priceHistory.filter(
        (p) => p.time && new Date(p.time).getTime() > now.getTime() - 60 * 60 * 1000
      );
    } else if (timeRange === '4h') {
      filtered = priceHistory.filter(
        (p) => p.time && new Date(p.time).getTime() > now.getTime() - 4 * 60 * 60 * 1000
      );
    } else if (timeRange === '24h') {
      filtered = priceHistory.filter(
        (p) => p.time && new Date(p.time).getTime() > now.getTime() - 24 * 60 * 60 * 1000
      );
    }

    if (filtered.length < 2) {
      filtered = [...priceHistory];
    }
    
    setFilteredHistory(filtered);
  }, [priceHistory, timeRange]);


  const handleTimeRangeChange = (newRange: string) => {
    setTimeRange(newRange);
  };

  // Fetch data on mount and set up polling
  useEffect(() => {
    fetchTokenSymbol();
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatSentiment = (value: number): string => `${(value * 100).toFixed(1)}%`;


  const CustomTooltip = ({ active, payload }: { active?: boolean, payload?: any[] }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 p-2 rounded-md shadow-md">
          <p className="text-xs text-gray-300">{payload[0].payload.formattedTime}</p>
          <p className="text-purple-400 font-medium text-sm">
            {payload[0].value.toFixed(8)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full text-gray-100">
      {error && (
        <div className="mb-4 p-3 rounded-md bg-purple-900/50 border border-purple-800 text-purple-200 text-sm flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {loading && priceHistory.length === 0 ? (
        <div className="flex items-center justify-center p-6 h-full">
          <div className="animate-pulse flex space-x-2">
            <div className="h-3 w-3 bg-purple-400 rounded-full"></div>
            <div className="h-3 w-3 bg-purple-500 rounded-full"></div>
            <div className="h-3 w-3 bg-purple-600 rounded-full"></div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-400">{tokenSymbol} Price Chart</div>
            <div className="inline-flex p-0.5 bg-gray-800 rounded-md">
              <button
                onClick={() => handleTimeRangeChange('1h')}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  timeRange === '1h' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                1H
              </button>
              <button
                onClick={() => handleTimeRangeChange('4h')}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  timeRange === '4h' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                4H
              </button>
              <button
                onClick={() => handleTimeRangeChange('24h')}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  timeRange === '24h' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                24H
              </button>
            </div>
          </div>

          <div className="h-100 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={filteredHistory}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.price} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.price} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  stroke={COLORS.grid} 
                />
                <XAxis 
                  dataKey="formattedTime" 
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  tickLine={{ stroke: '#9ca3af' }}
                  axisLine={{ stroke: '#9ca3af' }}
                  tickFormatter={(value, index) => {
               
                    return index % 3 === 0 ? value : '';
                  }}
                />
                <YAxis 
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  tickLine={{ stroke: '#9ca3af' }}
                  axisLine={{ stroke: '#9ca3af' }}
                  tickFormatter={(value) => value.toFixed(6)}
                  domain={['dataMin * 0.95', 'dataMax * 1.05']}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone"
                  dataKey="price" 
                  stroke={COLORS.priceLine} 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPrice)" 
                  dot={{ fill: COLORS.price, r: 3 }}
                  activeDot={{ r: 5, fill: '#fff', stroke: COLORS.price }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="border-t border-gray-800 my-4"></div>

          {marketData.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1 top-20">Market Sentiment</div>
                <div className="flex gap-4">
                  <div>
                    <div className="text-green-400 text-xs">Bullish</div>
                    
                    <div className="font-medium text-white">{formatSentiment(marketData[0].sentiment.bullish)}</div>
                  </div>
                  <div>
                    <div className="text-red-400 text-xs">Bearish</div>
                    <div className="font-medium text-white">{formatSentiment(marketData[0].sentiment.bearish)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs">Neutral</div>
                    <div className="font-medium text-white">{formatSentiment(marketData[0].sentiment.neutral)}</div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">24h Change</div>
                <div
                  className={`font-medium flex items-center justify-center ${
                    marketData[0].priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {marketData[0].priceChange24h >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {`${marketData[0].priceChange24h.toFixed(2)}%`}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">24h Volume</div>
                <div className="font-medium text-white">{`${marketData[0].volume24h.toFixed(2)} SOL`}</div>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-3">
            <button
              onClick={fetchMarketData}
              className="px-2 py-1 rounded text-xs bg-purple-900/30 border border-purple-800/50 text-purple-400 hover:bg-purple-800/30 transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        </>
      )}
    </div>
  );
}