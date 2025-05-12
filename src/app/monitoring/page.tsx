/*'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 

  TrendingUp, 
  TrendingDown,
  Gauge,
  MemoryStick,
  Users,
  RefreshCw,
  Clock,
  AlertTriangle,
  MessageCircle
} from 'lucide-react';

// Dynamically import heavy components with no SSR
const SimulationControls = dynamic(
  () => import('@/components/SimulationControls'),
  { ssr: false, loading: () => <div className="h-24 w-full flex items-center justify-center">
    <div className="animate-pulse flex space-x-2">
      <div className="h-3 w-3 bg-purple-400 rounded-full"></div>
      <div className="h-3 w-3 bg-purple-500 rounded-full"></div>
      <div className="h-3 w-3 bg-purple-600 rounded-full"></div>
    </div>
  </div> }
);

// Types
interface Transaction {
  id: string;
  type: string;
  amount: number;
  price: number;
  priceImpact: number;
  timestamp: number;
  agentId?: string;
  agent?: {
    displayName: string;
    personalityType: string;
    avatarUrl: string;
  }
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
  };
  agents?: {
    totalAgents: number;
    activeAgents: number;
  };
  simulationSpeed: number;
  timestamp: number;
}

const MarketVisualization = dynamic(
  () => import('@/components/MarketVisualization'),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-80 w-full bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800/50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <TrendingUp className="h-12 w-12 text-purple-400 mb-4" />
          <div className="h-4 w-48 bg-purple-800/50 rounded mb-3"></div>
          <div className="h-3 w-32 bg-purple-800/30 rounded"></div>
        </div>
      </div>
    )
  }
);

const AMMVisualization = dynamic(
  () => import('@/components/AMMVisualization'),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-80 w-full bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800/50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <MemoryStick className="h-12 w-12 text-purple-400 mb-4" />
          <div className="h-4 w-64 bg-purple-800/50 rounded mb-3"></div>
          <div className="h-3 w-40 bg-purple-800/30 rounded"></div>
        </div>
      </div>
    )
  }
);

const ChatSection = dynamic(
  () => import('@/components/chat/ChatSection'),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-60 w-full bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800/50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <MessageCircle className="h-12 w-12 text-purple-400 mb-4" />
          <div className="h-4 w-40 bg-purple-800/50 rounded mb-3"></div>
          <div className="h-3 w-32 bg-purple-800/30 rounded"></div>
        </div>
      </div>
    )
  }
);

export default function MonitoringPage() {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshRate, setRefreshRate] = useState(3000);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null); // Add error state

  const formatNumber = (num: number | undefined | null, decimals: number = 2): string => {
    if (num === undefined || num === null) return '0.00';
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getDirectionColor = (value: number): string => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get simulation status
      const statusResponse = await fetch('/api/simulation');
      if (!statusResponse.ok) {
        throw new Error(
          `Failed to fetch simulation status: ${statusResponse.status} ${statusResponse.statusText}`
        );
      }
      const statusData = await statusResponse.json();
      setSimulationStatus(statusData);

      // Get recent trades
      const tradesResponse = await fetch('/api/transactions?limit=10');
      if (!tradesResponse.ok) {
        throw new Error(
          `Failed to fetch transactions: ${tradesResponse.status} ${tradesResponse.statusText}`
        );
      }
      const tradesData = await tradesResponse.json();
      if (tradesData.success) {
        setTransactions(tradesData.transactions || []);
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

  const getStatusChip = () => {
    if (!simulationStatus) return (
      <span className="px-3 py-1 rounded-full bg-gray-700 text-gray-300 text-xs font-medium">
        Unknown
      </span>
    );

    switch (simulationStatus.status) {
      case 'RUNNING':
        return (
          <span className="px-3 py-1 rounded-full bg-green-900/60 text-green-300 text-xs font-medium flex items-center">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            Running
          </span>
        );
      case 'PAUSED':
        return (
          <span className="px-3 py-1 rounded-full bg-yellow-900/60 text-yellow-300 text-xs font-medium">
            Paused
          </span>
        );
      case 'STOPPED':
        return (
          <span className="px-3 py-1 rounded-full bg-red-900/60 text-red-300 text-xs font-medium">
            Stopped
          </span>
        );
      case 'ERROR':
        return (
          <span className="px-3 py-1 rounded-full bg-red-900/60 text-red-300 text-xs font-medium flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Error
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-gray-700 text-gray-300 text-xs font-medium">
            {simulationStatus.status}
          </span>
        );
    }
  };

  const getPhaseDisplay = () => {
    if (!simulationStatus) return null;

    let phaseLabel = simulationStatus.currentPhase;
    if (phaseLabel) {
      phaseLabel = phaseLabel.replace(/_/g, ' ');
      phaseLabel = phaseLabel.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }

    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm text-gray-400">
          Current Phase
        </span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-medium text-white">{phaseLabel}</span>
          <div className="flex-1 h-2 min-w-24 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${simulationStatus.phaseProgress}%` }}
            ></div>
          </div>
          <span className="text-sm text-gray-300">
            {simulationStatus.phaseProgress}%
          </span>
        </div>
      </div>
    );
  };
  
  
  return (
    <div className="min-h-screen bg-black  overflow-hidden relative p-20">
       
      <div className="absolute top-0 right-0 w-px h-screen bg-purple-800/20"></div>
      <div className="absolute top-1/3 left-0 w-screen h-px bg-purple-800/20"></div>
      <div className="absolute bottom-1/4 right-0 w-screen h-px bg-purple-800/20"></div>
      
      
      
      <main className="container mx-auto px-6 py-8">


         {error && (
          <div className="mb-8 bg-red-900/30 backdrop-blur-sm rounded-lg border border-red-800/50 p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        <div className="mb-8 bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800/50 p-6">
          <SimulationControls onDataRefresh={loadData} />
        </div>

        {loading && (
          <div className="w-full h-1 bg-gray-800 mb-6 overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse-x"></div>
          </div>
        )}
        

        <div className="mb-8 bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800/50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <span className="text-white font-medium">Status:</span>
              {getStatusChip()}
            </div>
            
            <div>
              {getPhaseDisplay()}
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-gray-300">
                <Gauge className="w-4 h-4 text-purple-400" />
                <span>
                  Speed: <span className="text-white font-medium">{simulationStatus?.simulationSpeed || 1}x</span>
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-300">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-sm">
                  Last update: {lastUpdate?.toLocaleTimeString() || 'Never'}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-400">
                Memory Usage
              </span>
              <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    (simulationStatus?.memoryUsage?.warning ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500')
                  }`}
                  style={{ width: `${simulationStatus?.memoryUsage?.percentage || 0}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-300">
                {simulationStatus?.memoryUsage?.used || 0} MB / {simulationStatus?.memoryUsage?.total || 0} MB
                ({simulationStatus?.memoryUsage?.percentage || 0}%)
              </span>
            </div>
          </div>
        </div>
        
      
        {simulationStatus?.memoryUsage?.warning && (
          <div className="mb-8 bg-red-900/30 backdrop-blur-sm rounded-lg border border-red-800/50 p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-200">
              High memory usage detected. Consider reducing the number of active agents or closing unused applications.
            </span>
          </div>
        )}
        

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
    
          <div className="bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800/50 p-6 transition-all hover:border-purple-800/50">
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-400">Agents</span>
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {simulationStatus?.activeAgentCount || 0} / {simulationStatus?.agentCount || 0}
            </div>
            <span className="text-sm text-gray-400">
              Active / Total
            </span>
          </div>
          

          <div className="bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800/50 p-6 transition-all hover:border-purple-800/50">
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-400">NURO Token Price</span>
              {simulationStatus?.market?.price && simulationStatus.market.price > 0 ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatNumber(simulationStatus?.market?.price || 0, 8)} SOL
            </div>
            <div className="text-sm">
              24h: <span className="text-green-400">High {formatNumber(simulationStatus?.market?.high24h || 0, 8)}</span> / <span className="text-red-400">Low {formatNumber(simulationStatus?.market?.low24h || 0, 8)}</span>
            </div>
          </div>
          

          <div className="bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800/50 p-6 transition-all hover:border-purple-800/50">
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-400">24h Trading Volume</span>
              <RefreshCw className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatNumber(simulationStatus?.market?.volume24h || 0)} SOL
            </div>
            <span className="text-sm text-gray-400">
              {simulationStatus?.market?.operationCount || 0} trades ({((simulationStatus?.market?.successRate || 0) * 100).toFixed(1)}% success)
            </span>
          </div>
     
          <div className="bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800/50 p-6 transition-all hover:border-purple-800/50">
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-400">Liquidity Pool</span>
              <MemoryStick className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatNumber(simulationStatus?.market?.solReserve || 0)} SOL
            </div>
            <span className="text-sm text-gray-400">
              {formatNumber(simulationStatus?.market?.tokenReserve || 0)} NURO
            </span>
          </div>
        </div>
        
      
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800/50 p-6 transition-all hover:border-purple-800/50">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Market Activity
            </h3>
            <div className="h-80">
              <MarketVisualization />
            </div>
          </div>
          
          <div className="bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800/50 p-6 transition-all hover:border-purple-800/50">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <MemoryStick className="w-5 h-5 text-purple-400" />
              Liquidity Distribution
            </h3>
            <div className="h-100">
              <AMMVisualization />
            </div>
          </div>
        </div>
        

        <div className="mb-8 bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800/50 pb-10 ">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-white py-4">Recent Transactions</h3>
            <button 
              onClick={loadData}
              className="px-3 py-1 rounded-md bg-purple-900/30 border border-purple-800/50 text-purple-400 text-sm font-medium hover:bg-purple-800/30 transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Agent</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Price Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No transactions yet
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/5">
                      <td className="py-3 px-4 text-sm text-gray-300">{formatTime(tx.timestamp)}</td>
                      <td className="py-3 px-4">
                        <span 
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.type === 'buy' 
                              ? 'bg-green-900/60 text-green-300' 
                              : 'bg-red-900/60 text-red-300'
                          }`}
                        >
                          {tx.type === 'buy' ? 'BUY' : 'SELL'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300">
                        {tx.agent ? tx.agent.displayName : 'System'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300 text-right">
                        {formatNumber(tx.amount)} {tx.type === 'buy' ? 'SOL' : 'NURO'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300 text-right">
                        {formatNumber(tx.price, 8)} SOL
                      </td>
                      <td className={`py-3 px-4 text-sm text-right ${getDirectionColor(tx.priceImpact)}`}>
                        {(tx.priceImpact * 100).toFixed(4)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      
     
    
       
      

      <footer className="border-t border-gray-800/50 py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
              <span className="text-sm font-medium text-white">
                NeuralTraders
              </span>
            </div>
            
            <div className="text-gray-500 text-xs">
              © {new Date().getFullYear()} NeuralTraders. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
      
   
      <style jsx global>{`
        @keyframes pulse-x {
          0%, 100% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(300%);
          }
        }
        .animate-pulse-x {
          animation: pulse-x 2s ease-in-out infinite;
        }
      `}</style>
            <ChatSection />
    </div>
  );
}
  */
 'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion'; // Added motion import
