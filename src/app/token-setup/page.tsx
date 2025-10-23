'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TokenSelector from '@/components/TokenSelector';
import { CheckCircle, ArrowRight, TrendingUp, Activity, Users, Zap } from 'lucide-react';

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
    <div className="min-h-screen w-full relative text-white overflow-hidden bg-black">
    
    
      
      {/* Bottom Right Blurred Circle */}
      <div className="absolute bottom-0 -right-32 w-96 h-96 rounded-full bg-white opacity-5 blur-[120px] pointer-events-none" />

      {/* Center Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-white opacity-3 blur-[150px] pointer-events-none" />

      {/* Enhanced Grid Background with Fade */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #1A1A1A 1px, transparent 1px),
            linear-gradient(to bottom, #1A1A1A 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          WebkitMaskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, #000 30%, transparent 100%)",
          maskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, #000 30%, transparent 100%)",
        }}
      />

      {/* Decorative Dots Pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Bottom Gradient Glow */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6 pt-32 pb-20">
        <div className="max-w-2xl w-full">
          {/* Header with Icon Badge */}
          <div className="text-center mb-12">
   
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              Trading Simulation Setup
            </h1>
            <p className="text-white/50 text-lg md:text-xl max-w-xl mx-auto">
              Select a token to start your AI-powered trading simulation on Solana
            </p>
          </div>

          {/* Current Token Display - Enhanced */}
          <div className="relative group mb-6">
            <div className="absolute -inset-1 bg-gradient-to-r from-gray-600/20 via-white/20 to-gray-600/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 group-hover:border-white/20 transition-all">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <div className="text-sm text-white/50 mb-3 uppercase tracking-wider font-medium">Selected Token</div>
                  {loading ? (
                    <div className="text-white/60">Loading...</div>
                  ) : currentToken ? (
                    <div>
                      <div className="text-4xl font-bold text-white mb-2">
                        {currentToken.symbol || 'SOL'}
                      </div>
                      {currentToken.name && (
                        <div className="text-lg text-white/60">{currentToken.name}</div>
                      )}
                      {currentToken.usdPrice && (
                        <div className="text-base text-white/50 mt-4 flex items-center gap-2">
                          <TrendingUp size={16} />
                          Price: ${currentToken.usdPrice.toFixed(currentToken.usdPrice < 1 ? 6 : 2)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xl text-white/50">No token selected</div>
                  )}
                </div>
                <button
                  onClick={() => setShowSelector(true)}
                  className="px-8 py-4 bg-white text-black rounded-xl hover:bg-white/90 transition-all font-semibold shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 transform duration-300"
                >
                  {currentToken ? 'Change Token' : 'Select Token'}
                </button>
              </div>

              {currentToken && (
                <div className="pt-6 border-t border-white/10 grid grid-cols-3 gap-6">
                  {currentToken.mcap && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="text-xs text-white/50 mb-2 uppercase tracking-wider">Market Cap</div>
                      <div className="text-lg text-white font-bold">
                        ${(currentToken.mcap / 1e6).toFixed(2)}M
                      </div>
                    </div>
                  )}
                  {currentToken.liquidity && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="text-xs text-white/50 mb-2 uppercase tracking-wider">Liquidity</div>
                      <div className="text-lg text-white font-bold">
                        ${(currentToken.liquidity / 1e6).toFixed(2)}M
                      </div>
                    </div>
                  )}
                  {currentToken.holderCount && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="text-xs text-white/50 mb-2 uppercase tracking-wider">Holders</div>
                      <div className="text-lg text-white font-bold">
                        {currentToken.holderCount.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Features List - Enhanced */}
          <div className="relative group mb-8">
            <div className="absolute -inset-1 bg-gradient-to-r from-gray-600/20 via-white/20 to-gray-600/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 group-hover:border-white/20 transition-all">
              <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                <Zap size={24} />
                What You'll Get
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/20">
                    <Users size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-2 text-lg">AI Trading Agents</div>
                    <div className="text-sm text-white/60 leading-relaxed">
                      Multiple AI agents with different trading personalities and strategies
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/20">
                    <Activity size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-2 text-lg">Real-Time Market Data</div>
                    <div className="text-sm text-white/60 leading-relaxed">
                      Live prices and market data directly from Jupiter aggregator
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/20">
                    <TrendingUp size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-2 text-lg">Simulated Trading</div>
                    <div className="text-sm text-white/60 leading-relaxed">
                      No real money - perfect for testing strategies risk-free
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/20">
                    <CheckCircle size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-2 text-lg">Social Interactions</div>
                    <div className="text-sm text-white/60 leading-relaxed">
                      Agents communicate and share market insights in real-time
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          {currentToken && (
            <button
              onClick={handleContinue}
              className="group w-full py-5 bg-white text-black rounded-xl hover:bg-white/90 transition-all font-bold text-lg flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.3)]  transform duration-300"
            >
              Continue to Simulation
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          {!currentToken && (
            <div className="text-center py-6">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <span className="text-white/60 text-sm font-medium">Please select a token to continue</span>
              </div>
            </div>
          )}
        </div>
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
