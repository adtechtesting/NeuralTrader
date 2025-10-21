
'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AMMData {
  solAmount: number;
  tokenAmount: number;
  currentPrice: number;
  tradingVolume: number;
  tradingVolume24h: number;
  lastTradedAt: string | null;
}

interface Transaction {
  signature: string;
  amount: number;
  tokenAmount: number;
  confirmedAt: string;
}

interface APIData {
  success: boolean;
  data: AMMData;
  message?: string;
  transactions?: Transaction[];
}

export default function AMMVisualization() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string>('TOKEN');
  const [ammData, setAmmData] = useState<AMMData>({
    solAmount: 0,
    tokenAmount: 0,
    currentPrice: 0,
    tradingVolume: 0,
    tradingVolume24h: 0,
    lastTradedAt: null,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);


  const formatNumber = (num: number | undefined | null, decimals = 2): string => {
    if (num === undefined || num === null) return '0.00';
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

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
 
  const fetchAmmData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/amm-stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: APIData = await response.json();

      if (data.success) {
        setAmmData({
          solAmount: data.data.solAmount || 0,
          tokenAmount: data.data.tokenAmount || 0,
          currentPrice: data.data.currentPrice || 0,
          tradingVolume: data.data.tradingVolume || 0,
          tradingVolume24h: data.data.tradingVolume24h || 0,
          lastTradedAt: data.data.lastTradedAt || null,
        });
        setTransactions(data.transactions || []);
        setError(null);
      } else {
        setError(data.message || 'Failed to load AMM data');
        useSampleData();
      }
    } catch (err) {
      console.error('Error fetching AMM data:', err);
      setError('Failed to fetch AMM data. Using sample data.');
      useSampleData();
    } finally {
      setLoading(false);
    }
  };


  const useSampleData = () => {
    setAmmData({
      solAmount: 1000 + Math.random() * 500,
      tokenAmount: 10000000 + Math.random() * 5000000,
      currentPrice: 0.0001 + Math.random() * 0.0001,
      tradingVolume: 250 + Math.random() * 100,
      tradingVolume24h: 1200 + Math.random() * 500,
      lastTradedAt: new Date().toISOString(),
    });

   
    const sampleTransactions: Transaction[] = [];
    for (let i = 0; i < 5; i++) {
      sampleTransactions.push({
        signature: `Sample${Math.random().toString(36).substring(2, 10)}`,
        amount: 1 + Math.random() * 10,
        tokenAmount: 1000 + Math.random() * 5000,
        confirmedAt: new Date(Date.now() - i * 1000 * 60 * 5).toISOString(), 
      });
    }
    setTransactions(sampleTransactions);
  };

  
  useEffect(() => {
    fetchTokenSymbol();
    fetchAmmData();
    const interval = setInterval(fetchAmmData, 10000);
    return () => clearInterval(interval);
  }, []);


  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };


  const shortenSignature = (signature: string | null): string => {
    if (!signature) return 'N/A';
    if (signature.length <= 12) return signature;
    return `${signature.substring(0, 6)}...${signature.substring(signature.length - 6)}`;
  };


  const preparePieChartData = () => {
    const tokenValueInSol = ammData.tokenAmount * ammData.currentPrice;
    const total = ammData.solAmount + tokenValueInSol;
    
    if (total === 0) {
      return [
        { name: 'No Data', value: 1 }
      ];
    }
    
    return [
      { name: 'SOL', value: ammData.solAmount },
      { name: tokenSymbol, value: tokenValueInSol }
    ];
  };

 
  const COLORS = ['#8b5cf6', '#6366f1']; 


  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / (ammData.solAmount + ammData.tokenAmount * ammData.currentPrice)) * 100).toFixed(1);
      
      return (
        <div className="bg-gray-800 p-2 rounded border border-gray-700 shadow-lg text-sm">
          <p className="font-medium text-white">{`${data.name}: ${formatNumber(data.value, 2)} SOL`}</p>
          <p className="text-gray-300">{`${percentage}% of pool`}</p>
        </div>
      );
    }
    return null;
  };


  const handleRefresh = () => {
    fetchAmmData();
  };

  return (
    <div className="w-full h-full text-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">AMM Pool Statistics</h2>
        <button 
          onClick={handleRefresh}
          className="flex items-center gap-1 text-xs bg-purple-900/40 hover:bg-purple-800/50 text-purple-200 py-1 px-3 rounded-md transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-purple-900/30 border border-purple-800 text-purple-200 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-purple-300 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-6 h-64 bg-gray-900/30 rounded-lg border border-gray-800">
          <div className="animate-pulse flex flex-col items-center space-y-3">
            <div className="flex space-x-2">
              <div className="h-3 w-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="h-3 w-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="h-3 w-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <div className="text-sm text-purple-300">Loading pool data...</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left side - Chart */}
          <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4 top-10">
            <div className="text-sm text-gray-400 mb-2 font-medium">Pool Distribution</div>
            <div className="h-56 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={preparePieChartData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    {preparePieChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                 
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="text-white font-medium text-lg">
                  {formatNumber(ammData.solAmount + ammData.tokenAmount * ammData.currentPrice, 2)}
                </div>
                <div className="text-gray-400 text-xs">Total SOL</div>
              </div>
            </div>
          </div>

          {/* Right side - Stats */}
          <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4">
            <div className="text-sm text-gray-400  font-medium">Pool Statistics</div>
            <div className="grid grid-cols-2 gap-2 mb-6">
              <div className="bg-gray-800/50 p-3 rounded-md border border-gray-700/50">
                <div className="text-xs text-gray-400 mb-1">SOL Reserve</div>
                <div className="text-white font-medium">{formatNumber(ammData.solAmount, 4)} SOL</div>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-md border border-gray-700/50">
                <div className="text-xs text-gray-400 mb-1">{tokenSymbol} Reserve</div>
                <div className="text-white font-medium">{formatNumber(ammData.tokenAmount, 0)} {tokenSymbol}</div>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-md border border-gray-700/50">
                <div className="text-xs text-gray-400 mb-1">Current Price</div>
                <div className="text-white font-medium">{formatNumber(ammData.currentPrice, 8)} SOL</div>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-md border border-gray-700/50">
                <div className="text-xs text-gray-400 mb-1">24h Volume</div>
                <div className="text-white font-medium">{formatNumber(ammData.tradingVolume24h, 2)} SOL</div>
              </div>
              <div className="col-span-2 bg-gray-800/50 p-3 rounded-md border border-gray-700/50">
                <div className="text-xs text-gray-400 mb-1">Last Traded</div>
                <div className="text-white font-medium">{ammData.lastTradedAt ? formatDate(ammData.lastTradedAt) : 'N/A'}</div>
              </div>
            </div>

         
            
          </div>
       
<div className="max-h-48 overflow-y-auto pl-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent space-y-2 w-130">
   <div className="text-sm text-gray-400 mb-2 font-medium">Recent Transactions</div>

  {transactions.length === 0 ? (
    <div className="text-gray-500 text-sm italic bg-gray-800/30 p-3 rounded-md text-center">
      No recent transactions
    </div>
  ) : (
    transactions.map((txn, index) => (
      <div
        key={index}
        className="bg-gray-800/50 rounded-md p-3 text-xs border border-gray-700/50 hover:border-purple-600/50 transition-colors"
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="text-gray-400 mb-1">Signature</div>
            <div className="text-white font-mono bg-gray-900/50 px-2 py-0.5 rounded">
              {shortenSignature(txn.signature)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-gray-400 mb-1">Amount</div>
            <div className="text-white">
              <span className="text-purple-300">
                {formatNumber(txn.amount, 2)} SOL
              </span>
              {' / '}
              <span className="text-indigo-300 ml-1">
                {formatNumber(txn.tokenAmount, 0)} {tokenSymbol}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-2 text-gray-500 text-xs flex items-center">
          <span className="bg-gray-800 px-2 py-0.5 rounded-full">
            Confirmed: {formatDate(txn.confirmedAt)}
          </span>
        </div>
      </div>
    ))
  )}
</div>








        </div>
      )}
    </div>
  );
}