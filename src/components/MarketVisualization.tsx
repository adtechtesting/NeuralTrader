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
      case '15M':
        points = 30;
        intervalMinutes = 0.5;
        break;
      case '1H':
        points = 60;
        intervalMinutes = 1;
        break;
      case '4H':
        points = 80;
        intervalMinutes = 3;
        break;
      case '24H':
        points = 96;
        intervalMinutes = 15;
        break;
      case '7D':
        points = 84;
        intervalMinutes = 120;
        break;
    }

    for (let i = points; i >= 0; i--) {
      const time = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);
      const volatility = 0.006;
      const change = (Math.random() - 0.5) * volatility;
      const price = currentPrice * (1 + change * (i / points));
      const open = i < points ? history[history.length - 1]?.close || price : price;
      const high = Math.max(open, price) * (1 + Math.random() * 0.002);
      const low = Math.min(open, price) * (1 - Math.random() * 0.002);
      const close = price;
      const volume = Math.random() * 2000000 + 500000;
      
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
    
    if (range === '7D') {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } else if (range === '24H') {
      return `${hours}:00`;
    } else {
      return `${hours}:${minutes}`;
    }
  };

  const generateOrderBook = (currentPrice: number) => {
    const bidOrders: OrderBookEntry[] = [];
    const askOrders: OrderBookEntry[] = [];
    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 0; i < 20; i++) {
      const priceLevel = currentPrice * (1 + (i + 1) * 0.0003);
      const amount = Math.random() * 15000 + 2000;
      askTotal += amount * priceLevel;
      askOrders.push({
        price: priceLevel,
        amount: amount,
        total: askTotal
      });
    }

    for (let i = 0; i < 20; i++) {
      const priceLevel = currentPrice * (1 - (i + 1) * 0.0003);
      const amount = Math.random() * 15000 + 2000;
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
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Bar */}
      <div className="bg-black/60 backdrop-blur-xl border-b border-white/10 px-6 py-3">
        <div className="flex items-center justify-between max-w-[2000px] mx-auto">
          <div className="flex items-center gap-6">
            {/* Token Info */}
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[13px] text-white/40 mb-0.5">{tokenData?.name || 'Loading...'}</div>
                <div className="text-xl font-bold text-white">{tokenData?.symbol || 'TOKEN'}/USD</div>
              </div>
            </div>
            
            <div className="h-10 w-px bg-white/10"></div>
            
            {/* Price & Change */}
            <div>
              <div className="text-[13px] text-white/40 mb-0.5">Last Price</div>
              <div className="flex items-center gap-2">
                <div className={`text-xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  ${tokenData?.usdPrice?.toFixed(6) || '0.000000'}
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                  isPositive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="h-10 w-px bg-white/10"></div>

            {/* 24h Stats */}
            <div className="flex items-center gap-8">
              <div>
                <div className="text-[11px] text-white/40 mb-1 uppercase tracking-wider">24h High</div>
                <div className="text-sm font-bold text-green-400">${high24h.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-[11px] text-white/40 mb-1 uppercase tracking-wider">24h Low</div>
                <div className="text-sm font-bold text-red-400">${low24h.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-[11px] text-white/40 mb-1 uppercase tracking-wider">24h Volume</div>
                <div className="text-sm font-bold text-white">
                  {tokenData?.volume24h 
                    ? `$${(tokenData.volume24h / 1e6).toFixed(2)}M` 
                    : `$${((tokenData?.mcap || 0) * 0.1 / 1e6).toFixed(2)}M`}
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={fetchData} 
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <RefreshCw size={16} className="text-white/60" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-60px)]">
        {/* Order Book */}
        <div className="w-[280px] bg-black/60 backdrop-blur-xl border-r border-white/10">
          <div className="p-3 border-b border-white/10">
            <div className="text-sm font-bold text-white">Order Book</div>
          </div>
          
          <div className="p-3">
            {/* Headers */}
            <div className="grid grid-cols-3 text-[10px] text-white/40 mb-2 pb-1 uppercase tracking-wider font-semibold">
              <div>Price(USD)</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Total</div>
            </div>

            {/* Asks */}
            <div className="space-y-[1px] mb-2">
              {asks.slice().reverse().slice(0, 14).map((ask, i) => (
                <div 
                  key={i} 
                  className="grid grid-cols-3 text-[11px] py-[2px] px-1 hover:bg-red-500/5 cursor-pointer relative rounded-sm"
                >
                  <div 
                    className="absolute right-0 top-0 bottom-0 bg-red-500/10 rounded-sm"
                    style={{ width: `${(ask.total / asks[asks.length - 1]?.total) * 100}%` }}
                  />
                  <div className="text-red-400 font-mono relative z-10 font-semibold">{ask.price.toFixed(6)}</div>
                  <div className="text-right text-white/80 relative z-10">{ask.amount.toFixed(1)}</div>
                  <div className="text-right text-white/40 relative z-10 text-[10px]">{ask.total.toFixed(0)}</div>
                </div>
              ))}
            </div>

            {/* Current Price */}
            <div className={`flex items-center justify-center py-2 mb-2 rounded-lg ${isPositive ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <div className={`text-lg font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                ${tokenData?.usdPrice?.toFixed(6)}
              </div>
              <div className="text-[10px] text-white/40 ml-2">↔ {spread}%</div>
            </div>

            {/* Bids */}
            <div className="space-y-[1px]">
              {bids.slice(0, 14).map((bid, i) => (
                <div 
                  key={i} 
                  className="grid grid-cols-3 text-[11px] py-[2px] px-1 hover:bg-green-500/5 cursor-pointer relative rounded-sm"
                >
                  <div 
                    className="absolute right-0 top-0 bottom-0 bg-green-500/10 rounded-sm"
                    style={{ width: `${(bid.total / bids[bids.length - 1]?.total) * 100}%` }}
                  />
                  <div className="text-green-400 font-mono relative z-10 font-semibold">{bid.price.toFixed(6)}</div>
                  <div className="text-right text-white/80 relative z-10">{bid.amount.toFixed(1)}</div>
                  <div className="text-right text-white/40 relative z-10 text-[10px]">{bid.total.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 bg-black/60 backdrop-blur-xl flex flex-col">
          {/* Chart Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
            <div className="flex items-center gap-3">
              {/* Time Range */}
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                {['15M', '1H', '4H', '24H', '7D'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      timeRange === range 
                        ? 'bg-white text-black' 
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>

              {/* Chart Type */}
              <div className="h-6 w-px bg-white/10"></div>
              <div className="flex items-center gap-1">
                {['area', 'line', 'candles'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type as typeof chartType)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${
                      chartType === type ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="h-6 w-px bg-white/10"></div>
              <button
                onClick={() => setShowVolume(!showVolume)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  showVolume ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                Volume
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <Settings size={14} className="text-white/60" />
              </button>
              <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <Maximize2 size={14} className="text-white/60" />
              </button>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={priceHistory} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="0" 
                  vertical={false}
                  horizontal={true}
                  stroke="rgba(255,255,255,0.1)" 
                  strokeWidth={0.5}
                />
                
                <XAxis 
                  dataKey="formattedTime" 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 0.5 }}
                  dy={8}
                  tickFormatter={(value, index) => {
                    const step = Math.ceil(priceHistory.length / 10);
                    return index % step === 0 ? value : '';
                  }}
                />
                
                <YAxis 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 0.5 }}
                  tickFormatter={(value) => `$${typeof value === 'number' ? value.toFixed(6) : '0'}`}
                  domain={['dataMin * 0.9998', 'dataMax * 1.0002']}
                  width={90}
                  orientation="right"
                  dx={8}
                />
                
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-black/90 backdrop-blur-xl border border-white/20 p-3 rounded-lg shadow-xl">
                          <div className="text-[10px] text-white/40 mb-2 uppercase tracking-wider">{data.formattedTime}</div>
                          <div className="space-y-1">
                            {chartType === 'candles' && (
                              <>
                                <div className="flex justify-between gap-4 text-xs">
                                  <span className="text-white/60">O:</span>
                                  <span className="text-white font-mono">${data.open?.toFixed(8)}</span>
                                </div>
                                <div className="flex justify-between gap-4 text-xs">
                                  <span className="text-white/60">H:</span>
                                  <span className="text-green-400 font-mono">${data.high?.toFixed(8)}</span>
                                </div>
                                <div className="flex justify-between gap-4 text-xs">
                                  <span className="text-white/60">L:</span>
                                  <span className="text-red-400 font-mono">${data.low?.toFixed(8)}</span>
                                </div>
                                <div className="flex justify-between gap-4 text-xs">
                                  <span className="text-white/60">C:</span>
                                  <span className="text-white font-mono font-bold">${data.close?.toFixed(8)}</span>
                                </div>
                              </>
                            )}
                            {chartType !== 'candles' && (
                              <div className="flex justify-between gap-4 text-xs">
                                <span className="text-white/60">Price:</span>
                                <span className="text-white font-mono font-bold">${data.price?.toFixed(8)}</span>
                              </div>
                            )}
                            {showVolume && (
                              <div className="flex justify-between gap-4 text-xs pt-1 border-t border-white/10">
                                <span className="text-white/60">Vol:</span>
                                <span className="text-white">${(data.volume / 1e6).toFixed(2)}M</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ stroke: 'rgba(255,255,255,0.4)', strokeWidth: 0.5, strokeDasharray: '3 3' }}
                />
                
                {showVolume && (
                  <Bar 
                    dataKey="volume" 
                    fill="rgba(255,255,255,0.2)"
                    fillOpacity={0.3}
                    yAxisId="volume"
                  />
                )}
                
                {chartType === 'area' && (
                  <Area 
                    type="monotone"
                    dataKey="price" 
                    stroke="#ffffff" 
                    strokeWidth={2}
                    fill="url(#chartGradient)" 
                    dot={false}
                    activeDot={{ r: 4, fill: '#ffffff', stroke: '#000000', strokeWidth: 2 }}
                  />
                )}
                
                {chartType === 'line' && (
                  <Line 
                    type="monotone"
                    dataKey="price" 
                    stroke="#ffffff" 
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 4, fill: '#ffffff', stroke: '#000000', strokeWidth: 2 }}
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
