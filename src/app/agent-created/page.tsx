"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Copy, ArrowRight, Sparkles, Wallet, Zap } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import AgentAvatar from '@/components/AgentAvatar';

interface AgentData {
  id: string;
  name: string;
  personality: string;
  personalityType: string;
  publicKey: string;
  balance: number;
  occupation: string;
  createdAt: string;
}

export default function AgentCreatedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get agent data from URL params
    const agentData = searchParams.get('agent');
    if (agentData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(agentData));
        setAgent(parsed);
      } catch (error) {
        console.error('Failed to parse agent data:', error);
        router.push('/agent-dashboard');
      }
    }
    setLoading(false);
  }, [searchParams, router]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">Agent data not found</p>
          <Link href="/agent-dashboard">
            <button className="px-6 py-2 bg-white text-black rounded-lg font-semibold hover:bg-white/90">
              Back to Dashboard
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 -left-32 w-[500px] h-[500px] rounded-full bg-white opacity-[0.02] blur-[120px]" />
        <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-white opacity-[0.02] blur-[120px]" />
      </div>

      {/* Main Content */}
      <main className="container mx-auto py-8 px-6 relative z-10 pt-24 max-w-2xl min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center"
            >
              <Check className="w-10 h-10 text-black" />
            </motion.div>
          </div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-center mb-2"
          >
            Agent Created Successfully! 🎉
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center text-white/60 mb-8"
          >
            Your AI trading agent is now ready to participate in simulations
          </motion.p>

          {/* Agent Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 mb-8"
          >
            {/* Agent Header */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-neutral-800">
              <AgentAvatar
                name={agent.name}
                personalityType={agent.personalityType}
                size={60}
              />
              <div>
                <h2 className="text-2xl font-bold text-white">{agent.name}</h2>
                <p className="text-white/60">{agent.personalityType}</p>
              </div>
            </div>

            {/* Agent Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Personality */}
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-2">
                  Personality
                </p>
                <p className="text-white">{agent.personality}</p>
              </div>

              {/* Occupation */}
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-2">
                  Occupation
                </p>
                <p className="text-white">{agent.occupation}</p>
              </div>

              {/* Balance */}
              <div className="bg-neutral-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-white/60" />
                  <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">
                    Initial Balance
                  </p>
                </div>
                <p className="text-2xl font-bold text-green-400">{agent.balance} SOL</p>
              </div>

              {/* Creation Fee */}
              <div className="bg-neutral-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-white/60" />
                  <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">
                    Creation Fee
                  </p>
                </div>
                <p className="text-2xl font-bold text-white">0.05 SOL</p>
              </div>
            </div>

            {/* Public Key */}
            <div className="bg-neutral-800 rounded-lg p-4">
              <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-3">
                Agent Wallet Address
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm text-white/80 break-all font-mono">
                  {agent.publicKey}
                </code>
                <button
                  onClick={() => copyToClipboard(agent.publicKey)}
                  className="p-2 hover:bg-neutral-700 rounded transition-colors flex-shrink-0"
                >
                  <Copy className={`w-4 h-4 ${copied ? 'text-green-400' : 'text-white/60'}`} />
                </button>
              </div>
            </div>

            {/* Created At */}
            <div className="mt-4 text-xs text-white/40">
              Created: {new Date(agent.createdAt).toLocaleString()}
            </div>
          </motion.div>

          {/* Info Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-8"
          >
            <div className="flex gap-3">
              <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="font-semibold mb-1">Ready to Trade!</p>
                <p className="text-blue-200/80">
                  Your agent is now active and can participate in trading simulations. Start a simulation to see your agent in action!
                </p>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex gap-4"
          >
            <Link href="/agent-dashboard" className="flex-1">
              <button className="w-full px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-white/90 transition-all flex items-center justify-center gap-2">
                View Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/monitoring" className="flex-1">
              <button className="w-full px-6 py-3 bg-neutral-800 text-white rounded-lg font-semibold hover:bg-neutral-700 transition-all flex items-center justify-center gap-2">
                Start Simulation
                <Zap className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
