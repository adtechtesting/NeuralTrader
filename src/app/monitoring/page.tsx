'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  MemoryStick,
  Users,
  RefreshCw,
  AlertTriangle,
  Zap,
  Home,
  Activity,
  List,
  ChevronLeft,
  ChevronRight, 
  TrendingDown
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import {toast} from "sonner"
import { cn } from '@/lib/utils';
import { Spotlight } from '@/components/ui/spotlight';
import { LightRays } from '@/components/ui/lightrays';
import { StripedPattern } from '@/components/ui/strippedpattern';

// Dynamically import components
const SimulationControls = dynamic(
  () => import('@/components/SimulationControls'),
  { ssr: false, loading: () => (
    <div className="h-24 w-full flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
    </div>
  )}
);

interface Transaction {
  id: string;
  type: string;
  amount: number;
  price?: number; // ✅ Optional since it's in details
  priceImpact: number;
  timestamp?: number; // ✅ Optional
  createdAt?: Date | string; // ✅ Add this
  agentId?: string;
  tokenAmount?: number; // ✅ Add this
  agent?: {
    name?: string;
    displayName?: string;
    personalityType?: string;
    avatarUrl?: string;
  };
  fromAgent?: { // ✅ Add this
    name?: string;
    personalityType?: string;
  };
  details?: { // ✅ Add this
    price?: number;
    side?: string;
    inputAmount?: number;
    outputAmount?: number;
  };
}

interface SimulationStatus {
  status: string;
  currentPhase: string;
  phaseProgress: number;
  agentCount: number;
  activeAgentCount: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
    warning: boolean;
  };
  market?: {
    price: number;
    solReserve: number;
    tokenReserve: number;
    volume24h: number;
    high24h: number;
    low24h: number;
    operationCount: number;
    successRate: number;
    error?: string;
    message?: string;
  };
  simulationSpeed: number;
  timestamp: number;
}

const MarketVisualization = dynamic(
  () => import('@/components/MarketVisualization'),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-[600px] w-full bg-neutral-950/80 backdrop-blur-xl rounded-xl border border-white/10 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    )
  }
);

const AMMVisualization = dynamic(
  () => import('@/components/AMMVisualization'),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-[500px] w-full bg-neutral-950/80 backdrop-blur-xl rounded-xl border border-white/10 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    )
  }
);

const ChatSection = dynamic(
  () => import('@/components/chat/ChatSection'),
  { ssr: false }
);

interface TokenData {
  symbol: string;
  name: string;
  usdPrice?: number;
  priceChange24h?: number;
  volume24h?: number;
  mcap?: number;
}

type TabType = 'home' | 'amm' | 'trades';

