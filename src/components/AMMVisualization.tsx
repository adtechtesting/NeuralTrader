'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, TrendingUp, Droplets, Activity, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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
  poolState: {
    current: {
      solReserve: number;
      tokenReserve: number;
      lastPrice: number;
      totalLiquidity: number;
      volume24h: number;
      lastUpdate: number;
    };
    memory?: any;
    db?: any;
  };
  error?: string;
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
      const response = await fetch('/api/pool/state', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        // Use the current state from the API response
        const poolState = data.poolState.current;

        // ✅ Check if there's an error (no token selected)
        if (poolState.error) {
          setAmmData({
            solAmount: 0,
            tokenAmount: 0,
            currentPrice: 0,
            tradingVolume: 0,
            tradingVolume24h: 0,
            lastTradedAt: null,
          });
          setError(poolState.message || 'No token selected');
          console.log('⚠️ No token selected for AMM visualization');
        } else {
          setAmmData({
            solAmount: poolState.solReserve || 0,
            tokenAmount: poolState.tokenReserve || 0,
            currentPrice: poolState.lastPrice || 0,
            tradingVolume: poolState.totalLiquidity || 0,
            tradingVolume24h: poolState.volume24h || 0,
            lastTradedAt: poolState.lastUpdate ? new Date(poolState.lastUpdate).toISOString() : null,
          });

          setTransactions([]); // Clear transactions for now, can be enhanced later
          setError(null);

          console.log('🔄 Pool UI updated:', poolState.lastPrice);
        }
      } else {
        setError(data.error || 'Failed to load pool data');
        useSampleData();
      }
    } catch (err) {
      console.error('Error fetching pool data:', err);
      setError('Failed to fetch pool data. Using sample data.');
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
    const interval = setInterval(fetchAmmData, 2000); // Poll every 2 seconds
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
      return [{ name: 'No Data', value: 1 }];
    }
    
    return [
      { name: 'SOL', value: ammData.solAmount },
      { name: tokenSymbol, value: tokenValueInSol }
    ];
  };

  const COLORS = ['#10b981', '#6366f1'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = ammData.solAmount + ammData.tokenAmount * ammData.currentPrice;
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
      
      return (
        <div className="bg-neutral-900 border border-neutral-700 p-3 rounded-lg shadow-xl">
          <p className="font-semibold text-white text-sm mb-1">{data.name}</p>
          <p className="text-white/80 text-sm">{formatNumber(data.value, 4)} SOL</p>
          <p className="text-white/60 text-xs mt-1">{percentage}% of pool</p>
        </div>
      );
    }
    return null;
  };

  const handleRefresh = () => {
    fetchAmmData();
  };

  const totalPoolValue = ammData.solAmount + (ammData.tokenAmount * ammData.currentPrice);

  return (
    <div className="w-full text-white space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Liquidity Pool</h2>
          <p className="text-sm text-white/50 mt-1">Real-time pool analytics and distribution</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 text-sm bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-white py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center p-16 bg-neutral-900 rounded-xl border border-neutral-800">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="text-sm text-white/60">Loading pool data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Top Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { 
                icon: Droplets, 
                label: "Total Liquidity", 
                value: `${formatNumber(totalPoolValue, 2)} SOL`,
                color: "text-blue-400"
              },
              { 
                icon: Activity, 
                label: "24h Volume", 
                value: `${formatNumber(ammData.tradingVolume24h, 2)} SOL`,
                color: "text-green-400"
              },
              { 
                icon: TrendingUp, 
                label: "Current Price", 
                value: `${formatNumber(ammData.currentPrice, 8)} SOL`,
                color: "text-purple-400"
              },
              { 
                icon: Clock, 
                label: "Last Trade", 
                value: ammData.lastTradedAt ? new Date(ammData.lastTradedAt).toLocaleTimeString() : 'N/A',
                color: "text-orange-400"
              }
            ].map((stat, i) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-white/50 font-medium uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-lg font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Pool Distribution & Reserves */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pool Distribution Chart */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wider">Pool Distribution</h3>
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={preparePieChartData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {preparePieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className="text-2xl font-bold text-white">{formatNumber(totalPoolValue, 2)}</div>
                  <div className="text-xs text-white/50">Total Value</div>
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-white/70">SOL ({formatNumber((ammData.solAmount / totalPoolValue) * 100, 1)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                  <span className="text-sm text-white/70">{tokenSymbol} ({formatNumber(((ammData.tokenAmount * ammData.currentPrice) / totalPoolValue) * 100, 1)}%)</span>
                </div>
              </div>
            </div>

            {/* Pool Reserves */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wider">Pool Reserves</h3>
              <div className="space-y-4">
                {/* SOL Reserve */}
                <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">SOL Reserve</span>
                    <span className="text-xs text-green-400 font-semibold">
                      {formatNumber((ammData.solAmount / totalPoolValue) * 100, 1)}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">{formatNumber(ammData.solAmount, 4)} SOL</div>
                  <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${(ammData.solAmount / totalPoolValue) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Token Reserve */}
                <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">{tokenSymbol} Reserve</span>
                    <span className="text-xs text-indigo-400 font-semibold">
                      {formatNumber(((ammData.tokenAmount * ammData.currentPrice) / totalPoolValue) * 100, 1)}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">{formatNumber(ammData.tokenAmount, 0)}</div>
                  <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${((ammData.tokenAmount * ammData.currentPrice) / totalPoolValue) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* K Constant */}
                <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                  <div className="text-sm text-white/60 mb-1">Constant Product (K)</div>
                  <div className="text-lg font-bold text-white font-mono">
                    {formatNumber(ammData.solAmount * ammData.tokenAmount, 0)}
                  </div>
                  <p className="text-xs text-white/40 mt-1">x * y = k (AMM formula)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Recent Transactions</h3>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="p-12 text-center">
                  <Activity className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No recent transactions</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-800">
                  {transactions.map((txn, index) => (
                    <div key={index} className="p-4 hover:bg-neutral-800/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-white/40">Signature:</span>
                            <code className="text-xs font-mono bg-neutral-800 px-2 py-1 rounded text-white/80">
                              {shortenSignature(txn.signature)}
                            </code>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="text-white/60">SOL: </span>
                              <span className="font-semibold text-white">{formatNumber(txn.amount, 4)}</span>
                            </div>
                            <div className="text-white/40">⇄</div>
                            <div>
                              <span className="text-white/60">{tokenSymbol}: </span>
                              <span className="font-semibold text-white">{formatNumber(txn.tokenAmount, 2)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-white/40 mb-1">Confirmed</div>
                          <div className="text-xs font-mono text-white/70">{new Date(txn.confirmedAt).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
