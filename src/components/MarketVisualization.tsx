'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Maximize2, Settings } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar
} from 'recharts';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

interface PricePoint {
  time: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  formattedTime?: string;
}

interface TokenData {
  symbol: string;
  name: string;
  usdPrice?: number;
  priceChange24h?: number;
  volume24h?: number;
  mcap?: number;
}

export default function MarketVisualization() {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1H');
  const [chartType, setChartType] = useState<'line' | 'area' | 'candles'>('area');
  const [high24h, setHigh24h] = useState(0);
  const [low24h, setLow24h] = useState(0);
  const [showVolume, setShowVolume] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tokenData?.usdPrice) {
      generatePriceHistory(tokenData.usdPrice);
    }
  }, [timeRange, tokenData?.usdPrice]);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/simulation/config');
      const data = await response.json();
      
      if (data.selectedToken) {
        const token = data.selectedToken;
        setTokenData(token);
        const currentPrice = token.usdPrice || 0.001;
        
        setHigh24h(currentPrice * 1.02);
        setLow24h(currentPrice * 0.98);
        
        generatePriceHistory(currentPrice);
        generateOrderBook(currentPrice);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePriceHistory = (currentPrice: number) => {
    const history: PricePoint[] = [];
    const now = new Date();

    let points = 60;
    let intervalMinutes = 1;

    switch(timeRange) {
      case '1M':
        points = 60;
        intervalMinutes = 1;
        break;
      case '5M':
        points = 60;
        intervalMinutes = 5;
        break;
      case '15M':
        points = 60;
        intervalMinutes = 15;
        break;
      case '1H':
        points = 60;
        intervalMinutes = 60;
        break;
      case '4H':
        points = 60;
        intervalMinutes = 240;
        break;
      case '1D':
        points = 60;
        intervalMinutes = 1440;
        break;
    }

    for (let i = points; i >= 0; i--) {
      const time = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);
      const volatility = 0.004;
      const change = (Math.random() - 0.5) * volatility;
      const price = currentPrice * (1 + change * (i / points));
      const open = i < points ? history[history.length - 1]?.close || price : price;
      const high = Math.max(open, price) * (1 + Math.random() * 0.001);
      const low = Math.min(open, price) * (1 - Math.random() * 0.001);
      const close = price;
      const volume = Math.random() * 1000000 + 100000;

      history.push({
        time: time.toISOString(),
        price: close,
        open,
        high,
        low,
        close,
        volume,
        formattedTime: formatTimeLabel(time, timeRange)
      });
    }

    history[history.length - 1].close = currentPrice;
    history[history.length - 1].price = currentPrice;
    setPriceHistory(history);
  };

  const formatTimeLabel = (date: Date, range: string): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    switch(range) {
      case '1M':
      case '5M':
      case '15M':
        return `${hours}:${minutes}`;
      case '1H':
      case '4H':
        return `${hours}:00`;
      case '1D':
        return `${date.getMonth() + 1}/${date.getDate()}`;
      default:
        return `${hours}:${minutes}`;
    }
  };

  const generateOrderBook = (currentPrice: number) => {
    const bidOrders: OrderBookEntry[] = [];
    const askOrders: OrderBookEntry[] = [];
    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 0; i < 15; i++) {
      const priceLevel = currentPrice * (1 + (i + 1) * 0.0002);
      const amount = Math.random() * 8000 + 1000;
      askTotal += amount * priceLevel;
      askOrders.push({
        price: priceLevel,
        amount: amount,
        total: askTotal
      });
    }

    for (let i = 0; i < 15; i++) {
      const priceLevel = currentPrice * (1 - (i + 1) * 0.0002);
      const amount = Math.random() * 8000 + 1000;
      bidTotal += amount * priceLevel;
      bidOrders.push({
        price: priceLevel,
        amount: amount,
        total: bidTotal
      });
    }

    setBids(bidOrders);
    setAsks(askOrders);
  };

  const spread = asks.length > 0 && bids.length > 0 
    ? ((asks[0].price - bids[0].price) / bids[0].price * 100).toFixed(3)
    : '0.000';

  const priceChange = tokenData?.priceChange24h || 0;
  const isPositive = priceChange >= 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black">
        <div className="w-8 h-8 border-4 border-neutral-700 border-t-white rounded-full animate-spin"></div>
        <div className="mt-4 text-gray-400 text-sm">Loading market data...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Top Bar */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Token Info */}
            <div>
              <div className="text-xs text-gray-500 mb-0.5">{tokenData?.name || 'Loading...'}</div>
              <div className="text-lg font-bold text-white">{tokenData?.symbol || 'TOKEN'}/USD</div>
            </div>

            <div className="h-8 w-px bg-neutral-800"></div>

            {/* Price & Change */}
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                ${tokenData?.usdPrice?.toFixed(6) || '0.000000'}
              </div>
              <div className={`text-sm font-semibold px-2.5 py-1 rounded ${
                isPositive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
              </div>
            </div>

            <div className="h-8 w-px bg-neutral-800"></div>

            {/* 24h Stats */}
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">24h High</div>
                <div className="text-sm font-semibold text-green-400">${high24h.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">24h Low</div>
                <div className="text-sm font-semibold text-red-400">${low24h.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Volume</div>
                <div className="text-sm font-semibold text-white">
                  {tokenData?.volume24h
                    ? `$${(tokenData.volume24h / 1e6).toFixed(1)}M`
                    : `$${((tokenData?.mcap || 0) * 0.1 / 1e6).toFixed(1)}M`}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={fetchData}
            className="p-2 hover:bg-neutral-800 rounded transition-colors"
          >
            <RefreshCw size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Order Book */}
        <div className="w-72 bg-neutral-900 border-r border-neutral-800 flex flex-col">
          <div className="p-3 border-b border-neutral-800">
            <div className="text-sm font-semibold text-white">Order Book</div>
          </div>

          <div className="flex-1 p-3 overflow-auto">
            {/* Headers */}
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-2 font-medium">
              <div>Price (USD)</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Total</div>
            </div>

            {/* Asks */}
            <div className="space-y-0.5 mb-3">
              {asks.slice().reverse().slice(0, 12).map((ask, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 gap-2 text-xs py-1 px-1.5 hover:bg-red-500/5 cursor-pointer relative rounded transition-colors"
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-red-500/10 rounded"
                    style={{ width: `${(ask.total / asks[asks.length - 1]?.total) * 100}%` }}
                  />
                  <div className="text-red-400 font-mono relative z-10 font-medium">{ask.price.toFixed(6)}</div>
                  <div className="text-right text-gray-300 relative z-10">{ask.amount.toFixed(1)}</div>
                  <div className="text-right text-gray-500 relative z-10">{ask.total.toFixed(0)}</div>
                </div>
              ))}
            </div>

            {/* Spread */}
            <div className={`flex items-center justify-between py-2 px-3 mb-3 rounded-lg ${
              isPositive ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
            }`}>
              <div className={`text-base font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                ${tokenData?.usdPrice?.toFixed(6)}
              </div>
              <div className="text-xs text-gray-400">Spread: {spread}%</div>
            </div>

            {/* Bids */}
            <div className="space-y-0.5">
              {bids.slice(0, 12).map((bid, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 gap-2 text-xs py-1 px-1.5 hover:bg-green-500/5 cursor-pointer relative rounded transition-colors"
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-green-500/10 rounded"
                    style={{ width: `${(bid.total / bids[bids.length - 1]?.total) * 100}%` }}
                  />
                  <div className="text-green-400 font-mono relative z-10 font-medium">{bid.price.toFixed(6)}</div>
                  <div className="text-right text-gray-300 relative z-10">{bid.amount.toFixed(1)}</div>
                  <div className="text-right text-gray-500 relative z-10">{bid.total.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 bg-black flex flex-col">
          {/* Chart Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-neutral-900/50">
            <div className="flex items-center gap-4">
              {/* Time Range */}
              <div className="flex items-center gap-1">
                {['1M', '5M', '15M', '1H', '4H', '1D'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                      timeRange === range
                        ? 'bg-white text-black'
                        : 'text-gray-400 hover:text-white hover:bg-neutral-800 border border-neutral-700'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>

              {/* Chart Type */}
              <div className="flex items-center gap-1">
                {[
                  { key: 'line', label: 'Line' },
                  { key: 'area', label: 'Area' },
                  { key: 'candles', label: 'Candles' }
                ].map((type) => (
                  <button
                    key={type.key}
                    onClick={() => setChartType(type.key as typeof chartType)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                      chartType === type.key
                        ? 'bg-white text-black'
                        : 'text-gray-400 hover:text-white hover:bg-neutral-800 border border-neutral-700'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowVolume(!showVolume)}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                  showVolume
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white hover:bg-neutral-800 border border-neutral-700'
                }`}
              >
                Volume
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-neutral-800 rounded transition-colors">
                <Settings size={16} className="text-gray-400" />
              </button>
              <button className="p-1.5 hover:bg-neutral-800 rounded transition-colors">
                <Maximize2 size={16} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={priceHistory} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="0"
                  vertical={false}
                  horizontal={true}
                  stroke="#262626"
                  strokeWidth={1}
                />

                <XAxis
                  dataKey="formattedTime"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#262626' }}
                  dy={8}
                  tickFormatter={(value, index) => {
                    const step = Math.ceil(priceHistory.length / 8);
                    return index % step === 0 ? value : '';
                  }}
                />

                <YAxis
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#262626' }}
                  tickFormatter={(value) => `$${typeof value === 'number' ? value.toFixed(6) : '0'}`}
                  domain={['dataMin * 0.9998', 'dataMax * 1.0002']}
                  width={85}
                  orientation="right"
                  dx={8}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-neutral-900 border border-neutral-700 p-3 rounded-lg shadow-xl">
                          <div className="text-xs text-gray-400 mb-2 font-medium">
                            {data.formattedTime}
                          </div>
                          <div className="space-y-1">
                            {chartType === 'candles' && (
                              <>
                                <div className="flex justify-between gap-4 text-xs">
                                  <span className="text-gray-400">Open:</span>
                                  <span className="text-white font-mono">${data.open?.toFixed(6)}</span>
                                </div>
                                <div className="flex justify-between gap-4 text-xs">
                                  <span className="text-gray-400">High:</span>
                                  <span className="text-green-400 font-mono">${data.high?.toFixed(6)}</span>
                                </div>
                                <div className="flex justify-between gap-4 text-xs">
                                  <span className="text-gray-400">Low:</span>
                                  <span className="text-red-400 font-mono">${data.low?.toFixed(6)}</span>
                                </div>
                                <div className="flex justify-between gap-4 text-xs border-t border-neutral-700 pt-1">
                                  <span className={`font-medium ${data.close > data.open ? 'text-green-400' : 'text-red-400'}`}>
                                    Close:
                                  </span>
                                  <span className={`font-mono ${data.close > data.open ? 'text-green-400' : 'text-red-400'}`}>
                                    ${data.close?.toFixed(6)}
                                  </span>
                                </div>
                              </>
                            )}
                            {chartType !== 'candles' && (
                              <div className="flex justify-between gap-4 text-xs">
                                <span className="text-gray-400">Price:</span>
                                <span className="text-white font-mono">${data.price?.toFixed(6)}</span>
                              </div>
                            )}
                            {showVolume && (
                              <div className="flex justify-between gap-4 text-xs pt-1 border-t border-neutral-700">
                                <span className="text-gray-400">Volume:</span>
                                <span className="text-white">${(data.volume / 1e6).toFixed(2)}M</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                />

                {showVolume && (
                  <Bar
                    dataKey="volume"
                    fill="#404040"
                    fillOpacity={0.5}
                    yAxisId="volume"
                  />
                )}

                {chartType === 'candles' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#3b82f6', stroke: '#000', strokeWidth: 2 }}
                    />

                    <Area
                      type="monotone"
                      dataKey="high"
                      stroke="#10b981"
                      fill="url(#positiveGradient)"
                      strokeWidth={1}
                      dot={false}
                    />

                    <Area
                      type="monotone"
                      dataKey="low"
                      stroke="#ef4444"
                      fill="url(#negativeGradient)"
                      strokeWidth={1}
                      dot={false}
                    />
                  </>
                )}

                {chartType === 'area' && (
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#chartGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#3b82f6', stroke: '#000', strokeWidth: 2 }}
                  />
                )}

                {chartType === 'line' && (
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#3b82f6', stroke: '#000', strokeWidth: 2 }}
                  />
                )}

                {showVolume && (
                  <YAxis
                    yAxisId="volume"
                    orientation="left"
                    tick={false}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 'dataMax * 4']}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
