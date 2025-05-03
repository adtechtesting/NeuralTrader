import { AutonomousAgent } from './autonomous/agent-core';
import { LLMAutonomousAgent } from './autonomous/agent-core-llm';
import { prisma } from '../cache/dbCache';
import { getPersonalityBehavior } from './personalities';
import { v4 as uuidv4 } from 'uuid';

export class AgentPool {
  private pool: Map<string, AutonomousAgent | LLMAutonomousAgent> = new Map();
  private maxSize: number;
  private lastAccess: Map<string, number> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private ttl: number;
  private useLLM: boolean = true; // Flag to determine which agent type to use

  constructor(options: { 
    maxSize?: number; 
    cleanupInterval?: number; 
    ttl?: number;
    useLLM?: boolean;
  } = {}) {
    this.maxSize = options.maxSize || 100;
    this.ttl = options.ttl || 60 * 60 * 1000; // Default: 1 hour
    this.useLLM = options.useLLM !== undefined ? options.useLLM : true; // Default to using LLM agents

    // Set up automatic cleanup if interval is provided
    if (options.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, options.cleanupInterval);
    }
  }

  async getAgent(agentId: string): Promise<AutonomousAgent | LLMAutonomousAgent> {
    // Update access time
    this.lastAccess.set(agentId, Date.now());

    // Check if agent exists in pool
    if (this.pool.has(agentId)) {
      return this.pool.get(agentId) as (AutonomousAgent | LLMAutonomousAgent);
    }

    // If pool is at max size, clean up some old agents
    if (this.pool.size >= this.maxSize) {
      await this.cleanup();
    }

    // Create new agent
    try {
      const agentData = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          state: true
        }
      });

      if (!agentData) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }

      // Determine which agent type to create based on useLLM flag
      if (this.useLLM) {
        // Create LLM-powered autonomous agent
        console.log(`Creating LLM-powered agent for ${agentData.name}`);
        const llmAgent = new LLMAutonomousAgent(agentData, {
          llmModel: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
          temperature: 0.7
        });
        this.pool.set(agentId, llmAgent);
        return llmAgent;
      } else {
        // Create traditional agent (fallback)
        console.log(`Creating traditional agent for ${agentData.name}`);
        const agent = new AutonomousAgent(agentData);
        this.pool.set(agentId, agent);
        return agent;
      }
    } catch (error) {
      console.error(`Error creating agent instance for ${agentId}:`, error);
      throw error;
    }
  }

  // Remove least recently accessed agents to free up memory
  async cleanup(): Promise<number> {
    // If pool is not at capacity, no cleanup needed
    if (this.pool.size < this.maxSize) {
      return 0;
    }

    const now = Date.now();
    let cleanedCount = 0;

    // Find expired entries
    const expiredEntries = [...this.lastAccess.entries()]
      .filter(([_, lastAccess]) => now - lastAccess > this.ttl)
      .map(([id]) => id);

    // Remove expired entries
    for (const id of expiredEntries) {
      this.pool.delete(id);
      this.lastAccess.delete(id);
      cleanedCount++;
    }

    // If we haven't freed up enough space, remove least recently used
    if (this.pool.size > this.maxSize * 0.9) {
      const sortedByAccess = [...this.lastAccess.entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([id]) => id);

      // Remove the oldest 20% of entries
      const toRemove = sortedByAccess.slice(0, Math.floor(this.maxSize * 0.2));
      
      for (const id of toRemove) {
        this.pool.delete(id);
        this.lastAccess.delete(id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  // Clean up all agents
  async cleanupAll(): Promise<void> {
    this.pool.clear();
    this.lastAccess.clear();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton AgentPool instance for makeAgentAct
const agentPool = new AgentPool({
  maxSize: 100,
  cleanupInterval: 60000,
  ttl: 3600000,
});

export async function makeAgentAct(agentId: string): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> {
  try {
    // Get agent from pool
    const agent = await agentPool.getAgent(agentId);

    // Fetch agent data for validation and action logic
    const agentData = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        personalityType: true,
        walletBalance: true,
        socialInfluence: true,
        messageFrequency: true,
      },
    });

    if (!agentData) {
      return { success: false, error: `Agent ${agentId} not found` };
    }

    // Get personality behavior
    //@ts-ignore
    const personality = getPersonalityBehavior(agentData.personalityType);

    // Simulate agent action (trade, swap, or message)
    const actionRoll = Math.random();
    const actionType = actionRoll < personality.tradeFrequency * 0.7 ? 'trade' :
                       actionRoll < personality.tradeFrequency ? 'swap' : 'message';
    let details: any = {};

    if (actionType === 'trade' || actionType === 'swap') {
      // Calculate trade/swap parameters
      const amount = agentData.walletBalance * (Math.random() * 0.1); // Up to 10% of balance
      const isBuy = actionType === 'trade' ? Math.random() < 0.5 : true; // Swaps are buys for simplicity
      const fee = amount * 0.01; // 1% fee
      const priceImpact = actionType === 'swap' ? Math.random() * 0.05 : null; // 0-5% for swaps
      const tokenAmount = actionType === 'swap' ? amount / (Math.random() * 0.001 + 0.0001) : null; // Token amount for swaps
      const signature = uuidv4(); // Unique transaction signature

      // For swaps, select a random counterparty agent
      let toAgentId: string | null = null;
      if (actionType === 'swap') {
        const counterparty = await prisma.agent.findFirst({
          where: { id: { not: agentId }, active: true },
          select: { id: true },
        });
        toAgentId = counterparty?.id || null;
      }

      // Update agent balance
      const balanceChange = isBuy ? -(amount + (fee || 0)) : (amount - (fee || 0));
      await prisma.agent.update({
        where: { id: agentId },
        data: { walletBalance: agentData.walletBalance + balanceChange },
      });

      // Log transaction
      details = {
        action: actionType,
        type: isBuy ? 'buy' : 'sell',
        amount,
        tokenAmount,
        priceImpact,
        fee,
        signature,
        fromAgentId: agentId,
        toAgentId,
        timestamp: new Date(),
      };

      await prisma.transaction.create({
        data: {
          signature,
          amount,
          tokenAmount,
          priceImpact,
          fromAgentId: agentId,
          toAgentId,
          status: 'pending',
          type: isBuy ? 'buy' : 'sell',
          details: {
            action: actionType,
            marketSentiment: Math.random(), // Placeholder
            riskLevel: personality.riskTolerance,
          },
          fee,
        },
      });
    } else {
      // Simulate a message
      details = {
        action: 'message',
        content: `Agent ${agentData.name} sent a message about the market`,
        timestamp: new Date(),
      };

      // Log message
      await prisma.message.create({
        data: {
          content: details.content,
          senderId: agentId,
          type: 'CHAT',
          visibility: 'public',
          createdAt: new Date(),
          sentiment: Math.random() < 0.5 ? 'positive' : 'negative',
        },
      });
    }

    return { success: true, details };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}