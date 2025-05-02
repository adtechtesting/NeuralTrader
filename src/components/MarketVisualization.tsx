'use client';

import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

// Define constants for colors
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '4h' | '24h'>('4h');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch market data
  const fetchMarketData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/market-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: APIData = await response.json();

      if (data.success) {
        setMarketData(data.data || []);
        setPriceHistory(data.priceHistory || []);
        setError(null);
      } else {
        setError(data.message || 'Failed to load market data');
        useSampleData();
      }
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError('Failed to fetch market data. Using sample data.');
      useSampleData();
    } finally {
      setLoading(false);
    }
  };

  // Generate sample data when real API data isn't available
  const useSampleData = () => {
    const now = new Date();
    const samplePriceHistory: PricePoint[] = [];
    const basePrice = 0.001;

    for (let i = 0; i < 24; i++) {
      const time = new Date(now.getTime() - (24 - i) * 60 * 60 * 1000).toISOString();
      const randomFactor = 1 + (Math.random() * 0.2 - 0.1); // ±10% variation
      const price = basePrice * randomFactor * (1 + i / 100);
      samplePriceHistory.push({ time, price });
    }
    setPriceHistory(samplePriceHistory);

    setMarketData([
      {
        price: samplePriceHistory[samplePriceHistory.length - 1].price,
        timestamp: now.toISOString(),
        volume24h: 1000 * Math.random(),
        priceChange24h: 5 * (Math.random() * 2 - 1), // ±5%
        sentiment: {
          bullish: 0.6,
          bearish: 0.3,
          neutral: 0.1,
        },
      },
    ]);
  };

  // Draw the price chart on the canvas
  const drawChart = () => {
    if (!canvasRef.current || priceHistory.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions based on device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Filter price history based on selected time range
    let filteredHistory = [...priceHistory];
    const now = new Date();
    if (timeRange === '1h') {
      filteredHistory = priceHistory.filter(
        (p) => new Date(p.time).getTime() > now.getTime() - 60 * 60 * 1000
      );
    } else if (timeRange === '4h') {
      filteredHistory = priceHistory.filter(
        (p) => new Date(p.time).getTime() > now.getTime() - 4 * 60 * 60 * 1000
      );
    } else if (timeRange === '24h') {
      filteredHistory = priceHistory.filter(
        (p) => new Date(p.time).getTime() > now.getTime() - 24 * 60 * 60 * 1000
      );
    }

    if (filteredHistory.length < 2) {
      filteredHistory = [...priceHistory];
    }

    const prices = filteredHistory.map((p) => p.price);
    const minPrice = Math.min(...prices) * 0.95;
    const maxPrice = Math.max(...prices) * 1.05;
    const width = rect.width;
    const height = rect.height;
    const paddingX = 40;
    const paddingY = 20;

    // Draw grid lines for price levels
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    const priceStep = (maxPrice - minPrice) / 5;
    for (let i = 0; i <= 5; i++) {
      const y = paddingY + (height - 2 * paddingY) * (1 - i / 5);
      ctx.beginPath();
      ctx.moveTo(paddingX, y);
      ctx.lineTo(width - paddingX, y);
      ctx.stroke();
      const price = minPrice + priceStep * i;
      ctx.fillStyle = '#9ca3af'; // Gray-400
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(price.toFixed(6), paddingX - 5, y + 3);
    }

    // Draw vertical grid lines and time labels
    const timeStep = Math.floor(filteredHistory.length / 4);
    for (let i = 0; i < filteredHistory.length; i += timeStep) {
      if (i === 0) continue;
      const x = paddingX + (width - 2 * paddingX) * (i / (filteredHistory.length - 1));
      ctx.beginPath();
      ctx.moveTo(x, paddingY);
      ctx.lineTo(x, height - paddingY);
      ctx.stroke();
      const time = new Date(filteredHistory[i].time);
      const timeLabel = time.getHours() + ':' + time.getMinutes().toString().padStart(2, '0');
      ctx.fillStyle = '#9ca3af'; // Gray-400
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(timeLabel, x, height - paddingY + 15);
    }

    // Draw the price line
    ctx.strokeStyle = COLORS.priceLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    filteredHistory.forEach((point, i) => {
      const x = paddingX + (width - 2 * paddingX) * (i / (filteredHistory.length - 1));
      const y = paddingY + (height - 2 * paddingY) * (1 - (point.price - minPrice) / (maxPrice - minPrice));
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Create gradient fill below the line
    const gradient = ctx.createLinearGradient(0, paddingY, 0, height - paddingY);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)'); // Purple-500 with alpha
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)'); // Transparent

    ctx.fillStyle = gradient;
    ctx.beginPath();

    // Start from the bottom left
    ctx.moveTo(paddingX, height - paddingY);

    // Draw the same line as above
    filteredHistory.forEach((point, i) => {
      const x = paddingX + (width - 2 * paddingX) * (i / (filteredHistory.length - 1));
      const y = paddingY + (height - 2 * paddingY) * (1 - (point.price - minPrice) / (maxPrice - minPrice));
      ctx.lineTo(x, y);
    });

    // Complete the path to the bottom right and fill
    ctx.lineTo(width - paddingX, height - paddingY);
    ctx.closePath();
    ctx.fill();

    // Draw price points
    filteredHistory.forEach((point, i) => {
      const x = paddingX + (width - 2 * paddingX) * (i / (filteredHistory.length - 1));
      const y = paddingY + (height - 2 * paddingY) * (1 - (point.price - minPrice) / (maxPrice - minPrice));
      ctx.fillStyle = COLORS.price;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw the current price label
    if (filteredHistory.length > 0) {
      const latestPoint = filteredHistory[filteredHistory.length - 1];
      const x = width - paddingX;
      const y = paddingY + (height - 2 * paddingY) * (1 - (latestPoint.price - minPrice) / (maxPrice - minPrice));

      // Background for price tag
      ctx.fillStyle = 'rgba(139, 92, 246, 0.3)'; // Semi-transparent purple
      ctx.beginPath();

      // Use roundRect if available, or fallback to rect
      if (ctx.roundRect) {
        ctx.roundRect(x + 5, y - 10, 75, 20, 5);
      } else {
        ctx.rect(x + 5, y - 10, 75, 20);
      }
      ctx.fill();

      // Price text
      ctx.fillStyle = '#ffffff'; // White text
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(latestPoint.price.toFixed(8), x + 10, y + 4);
    }
  };

  // Handle time range changes
  const handleTimeRangeChange = (newRange: '1h' | '4h' | '24h') => {
    setTimeRange(newRange);
  };

  // Fetch market data on mount
  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Redraw chart when price history or time range changes
  useEffect(() => {
    drawChart();
  }, [priceHistory, timeRange]);

  // Redraw chart on window resize
  useEffect(() => {
    const handleResize = () => {
      drawChart();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [priceHistory]);

  // Format sentiment as percentage
  const formatSentiment = (value: number): string => `${(value * 100).toFixed(1)}%`;

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
            <div className="text-sm text-gray-400">NURO Price Chart</div>
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

          <div className="h-64 w-full relative">
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
          </div>

          <div className="border-t border-gray-800 my-4"></div>

          {marketData.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Market Sentiment</div>
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