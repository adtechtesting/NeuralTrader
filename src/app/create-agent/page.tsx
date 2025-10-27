"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  Shield, 
  Target,
  Sparkles,
  ChevronRight,
  Check,
  Info,
  Wallet,
  Plus,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Personality types with detailed descriptions
const PERSONALITIES = {
  CONSERVATIVE: {
    name: "Conservative",
    icon: Shield,
    description: "Prioritizes capital preservation with minimal risk",
    defaultBehaviors: [
      "Only trade when price moves less than 2% in 15 minutes",
      "Set stop loss at 1% below entry",
      "Take profit at 2% above entry",
      "Wait for 3 confirmation signals before trading"
    ],
    riskLevel: "Low",
    tradeFrequency: "Rare",
    idealFor: "Long-term value investors",
    color: "blue"
  },
  MODERATE: {
    name: "Moderate",
    icon: Target,
    description: "Balanced approach between risk and reward",
    defaultBehaviors: [
      "Trade when price moves 2-5% in 15 minutes",
      "Set stop loss at 2% below entry",
      "Take profit at 4% above entry",
      "Analyze both technical and fundamental factors"
    ],
    riskLevel: "Medium",
    tradeFrequency: "Regular",
    idealFor: "Balanced traders",
    color: "green"
  },
  AGGRESSIVE: {
    name: "Aggressive",
    icon: Zap,
    description: "High-risk, high-reward trading strategy",
    defaultBehaviors: [
      "Trade on any significant price movement above 5%",
      "Set stop loss at 5% below entry",
      "Take profit at 10% above entry",
      "Seek volatile opportunities"
    ],
    riskLevel: "High",
    tradeFrequency: "Very Active",
    idealFor: "Risk-tolerant traders",
    color: "red"
  },
  TREND_FOLLOWER: {
    name: "Trend Follower",
    icon: TrendingUp,
    description: "Follows market momentum and price action",
    defaultBehaviors: [
      "Buy when price is in uptrend for 3+ candles",
      "Sell when trend reverses",
      "Use moving averages to confirm trend",
      "Ride trends until momentum fades"
    ],
    riskLevel: "Medium",
    tradeFrequency: "Active",
    idealFor: "Momentum traders",
    color: "purple"
  },
  CONTRARIAN: {
    name: "Contrarian",
    icon: Brain,
    description: "Goes against prevailing market sentiment",
    defaultBehaviors: [
      "Buy when price drops 10% or more",
      "Sell when price rises 15% or more",
      "Look for market overreactions",
      "Trade against the crowd"
    ],
    riskLevel: "Medium-High",
    tradeFrequency: "Selective",
    idealFor: "Counter-trend traders",
    color: "orange"
  }
};

