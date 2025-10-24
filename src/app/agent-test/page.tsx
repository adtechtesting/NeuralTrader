'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Users, Bot, Wallet } from 'lucide-react';
import { LogoTicker } from '@/components/ui/logoticker';

import { toast } from 'sonner';
import { useWallet } from '@solana/wallet-adapter-react';
import { clusterApiUrl, LAMPORTS_PER_SOL, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Connection } from '@solana/web3.js';

export default function AgentTestPage() {
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    personalityType: 'ANALYTICAL',
    llmProvider: 'OPENAI',
    initialBalance: 5,
    occupation: 'Trader'
  });
  const router = useRouter();

  // Wallet integration
  const wallet = useWallet();
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);
  const connection = new Connection(endpoint);
  const { connected, publicKey: walletPublicKey, signTransaction } = wallet;
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const personalityOptions = [
    { value: 'ANALYTICAL', label: 'Analytical' },
    { value: 'CREATIVE', label: 'Creative' },
    { value: 'SOCIAL', label: 'Social' },
    { value: 'STRATEGIC', label: 'Strategic' }
  ];

  const llmProviderOptions = [
    { value: 'OPENAI', label: 'OpenAI (GPT-4)' },
    { value: 'GEMINI', label: 'Google Gemini' },
    { value: 'ANTHROPIC', label: 'Anthropic Claude' },
    { value: 'MISTRAL', label: 'Mistral AI' },
    { value: 'LOCAL', label: 'Local Ollama' }
  ];

  useEffect(() => {
    if (wallet.publicKey) {
      checkBalance();
    }
  }, [wallet.publicKey]);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const checkBalance = async () => {
    if (!wallet.publicKey) return;

    try {
      const balance = await connection.getBalance(wallet.publicKey);
      const balanceInSol = balance / LAMPORTS_PER_SOL;
      setWalletBalance(balanceInSol);
    } catch (error) {
      console.error('Error getting balance:', error);
    }
  };

  useEffect(() => {
    if (!connected) {
      toast.warning('Please connect your Solana wallet to create agents');
    }
  }, [connected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !wallet.publicKey || !signTransaction) {
      toast.error('Please connect your wallet to create agents');
      return;
    }

    if (walletBalance !== null && walletBalance < 0.05) {
      toast.error('Insufficient balance. Need at least 0.05 SOL for agent creation fee');
      return;
    }

    setLoading(true);

    try {
      // Create transaction for 0.05 SOL agent creation fee
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey('11111111111111111111111111111112'), // Burn address or fee collector
          lamports: 0.05 * LAMPORTS_PER_SOL,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      const signedTransaction = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());

      console.log('Agent creation fee paid:', signature);
      await connection.confirmTransaction(signature);

      // Create agent after successful transaction
      const response = await fetch('/api/create-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          walletPublicKey: wallet.publicKey.toString(),
          walletSignature: signature
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${formData.name} created successfully! Fee: 0.05 SOL (transaction verified)`);
        setFormData({
          name: '',
          personalityType: 'ANALYTICAL',
          llmProvider: 'OPENAI',
          initialBalance: 5,
          occupation: 'Trader'
        });
        loadAgents();
        checkBalance(); // Refresh balance
      } else {
        toast.error(data.error || 'Failed to create agent');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative text-white overflow-hidden bg-black">
      {/* Enhanced Grid Background - Primary Layer */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Enhanced Grid Background - Fine Layer */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.015) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.015) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Enhanced Bottom Glow */}
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-full h-[500px] pointer-events-none">
        <div
          className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-[60%] w-[2000px] h-[2000px] rounded-full"
          style={{
            backgroundColor: 'black',
            boxShadow: `
              inset 0 0 100px 20px rgba(255, 255, 255, 0.035),
              inset 0 0 180px 50px rgba(255, 255, 255, 0.05)
            `,
            backgroundImage: `
              radial-gradient(circle, rgba(255, 255, 255, 0.5) 0.5px, transparent 0.5px),
              radial-gradient(circle, rgba(255, 255, 255, 0.3) 0.5px, transparent 0.5px)
            `,
            backgroundSize: "60px 60px, 60px 60px",
            backgroundPosition: "0 0, 30px 30px",
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 pt-16 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Create Agent</h1>
              <p className="text-white/60 text-lg">Create AI trading agents with a 0.05 SOL creation fee on Solana devnet</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-white/60" />
                  <span className="text-sm text-white/60">Balance:</span>
                  <span className="text-white font-semibold">
                    {walletBalance !== null ? `${walletBalance.toFixed(4)} SOL` : '0.0000 SOL'}
                  </span>
                </div>
                {walletBalance !== null && walletBalance < 0.05 && (
                  <p className="text-xs text-red-400 mt-1">Need 0.05 SOL for agent creation fee</p>
                )}
              </div>

              {!connected && (
                <div className="bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-xl px-5 py-3">
                  <p className="text-sm text-red-300">Wallet not connected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Creation Form Section */}
      <section className="relative bg-black py-16 px-6">
        <div className="relative z-10 container mx-auto max-w-4xl">
          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative group mb-16"
          >
            <div className="absolute -inset-1 bg-white/5 rounded-2xl blur opacity-40"></div>
            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-10 py-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="mb-6 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <p className="text-sm text-yellow-200 text-center">
                    💰 <strong>0.05 SOL transaction required!</strong> Agent creation fee will be deducted from your wallet.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Agent Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-white/20 focus:outline-none transition-colors"
                      placeholder="Enter agent name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Personality Type</label>
                    <select
                      value={formData.personalityType}
                      onChange={(e) => setFormData({ ...formData, personalityType: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-white/20 focus:outline-none transition-colors"
                    >
                      {personalityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">LLM Provider</label>
                    <select
                      value={formData.llmProvider}
                      onChange={(e) => setFormData({ ...formData, llmProvider: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-white/20 focus:outline-none transition-colors"
                    >
                      {llmProviderOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Initial Balance (SOL)</label>
                    <input
                      type="number"
                      value={formData.initialBalance}
                      onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) })}
                      min="1"
                      step="0.1"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-white/20 focus:outline-none transition-colors"
                      placeholder="5"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/80 mb-2">Occupation</label>
                    <input
                      type="text"
                      value={formData.occupation}
                      onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-white/20 focus:outline-none transition-colors"
                      placeholder="e.g., Full-time Trader, Financial Analyst"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-white/90 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
                  ) : (
                    <>
                      <Bot className="w-5 h-5" />
                      Create Agent
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>

          {/* Agents List Section */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              Your Created Agents
            </h2>
            <p className="text-white/50 text-md max-w-xl mx-auto">
              View and manage the AI agents you've created
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.length === 0 ? (
              <div className="md:col-span-2 lg:col-span-3 text-center py-12">
                <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/50 text-lg">No agents created yet. Create your first agent above!</p>
              </div>
            ) : (
              agents.map((agent) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="relative group"
                >
                  <div className="absolute -inset-1 bg-white/5 rounded-2xl blur opacity-40"></div>
                  <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <Bot className="w-5 h-5 text-white/80" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                        <p className="text-sm text-white/50">{agent.occupation}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-white/60">Personality:</span>
                        <span className="text-sm text-white/80">{agent.personalityType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-white/60">LLM Provider:</span>
                        <span className="text-sm text-white/80">{agent.llmProvider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-white/60">Balance:</span>
                        <span className="text-sm text-white/80">{agent.walletBalance} SOL</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Logo Ticker */}
      <LogoTicker />

      {/* Footer */}
      <footer className="relative bg-black py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-xl font-bold text-white">ℕ𝕖𝕦𝕣𝕒𝕝𝕥𝕣𝕒𝕕𝕖𝕣</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-md mx-auto mb-6">
              AI-powered trading simulation platform for Solana. Experience the future of trading with intelligent agents.
            </p>
            <div className="flex items-center justify-center gap-4">
              <a href="#" className="text-white/50 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
                </svg>
              </a>
              <a href="#" className="text-white/50 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
            <div className="pt-8 border-t border-white/5 mt-8">
              <div className="text-white/40 text-sm">
                © {new Date().getFullYear()} NeuralTrader. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}