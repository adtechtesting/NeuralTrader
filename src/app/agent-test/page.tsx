'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Connection } from '@solana/web3.js';
import { toast } from 'sonner';
import { Activity, Check, InfoIcon, List } from 'lucide-react';
import { Transaction } from '@solana/web3.js';
import { SystemProgram } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import MobilePopupWarning from '@/components/mobilepopup';

export default function AgentTestPage() {
  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [action, setAction] = useState<'create-agent' | 'request-airdrop'>('create-agent');
  const [tokenDetails, setTokenDetails] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [agentName, setAgentName] = useState('TestAgent');
  const [personalityType, setPersonalityType] = useState('ANALYTICAL');
  const [publicKey, setPublicKey] = useState('');
  const [airdropAmount, setAirdropAmount] = useState(1);
  const router = useRouter();

  const wallet = useWallet();
  const network = WalletAdapterNetwork.Devnet; 
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const connection = useMemo(() => new Connection(endpoint), [endpoint]); 
  const { connected, publicKey: walletPublicKey, sendTransaction } = wallet;
  const [walletbalance, setwalletbalance] = useState<number|null>(null);
  const [isAllowed, setisAllowed] = useState(false);      

  useEffect(() => {
    if(wallet.publicKey) {
      checkBalance();
    }
  },[wallet.publicKey]);

  const checkBalance = async () => {
    if(!wallet.publicKey) {
      return Error("wallet not connected");
    }

    try {
      const balance = await connection.getBalance(wallet.publicKey); 
      const balanceinsol = balance / LAMPORTS_PER_SOL;
      setwalletbalance(balanceinsol);  

      if(balance < 0.05) {
        return Error("At least 0.05 sol required");
      }
      setisAllowed(balanceinsol >= 0.05);
    } catch (error) { 
      console.log(error, "error in getting balanace");
    }
  };

  useEffect(() => {
    if (!connected) {
      router.push("/");
      toast.warning("Connect Your Solana Wallet to see the Agent Test");
    } else if (walletPublicKey) {
      setPublicKey(walletPublicKey.toString());
    }
  }, [connected, router, walletPublicKey]);
  
  useEffect(() => {
    setTokenDetails({
      name: 'NURO',
      symbol: '$NURO',
      decimals: 9,
      mintAddress: walletPublicKey ? walletPublicKey.toString() : 'ErsH1VbZrHpdsWZUAEhrgpVqQchT6QRHJHyAvdsPmyB8',
    });
    setTokenLoading(false);
    loadAgents();
  }, [walletPublicKey]);

  const loadAgents = async () => {
    try {
      setAgentsLoading(true);
      const response = await fetch('/api/agents');
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setAgentsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = { action };
  
      if (action === 'create-agent') {
        Object.assign(payload, { agentName, personalityType });
  
        if (!wallet.publicKey) {
          toast.error("Wallet not connected");
          setLoading(false);
          return;
        }
  
        try {
        
          const transaction=new Transaction().add(
            SystemProgram.transfer({
              fromPubkey:wallet.publicKey,
              toPubkey:new PublicKey(tokenDetails.mintAddress) ,
              lamports:0.01* LAMPORTS_PER_SOL,
            })
          )

          const {blockhash}=await connection.getLatestBlockhash() ;
          transaction.recentBlockhash=blockhash;
          transaction.feePayer=wallet.publicKey ;

          if(!wallet.signTransaction) {
            return Error("wallet not connect")
          }

          const signedTransaction=await wallet.signTransaction(transaction) 
          const transactionsignature=await connection.sendRawTransaction(signedTransaction.serialize()) 
          console.log("Agent Creation fee paid",transactionsignature)

          toast.success("Transaction done agent created")
           await connection.confirmTransaction(transactionsignature)

        } catch (error) {
          console.error("Error processing transaction:", error);
          toast.error("Transaction failed. Please try again.");
          setLoading(false);
          return;
        }
      } else {
        Object.assign(payload, { publicKey, airdropAmount });
     
      }
    

     
      
      const response = await fetch('/api/agent-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        loadAgents(); 
      }
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080010] overflow-hidden relative p-20">
      
      {/* Background effects */}

      <div className="absolute top-0 left-0 w-full h-full bg-gradient-radial from-[#14082f] via-[#0c0020] to-[#050008] opacity-80 z-0"></div>
      
     
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-700/20 blur-[100px] rounded-full"></div>
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-indigo-700/20 blur-[100px] rounded-full"></div>
      
      
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[1px] h-screen bg-purple-700/30 transform rotate-[15deg] origin-top-right"></div>
        <div className="absolute top-0 right-1/3 w-[1px] h-screen bg-indigo-700/20 transform rotate-[25deg] origin-top-right"></div>
        <div className="absolute bottom-0 left-0 w-screen h-[1px] bg-purple-700/30 transform rotate-[3deg] origin-bottom-left"></div>
        <div className="absolute top-1/2 left-0 w-screen h-[1px] bg-indigo-700/20 transform rotate-[-3deg] origin-center-left"></div>
      </div>
      
     

      <main className="max-w-6xl mx-auto relative z-10">
        <section className="relative z-10 pb-12 pt-8 md:pt-16 px-4 md:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-10"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
              <div>
                <h1 className="text-3xl md:text-5xl font-bold  bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-300">Agent Test</h1>
                <p className="text-gray-400 text-md mt-3 md:max-w-xl">Create an agent and request an airdrop on the Solana blockchain</p>
              </div>
              
              <div className="bg-gray-900/40 backdrop-blur-sm border border-gray-800/80 rounded-xl px-5 py-4 min-w-[220px] shadow-lg shadow-purple-900/10 hover:shadow-purple-800/20 transition-all duration-300 hover:scale-105 ">
                <p className="text-sm text-gray-300 font-medium">Wallet Balance</p>
                <div className="flex items-end gap-2">
                  <p className="text-xl text-white font-semibold mt-1">{walletbalance !== null ? walletbalance.toFixed(4) : '0.0000'}</p>
                  <p className="text-sm text-purple-300 mb-0.5">SOL</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-8">
            {/* Token Information Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="border border-purple-900/30 bg-black/40 backdrop-blur-md p-6 rounded-2xl shadow-lg shadow-purple-900/10 hover:shadow-purple-800/20 transition-all duration-300"
            >
              <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-3">
                <div className="p-2 bg-purple-900/30 rounded-lg">
                  <InfoIcon className='w-5 h-5 text-purple-300' />
                </div>
                <span>Token Information</span>
              </h2>
              <div className="p-5 bg-black/50 rounded-xl border border-purple-500/20 backdrop-blur-sm">
                {tokenLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin h-5 w-5 border-2 border-purple-400 border-t-transparent rounded-full mr-2"></div>
                    <p className="text-sm text-gray-400">Loading token details...</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-8">
                    <div className="min-w-[120px]">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Name</p>
                      <p className="text-sm text-white mt-1 font-medium">{tokenDetails.name}</p>
                    </div>
                    <div className="min-w-[120px]">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Symbol</p>
                      <p className="text-sm text-white mt-1 font-medium">{tokenDetails.symbol}</p>
                    </div>
                    <div className="min-w-[120px]">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Decimals</p>
                      <p className="text-sm text-white mt-1 font-medium">{tokenDetails.decimals}</p>
                    </div>
                    <div className="min-w-[120px] md:flex-1">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Mint Address</p>
                      <p className="text-sm text-white mt-1 font-medium truncate max-w-full md:max-w-md">{tokenDetails.mintAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Agent Actions Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="border border-purple-900/30 bg-black/40 backdrop-blur-md p-6 rounded-2xl shadow-lg shadow-purple-900/10 hover:shadow-purple-800/20 transition-all duration-300"
            >
              <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-3">
                <div className="p-2 bg-purple-900/30 rounded-lg">
                  <Activity className='w-5 h-5 text-purple-300' />
                </div>
                <span>Agent Actions</span>
              </h2>
              <form onSubmit={handleSubmit} className="p-5 bg-black/50 rounded-xl border border-purple-500/20 backdrop-blur-sm">
                <div className="mb-6">
                  <label className="text-xs text-gray-300 font-medium uppercase tracking-wider">Action Type</label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value as 'create-agent' | 'request-airdrop')}
                    className="w-full mt-2 p-3 bg-black/80 border border-purple-500/40 rounded-lg text-white text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-200 outline-none"
                  >
                    <option value="create-agent">Create Agent</option>
                    <option value="request-airdrop">Request Airdrop</option>
                  </select>
                </div>

                {action === 'create-agent' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs text-gray-300 font-medium uppercase tracking-wider block mb-2">Agent Name</label>
                      <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        className="w-full p-3 bg-black/80 border border-purple-500/40 rounded-lg text-white text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-200 outline-none"
                        placeholder="Enter agent name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-300 font-medium uppercase tracking-wider block mb-2">Personality Type</label>
                      <select
                        value={personalityType}
                        onChange={(e) => setPersonalityType(e.target.value)}
                        className="w-full p-3 bg-black/80 border border-purple-500/40 rounded-lg text-white text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-200 outline-none"
                      >
                     <option value="ANALYTICAL">Analytical</option>
     <option value="CREATIVE">Creative</option>
<option value="SOCIAL">Social</option>
<option value="STRATEGIC">Strategic</option>



                       
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs text-gray-300 font-medium uppercase tracking-wider block mb-2">Public Key</label>
                      <input
                        type="text"
                        value={publicKey}
                        onChange={(e) => setPublicKey(e.target.value)}
                        className="w-full p-3 bg-black/80 border border-purple-500/40 rounded-lg text-white text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-200 outline-none"
                        placeholder="Enter public key"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-300 font-medium uppercase tracking-wider block mb-2">Airdrop Amount (SOL)</label>
                      <input
                        type="number"
                        value={airdropAmount}
                        onChange={(e) => setAirdropAmount(parseFloat(e.target.value))}
                        min={0.1}
                        step={0.1}
                        className="w-full p-3 bg-black/80 border border-purple-500/40 rounded-lg text-white text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-200 outline-none"
                        placeholder="Enter amount"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className={`mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-900/30 hover:shadow-purple-800/40 ${
                    loading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : null}
                  {action === 'create-agent' ? 'Create Agent' : 'Request Airdrop'}
                </button>
              </form>
            </motion.div>

          
{/* Agent List Card */}
<motion.div 
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: 0.3 }}
  className="border border-purple-900/30 bg-black/40 backdrop-blur-md p-6 rounded-2xl shadow-lg shadow-purple-900/10 hover:shadow-purple-800/20 transition-all duration-300"
