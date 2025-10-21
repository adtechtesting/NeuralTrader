'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const COLORS = {
  price: '#8b5cf6',
  priceLine: 'rgba(139, 92, 246, 0.75)',
  grid: 'rgba(255, 255, 255, 0.1)',
};

interface PricePoint {
  time: string;
  price: number;
  formattedTime?: string;
}

interface TokenData {
  mint: string;
  symbol: string;
  name: string;
  usdPrice?: number;
  mcap?: number;
  liquidity?: number;
  volume24h?: number;
  priceChange24h?: number;
}

export default function MarketVisualization() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [timeRange, setTimeRange] = useState('24h');

  const fetchLiveMarketData = async () => {
    try {
      setLoading(true);
      
      // Get selected token with LIVE data from Jupiter
      const configResponse = await fetch('/api/simulation/config');
      const configData = await configResponse.json();
      
      if (!configData.selectedToken) {
        setError('No token selected');
        return;
      }

      const token = configData.selectedToken;
      setTokenData(token);

      // Generate simulated price history based on current price
      // In a real app, you'd fetch historical data from an API
      generatePriceHistory(token.usdPrice || 0.001);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching live market data:', err);
      setError('Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  };

  const generatePriceHistory = (currentPrice: number) => {
    const now = new Date();
    const history: PricePoint[] = [];
    const points = timeRange === '1h' ? 12 : timeRange === '4h' ? 24 : 48;
    const interval = timeRange === '1h' ? 5 : timeRange === '4h' ? 10 : 30; // minutes

    for (let i = points; i >= 0; i--) {
      const time = new Date(now.getTime() - i * interval * 60 * 1000);
      // Simulate price movement (±5% random walk)
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility;
      const price = currentPrice * (1 + change * (i / points));
      
      history.push({
        time: time.toISOString(),
        price: Math.max(price, currentPrice * 0.8), // Don't go below 80% of current
        formattedTime: formatTimeLabel(time)
      });
    }

    // Ensure last point is current price
    history[history.length - 1].price = currentPrice;
    setPriceHistory(history);
  };


  const formatTimeLabel = (date: Date): string => {
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleTimeRangeChange = (newRange: string) => {
    setTimeRange(newRange);
    if (tokenData?.usdPrice) {
      generatePriceHistory(tokenData.usdPrice);
    }
  };

  // Fetch data on mount and set up polling
  useEffect(() => {
    fetchLiveMarketData();
    const interval = setInterval(fetchLiveMarketData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Regenerate history when timeRange changes
  useEffect(() => {
    if (tokenData?.usdPrice) {
      generatePriceHistory(tokenData.usdPrice);
    }
  }, [timeRange]);


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
            <div className="text-sm text-gray-400">{tokenData?.symbol || 'TOKEN'} Price Chart</div>
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
                data={priceHistory}
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

          {tokenData && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Current Price</div>
                <div className="font-medium text-white">
                  ${tokenData.usdPrice ? tokenData.usdPrice.toFixed(tokenData.usdPrice < 0.01 ? 8 : 4) : 'N/A'}
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">24h Change</div>
                <div
                  className={`font-medium flex items-center justify-center ${
                    (tokenData.priceChange24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {(tokenData.priceChange24h || 0) >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {tokenData.priceChange24h ? `${tokenData.priceChange24h.toFixed(2)}%` : 'N/A'}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">Market Cap</div>
                <div className="font-medium text-white">
                  {tokenData.mcap ? `$${(tokenData.mcap / 1e6).toFixed(2)}M` : 'N/A'}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-3">
            <button
              onClick={fetchLiveMarketData}
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