export default function MonitoringPage() {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshRate, setRefreshRate] = useState(2000);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string>('TOKEN');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const {connected} = useWallet();
  const router = useRouter();

  useEffect(() => {
    if(!connected) {
      router.push("/");
      toast.warning("Please connect your Solana Wallet to track simulation");
    }
  }, [connected, router]);

   const formatNumber = (num: number | undefined | null, decimals: number = 2): string => {
    if (num === undefined || num === null) return '0.00';
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatTime = (timestamp: number): string => {
    if (!timestamp || isNaN(timestamp)) return 'N/A';
    try {
      const timeMs = String(timestamp).length <= 10 ? timestamp * 1000 : timestamp;
      const date = new Date(timeMs);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleTimeString();
    } catch (error) {
      return 'N/A';
    }
  };

  const formatPhase = (phase?: string | null): string => {
    if (!phase) return 'N/A';
    return phase.replace(/_/g, ' ');
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch token data
      try {
        const tokenResponse = await fetch('/api/simulation/config');
        if (tokenResponse.ok) {
          const tokenConfig = await tokenResponse.json();
          if (tokenConfig.selectedToken) {
            setTokenData(tokenConfig.selectedToken);
            setTokenSymbol(tokenConfig.selectedToken.symbol || 'TOKEN');
          }
        }
      } catch (err) {
        console.log('Could not fetch token config');
      }

      // Fetch pool state
      let poolState = null;
      try {
        const poolResponse = await fetch('/api/pool/state');
        if (poolResponse.ok) {
          const poolData = await poolResponse.json();
          if (poolData.success) {
            poolState = poolData.poolState.current;
          }
        }
      } catch (err) {
        console.log('Could not fetch pool state');
      }

      const statusResponse = await fetch('/api/simulation');
      if (!statusResponse.ok) {
        throw new Error(`Failed to fetch simulation status`);
      }
      const statusData = await statusResponse.json();

      if (poolState && !poolState.error) {
        statusData.market = {
          ...statusData.market,
          solReserve: poolState.solReserve,
          tokenReserve: poolState.tokenReserve,
          volume24h: poolState.volume24h,
          price: poolState.lastPrice,
          totalLiquidity: poolState.totalLiquidity
        };
      }

      setSimulationStatus(statusData);

      const tradesResponse = await fetch('/api/transactions?limit=50');
      if (!tradesResponse.ok) {
        throw new Error(`Failed to fetch transactions`);
      }
      const tradesData = await tradesResponse.json();
      
      // ✅ Handle both array response and object with transactions array
      if (Array.isArray(tradesData)) {
        setTransactions(tradesData);
      } else if (tradesData.success && Array.isArray(tradesData.transactions)) {
        setTransactions(tradesData.transactions);
      } else {
        setTransactions([]);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(loadData, refreshRate);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshRate, loadData]);

  const tabs = [
    { id: 'home' as TabType, label: 'Overview', icon: Home },
    { id: 'amm' as TabType, label: 'AMM Pool', icon: Activity },
    { id: 'trades' as TabType, label: 'Trades', icon: List }
  ];


  return (
    <div className="min-h-screen bg-black text-white">
       
            
                           
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 -left-32 w-[500px] h-[500px] rounded-full bg-white opacity-[0.02] blur-[120px]" />
        <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-white opacity-[0.02] blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-white opacity-[0.015] blur-[110px]" />
      </div>

      {/* Main Layout */}
      <div className="flex h-screen pt-20 relative">
        {/* Collapsible Sidebar */}
        <motion.aside
          initial={false}
          animate={{ 
            width: sidebarOpen ? 280 : 72 
          }}
          transition={{ 
            duration: 0.3, 
            ease: [0.4, 0, 0.2, 1] 
          }}
          className="bg-neutral-950/80 backdrop-blur-xl border-r border-white/10 shrink-0 flex flex-col relative z-10"
        >
          {/* Sidebar Header */}
          <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <AnimatePresence mode="wait">
              {sidebarOpen && (
                <motion.h2
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-bold text-white uppercase tracking-wider"
                >
                  Navigation
                </motion.h2>
              )}
            </AnimatePresence>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors ml-auto"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <motion.div
                animate={{ rotate: sidebarOpen ? 0 : 180 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronLeft size={18} className="text-white/80" />
              </motion.div>
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative overflow-hidden",
                  activeTab === tab.id
                    ? "bg-white/10 text-white shadow-lg"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white/5 rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <tab.icon size={20} className="shrink-0 relative z-10" />
                <AnimatePresence mode="wait">
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="font-semibold text-sm whitespace-nowrap relative z-10"
                    >
                      {tab.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-white/10 shrink-0">
            <AnimatePresence mode="wait">
              {sidebarOpen ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Last Update</span>
                    <span className="text-white/70 font-mono">{lastUpdate?.toLocaleTimeString() || '--:--:--'}</span>
                  </div>
                  {loading && (
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Syncing data...</span>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin text-white/60" />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-black">
          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mx-6 mt-4 shrink-0"
              >
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <span className="text-red-300 text-sm">{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-red-400 hover:text-red-300"
                  >
                    <span className="sr-only">Dismiss</span>
                    ×
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto" >
            <div className="p-6 max-w-[1800px] mx-auto space-y-10">
              <AnimatePresence mode="wait">
                {activeTab === 'home' && (
                  <motion.div
                    key="home"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    {/* Page Header */}
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between ">
                      <div className="space-y-2">
                        <h1 className="text-4xl font-bold">Simulation Center</h1>
                        <p className="text-white/55 text-sm max-w-xl">Orchestrate real-time agent trading, AMM liquidity, and telemetry from a single control surface.</p>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs sm:text-sm">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
                          loading ? 'border-white/15 bg-white/5 text-white/70' : 'border-white/10 bg-white/5 text-white/80'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-white/70 animate-pulse' : 'bg-white'}`} />
                          <span className="font-semibold tracking-wide">
                            {loading ? 'Syncing' : 'Live'}
                          </span>
                        </div>
                        <div className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/55 font-mono">
                          {lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--:--'}
                        </div>
                      </div>
                    </div>

                    {/* Simulation Controls */}
                    <SimulationControls onDataRefresh={loadData} />

                    {/* Market Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                      {[
                        { icon: Users, label: "Active Agents", value: `${simulationStatus?.activeAgentCount || 0} / ${simulationStatus?.agentCount || 0}`, subtitle: "Currently trading" },
                        { icon: TrendingUp, label: `${tokenData?.symbol || (simulationStatus?.market?.error ? 'No Token Selected' : 'TOKEN')} Price`, value: simulationStatus?.market?.error ? 'Select Token' : `$${formatNumber(tokenData?.usdPrice || 0, 6)}`, subtitle: simulationStatus?.market?.error ? simulationStatus.market.message : `24h: ${tokenData?.priceChange24h ? (tokenData.priceChange24h >= 0 ? '+' : '') + tokenData.priceChange24h.toFixed(2) + '%' : '0.00%'}`, color: simulationStatus?.market?.error ? "red" : (tokenData?.priceChange24h && tokenData.priceChange24h >= 0 ? "green" : "red"), showChange: !simulationStatus?.market?.error },
                        { icon: Zap, label: "24h Volume", value: simulationStatus?.market?.error ? 'N/A' : `${formatNumber(simulationStatus?.market?.volume24h || 0, 2)} SOL`, subtitle: simulationStatus?.market?.error ? 'Select a token first' : "Total traded volume", color: simulationStatus?.market?.error ? "white" : (simulationStatus?.market?.volume24h && simulationStatus?.market?.volume24h > 0 ? "green" : "white") },
                        { icon: MemoryStick, label: "Liquidity Pool", value: simulationStatus?.market?.error ? 'N/A' : `${formatNumber(simulationStatus?.market?.solReserve || 0, 2)} SOL`, subtitle: simulationStatus?.market?.error ? 'Select a token first' : "Available liquidity", color: simulationStatus?.market?.error ? "white" : (simulationStatus?.market?.solReserve && simulationStatus?.market?.solReserve > 0 ? "green" : "white") },
                      ].map((stat, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="relative group"
                        >
                          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-colors relative overflow-hidden">
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-50 transition-opacity" style={{ background: 'radial-gradient(circle at top, rgba(255,255,255,0.05), transparent 60%)' }} />
                            <div className="relative flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-neutral-800 rounded-xl border border-neutral-700 flex items-center justify-center">
                                  <stat.icon className="text-white w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-white/45 text-[11px] uppercase tracking-[0.3em]">{stat.label}</p>
                                </div>
                              </div>
                              {stat.showChange && tokenData?.priceChange24h !== undefined && (
                                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                                  tokenData.priceChange24h >= 0
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {tokenData.priceChange24h >= 0 ? (
                                    <TrendingUp className="w-3 h-3" />
                                  ) : (
                                    <TrendingDown className="w-3 h-3" />
                                  )}
                                  {Math.abs(tokenData.priceChange24h).toFixed(2)}%
                                </div>
                              )}
                            </div>
                            <div className="relative">
                              <h3 className={`text-3xl font-semibold mb-1 ${stat.color === 'green' ? 'text-green-400' : stat.color === 'red' ? 'text-red-400' : 'text-white'}`}>
                                {stat.value}
                              </h3>
                              <p className="text-white/45 text-xs">{stat.subtitle}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Trading Chart */}
                    <motion.section
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                        <div>
                          <h2 className="text-lg font-semibold uppercase tracking-[0.3em]">Market Telemetry</h2>
                          <p className="text-xs text-white/45">Live pricing, sentiment, and liquidity signals</p>
                        </div>
                        <div className="text-xs text-white/40">Auto-refresh {autoRefresh ? `every ${(refreshRate / 1000).toFixed(0)}s` : 'disabled'}</div>
                      </div>
                      <div className="relative group">
                        <div className="absolute -inset-0.5 bg-white/5 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                        <div className="relative bg-neutral-950/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors">
                          <MarketVisualization />
                        </div>
                      </div>
                    </motion.section>
                  </motion.div>
                )}

                {activeTab === 'amm' && (
                  <motion.div
                    key="amm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                      <div>
                        <h1 className="text-4xl font-bold mb-2">AMM Liquidity Pool</h1>
                        <p className="text-white/50">Real-time liquidity distribution and pool analytics</p>
                      </div>
                      <div className="text-xs text-white/45 font-mono">Phase: {formatPhase(simulationStatus?.currentPhase)}</div>
                    </div>

                    {/* AMM Visualization */}
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-white/5 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                      <div className="relative bg-neutral-950/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl hover:border-white/20 transition-colors">
                        <AMMVisualization />
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'trades' && (
                  <motion.div
                    key="trades"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    {/* Page Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h1 className="text-4xl font-bold mb-2">Recent Transactions</h1>
                        <p className="text-white/50">All trading activity from AI agents</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 text-xs text-white/45">
                          <span className="uppercase tracking-[0.3em]">Latency</span>
                          <div className={`px-2 py-1 rounded-md border text-xs ${loading ? 'border-white/20 text-white/60' : 'border-white/10 text-white/50'}`}>
                            {lastUpdate ? `${Math.max(0, Math.round((Date.now() - lastUpdate.getTime()) / 1000))}s ago` : 'n/a'}
                          </div>
                        </div>
                        <button
                          onClick={loadData}
                          disabled={loading}
                          className="px-5 py-2.5 bg-white text-black rounded-xl hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center gap-2 text-sm"
                        >
                          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                          Refresh
                        </button>
                      </div>
                    </div>

                    {/* Transactions Table */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-neutral-800/50 border-b border-neutral-700">
        <tr>
          <th className="py-3 px-6 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Time</th>
          <th className="py-3 px-6 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Type</th>
          <th className="py-3 px-6 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Agent</th>
          <th className="py-3 px-6 text-right text-xs font-semibold text-white/60 uppercase tracking-wider">Amount</th>
          <th className="py-3 px-6 text-right text-xs font-semibold text-white/60 uppercase tracking-wider">Price</th>
          <th className="py-3 px-6 text-right text-xs font-semibold text-white/60 uppercase tracking-wider">Impact</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-800">
        {transactions.length === 0 ? (
          <tr>
            <td colSpan={6} className="py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-white/20" />
                </div>
                <div>
                  <p className="text-white/40 text-sm font-medium">No transactions yet</p>
                  <p className="text-white/30 text-xs mt-1">Transactions will appear here once simulation starts</p>
                </div>
              </div>
            </td>
          </tr>
        ) : (
          transactions.map((tx) => {
            const txType = (tx.type || '').toUpperCase();
                                const txPrice = tx.price || (tx.details as any)?.price || 0;
                                const txTimestamp = tx.timestamp || (tx.createdAt ? new Date(tx.createdAt).getTime() : Date.now());
                                const agentName = tx.agent?.name || tx.agent?.displayName || (tx.fromAgent as any)?.name || 'System';
                                const agentInitial = (agentName[0] || 'S').toUpperCase();
                             
            
            return (
              <tr
                key={tx.id}
                className="hover:bg-neutral-800/30 transition-colors"
              >
                <td className="py-3.5 px-6 text-sm text-white/70 font-mono">
                 {formatTime(txTimestamp)}
                </td>
                
                <td className="py-3.5 px-6">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold ${
                    txType === 'BUY' 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}>
                    {txType}
                  </span>
                </td>
                
                <td className="py-3.5 px-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white text-xs font-semibold">
                      {agentInitial}
                    </div>
                    <span className="text-sm text-white/80 font-medium">
                      {agentName}
                    </span>
                  </div>
                </td>
                
                <td className="py-3.5 px-6 text-sm text-white/80 text-right font-mono">
                  {txType === 'BUY' 
                    ? `${formatNumber(tx.amount, 4)} SOL` 
                    : `${formatNumber(tx.tokenAmount || 0, 2)} ${tokenSymbol || 'MET'}`
                  }
                </td>
                
                <td className="py-3.5 px-6 text-sm text-white/80 text-right font-mono">
                  {formatNumber(txPrice, 8)} SOL
                </td>
                
                <td className={`py-3.5 px-6 text-sm text-right font-mono font-semibold ${
                  (tx.priceImpact || 0) > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {(tx.priceImpact || 0) > 0 ? '+' : ''}
                  {formatNumber(tx.priceImpact || 0, 2)}%
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>

  {transactions.length > 0 && (
    <div className="bg-neutral-900 border-t border-neutral-800 px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="text-xs text-white/45">
        Showing <span className="text-white/70 font-semibold">{transactions.length}</span> recent transactions
      </div>
      <div className="text-xs text-white/45">
        Last updated {lastUpdate?.toLocaleTimeString() || '--:--:--'}
      </div>
    </div>
  )}
</div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <ChatSection />
    </div>
  );
}