>
  <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-3">
    <div className="p-2 bg-purple-900/30 rounded-lg">
      <List className='w-5 h-5 text-purple-300' />
    </div>
    <span>Agent List</span>
  </h2>
  <div className="p-5 bg-black/50 rounded-xl border border-purple-500/20 backdrop-blur-sm">
    {agentsLoading ? (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin h-5 w-5 border-2 border-purple-400 border-t-transparent rounded-full mr-2"></div>
        <p className="text-sm text-gray-400">Loading agents...</p>
      </div>
    ) : agents.length === 0 ? (
      <div className="py-6 text-center">
        <p className="text-sm text-gray-400">No agents found. Create your first agent above.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4  md:max-h-100 overflow-y-auto pr-2 custom-scrollbar">
        {agents.map((agent) => (
          <div 
            key={agent.id} 
            className="p-4 bg-black/60 border border-purple-500/20 rounded-lg hover:border-purple-500/40 transition-all duration-300 hover:shadow-md hover:shadow-purple-900/20"
          >
            <p className="text-md font-semibold text-white mb-2">{agent.name}</p>
            <div className="space-y-1">
              <p className="text-xs text-gray-300 flex items-center gap-2">
                <span className="text-gray-500">Personality:</span>
                <span className="py-0.5 px-2 bg-purple-900/30 rounded-full text-purple-300 font-medium">{agent.personalityType}</span>
              </p>
              <p className="text-xs text-gray-300 flex flex-wrap items-center gap-1">
                <span className="text-gray-500">Public Key:</span>
                <span className="truncate max-w-[160px] font-mono">{agent.publicKey}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
</motion.div>

            {/* Result Card */}
            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="border border-purple-900/30 bg-black/40 backdrop-blur-md p-6 rounded-2xl shadow-lg shadow-purple-900/10 hover:shadow-purple-800/20 transition-all duration-300"
              >
                <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-3">
                  <div className="p-2 bg-purple-900/30 rounded-lg">
                    <Check className='w-5 h-5 text-purple-300' />
                  </div>
                  <span>Result</span>
                </h2>
                <div className="p-5 bg-black/50 rounded-xl border border-purple-500/20 backdrop-blur-sm">
                  <pre className="text-sm text-gray-100 overflow-auto font-mono p-4 bg-black/80 rounded-lg border border-purple-500/10">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </motion.div>
            )}
          </div>
        </section>
        <div className="mb-8 p-4 rounded-xl border border-purple-700/40 bg-gradient-to-r from-purple-900/40 to-indigo-900/30 backdrop-blur-md shadow-lg shadow-purple-900/10 text-white">
  <h3 className="text-lg font-semibold text-purple-300 mb-1">🚧 Page Under Deployment</h3>
  <p className="text-sm text-gray-300">
    This page is currently under deployment. Soon, you'll be able to choose  different LLM providers, create agents with the llm provider of your choice like openai, anthropic, gemini, and perform  trades .
    <br />
    In the meantime, you can <span className="text-purple-200 font-medium">create agents locally</span> and <span className="text-purple-200 font-medium">request an airdrop</span> 
  </p>
</div>

      </main>
      
      <footer className="py-10 border-t border-purple-900/30 mt-16 relative z-10 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-8 md:mb-0">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 mr-2"></div>
              <span className="text-xl font-bold text-transparent bg-clip-text  bg-gradient-to-r from-white to-purple-300">
                NeuralTraders
              </span>
            </div>
            <div className="text-gray-400 text-sm">
              Built by Adtech ♡
            </div>
            
            <div className="text-gray-400 text-sm">
              © {new Date().getFullYear()} NeuralTraders. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}