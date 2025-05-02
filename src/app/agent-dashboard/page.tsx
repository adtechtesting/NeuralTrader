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
} from 'lucide-react';

import AgentAvatar from '@/components/AgentAvatar';
import ChatSection from '@/components/chat/ChatSection';


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
    <div className="min-h-screen bg-black bg-gradient-to-br from-purple-950 via-black to-indigo-950 overflow-hidden relative p-16">
     
      <div className="absolute top-0 right-0 w-px h-screen bg-purple-800/20"></div>
      <div className="absolute top-1/3 left-0 w-screen h-px bg-purple-800/20"></div>
      <div className="absolute bottom-1/4 right-0 w-screen h-px bg-purple-800/20"></div>
      
    

      <main className="container mx-auto py-8 px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Agent Dashboard</h1>
          <p className="text-gray-400">
            Monitor and manage AI trading agents in your simulated Solana environment
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="border border-gray-800/50 bg-gray-900/30 backdrop-blur-sm p-6 rounded-lg">
              <div className="w-10 h-10 bg-purple-900/60 rounded-md flex items-center justify-center mb-4">
                <Users className="text-purple-400 w-5 h-5" />
              </div>
              <p className="text-gray-400 text-sm mb-1">Total Agents</p>
              <h3 className="text-3xl font-bold text-white">{stats.totalAgents}</h3>
            </div>
            
            <div className="border border-gray-800/50 bg-gray-900/30 backdrop-blur-sm p-6 rounded-lg">
              <div className="w-10 h-10 bg-purple-900/60 rounded-md flex items-center justify-center mb-4">
                <BarChart3 className="text-purple-400 w-5 h-5" />
              </div>
              <p className="text-gray-400 text-sm mb-1">Successfully Funded</p>
              <h3 className="text-3xl font-bold text-green-400">{stats.successfullyFunded}</h3>
            </div>
            
            <div className="border border-gray-800/50 bg-gray-900/30 backdrop-blur-sm p-6 rounded-lg">
              <div className="w-10 h-10 bg-purple-900/60 rounded-md flex items-center justify-center mb-4">
                <MessageCircle className="text-purple-400 w-5 h-5" />
              </div>
              <p className="text-gray-400 text-sm mb-1">Total SOL Funded</p>
              <h3 className="text-3xl font-bold text-white">{stats.totalFunded.toFixed(2)} SOL</h3>
            </div>
            
            <div className="border border-gray-800/50 bg-gray-900/30 backdrop-blur-sm p-6 rounded-lg">
              <div className="w-10 h-10 bg-purple-900/60 rounded-md flex items-center justify-center mb-4">
                <div className="text-red-400">!</div>
              </div>
              <p className="text-gray-400 text-sm mb-1">Failed to Fund</p>
              <h3 className="text-3xl font-bold text-red-400">{stats.failedToFund}</h3>
            </div>
          </div>
        )}
        
      
        {stats && stats.personalityDistribution && (
          <div className="border border-gray-800/50 bg-gray-900/30 backdrop-blur-sm p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Personality Distribution</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(stats.personalityDistribution).map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setPersonalityFilter(personalityFilter === type ? '' : type)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    personalityFilter === type 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  {type}: {count} ({Math.round((count / stats.totalAgents) * 100)}%)
                </button>
              ))}
            </div>
          </div>
        )}
        

        <div className="border border-gray-800/50 bg-gray-900/30 backdrop-blur-sm p-6 rounded-lg mb-8">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="w-full md:w-2/3 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name or public key"
                className="w-full bg-gray-800/50 border border-gray-700 rounded-md pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            
            <div className="w-full md:w-1/3 relative">
              <select
                value={personalityFilter}
                onChange={(e) => setPersonalityFilter(e.target.value)}
                className="w-full appearance-none bg-gray-800/50 border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Personalities</option>
                {stats?.personalityDistribution && 
                  Object.keys(stats.personalityDistribution).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))
                }
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
            </div>
            
            <button
              onClick={() => {
                setFilter('');
                setPersonalityFilter('');
              }}
              className="w-full md:w-auto px-4 py-2 rounded-md bg-gray-800/70 text-white hover:bg-gray-700/70 transition-colors flex items-center justify-center"
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </button>
            
            <button
              onClick={loadAgents}
              className="w-full md:w-auto px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        

        <div className="border border-gray-800/50 bg-gray-900/30 backdrop-blur-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/70">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase">Agent</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase">Personality</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase">Occupation</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase">Balance (SOL)</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase">Public Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <div className="flex justify-center">
                        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                      </div>
                      <p className="mt-2 text-gray-400">Loading agents...</p>
                    </td>
                  </tr>
                ) : filteredAgents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <p className="text-gray-400">No agents found matching your criteria</p>
                    </td>
                  </tr>
                ) : (
                  filteredAgents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <AgentAvatar 
                            name={agent.name} 
                            personalityType={agent.personalityType} 
                            size={32} 
                          />
                          <span className="text-white font-medium">{agent.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          personalityFilter === agent.personalityType 
                            ? 'bg-purple-500 text-white' 
                            : 'bg-gray-800 text-gray-300'
                        }`}>
                          {agent.personalityType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                        {agent.occupation}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`font-medium ${(agent.balance || 0) > 0 ? 'text-green-400' : 'text-white'}`}>
                          {(agent.balance || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-400">
                          {agent.publicKey.substring(0, 12)}...
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-800/50">
            <div className="flex items-center text-sm text-gray-400">
              <span>
                Showing {pagination.page * pagination.pageSize + 1} to {
                  Math.min((pagination.page + 1) * pagination.pageSize, pagination.totalAgents)
                } of {pagination.totalAgents} agents
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <select 
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                value={pagination.pageSize}
                onChange={(e) => handleChangeRowsPerPage(parseInt(e.target.value))}
              >
                {[10, 25, 50, 100].map(size => (
                  <option key={size} value={size}>{size} per page</option>
                ))}
              </select>
              
              <div className="flex space-x-1">
                <button
                  onClick={() => handleChangePage(pagination.page - 1)}
                  disabled={pagination.page === 0}
                  className={`px-3 py-1 rounded text-sm ${
                    pagination.page === 0 
                      ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-800 text-white hover:bg-gray-700 transition-colors'
                  }`}
                >
                  Prev
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = pagination.page <= 2 
                    ? i 
                    : pagination.page + i - 2;
                  
                  if (pageNum >= pagination.totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handleChangePage(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center rounded text-sm ${
                        pagination.page === pageNum 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-800 text-white hover:bg-gray-700 transition-colors'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => handleChangePage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages - 1}
                  className={`px-3 py-1 rounded text-sm ${
                    pagination.page >= pagination.totalPages - 1 
                      ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-800 text-white hover:bg-gray-700 transition-colors'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
        <ChatSection></ChatSection>
      </main>
      
      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-800/50 mt-12">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
              <span className="text-lg font-bold text-white">
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