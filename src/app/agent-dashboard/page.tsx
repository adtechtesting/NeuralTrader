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
  Plus,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import AgentAvatar from '@/components/AgentAvatar';
import ChatSection from '@/components/chat/ChatSection';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import Link from 'next/link';

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
  const { connected, publicKey } = useWallet();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [globalAgents, setGlobalAgents] = useState<Agent[]>([]);
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
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
      toast.warning("Connect Your Solana Wallet to Simulate tokens ");
    }
  }, [mounted, connected, router]);

  useEffect(() => {
    if (mounted) {
      loadGlobalAgents();
    }
  }, [mounted, pagination.page, pagination.pageSize, personalityFilter]);

  useEffect(() => {
    if (mounted && connected && publicKey) {
      loadMyAgents(publicKey.toString());
    } else if (mounted) {
      setMyAgents([]);
    }
  }, [mounted, connected, publicKey, personalityFilter]);

  const loadGlobalAgents = async () => {
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
        setGlobalAgents(data.agents || []);
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

  const loadMyAgents = async (walletAddress: string) => {
    try {
      const url = new URL('/api/agents', window.location.origin);
      url.searchParams.append('page', '1');
      url.searchParams.append('pageSize', '12');
      url.searchParams.append('creatorWallet', walletAddress);
      if (personalityFilter) {
        url.searchParams.append('personalityType', personalityFilter);
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.success) {
        setMyAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error loading personal agents:', error);
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
  
  const filteredAgents = globalAgents.filter(agent => 
    filter === '' || 
    agent.name.toLowerCase().includes(filter.toLowerCase()) ||
    agent.publicKey.toLowerCase().includes(filter.toLowerCase())
  );
  const totalAgentsCount = stats?.totalAgents ?? globalAgents.length;
  const myAgentsCount = myAgents.length;
  const successRate = stats && stats.totalAgents > 0
    ? Math.round((stats.successfullyFunded / stats.totalAgents) * 100)
    : null;
  const fundedVolume = stats && typeof stats.totalFunded === 'number'
    ? `${stats.totalFunded.toFixed(2)} SOL`
    : '--';
  const heroMetrics = [
    {
      label: 'Total Agents',
      value: totalAgentsCount.toLocaleString(),
      helper: 'Across NeuralTrader network'
    },
    {
      label: 'Your Agents',
      value: myAgentsCount.toLocaleString(),
      helper: 'Owned by this wallet'
    },
    {
      label: 'Funded Volume',
      value: fundedVolume,
      helper: 'Aggregate SOL allocated'
    },
    {
      label: 'Success Rate',
      value: successRate !== null ? `${successRate}%` : '--',
      helper: 'Funding completion ratio'
    }
  ];
  const statsCards = stats ? [
    {
      icon: BarChart3,
      label: 'Successfully Funded',
      value: stats.successfullyFunded.toLocaleString(),
      helper: 'Agents cleared funding checks'
    },
    {
      icon: AlertTriangle,
      label: 'Awaiting Funding',
      value: stats.failedToFund.toLocaleString(),
      helper: 'Need capital top-up'
    },
    {
      icon: Zap,
      label: 'Total SOL Funded',
      value: stats.totalFunded?.toFixed(2) ?? '0.00',
      suffix: 'SOL',
      helper: 'Cumulative launch capital'
    },
    {
      icon: Users,
      label: 'Personality Types',
      value: Object.keys(stats.personalityDistribution || {}).length.toLocaleString(),
      helper: 'Active archetypes'
    }
  ] : [];
  const personalityEntries = stats?.personalityDistribution
    ? Object.entries(stats.personalityDistribution).sort((a, b) => b[1] - a[1])
    : [];
  const personalityTotal = personalityEntries.reduce((acc, [, count]) => acc + count, 0);
  const occupationEntries = stats?.occupationDistribution
    ? Object.entries(stats.occupationDistribution).sort((a, b) => b[1] - a[1])
    : [];
  const paginationStart = pagination.totalAgents === 0 ? 0 : pagination.page * pagination.pageSize + 1;
  const paginationEnd = Math.min((pagination.page + 1) * pagination.pageSize, pagination.totalAgents);

  if (!mounted) return null;
  
  return (
    <div className="min-h-screen bg-black">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 -left-32 w-[500px] h-[500px] rounded-full bg-white opacity-[0.02] blur-[120px]" />
        <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-white opacity-[0.02] blur-[120px]" />
      </div>

      {/* Main Content */}
      <main className="container mx-auto py-8 px-6 relative z-10 pt-24 max-w-[1800px] space-y-12">
        {/* Hero Section */}
        <section className="space-y-6">
          <div className="rounded-3xl border border-neutral-800 bg-black/60 backdrop-blur-xl px-8 py-10 relative overflow-hidden">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 45%)' }} />
            <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs uppercase tracking-[0.28em] text-white/60">
                  NeuralTrader Agent Command Center
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                  Monitor, iterate, and scale your autonomous trading agents
                </h1>
                <p className="text-white/55 text-base md:text-lg">
                  Track funding progress, personality mix, and portfolio exposure across every agent you deploy—all in one operational control room.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 min-w-[250px]">
                {heroMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-white/40 mb-2 font-semibold">{metric.label}</p>
                    <div className="text-xl font-semibold text-white">{metric.value}</div>
                    <p className="text-[11px] text-white/50 mt-2">{metric.helper}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Network Health */}
        {stats && (
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white uppercase tracking-[0.3em] mb-1">Network Health</h2>
                <p className="text-xs text-white/50 max-w-lg">Snapshot of how NeuralTrader agents are performing across funding checkpoints and personas.</p>
              </div>
              <div className="text-xs text-white/40">
                Last refreshed {new Date().toLocaleTimeString()}&nbsp;•&nbsp;Data may be delayed up to 60s
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {statsCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-neutral-800 bg-neutral-900 px-6 py-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center border border-neutral-700">
                      <card.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">{card.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">{card.value}</span>
                    {card.suffix && <span className="text-sm text-white/50">{card.suffix}</span>}
                  </div>
                  <p className="text-xs text-white/45 leading-relaxed">{card.helper}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My Created Agents */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Your Agent Portfolio</h2>
                <p className="text-xs text-white/50">A quick glance at the squads launched from this wallet.</p>
              </div>
            </div>
            <Link href="/create-agent" className="w-full md:w-auto">
              <button className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl font-semibold hover:bg-white/90 transition-all">
                <Plus className="w-4 h-4" />
                Launch New Agent
              </button>
            </Link>
          </div>

          {myAgents && myAgents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {myAgents.slice(0, 4).map((agent) => (
                <motion.div
                  key={agent.id}
                  whileHover={{ translateY: -4 }}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-3 hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <AgentAvatar 
                      name={agent.name} 
                      personalityType={agent.personalityType} 
                      size={44} 
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white truncate pr-2">{agent.name}</h3>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-white/40">{agent.personalityType}</span>
                      </div>
                      <p className="text-xs text-white/50">{agent.occupation}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-800/50 p-3 text-xs text-white/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Wallet Balance</span>
                      <span className="font-semibold text-green-400">{agent.balance.toFixed(2)} SOL</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Launched</span>
                      <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="pt-2 border-t border-neutral-800">
                      <code className="block text-[11px] text-white/50 truncate">{agent.publicKey}</code>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-2">
                <p className="text-white font-semibold">You haven’t launched any agents yet</p>
                <p className="text-sm text-white/55">Spin up your first agent to unlock personalised analytics and funding insights.</p>
              </div>
              <Link href="/create-agent">
                <button className="px-6 py-2.5 bg-white text-black rounded-xl font-semibold hover:bg-white/90 transition-all">
                  Create Your First Agent
                </button>
              </Link>
            </div>
          )}
        </section>

        {/* Distribution Insights */}
        {stats && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white uppercase tracking-[0.3em]">Personality Mix</h3>
                  <p className="text-xs text-white/50">Distribution of active archetypes</p>
                </div>
                <span className="text-xs text-white/40">Total {personalityTotal}</span>
              </div>
              <div className="space-y-3">
                {personalityEntries.length > 0 ? personalityEntries.map(([type, count]) => {
                  const percentage = personalityTotal ? Math.round((count / personalityTotal) * 100) : 0;
                  return (
                    <button
                      key={type}
                      onClick={() => setPersonalityFilter(personalityFilter === type ? '' : type)}
                      className={`w-full rounded-xl border border-neutral-800 bg-neutral-800/40 px-4 py-3 text-left transition-all ${
                        personalityFilter === type ? 'border-white/40' : 'hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-sm text-white">
                        <span className="font-semibold">{type}</span>
                        <span className="text-xs text-white/60">{count} agents</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full bg-white/80"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="mt-2 text-xs text-white/50">{percentage}% of active roster</div>
                    </button>
                  );
                }) : (
                  <p className="text-xs text-white/50">No personality data available yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white uppercase tracking-[0.3em]">Occupational Spread</h3>
                  <p className="text-xs text-white/50">Dominant agent roles by count</p>
                </div>
                <span className="text-xs text-white/40">{occupationEntries.length || 0} roles</span>
              </div>
              <div className="space-y-3">
                {occupationEntries.length > 0 ? occupationEntries.map(([role, count]) => (
                  <div key={role} className="rounded-xl border border-neutral-800 bg-neutral-800/40 px-4 py-3">
                    <div className="flex items-center justify-between text-sm text-white">
                      <span className="font-semibold">{role}</span>
                      <span className="text-xs text-white/60">{count} agents</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-white/50">No occupation data captured yet.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Search and Filter */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-[0.3em]">Global Agent Catalog</h3>
              <p className="text-xs text-white/50">Viewing {filteredAgents.length} of {globalAgents.length} agents returned this cycle.</p>
            </div>
            <div className="text-xs text-white/45">
              Filters sync across global and personal lists
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="w-full md:flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name or public key"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none focus:border-neutral-600 transition-all"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            
            <div className="w-full md:w-48 relative">
              <select
                value={personalityFilter}
                onChange={(e) => setPersonalityFilter(e.target.value)}
                className="w-full appearance-none bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-neutral-600 transition-all"
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
              className="px-4 py-2.5 rounded-xl bg-neutral-800 text-white text-sm border border-neutral-700 hover:bg-neutral-700 transition-all flex items-center"
            >
              <X className="w-4 h-4 mr-1.5" />
              Clear
            </button>
            
            <button
              onClick={loadGlobalAgents}
              className="px-4 py-2.5 rounded-xl bg-white text-black hover:bg-white/90 transition-all flex items-center font-semibold text-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </section>

        {/* Agents Table */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
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
          <div className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-neutral-800 bg-neutral-900">
            <div className="text-xs text-white/45">
              Showing {paginationStart} to {paginationEnd} of {pagination.totalAgents.toLocaleString()} agents
            </div>
            
            <div className="flex items-center gap-2">
              <select 
                className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-600"
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
                  className={`px-3 py-1.5 rounded-xl text-xs ${
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
                      className={`w-8 h-8 rounded-xl text-xs ${
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
                  className={`px-3 py-1.5 rounded-xl text-xs ${
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
        </section>
        
        <ChatSection />
      </main>
    </div>
  );
}
