'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TokenSelector from '@/components/TokenSelector';
import { Coins, CheckCircle, ArrowRight } from 'lucide-react';

export default function TokenSetupPage() {
  const router = useRouter();
  const [showSelector, setShowSelector] = useState(false);
  const [currentToken, setCurrentToken] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentToken();
  }, []);

  const fetchCurrentToken = async () => {
    try {
      const response = await fetch('/api/simulation/config');
      const data = await response.json();
      setCurrentToken(data.selectedToken);
    } catch (err) {
      console.error('Failed to fetch current token:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSelect = (token: any) => {
    setCurrentToken(token);
    setShowSelector(false);
  };

  const handleContinue = () => {
    router.push('/monitoring');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
            <Coins size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Trading Simulation Setup
          </h1>
          <p className="text-gray-400 text-lg">
            Select a token to start your AI-powered trading simulation
          </p>
        </div>

        {/* Current Token Display */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">Selected Token</div>
              {loading ? (
                <div className="text-gray-500">Loading...</div>
              ) : currentToken ? (
                <div>
                  <div className="text-2xl font-bold text-white mb-2">
                    {currentToken.symbol || 'SOL'}
                  </div>
                  {currentToken.name && (
                    <div className="text-sm text-gray-400">{currentToken.name}</div>
                  )}
                  {currentToken.usdPrice && (
                    <div className="text-sm text-gray-400 mt-2">
                      Price: ${currentToken.usdPrice.toFixed(currentToken.usdPrice < 1 ? 6 : 2)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xl text-gray-500">No token selected</div>
              )}
            </div>
            <button
              onClick={() => setShowSelector(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
            >
              {currentToken ? 'Change Token' : 'Select Token'}
            </button>
          </div>

          {currentToken && (
            <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-3 gap-4">
              {currentToken.mcap && (
                <div>
                  <div className="text-xs text-gray-500">Market Cap</div>
                  <div className="text-sm text-white font-medium">
                    ${(currentToken.mcap / 1e6).toFixed(2)}M
                  </div>
                </div>
              )}
              {currentToken.liquidity && (
                <div>
                  <div className="text-xs text-gray-500">Liquidity</div>
                  <div className="text-sm text-white font-medium">
                    ${(currentToken.liquidity / 1e6).toFixed(2)}M
                  </div>
                </div>
              )}
              {currentToken.holderCount && (
                <div>
                  <div className="text-xs text-gray-500">Holders</div>
                  <div className="text-sm text-white font-medium">
                    {currentToken.holderCount.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Features List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">What You'll Get</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-white font-medium">AI Trading Agents</div>
                <div className="text-sm text-gray-400">
                  Multiple AI agents with different trading personalities
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-white font-medium">Real-Time Market Data</div>
                <div className="text-sm text-gray-400">
                  Live prices and market data from Jupiter
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-white font-medium">Simulated Trading</div>
                <div className="text-sm text-gray-400">
                  No real money - perfect for testing strategies
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-white font-medium">Social Interactions</div>
                <div className="text-sm text-gray-400">
                  Agents communicate and share market insights
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        {currentToken && (
          <button
            onClick={handleContinue}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
          >
            Continue to Simulation
            <ArrowRight size={20} />
          </button>
        )}

        {!currentToken && (
          <div className="text-center text-gray-500 text-sm">
            Please select a token to continue
          </div>
        )}
      </div>

      {/* Token Selector Modal */}
      {showSelector && (
        <TokenSelector 
          onClose={() => setShowSelector(false)}
          onSelect={handleTokenSelect}
        />
      )}
    </div>
  );
}
