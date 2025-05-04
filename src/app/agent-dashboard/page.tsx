"use client";

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  MessageCircle, 
  RefreshCw, 
  Search,
  ChevronDown,
  X,
  AlertTriangle,
  Zap,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import AgentAvatar from '@/components/AgentAvatar';
import ChatSection from '@/components/chat/ChatSection';
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
    loadAgents();
  }, [pagination.page, pagination.pageSize, personalityFilter]);
  

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
  
  // Filter agents by search term
  const filteredAgents = agents.filter(agent => 
    filter === '' || 
    agent.name.toLowerCase().includes(filter.toLowerCase()) ||
    agent.publicKey.toLowerCase().includes(filter.toLowerCase())
  );
  
  if (!mounted) {
    return null; 
  }
  
  return (
    <div className="min-h-screen bg-[#050008] overflow-hidden relative p-16 bg-gradient-to-br from-black  to-neutral-950">
 =
    <div className="absolute top-0 left-0 w-full h-full">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-radial from-[#14082f] via-[#0c0020] to-[#050008] opacity-80 z-0"></div>
      
     
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-700/20 blur-[100px] rounded-full"></div>
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-indigo-700/20 blur-[100px] rounded-full"></div>
      
      
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[1px] h-screen bg-purple-700/30 transform rotate-[15deg] origin-top-right"></div>
        <div className="absolute top-0 right-1/3 w-[1px] h-screen bg-indigo-700/20 transform rotate-[25deg] origin-top-right"></div>
        <div className="absolute bottom-0 left-0 w-screen h-[1px] bg-purple-700/30 transform rotate-[3deg] origin-bottom-left"></div>
        <div className="absolute top-1/2 left-0 w-screen h-[1px] bg-indigo-700/20 transform rotate-[-3deg] origin-center-left"></div>
      </div>
      
      
    </div>

   

    {/* Main Content */}
    <main className="container mx-auto py-8 px-6 relative z-10">
      <motion.div 
        initial="hidden"
        animate="visible"
        
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-3">Agent Dashboard</h1>
        <p className="text-gray-300 text-lg">
          Monitor and manage AI trading agents in your simulated Solana environment
        </p>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/50 to-purple-800/50 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-300"></div>
            <div className="relative border border-purple-900/50 bg-black/60 backdrop-blur-md p-6 rounded-xl shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-700 to-indigo-900 rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-purple-900/30">
                <Users className="text-purple-200 w-6 h-6" />
              </div>
              <p className="text-gray-400 text-sm mb-1">Total Agents</p>
              <h3 className="text-3xl font-bold text-white">{stats.totalAgents}</h3>
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600/50 to-emerald-800/50 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-300"></div>
            <div className="relative border border-green-900/50 bg-black/60 backdrop-blur-md p-6 rounded-xl shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-green-700 to-emerald-900 rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-green-900/30">
                <BarChart3 className="text-green-200 w-6 h-6" />
              </div>
              <p className="text-gray-400 text-sm mb-1">Successfully Funded</p>
              <h3 className="text-3xl font-bold text-green-400">{stats?.successfullyFunded}</h3>
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600/50 to-blue-800/50 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-300"></div>
            <div className="relative border border-indigo-900/50 bg-black/60 backdrop-blur-md p-6 rounded-xl shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-700 to-blue-900 rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-indigo-900/30">
                <Zap className="text-indigo-200 w-6 h-6" />
              </div>
              <p className="text-gray-400 text-sm mb-1">Total SOL Funded</p>
              <h3 className="text-3xl font-bold text-white">{stats?.totalFunded?.toFixed(2)} SOL</h3>
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600/50 to-orange-800/50 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-300"></div>
            <div className="relative border border-red-900/50 bg-black/60 backdrop-blur-md p-6 rounded-xl shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-red-700 to-orange-900 rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-red-900/30">
                <AlertTriangle className="text-red-200 w-6 h-6" />
              </div>
              <p className="text-gray-400 text-sm mb-1">Failed to Fund</p>
              <h3 className="text-3xl font-bold text-red-400">{stats?.failedToFund}</h3>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Personality Distribution */}
      {stats?.personalityDistribution && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative group mb-8"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-xl blur opacity-50 group-hover:opacity-70 transition duration-300"></div>
          <div className="relative border border-purple-900/50 bg-black/70 backdrop-blur-md p-6 rounded-xl shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Users className="mr-2 w-5 h-5 text-purple-400" />
              Personality Distribution
            </h2>
            <div className="flex flex-wrap gap-3 mt-2">
              {Object.entries(stats.personalityDistribution).map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setPersonalityFilter(personalityFilter === type ? '' : type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    personalityFilter === type 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/30' 
                      : 'bg-gray-800/70 text-gray-300 hover:bg-gray-700/70 border border-gray-700/50'
                  }`}
                >
                  {type}: {count} ({Math.round((count / stats.totalAgents) * 100)}%)
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Search and Filter */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative group mb-8"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 rounded-xl blur opacity-50 group-hover:opacity-70 transition duration-300"></div>
        <div className="relative border border-indigo-900/50 bg-black/70 backdrop-blur-md p-6 rounded-xl shadow-xl">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search Input */}
            <div className="w-full md:w-2/3 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or public key"
                className="w-full bg-black/50 border border-purple-900/50 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            
            {/* Personality Filter */}
            <div className="w-full md:w-1/3 relative">
              <select
                value={personalityFilter}
                onChange={(e) => setPersonalityFilter(e.target.value)}
                className="w-full appearance-none bg-black/50 border border-purple-900/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="">All Personalities</option>
                {stats?.personalityDistribution && 
                  Object.keys(stats.personalityDistribution).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))
                }
              </select>
              <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5 pointer-events-none" />
            </div>
            
            {/* Action Buttons */}
            <button
              onClick={() => {
                setFilter('');
                setPersonalityFilter('');
              }}
              className="w-full md:w-auto px-5 py-3 rounded-lg bg-black/70 text-white border border-gray-800 hover:bg-black/90 hover:border-gray-700 transition-all flex items-center justify-center"
            >
              <X className="w-5 h-5 mr-2 text-gray-400" />
              Clear
            </button>
            
            <button
              onClick={loadAgents}
              className="w-full md:w-auto px-5 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center shadow-lg shadow-purple-900/30"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Agents Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="relative group"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-xl blur opacity-50 group-hover:opacity-70 transition duration-300"></div>
        <div className="relative border border-purple-900/50 bg-black/70 backdrop-blur-md rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-900/80 to-indigo-900/80">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-300 uppercase tracking-wider">Agent</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-300 uppercase tracking-wider">Personality</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-300 uppercase tracking-wider">Occupation</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-gray-300 uppercase tracking-wider">Balance (SOL)</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-300 uppercase tracking-wider">Public Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50 relative">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-2 border-purple-500/20"></div>
                          <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-t-2 border-purple-500 animate-spin"></div>
                        </div>
                        <p className="mt-4 text-gray-400 text-lg">Loading agents...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredAgents?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <p className="text-gray-400 text-lg">No agents found matching your criteria</p>
                    </td>
                  </tr>
                ) : (
                  filteredAgents?.map((agent) => (
                    <tr key={agent.id} className="hover:bg-purple-900/10 transition-colors group/row">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <AgentAvatar 
                            name={agent.name} 
                            personalityType={agent.personalityType} 
                            size={38} 
                          />
                          <span className="text-white font-medium group-hover/row:text-purple-300 transition-colors">{agent.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
                          personalityFilter === agent.personalityType 
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/30' 
                            : 'bg-gray-800/70 text-gray-300 border border-gray-700/50'
                        }`}>
                          {agent.personalityType}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-gray-300">
                        {agent.occupation}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <span className={`font-medium ${(agent.balance || 0) > 0 ? 'text-green-400' : 'text-gray-300'}`}>
                          {(agent.balance || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="font-mono text-sm text-gray-400 bg-black/30 px-3 py-1 rounded-lg border border-gray-800/40 inline-flex">
                          {agent.publicKey?.substring(0, 12)}...
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-800/50 bg-black/40 backdrop-blur-sm">
            <div className="flex items-center text-sm text-gray-400">
              <span>
                Showing {pagination?.page * pagination?.pageSize + 1} to {
                  Math.min((pagination?.page + 1) * pagination?.pageSize, pagination?.totalAgents)
                } of {pagination?.totalAgents} agents
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <select 
                className="bg-black/60 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={pagination?.pageSize}
                onChange={(e) => handleChangeRowsPerPage(parseInt(e.target.value))}
              >
                {[10, 25, 50, 100].map(size => (
                  <option key={size} value={size}>{size} per page</option>
                ))}
              </select>
              
              <div className="flex space-x-1">
                <button
                  onClick={() => handleChangePage(pagination?.page - 1)}
                  disabled={pagination?.page === 0}
                  className={`px-4 py-2 rounded-lg text-sm flex items-center ${
                    pagination?.page === 0 
                      ? 'bg-gray-900/40 text-gray-500 cursor-not-allowed' 
                      : 'bg-black/60 text-white hover:bg-black/80 border border-gray-800 transition-colors'
                  }`}
                >
                  Prev
                </button>
                
                {Array.from({ length: Math.min(5, pagination?.totalPages || 5) }, (_, i) => {
                  const pageNum = pagination?.page <= 2 
                    ? i 
                    : pagination?.page + i - 2;
                  
                  if (pageNum >= (pagination?.totalPages || 0)) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handleChangePage(pageNum)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm ${
                        pagination?.page === pageNum 
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/30' 
                          : 'bg-black/60 text-white hover:bg-black/80 border border-gray-800 transition-colors'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handleChangePage(pagination?.page + 1)}
                  disabled={pagination?.page >= (pagination?.totalPages - 1 || 0)}
                  className={`px-4 py-2 rounded-lg text-sm flex items-center ${
                    pagination?.page >= (pagination?.totalPages - 1 || 0) 
                      ? 'bg-gray-900/40 text-gray-500 cursor-not-allowed' 
                      : 'bg-black/60 text-white hover:bg-black/80 border border-gray-800 transition-colors'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
   
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-8"
      >
        <ChatSection />
      </motion.div>
    </main>
    

    <footer className="py-8 px-6 border-t border-purple-900/30 mt-12 relative z-10 backdrop-blur-sm">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-6 md:mb-0">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 mr-2"></div>
            <span className="text-xl font-bold text-white">
              NeuralTraders
            </span>
          </div>
          
         
          
          <div className="text-gray-500 text-sm">
            © {new Date().getFullYear()} NeuralTraders. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  </div>
  );
}