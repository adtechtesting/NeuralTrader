import { PersonalityType, LLMProviderType } from './manager';

export interface Agent {
  id: string;
  name: string;
  personality: string;
  personalityType: PersonalityType;
  publicKey: string;
  privateKey: string;
  walletBalance: number;
  createdAt: Date;
  occupation?: string;
  llmProvider?: LLMProviderType;
}

// In-memory storage for agents
const agents: Agent[] = [];

export function saveAgent(agentData: Omit<Agent, 'id' | 'createdAt'>): Agent {
  const newAgent: Agent = {
    ...agentData,
    id: `agent_${Math.random().toString(36).substring(2, 15)}`,
    createdAt: new Date()
  };

  agents.push(newAgent);
  return newAgent;
}

export function getAgents(): Agent[] {
  return [...agents];
}

export function getAgentById(id: string): Agent | undefined {
  return agents.find(agent => agent.id === id);
}

export function getAgentCountsByPersonality(): Record<string, number> {
  return agents.reduce((counts, agent) => {
    counts[agent.personalityType] = (counts[agent.personalityType] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
} 