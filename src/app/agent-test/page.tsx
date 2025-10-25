'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Users, Bot, Wallet, AlertCircle } from 'lucide-react';
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
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey('11111111111111111111111111111112'),
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
        toast.success(`${formData.name} created successfully!`);
        setFormData({
          name: '',
          personalityType: 'ANALYTICAL',
          llmProvider: 'OPENAI',
          initialBalance: 5,
          occupation: 'Trader'
        });
        loadAgents();
        checkBalance();
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
    <div className="min-h-screen bg-black">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 -left-32 w-[500px] h-[500px] rounded-full bg-white opacity-[0.02] blur-[120px]" />
        <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-white opacity-[0.02] blur-[120px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 pt-24 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Create AI Agent</h1>
              <p className="text-white/50">Create trading agents and trade with simulation environment</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {connected && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white/60">Balance:</span>
                    <span className="text-white font-semibold text-sm">
                      {walletBalance !== null ? `${walletBalance.toFixed(4)} SOL` : '0.0000 SOL'}
                    </span>
                  </div>
                </div>
              )}

              {!connected && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">Wallet not connected</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className="lg:col-span-2">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Fee Notice */}
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-sm text-yellow-200 text-center">
                      💰 <strong>0.05 SOL required</strong> for agent creation
                    </p>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Agent Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-white/40 focus:border-neutral-600 focus:outline-none transition-colors"
                        placeholder="Enter agent name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Personality Type</label>
                      <select
                        value={formData.personalityType}
                        onChange={(e) => setFormData({ ...formData, personalityType: e.target.value })}
                        className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:border-neutral-600 focus:outline-none transition-colors"
                      >
                        {personalityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">LLM Provider</label>
                      <select
                        value={formData.llmProvider}
                        onChange={(e) => setFormData({ ...formData, llmProvider: e.target.value })}
                        className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:border-neutral-600 focus:outline-none transition-colors"
                      >
                        {llmProviderOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Initial Balance (SOL)</label>
                      <input
                        type="number"
                        value={formData.initialBalance}
                        onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) })}
                        min="1"
                        step="0.1"
                        className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-white/40 focus:border-neutral-600 focus:outline-none transition-colors"
                        placeholder="5"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white/70 mb-2">Occupation</label>
                      <input
                        type="text"
                        value={formData.occupation}
                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-white/40 focus:border-neutral-600 focus:outline-none transition-colors"
                        placeholder="e.g., Trader, Analyst"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !connected}
                    className="w-full bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
                    ) : (
                      <>
                        <Bot className="w-5 h-5" />
                        Create Agent (0.05 SOL)
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Stats Section */}
            <div className="space-y-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wider">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Total Agents</span>
                    <span className="text-lg font-bold text-white">{agents.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Creation Fee</span>
                    <span className="text-lg font-bold text-white">0.05 SOL</span>
                  </div>
                  {walletBalance !== null && (
                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                      <span className="text-sm text-white/60">Your Balance</span>
                      <span className={`text-lg font-bold ${walletBalance >= 0.05 ? 'text-green-400' : 'text-red-400'}`}>
                        {walletBalance.toFixed(4)} SOL
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wider">Need Help?</h3>
                <p className="text-xs text-white/50 leading-relaxed mb-3">
                  Connect your Solana wallet and ensure you have at least 0.05 SOL for agent creation fees.
                </p>
               
              </div>
            </div>
          </div>

          {/* Agents List */}
          <div className="mt-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">Your Agents</h2>
              <p className="text-white/50 text-sm">Manage your created AI trading agents</p>
            </div>

            {agents.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
                <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/40">No agents created yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-neutral-800 rounded-lg">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white truncate">{agent.name}</h3>
                        <p className="text-xs text-white/50 truncate">{agent.occupation}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/50">Type:</span>
                        <span className="text-white">{agent.personalityType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">Provider:</span>
                        <span className="text-white">{agent.llmProvider}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-neutral-800">
                        <span className="text-white/50">Balance:</span>
                        <span className="text-green-400 font-semibold">{agent.walletBalance} SOL</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
