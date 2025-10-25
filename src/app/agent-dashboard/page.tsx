"use client";

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  RefreshCw, 
  Search,
  ChevronDown,
  X,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import AgentAvatar from '@/components/AgentAvatar';
import ChatSection from '@/components/chat/ChatSection';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  personalityType: string;
  personality: string;
  occupation: string;
  publicKey: string;
  balance: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalAgents: number;
}

interface Stats {
  totalAgents: number;
  successfullyFunded: number;
  failedToFund: number;
  totalFunded: number;
  personalityDistribution: Record<string, number>;
  occupationDistribution: Record<string, number>;
}

export default function AgentDashboardPage() {
  const {connected} = useWallet();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    totalPages: 0,
    totalAgents: 0
  });
  const [filter, setFilter] = useState('');
  const [personalityFilter, setPersonalityFilter] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !connected) {
      router.push("/");
      toast.warning("Connect Your Solana Wallet to see the Agent Dashboard");
    }
  }, [mounted, connected, router]);

  useEffect(() => {
    if (mounted && connected) {
      loadAgents();
    }
  }, [mounted, connected, pagination.page, pagination.pageSize, personalityFilter]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/agents', window.location.origin);
      url.searchParams.append('page', (pagination.page + 1).toString());
      url.searchParams.append('pageSize', pagination.pageSize.toString());
      
      if (personalityFilter) {
        url.searchParams.append('personalityType', personalityFilter);
      }
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (data.success) {
        setAgents(data.agents || []);
        setStats(data.stats || null);
        setPagination({
          page: data.pagination.page - 1,
          pageSize: data.pagination.pageSize,
          totalPages: data.pagination.totalPages,
          totalAgents: data.pagination.totalAgents
        });
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error("Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (newPage: number) => {
    setPagination({ ...pagination, page: newPage });
  };
  
  const handleChangeRowsPerPage = (newSize: number) => {
    setPagination({
      ...pagination,
      page: 0,
      pageSize: newSize
    });
  };
  
  const filteredAgents = agents.filter(agent => 
    filter === '' || 
    agent.name.toLowerCase().includes(filter.toLowerCase()) ||
    agent.publicKey.toLowerCase().includes(filter.toLowerCase())
  );
  
  if (!mounted) return null;
  
  return (
    <div className="min-h-screen bg-black">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 -left-32 w-[500px] h-[500px] rounded-full bg-white opacity-[0.02] blur-[120px]" />
        <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-white opacity-[0.02] blur-[120px]" />
      </div>

      {/* Main Content */}
      <main className="container mx-auto py-8 px-6 relative z-10 pt-24 max-w-[1800px]">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Agent Dashboard</h1>
          <p className="text-white/50 text-sm">Monitor and manage AI trading agents</p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { icon: Users, label: "Total Agents", value: stats.totalAgents, color: "white" },
              { icon: BarChart3, label: "Successfully Funded", value: stats.successfullyFunded, color: "green" },
              { icon: Zap, label: "Total SOL Funded", value: `${stats.totalFunded?.toFixed(2)}`, color: "white", unit: "SOL" },
              { icon: AlertTriangle, label: "Failed to Fund", value: stats.failedToFund, color: "red" }
            ].map((stat, i) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
                    <stat.icon className="text-white w-5 h-5" />
                  </div>
                </div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1 font-semibold">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <h3 className={`text-2xl font-bold ${
                    stat.color === 'green' ? 'text-green-400' : 
                    stat.color === 'red' ? 'text-red-400' : 'text-white'
                  }`}>
                    {stat.value}
                  </h3>
                  {stat.unit && <span className="text-sm text-white/40">{stat.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Personality Distribution */}
        {stats?.personalityDistribution && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 mb-6">
            <h2 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wider flex items-center">
              <Users className="mr-2 w-4 h-4" />
              Personality Distribution
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.personalityDistribution).map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setPersonalityFilter(personalityFilter === type ? '' : type)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    personalityFilter === type 
                      ? 'bg-white text-black' 
                      : 'bg-neutral-800 text-white/70 hover:bg-neutral-700 border border-neutral-700'
                  }`}
                >
                  {type}: {count}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Search and Filter */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="w-full md:flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name or public key"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none focus:border-neutral-600 transition-all"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            
            <div className="w-full md:w-48 relative">
              <select
                value={personalityFilter}
                onChange={(e) => setPersonalityFilter(e.target.value)}
                className="w-full appearance-none bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-neutral-600 transition-all"
              >
                <option value="">All Personalities</option>
                {stats?.personalityDistribution && 
                  Object.keys(stats.personalityDistribution).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))
                }
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4 pointer-events-none" />
            </div>
            
            <button
              onClick={() => {
                setFilter('');
                setPersonalityFilter('');
              }}
              className="px-4 py-2.5 rounded-lg bg-neutral-800 text-white text-sm border border-neutral-700 hover:bg-neutral-700 transition-all flex items-center"
            >
              <X className="w-4 h-4 mr-1.5" />
              Clear
            </button>
            
            <button
              onClick={loadAgents}
              className="px-4 py-2.5 rounded-lg bg-white text-black hover:bg-white/90 transition-all flex items-center font-semibold text-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Agents Table */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-800/50 border-b border-neutral-700">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Agent</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Personality</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Occupation</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Balance</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Public Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-neutral-700 border-t-white rounded-full animate-spin"></div>
                        <p className="mt-4 text-white/40 text-sm">Loading agents...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredAgents?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <p className="text-white/40 text-sm">No agents found</p>
                    </td>
                  </tr>
                ) : (
                  filteredAgents?.map((agent) => (
                    <tr key={agent.id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <AgentAvatar 
                            name={agent.name} 
                            personalityType={agent.personalityType} 
                            size={36} 
                          />
                          <span className="text-white font-medium text-sm">{agent.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded text-xs font-semibold ${
                          personalityFilter === agent.personalityType 
                            ? 'bg-white text-black' 
                            : 'bg-neutral-800 text-white/80 border border-neutral-700'
                        }`}>
                          {agent.personalityType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white/70 text-sm">{agent.occupation}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-mono text-sm ${(agent.balance || 0) > 0 ? 'text-green-400' : 'text-white/70'}`}>
                          {(agent.balance || 0).toFixed(2)} SOL
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs text-white/60 bg-neutral-800 px-2.5 py-1 rounded border border-neutral-700">
                          {agent.publicKey?.substring(0, 12)}...
                        </code>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-3 flex items-center justify-between border-t border-neutral-800 bg-neutral-900">
            <div className="text-xs text-white/40">
              Showing {pagination?.page * pagination?.pageSize + 1} to {
                Math.min((pagination?.page + 1) * pagination?.pageSize, pagination?.totalAgents)
              } of {pagination?.totalAgents}
            </div>
            
            <div className="flex items-center gap-2">
              <select 
                className="bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-600"
                value={pagination?.pageSize}
                onChange={(e) => handleChangeRowsPerPage(parseInt(e.target.value))}
              >
                {[10, 25, 50, 100].map(size => (
                  <option key={size} value={size}>{size} per page</option>
                ))}
              </select>
              
              <div className="flex gap-1">
                <button
                  onClick={() => handleChangePage(pagination?.page - 1)}
                  disabled={pagination?.page === 0}
                  className={`px-3 py-1.5 rounded text-xs ${
                    pagination?.page === 0 
                      ? 'bg-neutral-800 text-white/30 cursor-not-allowed' 
                      : 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700'
                  }`}
                >
                  Prev
                </button>
                
                {Array.from({ length: Math.min(5, pagination?.totalPages || 5) }, (_, i) => {
                  const pageNum = pagination?.page <= 2 ? i : pagination?.page + i - 2;
                  if (pageNum >= (pagination?.totalPages || 0)) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handleChangePage(pageNum)}
                      className={`w-8 h-8 rounded text-xs ${
                        pagination?.page === pageNum 
                          ? 'bg-white text-black font-semibold' 
                          : 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handleChangePage(pagination?.page + 1)}
                  disabled={pagination?.page >= (pagination?.totalPages - 1 || 0)}
                  className={`px-3 py-1.5 rounded text-xs ${
                    pagination?.page >= (pagination?.totalPages - 1 || 0) 
                      ? 'bg-neutral-800 text-white/30 cursor-not-allowed' 
                      : 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <ChatSection />
      </main>
    </div>
  );
}
