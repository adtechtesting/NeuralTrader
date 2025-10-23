import { AutonomousAgent } from './autonomous/agent-core';
import { LLMAutonomousAgent } from './autonomous/agent-core-llm';
import { prisma } from '../cache/dbCache';
import { getPersonalityBehavior } from './personalities';
import { v4 as uuidv4 } from 'uuid';

// Simple logging function
function addLog(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data ? data : '');
}

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
         llmModel: process.env.LLM_MODEL || "llama3.1",
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
    // Get agent from LLM pool instead of rule-based simulation
    const agentPool = new AgentPool({ maxSize: 100, useLLM: true });
    const llmAgent = await agentPool.getAgent(agentId) as any;

    if (!llmAgent) {
      return { success: false, error: `LLM Agent ${agentId} not found in pool` };
    }

    // Get current market data for the LLM agent
    const { marketData } = await import('../market/data');
    const marketInfo = await marketData.getMarketInfo();

    if (!marketInfo) {
      return { success: false, error: 'Market data not available' };
    }

    // Use LLM agent's decision-making capabilities
    let actionResult: any = {};

    // Determine which action to take based on LLM agent's personality and market conditions
    const personality = getPersonalityBehavior(llmAgent.agentData.personalityType);

    // Choose action based on personality traits and some randomness
    const actionRoll = Math.random();

    if (actionRoll < personality.tradeFrequency * 0.7) {
      // Make a trading decision using LLM
      addLog('info', `Agent ${llmAgent.agentData.name} making LLM trade decision`);
      const tradeSuccess = await llmAgent.makeTradeDecision(marketInfo);
      actionResult = {
        action: 'trade',
        type: 'LLM_DECISION',
        success: tradeSuccess,
        marketInfo,
        timestamp: new Date(),
      };
    } else if (actionRoll < personality.tradeFrequency + personality.messageFrequency * 0.5) {
      // Analyze market using LLM
      addLog('info', `Agent ${llmAgent.agentData.name} analyzing market with LLM`);
      const analysisSuccess = await llmAgent.analyzeMarket(marketInfo);
      actionResult = {
        action: 'analysis',
        type: 'LLM_ANALYSIS',
        success: analysisSuccess,
        marketInfo,
        timestamp: new Date(),
      };
    } else {
      // Social interaction using LLM
      addLog('info', `Agent ${llmAgent.agentData.name} engaging in LLM social interaction`);

      // Get recent messages for context
      const { prisma } = await import('../cache/dbCache');
      const recentMessages = await prisma.message.findMany({
        take: 5,
        where: { visibility: 'public' },
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              personalityType: true
            }
          }
        }
      });

      const sentiment = await marketData.getMarketSentiment();
      const socialSuccess = await llmAgent.socialInteraction(recentMessages, sentiment);

      actionResult = {
        action: 'social',
        type: 'LLM_SOCIAL',
        success: socialSuccess,
        timestamp: new Date(),
      };
    }

    return { success: true, details: actionResult };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}