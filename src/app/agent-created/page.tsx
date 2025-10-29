"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Copy, ArrowRight, Wallet, AlertCircle, Brain, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import AgentAvatar from '@/components/AgentAvatar';

interface AgentData {
  id: string;
  name: string;
  personality?: string;
  personalityType: string;
  publicKey: string;
  balance: number;
  occupation: string;
  createdAt: string;
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-neutral-800 border-t-white rounded-full animate-spin" />
        <p className="text-white/60 text-sm">Loading agent data...</p>
      </div>
    </div>
  );
}

export default function AgentCreatedPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AgentCreatedPageContent />
    </Suspense>
  );
}

function AgentCreatedPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const agentData = searchParams.get('agent');
    console.log('Raw agent data from URL:', agentData);
    
    if (!agentData) {
      console.error('No agent data in URL params');
      setError('No agent data found in URL');
      setLoading(false);
      return;
    }

    try {
      console.log('Decoding agent data...');
      const parsed = JSON.parse(decodeURIComponent(agentData));
      console.log('Parsed agent data:', parsed);
      
      if (!parsed.id || !parsed.name || !parsed.personalityType) {
        throw new Error('Invalid agent data structure - missing required fields');
      }
      
      setAgent(parsed);
      setError(null);
    } catch (error) {
      console.error('Failed to parse agent data:', error);
      setError('Failed to load agent data. The agent was created successfully but we couldn\'t display it.');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        <div className="fixed inset-0 z-0 bg-black" />

        <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full"
          >
            <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 text-center">
              <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-neutral-700">
                <AlertCircle className="w-10 h-10 text-white/70" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Agent Data Not Found</h2>
              <p className="text-white/60 mb-8 leading-relaxed">
                {error || 'Could not load agent information. The agent may have been created successfully.'}
              </p>
              <div className="flex gap-3">
                <Link href="/agent-dashboard" className="flex-1">
                  <button className="w-full px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-white/90 transition-all hover:scale-105">
                    View Dashboard
                  </button>
                </Link>
                <Link href="/agent-test" className="flex-1">
                  <button className="w-full px-6 py-3 bg-neutral-800 text-white rounded-xl font-semibold hover:bg-neutral-700 transition-all border border-neutral-700 hover:scale-105">
                    Create Another
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 bg-black" />

      {/* Main Content */}
      <main className="container mx-auto py-8 px-6 relative z-10 pt-24 pb-20 max-w-4xl min-h-screen flex items-center justify-center">
        <motion.div className="w-full">
          {/* Success Animation */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <Check className="w-12 h-12 text-white" strokeWidth={2.5} />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-12 space-y-3">
            <h1 className="text-3xl font-bold">
              Agent created successfully
            </h1>
            <p className="text-white/55 text-base max-w-xl mx-auto">
              Your autonomous trader is registered and funded. You can review the profile below or jump back to the dashboard.
            </p>
          </div>

          {/* Agent Card */}
          <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-2xl overflow-hidden mb-6">
            {/* Header with Avatar */}
            <div className="bg-neutral-900 p-8 border-b border-neutral-800">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <AgentAvatar
                    name={agent.name}
                    personalityType={agent.personalityType}
                    size={60}
                  />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">{agent.name}</h2>
                  <div className="flex items-center gap-2">
                    <Brain className="w-3 h-3 text-white/60" />
                    <span className="text-md text-white/80">
                      {agent.personalityType.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white/70" />
                    </div>
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">
                        Initial Balance
                      </p>
                      <p className="text-3xl font-bold text-white">{agent.balance} SOL</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/45">Ready for trading</p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white/70" />
                    </div>
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">
                        Creation Fee
                      </p>
                      <p className="text-3xl font-bold text-white">0.05 SOL</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/45">Transaction completed</p>
                </div>

                <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
                  <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-3">
                    Occupation
                  </p>
                  <p className="text-xl font-semibold text-white">{agent.occupation}</p>
                </div>

                {/* Personality Card */}
                {agent.personality && (
                  <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
                    <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-3">
                      Personality
                    </p>
                    <p className="text-xl font-semibold text-white">{agent.personality}</p>
                  </div>
                )}
              </div>

              {/* Wallet Address */}
              <div className="bg-neutral-800 rounded-xl p-5 border border-neutral-700">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">
                    Agent Wallet Address
                  </p>
                  <button
                    onClick={() => copyToClipboard(agent.publicKey)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors text-xs font-medium"
                  >
                    <Copy className={`w-3.5 h-3.5 ${copied ? 'text-white' : 'text-white/60'}`} />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <code className="text-sm text-white/80 break-all font-mono block">
                  {agent.publicKey}
                </code>
              </div>

              {/* Timestamp */}
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/40">
                <span>Created on {new Date(agent.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-6">
            <div className="flex flex-col gap-2 text-sm text-white/60">
              <p className="text-white font-semibold">Agent ready for deployment</p>
              <p>
                Review this profile on the dashboard to configure behaviors, or jump directly into monitoring to watch performance.
              </p>
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/agent-dashboard" className="group">
              <button className="w-full px-6 py-4 bg-white text-black rounded-xl font-semibold text-base hover:bg-white/90 transition-all flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5" />
                View dashboard
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/monitoring" className="group">
              <button className="w-full px-6 py-4 bg-neutral-900 text-white rounded-xl font-semibold text-base hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 border border-neutral-800">
                Start monitoring
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
