'use client';

import { useState, useEffect } from 'react';
import { X, Search, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

interface Token {
  id: string;
  name: string;
  symbol: string;
  icon?: string;
  decimals: number;
  usdPrice?: number;
  mcap?: number;
  liquidity?: number;
  holderCount?: number;
  isVerified?: boolean;
  tags?: string[];
}

interface TokenSelectorProps {
  onClose?: () => void;
  onSelect?: (token: Token) => void;
}

export default function TokenSelector({ onClose, onSelect }: TokenSelectorProps) {
  const [activeTab, setActiveTab] = useState<'verified' | 'trending' | 'recent'>('verified');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Token[]>([]);

  useEffect(() => {
    loadTokens();
  }, [activeTab]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      searchTokens();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadTokens = async () => {
    try {
      setLoading(true);
      const endpoint = `/api/tokens/${activeTab}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      setTokens(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading tokens:', error);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const searchTokens = async () => {
    try {
      const response = await fetch(`/api/tokens/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error searching tokens:', error);
      setSearchResults([]);
    }
  };

  const handleSelectToken = async (token: Token) => {
    try {
      // Save selected token to database
      await fetch('/api/simulation/select-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      // Call onSelect callback
      if (onSelect) {
        onSelect(token);
      }

      // Close modal
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error selecting token:', error);
    }
  };

  const displayTokens = searchQuery.length > 0 ? searchResults : tokens;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Select Token</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('verified')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'verified'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <CheckCircle2 size={16} />
              Verified
            </button>
            <button
              onClick={() => setActiveTab('trending')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'trending'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <TrendingUp size={16} />
              Trending
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'recent'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Clock size={16} />
              Recent
            </button>
          </div>
        </div>

        {/* Token List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            </div>
          ) : displayTokens.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {searchQuery ? 'No tokens found' : 'No tokens available'}
            </div>
          ) : (
            <div className="space-y-2">
              {displayTokens.map((token) => (
                <button
                  key={token.id}
                  onClick={() => handleSelectToken(token)}
                  className="w-full p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-500 rounded-lg transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    {/* Token Icon */}
                    {token.icon ? (
                      <img
                        src={token.icon}
                        alt={token.symbol}
                        className="w-10 h-10 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.symbol}&background=6366f1&color=fff`;
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                        {token.symbol.charAt(0)}
                      </div>
                    )}

                    {/* Token Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{token.symbol}</span>
                        {token.isVerified && (
                          <CheckCircle2 size={16} className="text-blue-400" />
                        )}
                      </div>
                      <div className="text-sm text-gray-400">{token.name}</div>
                    </div>

                    {/* Token Stats */}
                    <div className="text-right">
                      {token.usdPrice !== undefined && (
                        <div className="text-white font-medium">
                          ${token.usdPrice < 1 ? token.usdPrice.toFixed(6) : token.usdPrice.toFixed(2)}
                        </div>
                      )}
                      {token.mcap && (
                        <div className="text-sm text-gray-400">
                          MCap: ${(token.mcap / 1e6).toFixed(2)}M
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(token.liquidity || token.holderCount) && (
                    <div className="mt-2 pt-2 border-t border-gray-700 flex gap-4 text-xs text-gray-400">
                      {token.liquidity && (
                        <span>Liquidity: ${(token.liquidity / 1e6).toFixed(2)}M</span>
                      )}
                      {token.holderCount && (
                        <span>Holders: {token.holderCount.toLocaleString()}</span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
