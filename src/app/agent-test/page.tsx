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
    personalityType: 'MODERATE',
    llmProvider: 'GROQ',
    initialBalance: 5,
    occupation: 'Trader'
  });
  const [customBehaviors, setCustomBehaviors] = useState<string[]>([]);
  const [newBehavior, setNewBehavior] = useState('');
  const router = useRouter();

  // Wallet integration
  const wallet = useWallet();
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);
  const connection = new Connection(endpoint);
  const { connected, publicKey: walletPublicKey, signTransaction } = wallet;
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const personalityOptions = [
    { value: 'CONSERVATIVE', label: 'Conservative' },
    { value: 'MODERATE', label: 'Moderate' },
    { value: 'AGGRESSIVE', label: 'Aggressive' },
    { value: 'TREND_FOLLOWER', label: 'Trend Follower' },
    { value: 'CONTRARIAN', label: 'Contrarian' },
    { value: 'TECHNICAL', label: 'Technical Analyst' },
    { value: 'FUNDAMENTAL', label: 'Fundamental' },
    { value: 'EMOTIONAL', label: 'Emotional' },
    { value: 'WHALE', label: 'Whale' },
    { value: 'NOVICE', label: 'Novice' }
  ];

  const llmProviderOptions = [
    { value: 'GROQ', label: 'Groq (Llama 3)' },
    { value: 'OPENAI', label: 'OpenAI (GPT-4)' },
    { value: 'GEMINI', label: 'Google Gemini' },
    { value: 'ANTHROPIC', label: 'Anthropic Claude' }
  ];

  useEffect(() => {
    if (wallet.publicKey) {
      checkBalance();
    }
  }, [wallet.publicKey]);

  useEffect(() => {
    if (walletPublicKey) {
      loadAgents();
    } else {
      setAgents([]);
    }
  }, [walletPublicKey]);

  const loadAgents = async () => {
    if (!walletPublicKey) {
      setAgents([]);
      return;
    }

    try {
      const url = new URL('/api/agents', window.location.origin);
      url.searchParams.append('creatorWallet', walletPublicKey.toString());
      const response = await fetch(url.toString());
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
          walletSignature: signature,
          customBehaviors
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${formData.name} created successfully!`);
        
        // Redirect to success page with agent data
        const agentData = encodeURIComponent(JSON.stringify(data.agent));
        router.push(`/agent-created?agent=${agentData}`);
      } else {
        toast.error(data.error || 'Failed to create agent');
        console.error('API Error:', data);
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
      <header className="relative z-10 pt-24 pb-8 px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(120deg, rgba(255,255,255,0.08) 0%, transparent 45%)' }} />
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs uppercase tracking-[0.28em] text-white/60">
                  NeuralTrader Agent Builder
                </div>
                <div className="space-y-2">
                  <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">Launch a production-grade AI trading agent</h1>
                  <p className="text-white/55 text-base md:text-lg max-w-2xl">
                    Configure personality, fund an on-chain wallet, and deploy to the NeuralTrader simulation in minutes.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-white/60">
                  {[{
                    label: 'Creation Fee',
                    value: '0.05 SOL',
                    helper: 'Transferred to protocol escrow'
                  }, {
                    label: 'Max Behavior Rules',
                    value: 'Unlimited',
                    helper: 'Stack instructions for fine control'
                  }, {
                    label: 'Wallet Status',
                    value: connected ? 'Connected' : 'Disconnected',
                    helper: connected ? 'Ready to launch agent' : 'Connect to continue'
                  }].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-white/40 mb-1 font-semibold">{item.label}</p>
                      <div className="text-lg font-semibold text-white">{item.value}</div>
                      <p className="text-[11px] text-white/50 mt-2">{item.helper}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full max-w-xs space-y-3">
                <div className="rounded-2xl border border-white/15 bg-white/5 px-5 py-4">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-white/40 mb-2 font-semibold">Wallet Overview</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white/65" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-white/50">Current Balance</p>
                      <p className="text-lg font-semibold text-white">
                        {walletBalance !== null ? `${walletBalance.toFixed(4)} SOL` : '0.0000 SOL'}
                      </p>
                    </div>
                  </div>
                </div>
                {!connected && (
                  <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-3">
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      Wallet not connected
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <section className="relative z-10 px-6 pb-20">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white uppercase tracking-[0.3em]">Agent Parameters</h2>
                    <p className="text-xs text-white/50">Define how your agent will behave and allocate capital.</p>
                  </div>
                  <div className="text-xs text-white/45">All settings can be edited after creation via dashboard</div>
                </div>

                <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200 text-center">
                  0.05 SOL will be transferred to fund the agent’s execution wallet
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-white/60 uppercase tracking-[0.28em]">Agent Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2.75 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm placeholder-white/40 focus:border-neutral-600 focus:outline-none transition-colors"
                        placeholder="e.g., Solana Whale, Market Maker"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-white/60 uppercase tracking-[0.28em]">Personality Type</label>
                      <select
                        value={formData.personalityType}
                        onChange={(e) => setFormData({ ...formData, personalityType: e.target.value })}
                        className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm focus:border-neutral-600 focus:outline-none transition-colors"
                      >
                        {personalityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-white/60 uppercase tracking-[0.28em]">LLM Provider</label>
                      <select
                        value={formData.llmProvider}
                        onChange={(e) => setFormData({ ...formData, llmProvider: e.target.value })}
                        className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm focus:border-neutral-600 focus:outline-none transition-colors"
                      >
                        {llmProviderOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-white/60 uppercase tracking-[0.28em]">Initial Balance (SOL)</label>
                      <input
                        type="number"
                        value={formData.initialBalance}
                        onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) })}
                        min="1"
                        step="0.1"
                        className="w-full px-4 py-2.75 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm placeholder-white/40 focus:border-neutral-600 focus:outline-none transition-colors"
                        placeholder="5"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-xs font-semibold text-white/60 uppercase tracking-[0.28em]">Occupation</label>
                      <input
                        type="text"
                        value={formData.occupation}
                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        className="w-full px-4 py-2.75 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm placeholder-white/40 focus:border-neutral-600 focus:outline-none transition-colors"
                        placeholder="e.g., Market Maker, Risk Analyst"
                      />
                    </div>
                  </div>

                  {/* Custom Behaviors */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-semibold text-white/60 uppercase tracking-[0.28em]">Trading Behaviors</label>
                        <p className="text-xs text-white/45">Optional rule set to guide execution logic.</p>
                      </div>
                      <span className="text-[11px] text-white/40">{customBehaviors.length} added</span>
                    </div>

                    <div className="space-y-2">
                      {customBehaviors.map((behavior, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-800/40 px-3 py-2">
                          <input
                            type="text"
                            value={behavior}
                            onChange={(e) => {
                              const updated = [...customBehaviors];
                              updated[i] = e.target.value;
                              setCustomBehaviors(updated);
                            }}
                            className="flex-1 bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setCustomBehaviors(customBehaviors.filter((_, idx) => idx !== i))}
                            className="px-2 py-1 text-xs text-white/50 hover:text-white">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={newBehavior}
                        onChange={(e) => setNewBehavior(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newBehavior.trim()) {
                            setCustomBehaviors([...customBehaviors, newBehavior]);
                            setNewBehavior('');
                          }
                        }}
                        placeholder="Add behavior instruction... (Press Enter)"
                        className="flex-1 px-4 py-2.75 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm placeholder-white/40 focus:border-neutral-600 focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newBehavior.trim()) {
                            setCustomBehaviors([...customBehaviors, newBehavior]);
                            setNewBehavior('');
                          }
                        }}
                        className="px-4 py-2.75 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-white text-sm transition-colors"
                      >
                        Add Rule
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !connected}
                    className="w-full bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-[0.3em]">Launch Checklist</h3>
                  <span className="text-xs text-white/45">Auto-updates with wallet state</span>
                </div>
                <div className="space-y-3 text-sm text-white/65">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-white' : 'bg-white/20'} animate-pulse`}></div>
                    {connected ? 'Wallet connected' : 'Connect wallet to continue'}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${walletBalance !== null && walletBalance >= 0.05 ? 'bg-white' : 'bg-white/20'} animate-pulse`}></div>
                    {walletBalance !== null && walletBalance >= 0.05 ? 'Sufficient balance for creation fee' : 'Need at least 0.05 SOL'}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${formData.name ? 'bg-white' : 'bg-white/20'} animate-pulse`}></div>
                    Agent profile configured
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white uppercase tracking-[0.3em]">Your Squad</h3>
                <div className="rounded-2xl border border-neutral-800 bg-neutral-800/40 px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white/60" />
                  </div>
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-[0.2em]">Active Agents</p>
                    <p className="text-xl font-semibold text-white">{agents.length}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-800 bg-neutral-800/40 px-4 py-3 text-xs text-white/55 leading-relaxed">
                  Agents inherit the personality archetypes you select here. You can iterate on behavior rules and funding from the main dashboard after launch.
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-[0.3em] mb-3">Help & Guidance</h3>
                <ul className="text-xs text-white/50 space-y-2">
                  <li>• LLM provider determines linguistic reasoning style.</li>
                  <li>• Personality types inform risk appetite and trade cadence.</li>
                  <li>• Custom behaviors override default playbooks moment-to-moment.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Agents List */}
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-white">Agents you’ve launched</h2>
                <p className="text-xs text-white/50">Personal roster scoped to this wallet.</p>
              </div>
              <button
                onClick={loadAgents}
                className="px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all flex items-center gap-2"
              >
                Refresh
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {agents.length === 0 ? (
              <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-12 text-center space-y-3">
                <Users className="w-12 h-12 text-white/25 mx-auto" />
                <p className="text-white/60 font-semibold">No agents created yet</p>
                <p className="text-sm text-white/45">Deploy your first agent to see it appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-3 hover:border-neutral-700 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white truncate">{agent.name}</h3>
                        <p className="text-xs text-white/50 truncate">{agent.occupation}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-neutral-800 bg-neutral-800/40 p-3 text-xs text-white/60 space-y-2">
                      <div className="flex justify-between">
                        <span>Personality</span>
                        <span className="text-white">{agent.personalityType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Public Key</span>
                        <span className="text-white">{agent.publicKey?.substring(0, 16)}...</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-neutral-800">
                        <span>Balance</span>
                        <span className="text-green-400 font-semibold">{agent.balance.toFixed(2)} SOL</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
