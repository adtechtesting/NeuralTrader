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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-white opacity-5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-white opacity-5 blur-[120px]" />
      </div>

      <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 w-full max-w-3xl max-h-[85vh] flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-gray-600/20 via-white/20 to-gray-600/20 rounded-2xl blur opacity-30"></div>

        {/* Header */}
        <div className="relative p-8 border-b border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-white">Select Token</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all border border-white/10 hover:border-white/20"
              >
                <X size={24} className="text-white/70 hover:text-white" />
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Search by name or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('verified')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-semibold ${
                activeTab === 'verified'
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <CheckCircle2 size={18} />
              Verified
            </button>
            <button
              onClick={() => setActiveTab('trending')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-semibold ${
                activeTab === 'trending'
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <TrendingUp size={18} />
              Trending
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-semibold ${
                activeTab === 'recent'
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <Clock size={18} />
              Recent
            </button>
          </div>
        </div>

        {/* Token List */}
        <div className="relative flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="relative">
                <div className="animate-spin h-12 w-12 border-4 border-white/20 border-t-white rounded-full"></div>
              </div>
            </div>
          ) : displayTokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                <Search size={32} className="text-white/40" />
              </div>
              <div className="text-white/40 text-lg">
                {searchQuery ? 'No tokens found' : 'No tokens available'}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {displayTokens.map((token) => (
                <button
                  key={token.id}
                  onClick={() => handleSelectToken(token)}
                  className="group w-full p-5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all text-left backdrop-blur-sm"
                >
                  <div className="flex items-center gap-5">
                    {/* Token Icon */}
                    {token.icon ? (
                      <img
                        src={token.icon}
                        alt={token.symbol}
                        className="w-12 h-12 rounded-full border-2 border-white/10 group-hover:border-white/20"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.symbol}&background=ffffff&color=000`;
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-black font-bold text-lg border-2 border-white/10 group-hover:border-white/20">
                        {token.symbol.charAt(0)}
                      </div>
                    )}

                    {/* Token Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-lg">{token.symbol}</span>
                        {token.isVerified && (
                          <CheckCircle2 size={18} className="text-white" />
                        )}
                      </div>
                      <div className="text-base text-white/60">{token.name}</div>
                    </div>

                    {/* Token Stats */}
                    <div className="text-right">
                      {token.usdPrice !== undefined && (
                        <div className="text-white font-bold text-lg mb-1">
                          ${token.usdPrice < 1 ? token.usdPrice.toFixed(6) : token.usdPrice.toFixed(2)}
                        </div>
                      )}
                      {token.mcap && (
                        <div className="text-sm text-white/50 font-medium">
                          MCap: ${(token.mcap / 1e6).toFixed(2)}M
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(token.liquidity || token.holderCount) && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex gap-6 text-sm text-white/60 font-medium">
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