import { 
  TrendingUp, 
  TrendingDown,
  Gauge,
  MemoryStick,
  Users,
  RefreshCw,
  Clock,
  AlertTriangle,
  MessageCircle,
  Search,
  ChevronDown,
  BarChart3,
  Zap,
  X
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import {toast} from "sonner"

// Dynamically import heavy components with no SSR
const SimulationControls = dynamic(
  () => import('@/components/SimulationControls'),
  { ssr: false, loading: () => <div className="h-24 w-full flex items-center justify-center">
    <div className="animate-pulse flex space-x-2">
      <div className="h-3 w-3 bg-purple-400 rounded-full"></div>
      <div className="h-3 w-3 bg-purple-500 rounded-full"></div>
      <div className="h-3 w-3 bg-purple-600 rounded-full"></div>
    </div>
  </div> }
);

// Types
interface Transaction {
  id: string;
  type: string;
  amount: number;
  price: number;
  priceImpact: number;
  timestamp: number;
  agentId?: string;
  agent?: {
    displayName: string;
    personalityType: string;
    avatarUrl: string;
  }
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
  };
  agents?: {
    totalAgents: number;
    activeAgents: number;
  };
  simulationSpeed: number;
  timestamp: number;
}

const MarketVisualization = dynamic(
  () => import('@/components/MarketVisualization'),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-110 w-full bg-black/60 backdrop-blur-sm rounded-lg border border-purple-900/50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <TrendingUp className="h-12 w-12 text-purple-400 mb-4" />
          <div className="h-4 w-48 bg-purple-800/50 rounded mb-3"></div>
          <div className="h-3 w-32 bg-purple-800/30 rounded"></div>
        </div>
      </div>
    )
  }
);

