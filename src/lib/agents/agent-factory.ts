import { LLMAutonomousAgent } from './autonomous/agent-core-llm';
import { ASINeuralAgent } from './asi-integration';
import { MeTTaKnowledgeGraph, AgentverseManager, ChatProtocol } from './asi-services';
import { ASI_FEATURES } from '../config/asi-config';
import { prisma } from '../cache/dbCache';

interface AgentConfig {
  maxSize?: number;
  cleanupInterval?: number;
  ttl?: number;
  useLLM?: boolean;
  useASI?: boolean;
  knowledgeGraphUrl?: string;
  agentverseUrl?: string;
}

export class AgentPool {
  private agents: Map<string, any> = new Map();
  private maxSize: number;
  private cleanupInterval: number;
  private ttl: number;
  private useASI: boolean;
  private knowledgeGraph: MeTTaKnowledgeGraph | null = null;
  private agentverse: AgentverseManager;
  private chatProtocol: ChatProtocol | null = null;
  private config: AgentConfig;

  constructor(config: AgentConfig = {}) {
    this.maxSize = config.maxSize || 50;
    this.cleanupInterval = config.cleanupInterval || 300000; // 5 minutes
    this.ttl = config.ttl || 3600000; // 1 hour
    this.useASI = config.useASI || ASI_FEATURES.enabled;
    this.config = config;

    this.agentverse = AgentverseManager.getInstance();

    if (this.useASI) {
      this.initializeASIServices(config);
    }

    // Start cleanup interval
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  private async initializeASIServices(config: AgentConfig) {
    // Initialize MeTTa Knowledge Graph
    if (config.knowledgeGraphUrl) {
      this.knowledgeGraph = new MeTTaKnowledgeGraph(
        config.knowledgeGraphUrl,
        'neuraltrader-pool'
      );
      console.log('🔗 MeTTa Knowledge Graph initialized');
    }

    // Initialize Chat Protocol
    this.chatProtocol = new ChatProtocol('neuraltrader-hub');
    console.log('💬 Chat Protocol initialized');
  }

  async getAgent(agentId: string): Promise<any> {
    // Check if agent exists in pool
    if (this.agents.has(agentId)) {
      const agent = this.agents.get(agentId);
      agent.lastAccess = Date.now();
      return agent.agent;
    }

    // Check if agent exists in database
    const agentData = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { state: true }
    });

    if (!agentData) {
      throw new Error(`Agent ${agentId} not found`);
    }

   
    const nameHash = agentData.name
      .split('')
      .reduce((sum, char) => (sum + char.charCodeAt(0)) % 10_000, 0);
    // 90% ASI agents to avoid Groq rate limits
    const shouldUseASI = this.useASI && (nameHash % 10) < 9;

    let agent: any;

    if (shouldUseASI) {
      agent = new ASINeuralAgent({
        name: agentData.name,
        personalityType: agentData.personalityType,
        walletAddress: agentData.publicKey,
        capabilities: ['trading', 'market-analysis', 'social-interaction'],
        knowledgeGraphUrl: this.config.knowledgeGraphUrl || process.env.METTA_KNOWLEDGE_GRAPH_URL || undefined,
        databaseId: agentId
      });

      (agent as any).databaseId = agentId;
      (agent as any).agentName = agentData.name;

      console.log(`🚀 Created ASI-enhanced agent (90% bucket): ${agentData.name}`);
    } else {
      agent = new LLMAutonomousAgent(agentData);
      console.log(`🤖 Created LLM autonomous agent (10% bucket): ${agentData.name}`);
    }

    // Add to pool if there's space
    if (this.agents.size < this.maxSize) {
      this.agents.set(agentId, {
        agent,
        created: Date.now(),
        lastAccess: Date.now()
      });
    }

    return agent;
  }

  private async handleAgentChat(agentId: string, message: any): Promise<any> {
    try {
      const agentData = await prisma.agent.findUnique({
        where: { id: agentId }
      });

      if (this.knowledgeGraph && agentData?.personalityType) {
        // Enhance response with knowledge graph
        const knowledge = await this.knowledgeGraph.enhanceSocialResponse(
          message.content,
          agentData.personalityType,
          { overall: 'neutral' } // Get current market sentiment
        );

        return {
          content: `As a ${agentData.personalityType} trader: ${message.content}`,
          sentiment: 'neutral',
          agent: agentData.name,
          timestamp: new Date().toISOString()
        };
      }

      // Standard response
      return {
        content: `Agent ${agentData?.name || 'Unknown'} responding: ${message.content}`,
        sentiment: 'neutral',
        agent: agentData?.name || 'Unknown',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error handling chat for agent ${agentId}:`, error);
      return {
        content: 'Unable to process message at this time',
        sentiment: 'neutral',
        timestamp: new Date().toISOString()
      };
    }
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [agentId, agentInfo] of this.agents.entries()) {
      if (now - agentInfo.lastAccess > this.ttl) {
        toRemove.push(agentId);
      }
    }

    for (const agentId of toRemove) {
      const agentInfo = this.agents.get(agentId);
      if (agentInfo?.agent?.shutdown) {
        await agentInfo.agent.shutdown();
      }
      this.agents.delete(agentId);
    }

    if (toRemove.length > 0) {
      console.log(`🧹 Cleaned up ${toRemove.length} inactive agents`);
    }
  }

  async cleanupAll(): Promise<void> {
    for (const [agentId, agentInfo] of this.agents.entries()) {
      if (agentInfo?.agent?.shutdown) {
        await agentInfo.agent.shutdown();
      }
    }
    this.agents.clear();
    console.log('🧹 Cleaned up all agents');
  }

  getPoolSize(): number {
    return this.agents.size;
  }

  getASIStatus(): { enabled: boolean; knowledgeGraph: boolean; chatProtocol: boolean } {
    return {
      enabled: this.useASI,
      knowledgeGraph: !!this.knowledgeGraph,
      chatProtocol: !!this.chatProtocol
    };
  }
}


export async function makeAgentAct(agentId: string): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> {
  try {
    // Get agent from pool
    const agentPool = new AgentPool({ maxSize: 100, useLLM: true, useASI: true });
    const agent = await agentPool.getAgent(agentId) as any;

    if (!agent) {
      return { success: false, error: `Agent ${agentId} not found in pool` };
    }

    // Get current market data for the agent
    const { marketData } = await import('../market/data');
    const marketInfo = await marketData.getMarketInfo();

    if (!marketInfo) {
      return { success: false, error: 'Market data not available' };
    }

    // Use the appropriate agent method based on type
    if (agent.analyzeMarket && agent.makeTradeDecision && agent.socialInteraction) {
      console.log(`🤖 Agent ${agentId} taking action`);

     
      const actionRoll = Math.random();

      if (actionRoll < 0.3) {
        // Market analysis (30%)
        await agent.analyzeMarket(marketInfo);
        return { success: true, details: { action: 'analyze', marketInfo } };
      } else if (actionRoll < 0.5) {
        // Trading decision (20%)
        await agent.makeTradeDecision(marketInfo);
        return { success: true, details: { action: 'trade', marketInfo } };
      } else {
     
        const sentiment = await marketData.getMarketSentiment();
        await agent.socialInteraction([], sentiment); 
        return { success: true, details: { action: 'social', messageCount: 0 } };
      }
    } else {
      // Fallback for agents without all methods
      console.log(`🧠 Agent ${agentId} taking limited action`);
      return { success: true, details: { action: 'limited', marketInfo } };
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