export default function CreateAgentPage() {
  const { connected, publicKey, signMessage } = useWallet();
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [selectedPersonality, setSelectedPersonality] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('');
  const [occupation, setOccupation] = useState('Trader');
  const [customBehaviors, setCustomBehaviors] = useState<string[]>([]);
  const [newBehavior, setNewBehavior] = useState('');
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !connected) {
      router.push("/");
      toast.warning("Connect your Solana wallet to create an AI agent");
    }
  }, [mounted, connected, router]);

  const handleCreateAgent = async () => {
    if (!agentName.trim()) {
      toast.error("Please enter an agent name");
      return;
    }

    if (!selectedPersonality) {
      toast.error("Please select a personality type");
      return;
    }

    if (!publicKey || !signMessage) {
      toast.error("Wallet not connected properly");
      return;
    }

    setCreating(true);

    try {
      // Create message to sign for verification
      const message = new TextEncoder().encode(
        `Create AI Agent: ${agentName}\nFee: 0.05 SOL\nTimestamp: ${Date.now()}`
      );

      // Request signature from wallet
      toast.info("Please sign the transaction in your wallet...");
      const signature = await signMessage(message);
      const signatureBase58 = Buffer.from(signature).toString('base64');

      toast.loading("Creating your AI agent...");

      // Call API to create agent
      const response = await fetch('/api/create-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: agentName,
          personalityType: selectedPersonality,
          occupation,
          walletPublicKey: publicKey.toString(),
          walletSignature: signatureBase58,
          initialBalance: 5,
          customBehaviors
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`🎉 ${agentName} created successfully!`);
        
        // Redirect to monitoring page
        setTimeout(() => {
          router.push('/monitoring');
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to create agent');
      }
    } catch (error: any) {
      console.error('Error creating agent:', error);
      
      if (error.message?.includes('User rejected')) {
        toast.error('Transaction cancelled');
      } else if (error.message?.includes('insufficient funds')) {
        toast.error('Insufficient SOL balance. Please add funds to your wallet.');
      } else {
        toast.error(error.message || 'Failed to create agent. Please try again.');
      }
    } finally {
      setCreating(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Grid */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Gradient Overlay */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 50%)",
        }}
      />

      {/* Main Content */}
      <main className="container mx-auto py-8 px-6 relative z-10 pt-24 pb-20 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold mb-4"
          >
            Create Your AI Trading Agent
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/50 text-lg max-w-2xl mx-auto"
          >
            Design a custom AI agent with unique personality and trading behavior
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/5 border border-white/10 rounded-lg"
          >
            <Wallet className="w-4 h-4 text-white/60" />
            <span className="text-sm text-white/60">Creation Fee: <span className="text-white font-semibold">0.05 SOL</span> (Devnet)</span>
          </motion.div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12 gap-2">
          {[
            { num: 1, label: "Personality" },
            { num: 2, label: "Configure" },
            { num: 3, label: "Confirm" }
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className={`flex items-center gap-2 transition-all ${step >= s.num ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  step > s.num 
                    ? 'bg-green-500 text-black' 
                    : step === s.num 
                    ? 'bg-white text-black scale-110' 
                    : 'bg-neutral-800 text-white/60'
                }`}>
                  {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                </div>
                <span className="text-sm font-medium hidden md:block">{s.label}</span>
              </div>
              {i < 2 && <ChevronRight className="w-5 h-5 text-white/20 mx-1" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Personality */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {Object.entries(PERSONALITIES).map(([key, personality]) => {
                  const Icon = personality.icon;
                  const isSelected = selectedPersonality === key;
                  
                  return (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedPersonality(key);
                        setCustomBehaviors(personality.defaultBehaviors);
                      }}
                      className={`relative p-6 rounded-xl border-2 transition-all text-left group ${
                        isSelected 
                          ? 'border-white bg-neutral-900 shadow-xl' 
                          : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${
                        isSelected ? 'bg-white text-black' : 'bg-neutral-800 text-white group-hover:bg-neutral-700'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      {/* Name */}
                      <h3 className="text-xl font-bold mb-2">{personality.name}</h3>
                      
                      {/* Description */}
                      <p className="text-sm text-white/60 mb-4 line-clamp-2">{personality.description}</p>

                      {/* Stats */}
                      <div className="flex gap-2 mb-4 flex-wrap">
                        <span className="px-2 py-1 rounded-md text-xs bg-neutral-800 text-white/80 border border-neutral-700">
                          {personality.riskLevel} Risk
                        </span>
                        <span className="px-2 py-1 rounded-md text-xs bg-neutral-800 text-white/80 border border-neutral-700">
                          {personality.tradeFrequency}
                        </span>
                      </div>

                      {/* Preview Behaviors */}
                      <div className="space-y-1">
                        {personality.defaultBehaviors.slice(0, 2).map((behavior, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-white/50">
                            <Check className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-1">{behavior}</span>
                          </div>
                        ))}
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-lg"
                        >
                          <Check className="w-4 h-4 text-black" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedPersonality}
                  className={`px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                    selectedPersonality 
                      ? 'bg-white text-black hover:bg-white/90 hover:scale-105' 
                      : 'bg-neutral-800 text-white/40 cursor-not-allowed'
                  }`}
                >
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Configure Agent */}
          {step === 2 && selectedPersonality && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6">Configure Your Agent</h2>

                {/* Agent Name */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-white/80 mb-2">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="e.g., Alpha Trader, Market Maven, Crypto Sage"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors"
                    maxLength={30}
                  />
                  <p className="text-xs text-white/40 mt-1">{agentName.length}/30 characters</p>
                </div>

                {/* Occupation */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-white/80 mb-2">
                    Occupation (Optional)
                  </label>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g., Day Trader, Analyst, Investor"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors"
                  />
                </div>

                {/* Selected Personality Summary */}
                <div className="bg-neutral-800 rounded-xl p-4 mb-6 border border-neutral-700">
                  <div className="flex items-center gap-3 mb-3">
                    {(() => {
                      const Icon = PERSONALITIES[selectedPersonality as keyof typeof PERSONALITIES].icon;
                      return <Icon className="w-5 h-5" />;
                    })()}
                    <h3 className="font-semibold">
                      {PERSONALITIES[selectedPersonality as keyof typeof PERSONALITIES].name} Personality
                    </h3>
                  </div>
                  <p className="text-sm text-white/60">
                    {PERSONALITIES[selectedPersonality as keyof typeof PERSONALITIES].description}
                  </p>
                </div>

                {/* Custom Behaviors */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-white/80 mb-3">
                    Trading Behaviors & Instructions
                  </label>
                  <p className="text-xs text-white/50 mb-3">
                    Define how your agent should behave. Edit or add custom trading rules.
                  </p>

                  {/* Current Behaviors */}
                  <div className="space-y-2 mb-4">
                    {customBehaviors.map((behavior, i) => (
                      <div key={i} className="flex items-start gap-3 bg-neutral-800 p-3 rounded-lg border border-neutral-700">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={behavior}
                            onChange={(e) => {
                              const updated = [...customBehaviors];
                              updated[i] = e.target.value;
                              setCustomBehaviors(updated);
                            }}
                            className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/50"
                          />
                        </div>
                        <button
                          onClick={() => setCustomBehaviors(customBehaviors.filter((_, idx) => idx !== i))}
                          className="p-2 hover:bg-neutral-700 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-white/60" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Behavior */}
                  <div className="flex gap-2">
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
                      placeholder="Add new behavior... (Press Enter)"
                      className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50"
                    />
                    <button
                      onClick={() => {
                        if (newBehavior.trim()) {
                          setCustomBehaviors([...customBehaviors, newBehavior]);
                          setNewBehavior('');
                        }
                      }}
                      className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors border border-neutral-700"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 px-6 py-3 rounded-xl bg-neutral-800 text-white hover:bg-neutral-700 font-semibold border border-neutral-700 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!agentName.trim() || customBehaviors.length === 0}
                    className={`flex-1 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      agentName.trim() && customBehaviors.length > 0
                        ? 'bg-white text-black hover:bg-white/90 hover:scale-105'
                        : 'bg-neutral-800 text-white/40 cursor-not-allowed border border-neutral-700'
                    }`}
                  >
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirm & Pay */}
          {step === 3 && selectedPersonality && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6">Confirm & Create Agent</h2>

                {/* Summary */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between py-3 border-b border-neutral-800">
                    <span className="text-white/60">Agent Name</span>
                    <span className="font-semibold">{agentName}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-neutral-800">
                    <span className="text-white/60">Personality</span>
                    <span className="font-semibold">
                      {PERSONALITIES[selectedPersonality as keyof typeof PERSONALITIES].name}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-neutral-800">
                    <span className="text-white/60">Occupation</span>
                    <span className="font-semibold">{occupation}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-neutral-800">
                    <span className="text-white/60">Initial Balance</span>
                    <span className="font-semibold">5 SOL</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-white/60">Creation Fee</span>
                    <span className="font-bold text-lg text-green-400">0.05 SOL</span>
                  </div>
                </div>

                {/* Custom Behaviors */}
                <div className="bg-neutral-800 rounded-xl p-4 mb-6 border border-neutral-700">
                  <h3 className="font-semibold text-white mb-3">Trading Behaviors</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {customBehaviors.map((behavior, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-white/70">
                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400" />
                        <span>{behavior}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-200">
                      <p className="font-semibold mb-1">Devnet Transaction</p>
                      <p className="text-blue-200/80">
                        This transaction will be processed on Solana Devnet. Your agent will be created instantly.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Wallet Info */}
                {publicKey && (
                  <div className="bg-neutral-800 rounded-xl p-4 mb-6 border border-neutral-700">
                    <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
                      <Wallet className="w-4 h-4" />
                      <span>Connected Wallet</span>
                    </div>
                    <code className="text-xs text-white/80 font-mono break-all">{publicKey.toString()}</code>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    disabled={creating}
                    className="flex-1 px-6 py-3 rounded-xl bg-neutral-800 text-white hover:bg-neutral-700 font-semibold disabled:opacity-50 border border-neutral-700 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateAgent}
                    disabled={creating}
                    className="flex-1 px-6 py-3 rounded-xl bg-white text-black hover:bg-white/90 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                  >
                    {creating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Create Agent (0.05 SOL)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