const AMMVisualization = dynamic(
  () => import('@/components/AMMVisualization'),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-150 w-full bg-black/60 backdrop-blur-sm rounded-lg border border-purple-900/50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <MemoryStick className="h-12 w-12 text-purple-400 mb-4" />
          <div className="h-4 w-64 bg-purple-800/50 rounded mb-3"></div>
          <div className="h-3 w-40 bg-purple-800/30 rounded"></div>
        </div>
      </div>
    )
  }
);

const ChatSection = dynamic(
  () => import('@/components/chat/ChatSection'),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-60 w-full bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-800/50 flex items-center justify-center relative">
        <div className="animate-pulse flex flex-col items-center">
          <MessageCircle className="h-12 w-12 text-purple-400 mb-4" />
          <div className="h-4 w-40 bg-purple-800/50 rounded mb-3"></div>
          <div className="h-3 w-32 bg-purple-800/30 rounded"></div>
        </div>
      </div>
    )
  })

export default function MonitoringPage() {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshRate, setRefreshRate] = useState(3000);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {connected}=useWallet()

  const router=useRouter()


   useEffect(()=>{
     if(!connected){
       router.push("/")
       toast.warning("Please connect your Solana Wallet to track simulation")
     }
   },[connected,loading])

  const formatNumber = (num: number | undefined | null, decimals: number = 2): string => {
    if (num === undefined || num === null) return '0.00';
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatTime = (timestamp: number|Date |number): string => {
    const date=new Date(timestamp)
    if(isNaN(date.getTime())) return "Invalid Date"
    return date.toLocaleTimeString()
  };

  const getDirectionColor = (value: number): string => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get simulation status
      const statusResponse = await fetch('/api/simulation');
      if (!statusResponse.ok) {
        throw new Error(
          `Failed to fetch simulation status: ${statusResponse.status} ${statusResponse.statusText}`
        );
      }
      const statusData = await statusResponse.json();
      setSimulationStatus(statusData);

      // Get recent trades
      const tradesResponse = await fetch('/api/transactions?limit=10');
      if (!tradesResponse.ok) {
        throw new Error(
          `Failed to fetch transactions: ${tradesResponse.status} ${tradesResponse.statusText}`
        );
      }
      const tradesData = await tradesResponse.json();
      if (tradesData.success) {
        setTransactions(tradesData.transactions || []);
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

  const getStatusChip = () => {
    if (!simulationStatus) return (
      <span className="px-3 py-1 rounded-full bg-gray-700 text-gray-300 text-xs font-medium">
        Unknown
      </span>
    );

    switch (simulationStatus.status) {
      case 'RUNNING':
        return (
          <span className="px-3 py-1 rounded-full bg-green-900/60 text-green-300 text-xs font-medium flex items-center">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            Running
          </span>
        );
      case 'PAUSED':
        return (
          <span className="px-3 py-1 rounded-full bg-yellow-900/60 text-yellow-300 text-xs font-medium">
            Paused
          </span>
        );
      case 'STOPPED':
        return (
          <span className="px-3 py-1 rounded-full bg-red-900/60 text-red-300 text-xs font-medium">
            Stopped
          </span>
        );
      case 'ERROR':
        return (
          <span className="px-3 py-1 rounded-full bg-red-900/60 text-red-300 text-xs font-medium flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Error
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-gray-700 text-gray-300 text-xs font-medium">
            {simulationStatus.status}
          </span>
        );
    }
  };

  const getPhaseDisplay = () => {
    if (!simulationStatus) return null;

    let phaseLabel = simulationStatus.currentPhase;
    if (phaseLabel) {
      phaseLabel = phaseLabel.replace(/_/g, ' ');
      phaseLabel = phaseLabel.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }

    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm text-gray-400">
          Current Phase
        </span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-medium text-white">{phaseLabel}</span>
          <div className="flex-1 h-2 min-w-24 bg-black/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${simulationStatus.phaseProgress}%` }}
            ></div>
          </div>
          <span className="text-sm text-gray-300">
            {simulationStatus.phaseProgress}%
          </span>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-[#050008] overflow-hidden relative p-20 bg-gradient-to-br from-black to-neutral-950 ">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-radial from-[#14082f] via-[#0c0020] to-[#050008] opacity-80 z-0"></div>
        
        {/* Gradient blobs */}
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-700/20 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-indigo-700/20 blur-[100px] rounded-full"></div>
        
        {/* Grid lines */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[1px] h-screen bg-purple-700/30 transform rotate-[15deg] origin-top-right"></div>
          <div className="absolute top-0 right-1/3 w-[1px] h-screen bg-indigo-700/20 transform rotate-[25deg] origin-top-right"></div>
          <div className="absolute bottom-0 left-0 w-screen h-[1px] bg-purple-700/30 transform rotate-[3deg] origin-bottom-left"></div>
          <div className="absolute top-1/2 left-0 w-screen h-[1px] bg-indigo-700/20 transform rotate-[-3deg] origin-center-left"></div>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 relative z-10">
        <motion.div 
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-3">Simulation Monitor</h1>
          <p className="text-gray-300 text-lg">
            Real-time monitoring and control of the AI trading simulation environment
          </p>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600/50 to-red-800/50 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-300"></div>
            <div className="relative border border-red-900/50 bg-black/60 backdrop-blur-md p-6 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-red-200">{error}</span>
            </div>
          </motion.div>
        )}

        {/* Simulation Controls */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8 relative group"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-xl blur opacity-50 group-hover:opacity-70 transition duration-300"></div>
          <div className="relative border border-purple-900/50 bg-black/70 backdrop-blur-md p-6 rounded-xl shadow-xl">
            <SimulationControls onDataRefresh={loadData} />
          </div>
        </motion.div>

        {loading && (
          <div className="w-full h-1 bg-black/60 mb-6 overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse-x"></div>
          </div>
        )}
        
        {/* Status Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8 relative group"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-xl blur opacity-50 group-hover:opacity-70 transition duration-300"></div>
          <div className="relative border border-purple-900/50 bg-black/70 backdrop-blur-md p-6 rounded-xl shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <span className="text-white font-medium">Status:</span>
                {getStatusChip()}
              </div>
              
              <div>
                {getPhaseDisplay()}
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-300">
                  <Gauge className="w-4 h-4 text-purple-400" />
                  <span>
                    Speed: <span className="text-white font-medium">{simulationStatus?.simulationSpeed || 1}x</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span className="text-sm">
                    Last update: {lastUpdate?.toLocaleTimeString() || 'Never'}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-400">
                  Memory Usage
                </span>
                <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      (simulationStatus?.memoryUsage?.warning ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500')
                    }`}
                    style={{ width: `${simulationStatus?.memoryUsage?.percentage || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-300">
                  {simulationStatus?.memoryUsage?.used || 0} MB / {simulationStatus?.memoryUsage?.total || 0} MB
                  ({simulationStatus?.memoryUsage?.percentage || 0}%)
                </span>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* System warnings */}
        {simulationStatus?.memoryUsage?.warning && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-8 relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600/50 to-orange-800/50 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-300"></div>
            <div className="relative border border-red-900/50 bg-black/60 backdrop-blur-md p-4 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-red-200">
                High memory usage detected. Consider reducing the number of active agents or closing unused applications.
              </span>
            </div>
          </motion.div>
        )}
        
        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Agents Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/50 to-purple-800/50 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-300"></div>
            <div className="relative border border-purple-900/50 bg-black/60 backdrop-blur-md p-6 rounded-xl shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-700 to-indigo-900 rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-purple-900/30">
                <Users className="text-purple-200 w-6 h-6" />
              </div>
              <p className="text-gray-400 text-sm mb-1">Total Agents</p>
              <h3 className="text-3xl font-bold text-white">
                {simulationStatus?.activeAgentCount || 0} / {simulationStatus?.agentCount || 0}
              </h3>
              <p className="text-gray-400 text-sm">Active / Total</p>
            </div>
          </div>

          {/* NURO Token Price */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600/50 to-emerald-800/50 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-300"></div>
            <div className="relative border border-green-900/50 bg-black/60 backdrop-blur-md p-6 rounded-xl shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-green-700 to-emerald-900 rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-green-900/30">
                {simulationStatus?.market?.price && simulationStatus.market.price > 0 ? (
                  <TrendingUp className="text-green-200 w-6 h-6" />
                ) : (
                  <TrendingDown className="text-red-200 w-6 h-6" />
                )}
              </div>
              <p className="text-gray-400 text-sm mb-1">NURO Token Price</p>
              <h3 className="text-3xl font-bold text-green-400">
                {formatNumber(simulationStatus?.market?.price || 0, 8)} SOL
              </h3>
              <p className="text-sm text-gray-400">
                24h: <span className="text-green-400">H {formatNumber(simulationStatus?.market?.high24h || 0, 8)}</span> / 
                <span className="text-red-400">L {formatNumber(simulationStatus?.market?.low24h || 0, 8)}</span>
              </p>
            </div>
          </div>

          {/* Trading Volume */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600/50 to-blue-800/50 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-300"></div>
            <div className="relative border border-indigo-900/50 bg-black/60 backdrop-blur-md p-6 rounded-xl shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-700 to-blue-900 rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-indigo-900/30">
                <Zap className="text-indigo-200 w-6 h-6" />
              </div>
              <p className="text-gray-400 text-sm mb-1">24h Trading Volume</p>
              <h3 className="text-3xl font-bold text-white">
                {formatNumber(simulationStatus?.market?.volume24h || 0)} SOL
              </h3>
              <p className="text-sm text-gray-400">
                {simulationStatus?.market?.operationCount || 0} trades ({((simulationStatus?.market?.successRate || 0) * 100).toFixed(1)}% success)
              </p>
            </div>
          </div>

          {/* Liquidity Pool */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600/50 to-orange-800/50 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-300"></div>
            <div className="relative border border-red-900/50 bg-black/60 backdrop-blur-md p-6 rounded-xl shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-red-700 to-orange-900 rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-red-900/30">
                <MemoryStick className="text-red-200 w-6 h-6" />
              </div>
              <p className="text-gray-400 text-sm mb-1">Liquidity Pool</p>
              <h3 className="text-3xl font-bold text-red-400">
                {formatNumber(simulationStatus?.market?.solReserve || 0)} SOL
              </h3>
              <p className="text-sm text-gray-400">
                {formatNumber(simulationStatus?.market?.tokenReserve || 0)} NURO
              </p>
            </div>
          </div>
        </motion.div>
        
 
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
        >
     
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-xl blur opacity-50 group-hover:opacity-70 transition duration-300"></div>
            <div className="relative border border-purple-900/50 bg-black/70 backdrop-blur-md p-6 rounded-xl shadow-xl">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <TrendingUp className="mr-2 w-5 h-5 text-purple-400" />
                Market Activity
              </h3>
              <div className="h-150">
                <MarketVisualization />
              </div>
            </div>
          </div>
          
         
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-xl blur opacity-50 group-hover:opacity-70 transition duration-300"></div>
            <div className="relative border border-purple-900/50 bg-black/70 backdrop-blur-md p-6 rounded-xl shadow-xl">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <MemoryStick className="mr-2 w-5 h-5 text-purple-400" />
                Liquidity Distribution
              </h3>
              <div className="h-150">
                <AMMVisualization />
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Recent Transactions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-8 relative group bottom-0"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-xl blur opacity-50 group-hover:opacity-70 transition duration-300"></div>
          <div className="relative border border-purple-900/50 bg-black/70 backdrop-blur-md rounded-xl shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-6">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <RefreshCw className="mr-2 w-5 h-5 text-purple-400" />
                Recent Transactions
              </h3>
              <button 
                onClick={loadData}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-purple-900/30"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-900/80 to-indigo-900/80">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Time</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Agent</th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Price</th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Price Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <RefreshCw className="w-12 h-12 text-purple-500/20 mb-4" />
                          <p className="text-gray-400 text-lg">No transactions yet</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-purple-900/10 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-300">{formatTime(tx.timestamp)}</td>
                        <td className="py-3 px-4">
                          <span 
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              tx.type === 'buy' 
                              ? 'bg-green-900/60 text-green-300' 
                              : 'bg-red-900/60 text-red-300'
                          }`}
                        >
                          {tx.type === 'buy' ? 'BUY' : 'SELL'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300">
                        {tx.agent ? tx.agent.displayName : 'System'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300 text-right">
                        {formatNumber(tx.amount)} {tx.type === 'buy' ? 'SOL' : 'NURO'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300 text-right">
                        {formatNumber(tx.price, 8)} SOL
                      </td>
                      <td className={`py-3 px-4 text-sm text-right ${getDirectionColor(tx.priceImpact)}`}>
                        {(tx.priceImpact * 100).toFixed(4)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
      <ChatSection></ChatSection>
      </main>
      
     
    
       
      

      <footer className="border-t border-gray-800/50 py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
              <span className="text-sm font-medium text-white">
                NeuralTraders
              </span>
            </div>
            <div className="text-gray-400 text-sm">
              Built by Adtech ♡
            </div>
            
            <div className="text-gray-500 text-xs">
              © {new Date().getFullYear()} NeuralTraders. All rights reserved.
            </div>
          </div>
        </div>
     
      </footer>
      

      <style jsx global>{`
        @keyframes pulse-x {
          0%, 100% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(300%);
          }
        }
        .animate-pulse-x {
          animation: pulse-x 2s ease-in-out infinite;
        }
      `}</style>

    </div>
  
  );
}
                     