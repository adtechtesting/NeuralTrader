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
      await fetch('/api/simulation/select-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (onSelect) {
        onSelect(token);
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error selecting token:', error);
    }
  };

  const displayTokens = searchQuery.length > 0 ? searchResults : tokens;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative bg-neutral-900 rounded-xl border border-neutral-800 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="relative p-6 border-b border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Select Token</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-white/60" />
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search by name or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-neutral-600 transition-colors"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('verified')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-sm font-semibold ${
                activeTab === 'verified'
                  ? 'bg-white text-black'
                  : 'bg-neutral-800 text-white/70 hover:bg-neutral-700 hover:text-white border border-neutral-700'
              }`}
            >
              <CheckCircle2 size={16} />
              Verified
            </button>
            <button
              onClick={() => setActiveTab('trending')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-sm font-semibold ${
                activeTab === 'trending'
                  ? 'bg-white text-black'
                  : 'bg-neutral-800 text-white/70 hover:bg-neutral-700 hover:text-white border border-neutral-700'
              }`}
            >
              <TrendingUp size={16} />
              Trending
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-sm font-semibold ${
                activeTab === 'recent'
                  ? 'bg-white text-black'
                  : 'bg-neutral-800 text-white/70 hover:bg-neutral-700 hover:text-white border border-neutral-700'
              }`}
            >
              <Clock size={16} />
              Recent
            </button>
          </div>
        </div>

        {/* Token List */}
        <div className="relative flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-neutral-700 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : displayTokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-14 h-14 rounded-lg bg-neutral-800 flex items-center justify-center mb-3 border border-neutral-700">
                <Search size={24} className="text-white/30" />
              </div>
              <div className="text-white/40 text-sm">
                {searchQuery ? 'No tokens found' : 'No tokens available'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {displayTokens.map((token) => (
                <button
                  key={token.id}
                  onClick={() => handleSelectToken(token)}
                  className="group w-full p-4 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-neutral-600 rounded-lg transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    {/* Token Icon */}
                    {token.icon ? (
                      <img
                        src={token.icon}
                        alt={token.symbol}
                        className="w-10 h-10 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.symbol}&background=ffffff&color=000`;
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {token.symbol.charAt(0)}
                      </div>
                    )}

                    {/* Token Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white font-semibold text-sm truncate">{token.symbol}</span>
                        {token.isVerified && (
                          <CheckCircle2 size={14} className="text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-white/50 truncate">{token.name}</div>
                    </div>

                    {/* Token Stats */}
                    <div className="text-right flex-shrink-0">
                      {token.usdPrice !== undefined && (
                        <div className="text-white font-semibold text-sm mb-0.5">
                          ${token.usdPrice < 1 ? token.usdPrice.toFixed(6) : token.usdPrice.toFixed(2)}
                        </div>
                      )}
                      {token.mcap && (
                        <div className="text-xs text-white/40">
                          ${(token.mcap / 1e6).toFixed(2)}M
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(token.liquidity || token.holderCount) && (
                    <div className="mt-3 pt-3 border-t border-neutral-700 flex gap-4 text-xs text-white/50">
                      {token.liquidity && (
                        <span>Liq: ${(token.liquidity / 1e6).toFixed(2)}M</span>
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
