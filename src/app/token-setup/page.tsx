'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TokenSelector from '@/components/TokenSelector';
import { CheckCircle, ArrowRight, TrendingUp, Activity, Users, Zap, Sparkles } from 'lucide-react';
import { StripedPattern } from '@/components/ui/strippedpattern';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from "sonner";
import { Spotlight } from '@/components/ui/spotlight';
import { LightRays } from '@/components/ui/lightrays';
export default function TokenSetupPage() {
   const {connected} = useWallet();
  const router = useRouter();
  const [showSelector, setShowSelector] = useState(false);
  const [currentToken, setCurrentToken] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  const formatCurrency = (value?: number) => {
    if (!value || Number.isNaN(value)) return '--';
    if (value < 1) {
      return `$${value.toFixed(6)}`;
    }
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatCompactNumber = (value?: number) => {
    if (!value || Number.isNaN(value)) return '--';
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return value.toString();
  };

  const featureCards = [
    {
      icon: Users,
      title: "AI Trading Squads",
      desc: "Deploy diverse agents that collaborate and debate before every trade.",
    },
    {
      icon: Activity,
      title: "Live Market Telemetry",
      desc: "Stream price action, liquidity and on-chain flow directly into your sim.",
    },
    {
      icon: TrendingUp,
      title: "Risk-Free Execution",
      desc: "Prototype trading theses without capital exposure or wallet risk.",
    },
    {
      icon: CheckCircle,
      title: "Conversation-Aware",
      desc: "Agents share market calls in real-time so you never miss high-conviction moves.",
    }
  ];

  const setupSteps = [
    {
      step: '01',
      title: 'Select Market Token',
      copy: 'Choose the asset your agents will track and trade inside the simulation.',
    },
    {
      step: '02',
      title: 'Review Live Metrics',
      copy: 'Confirm liquidity, holder depth and momentum before launching agents.',
    },
    {
      step: '03',
      title: 'Launch Simulation',
      copy: 'Push to the monitoring suite and let NeuralTrader orchestrate execution.',
    }
  ];

  return (
    <div className="min-h-screen w-full relative text-white overflow-hidden bg-black">
       <Spotlight />
        <LightRays />
        <StripedPattern className="[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]" />
      {/* Background Effects - Same as Original */}
      <div className="absolute bottom-0 -right-32 w-96 h-96 rounded-full bg-white opacity-5 blur-[120px] pointer-events-none" />
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
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 pt-32 pb-24">
        <div className="w-full max-w-5xl space-y-12">
          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs uppercase tracking-[0.28em] text-white/60">
             NeuralTrader 
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
             Select a Market Token and Ignite the Simulation
            </h1>
            <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto">
             Pick a token, set the stage, and watch your AI traders debate, learn, and compete to balance the market.
            </p>
          </div>

        

          {/* Token Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-3xl blur opacity-40 group-hover:opacity-60 transition-all duration-500"></div>
            <div className="relative border border-white/10 rounded-3xl bg-black/60 backdrop-blur-2xl overflow-hidden">
              <div className="relative p-8 flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.32em] text-white/40 font-semibold mb-3">Selected Token</p>
                      {loading ? (
                        <div className="space-y-4">
                          <div className="h-10 w-40 bg-white/5 rounded-lg animate-pulse" />
                          <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                          <div className="h-8 w-32 bg-white/5 rounded-lg animate-pulse" />
                        </div>
                      ) : currentToken ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-4xl font-bold text-white tracking-tight">{currentToken.symbol || 'SOL'}</span>
                            {currentToken.chain && (
                              <span className="text-[11px] uppercase tracking-[0.2em] text-white/50 border border-white/10 rounded-full px-3 py-1">
                                {currentToken.chain}
                              </span>
                            )}
                          </div>
                          {currentToken.name && (
                            <p className="text-sm text-white/60">{currentToken.name}</p>
                          )}
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-sm text-white/60">
                            <TrendingUp size={16} className="text-white" />
                            <span>{formatCurrency(currentToken.usdPrice)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-base text-white/60">No token selected yet</div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowSelector(true)}
                      className="px-6 py-3 h-fit bg-white text-black rounded-xl font-semibold text-sm hover:bg-white/90 transition-all shadow-[0_0_24px_rgba(255,255,255,0.18)] hover:shadow-[0_0_36px_rgba(255,255,255,0.25)]"
                    >
                      {currentToken ? 'Change Token' : 'Select Token'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        label: 'Market Cap',
                        value: currentToken ? formatCompactNumber(currentToken.mcap) : '--',
                      },
                      {
                        label: 'Liquidity',
                        value: currentToken ? formatCompactNumber(currentToken.liquidity) : '--',
                      },
                      {
                        label: 'Holder Count',
                        value: currentToken ? formatCompactNumber(currentToken.holderCount) : '--',
                      }
                    ].map((metric, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="text-[11px] uppercase tracking-widest text-white/40 mb-2 font-semibold">
                          {metric.label}
                        </div>
                        <div className="text-lg font-semibold text-white">{metric.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:w-64 space-y-5">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-3 font-semibold">Simulation Summary</p>
                    <ul className="space-y-3 text-sm text-white/60">
                      <li className="flex items-start gap-2">
      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60"></span>
      <span>AI trading squads rebalance exposure dynamically as they debate and react to real market signals.</span>
    </li>
    <li className="flex items-start gap-2">
      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/40"></span>
      <span>Each agent learns and adapts through interaction — adjusting risk, liquidity positions, and trading bias on the fly.</span>
    </li>
    <li className="flex items-start gap-2">
      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/30"></span>
      <span>Switch tokens at any time — NeuralTrader recalibrates the entire simulation instantly without stopping agent behavior.</span>
    </li>
                    </ul>
                  </div>

                
                </div>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {setupSteps.map((item) => (
              <div key={item.step} className="relative rounded-2xl border border-white/10 bg-black/50 p-5 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                <div className="text-xs uppercase tracking-[0.3em] text-white/30 mb-4 font-semibold">{item.step}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{item.copy}</p>
              </div>
            ))}
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featureCards.map((feature, i) => (
              <div key={i} className="relative group rounded-2xl border border-white/10 bg-black/50 p-6 overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                  backgroundImage: 'linear-gradient(120deg, rgba(255,255,255,0.08) 0%, transparent 40%)'
                }} />
                <div className="relative flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                    <feature.icon size={20} className="text-white" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-base font-semibold text-white">{feature.title}</h4>
                    <p className="text-sm text-white/50 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Continue CTA */}
          {currentToken ? (
            <button
              onClick={handleContinue}
              className="group w-full py-4 rounded-2xl bg-white text-black font-semibold text-base flex items-center justify-center gap-2 hover:bg-white/90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.18)] hover:shadow-[0_0_50px_rgba(255,255,255,0.25)]"
            >
              Enter Monitoring Suite
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse"></div>
                <span className="text-sm text-white/60 font-medium">Select a token to unlock the simulation dashboard</span>
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
