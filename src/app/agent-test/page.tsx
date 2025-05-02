'use client';

import NextLink from 'next/link';
import { useState, useEffect } from 'react';

export default function AgentTestPage() {
  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [action, setAction] = useState<'create-agent' | 'request-airdrop'>('create-agent');
  const [tokenDetails, setTokenDetails] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [agentName, setAgentName] = useState('TestAgent');
  const [personalityType, setPersonalityType] = useState('AGGRESSIVE');
  const [publicKey, setPublicKey] = useState('');
  const [airdropAmount, setAirdropAmount] = useState(1);

  useEffect(() => {
    // Simulate loading token details
    setTokenDetails({
      name: 'NURO',
      symbol: '$TORM',
      decimals: 9,
      mintAddress: 'Guwx1V6mcWmA7kk1qq6RK34A37PZ8dd2yf2qrYRvSU9J',
    });
    setTokenLoading(false);
  }, []);

  // Placeholder for loadAgents (assumed to fetch agent list)
  const loadAgents = async () => {
    try {
      setAgentsLoading(true);
      // Simulate fetching agents (replace with actual API call)
      const response = await fetch('/api/agents');
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setAgentsLoading(false);
    }
  };

  // Placeholder for handleSubmit (assumed to handle form submission)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload =
        action === 'create-agent'
          ? { action, agentName, personalityType }
          : { action, publicKey, airdropAmount };
      const response = await fetch('/api/agent-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        loadAgents(); // Refresh agent list on success
      }
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 text-gray-100 min-h-screen">
      {/* Header */}
      <header className="bg-gray-900 p-4 border-b border-gray-700">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-white">Agent Testing</h1>
          <div className="flex gap-4">
            <NextLink href="/" passHref>
              <button className="text-gray-300 hover:text-white text-sm font-medium transition-all">
                Home
              </button>
            </NextLink>
            <NextLink href="/chatroom" passHref>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-all">
                Join Chatroom
              </button>
            </NextLink>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Token Information */}
        <h2 className="text-lg font-semibold text-white mb-4">Token Information</h2>
        <div className="bg-gray-700 p-4 rounded-lg shadow-md">
          {tokenLoading ? (
            <p className="text-sm text-gray-400">Loading token details...</p>
          ) : (
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-gray-400 font-semibold">Name:</p>
                <p className="text-sm text-white">{tokenDetails.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">Symbol:</p>
                <p className="text-sm text-white">{tokenDetails.symbol}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">Decimals:</p>
                <p className="text-sm text-white">{tokenDetails.decimals}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">Mint Address:</p>
                <p className="text-sm text-white truncate max-w-[200px]">{tokenDetails.mintAddress}</p>
              </div>
            </div>
          )}
        </div>

        {/* Agent Form */}
        <h2 className="text-lg font-semibold text-white mt-8 mb-4">Agent Actions</h2>
        <form onSubmit={handleSubmit} className="bg-gray-700 p-4 rounded-lg shadow-md">
          <div className="mb-4">
            <label className="text-xs text-gray-400 font-semibold">Action:</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as 'create-agent' | 'request-airdrop')}
              className="w-full mt-1 p-2 bg-gray-800 border border-gray-600 rounded-md text-white text-sm"
            >
              <option value="create-agent">Create Agent</option>
              <option value="request-airdrop">Request Airdrop</option>
            </select>
          </div>

          {action === 'create-agent' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-semibold">Agent Name:</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full mt-1 p-2 bg-gray-800 border border-gray-600 rounded-md text-white text-sm"
                  placeholder="Enter agent name"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-semibold">Personality Type:</label>
                <select
                  value={personalityType}
                  onChange={(e) => setPersonalityType(e.target.value)}
                  className="w-full mt-1 p-2 bg-gray-800 border border-gray-600 rounded-md text-white text-sm"
                >
                  <option value="AGGRESSIVE">Aggressive</option>
                  <option value="CONSERVATIVE">Conservative</option>
                  <option value="TECHNICAL">Technical</option>
                  <option value="FUNDAMENTAL">Fundamental</option>
                  <option value="EMOTIONAL">Emotional</option>
                  <option value="CONTRARIAN">Contrarian</option>
                  <option value="WHALE">Whale</option>
                  <option value="NOVICE">Novice</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-semibold">Public Key:</label>
                <input
                  type="text"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  className="w-full mt-1 p-2 bg-gray-800 border border-gray-600 rounded-md text-white text-sm"
                  placeholder="Enter public key"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-semibold">Airdrop Amount (SOL):</label>
                <input
                  type="number"
                  value={airdropAmount}
                  onChange={(e) => setAirdropAmount(parseFloat(e.target.value))}
                  min={0.1}
                  step={0.1}
                  className="w-full mt-1 p-2 bg-gray-800 border border-gray-600 rounded-md text-white text-sm"
                  placeholder="Enter amount"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className={`mt-4 px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-all flex items-center gap-2 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
            ) : null}
            Submit
          </button>
        </form>

        {/* Agent List */}
        <h2 className="text-lg font-semibold text-white mt-8 mb-4">Agent List</h2>
        <div className="bg-gray-700 p-4 rounded-lg shadow-md">
          {agentsLoading ? (
            <p className="text-sm text-gray-400">Loading agents...</p>
          ) : agents.length === 0 ? (
            <p className="text-sm text-gray-400">No agents found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <div key={agent.id} className="p-3 bg-gray-800 rounded-md">
                  <p className="text-sm font-semibold text-white">{agent.name}</p>
                  <p className="text-xs text-gray-400">Personality: {agent.personalityType}</p>
                  <p className="text-xs text-gray-400 truncate">Public Key: {agent.publicKey}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="mt-8 bg-gray-700 p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-white mb-2">Result</h2>
            <pre className="text-sm text-gray-100 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}