import { AutonomousAgent } from './autonomous/agent-core';
import { LLMAutonomousAgent } from './autonomous/agent-core-llm';
import { prisma } from '../cache/dbCache';


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