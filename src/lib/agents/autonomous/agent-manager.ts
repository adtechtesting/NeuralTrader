import { AgentPool } from '../agent-factory';
import { AutonomousAgent } from './agent-core';
import { prisma } from '../../cache/dbCache';
import { PersonalityType } from '../personalities';

import { marketData } from '../../market/data';
import { amm } from '../../blockchain/amm';

import pMap from 'p-map';

const DEFAULT_MAX_CONCURRENT = Math.max(
  1,
  Number.parseInt(process.env.MAX_CONCURRENT_AGENTS ?? '', 10) || 2
);
const DEFAULT_RATE_LIMIT_DELAY = Math.max(
  250,
  Number.parseInt(process.env.GROQ_RATE_LIMIT_DELAY_MS ?? '', 10) || 2500
);
const MAX_RATE_LIMIT_DELAY = Math.max(
  DEFAULT_RATE_LIMIT_DELAY,
  Number.parseInt(process.env.GROQ_MAX_DELAY_MS ?? '', 10) || 10000
);
const RATE_LIMIT_JITTER = Math.max(
  0,
  Number.parseInt(process.env.GROQ_DELAY_JITTER_MS ?? '', 10) || 250
);

interface Message {
  id: string;
  content: string;
  sentiment: string | null;
  sentimentScore: number | null;
  type: string;
  visibility: string;
  senderId: string;
  receiverId: string | null;
  mentions: string[];
  influence: number | null;
  createdAt: Date;
}

/**
 * AgentManager - Manages the creation, scheduling and execution of autonomous agents
 */
export class AgentManager {
  private static instance: AgentManager;
  private agentPool: AgentPool;
  private agentIds: string[] = [];
  private activeAgentIds: Set<string> = new Set();
  private lastAccessTime: Map<string, number> = new Map();
  private maxConcurrent: number;
  private maxActiveAgents: number = 1000; // Maximum agents active at once
  private agentCacheTTL: number = 60 * 60 * 1000; // 1 hour cache TTL by default
  private rateLimitDelay: number = DEFAULT_RATE_LIMIT_DELAY; // Delay between Groq calls
  private readonly minRateLimitDelay: number = DEFAULT_RATE_LIMIT_DELAY;
  private readonly maxRateLimitDelay: number = MAX_RATE_LIMIT_DELAY;
  private readonly rateLimitJitter: number = RATE_LIMIT_JITTER;
  private lastApiCall: number = 0;
  private responsesToGenerate: Array<{ agentId: string; response: string }> = [];
  private tradesToExecute: Array<{ agentId: string; trade: any }> = [];
  private apiQuotaExceeded: boolean = false;
  private quotaRetryDelay: number = 5000; // 5 seconds delay when quota is exceeded
  private personalityDistribution: Record<PersonalityType, number> = {
    CONSERVATIVE: 0.1,
    AGGRESSIVE: 0.1,
    TECHNICAL: 0.1,
    FUNDAMENTAL: 0.1,
    EMOTIONAL: 0.1,
    CONTRARIAN: 0.1,
    WHALE: 0.1,
    NOVICE: 0.1,
    MODERATE: 0.1,
    TREND_FOLLOWER: 0.1
  };
  
  // Private constructor
  private constructor() {
    this.agentPool = new AgentPool({
      maxSize: 100,
      cleanupInterval: 5 * 60 * 1000,
      ttl: this.agentCacheTTL,
      useLLM: true,
      useASI: true // Enable ASI features for hackathon
    });
    this.maxConcurrent = DEFAULT_MAX_CONCURRENT;
    this.lastAccessTime = new Map();
  }
  
 
  public static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }
  

  public setLimits(maxConcurrent: number, maxActiveAgents: number) {
    this.maxConcurrent = Math.max(1, Math.min(maxConcurrent, DEFAULT_MAX_CONCURRENT));
    this.maxActiveAgents = Math.max(1, maxActiveAgents);
    return this;
  }
  
  // Initialize agents
  public async initializeAgents(count: number, personalityDistribution?: any): Promise<number> {
    console.log(`Initializing ${count} agents...`);
    
    try {
      // Check for existing agents in the database
      const existingCount = await prisma.agent.count();
      
      if (existingCount >= count) {
        console.log(`Found ${existingCount} existing agents, using those...`);
        
        // Load existing agent IDs
        const agents = await prisma.agent.findMany({
          select: { id: true },
          take: count,
          orderBy: { createdAt: 'asc' }
        });
        
        this.agentIds = agents.map(agent => agent.id);
        console.log(`Loaded ${this.agentIds.length} agent IDs from database`);
      }
      
      return this.agentIds.length;
    } catch (error) {
      console.error('Error initializing agents:', error);
      throw error;
    }
  }
  

  public async getActiveAgentIds(): Promise<string[]> {
    const now = Date.now();
    
   
    for (const [id, lastAccess] of this.lastAccessTime.entries()) {
      if (now - lastAccess > this.agentCacheTTL) {
        this.lastAccessTime.delete(id);
        this.activeAgentIds.delete(id);
      }
    }
    
    
    if (this.activeAgentIds.size < this.maxActiveAgents) {
      const allAgentIds = await this.getAgentIds();
      
     
      const shuffled = [...allAgentIds].sort(() => 0.5 - Math.random());
      

      for (const id of shuffled) {
        if (!this.activeAgentIds.has(id)) {
          this.activeAgentIds.add(id);
          this.lastAccessTime.set(id, now);
          
          if (this.activeAgentIds.size >= this.maxActiveAgents) {
            break;
          }
        }
      }
    }
    
    return [...this.activeAgentIds];
  }
  
  
  public async getAgentIds(): Promise<string[]> {
    if (this.agentIds.length === 0) {

      const agents = await prisma.agent.findMany({
        select: { id: true },
        orderBy: { createdAt: 'asc' }
      });
      
      this.agentIds = agents.map(agent => agent.id);
    }
    
    return this.agentIds;
  }
  
  // Get active agent count
  public async getActiveAgentCount(): Promise<number> {
    const activeIds = await this.getActiveAgentIds();
    return activeIds.length;
  }
  
  // Get total agent count
  public async getAgentCount(): Promise<number> {
    const allAgentIds = await this.getAgentIds();
    return allAgentIds.length;
  }
  
  /**
   * Process agents for market analysis with enhanced logging
   */
  public async processAgentsForMarketAnalysis(batchSize: number = 50): Promise<void> {
    const activeAgentIds = await this.getActiveAgentIds();
    // Reduce batch size for faster processing
    const selectedAgentIds = activeAgentIds.slice(0, Math.min(batchSize, 10));
    
    console.log(`🔍 Processing ${selectedAgentIds.length} agents for market analysis (reduced for speed)`);
    
    // Fetch market info once and reuse
    const marketInfo = await marketData.getMarketInfo();
    

    const isRateLimited = this.rateLimitDelay > 2000; 
    
   
    let successCount = 0;
    let failureCount = 0;
    
  
    if (isRateLimited) {
      console.log('⚠️ OpenAI API rate limited, using simulated market analysis');
      
      await pMap(
        selectedAgentIds,
        async (agentId) => {
          try {
            // Get agent data from database
            const agentData = await prisma.agent.findUnique({
              where: { id: agentId },
              include: { state: true }
            });
            
            if (!agentData) return;
            

            const analysisText = await this.generateSimulatedAnalysis(agentData.personalityType, marketInfo);
            

            await prisma.agentState.update({
              where: { agentId },
              data: {
                lastMarketAnalysis: new Date(),
                lastAction: new Date(),
                lastDecision: {
                  type: 'MARKET_ANALYSIS',
                  timestamp: new Date().toISOString(),
                  data: {
                    marketInfo: {
                      price: marketInfo.price || 0,
                      liquidity: marketInfo.liquidity || 0,
                      volume24h: marketInfo.volume24h || 0,
                      priceChange24h: marketInfo.priceChange24h || 0
                    },
                    analysis: analysisText,
                    simulated: true
                  }
                }
              }
            });
            
            this.lastAccessTime.set(agentId, Date.now());
            successCount++;
          } catch (error) {
            console.error(`Error in simulated market analysis for agent ${agentId}:`, error);
            failureCount++;
          }
        },
        { concurrency: Math.min(20, this.maxConcurrent) }
      );
      
      console.log(`✅ Simulated market analysis complete: ${successCount} successful, ${failureCount} failed`);
      return;
    }
    
 
    await pMap(
      selectedAgentIds,
      async (agentId) => {
        try {
        
          const now = Date.now();
          const timeSinceLastCall = now - this.lastApiCall;
          const baseDelay = Math.max(0, this.rateLimitDelay - timeSinceLastCall);
          if (baseDelay > 0) {
            const jitter = this.rateLimitJitter > 0 ? Math.random() * this.rateLimitJitter : 0;
            await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
          }
          
          const agent = await this.getAgentInstance(agentId);
          if (agent) {
            await agent.analyzeMarket(marketInfo);
            this.lastAccessTime.set(agentId, Date.now());
            this.lastApiCall = Date.now();
            successCount++;
          }
        } catch (error: unknown) {
          console.error(`Error in market analysis for agent ${agentId}:`, error);
          failureCount++;
          

          if (error instanceof Error && (error.message?.includes('429') || error.message?.includes('quota'))) {
            this.rateLimitDelay = Math.min(this.rateLimitDelay * 2, 10000); // Max 10 second delay
            console.log(`Rate limit hit, increasing delay to ${this.rateLimitDelay}ms`);
            
        
            try {
              const agentData = await prisma.agent.findUnique({
                where: { id: agentId },
                include: { state: true }
              });
              
              if (agentData) {

                const analysisText = await this.generateSimulatedAnalysis(agentData.personalityType, marketInfo);
                
        
                await prisma.agentState.update({
                  where: { agentId },
                  data: {
                    lastMarketAnalysis: new Date(),
                    lastAction: new Date(),
                    lastDecision: {
                      type: 'MARKET_ANALYSIS',
                      timestamp: new Date().toISOString(),
                      data: {
                        marketInfo: {
                          price: marketInfo.price || 0,
                          liquidity: marketInfo.liquidity || 0,
                          volume24h: marketInfo.volume24h || 0,
                          priceChange24h: marketInfo.priceChange24h || 0
                        },
                        analysis: analysisText,
                        simulated: true,
                        error: 'API quota exceeded, using fallback analysis'
                      }
                    }
                  }
                });
                
                this.lastAccessTime.set(agentId, Date.now());
                successCount++; 
                failureCount--; 
              }
            } catch (fallbackError) {
              console.error(`Error in fallback analysis for agent ${agentId}:`, fallbackError);
            }
          }
        }
      },
      { concurrency: this.maxConcurrent }
    );
    
    console.log(`✅ Market analysis complete: ${successCount} successful, ${failureCount} failed`);
  }
  
  /**
   * Generate a simulated market analysis text based on agent personality type
   */
  private async generateSimulatedAnalysis(personalityType: string, marketInfo: any): Promise<string> {
    const price = marketInfo.price || 0.001;
    const priceChange = marketInfo.priceChange24h || 0;
    const volume = marketInfo.volume24h || 0;
    
    const { getSelectedToken } = await import('../../config/selectedToken');
    const selectedToken = await getSelectedToken();
    const tokenSymbol = selectedToken?.symbol || 'TOKEN';
    
    // Create personalized analysis based on personality type
    switch (personalityType) {
      case 'AGGRESSIVE':
        return `As an aggressive trader, I see the current ${tokenSymbol} price of ${price} SOL as an opportunity. ` +
               `The market ${priceChange >= 0 ? 'growth' : 'dip'} of ${Math.abs(priceChange).toFixed(2)}% ` +
               `presents a ${priceChange >= 0 ? 'momentum to ride' : 'buying opportunity'}. ` +
               `With ${volume} SOL in trading volume, there's decent liquidity. ` +
               `I'm inclined to take a more aggressive position.`;
               
      case 'CONSERVATIVE':
        return `Looking at the ${tokenSymbol} market with caution. Current price at ${price} SOL with ` +
               `${Math.abs(priceChange).toFixed(2)}% ${priceChange >= 0 ? 'increase' : 'decrease'} in 24h. ` +
               `Volume of ${volume} SOL indicates ${volume > 100 ? 'reasonable' : 'limited'} market activity. ` +
               `I prefer to maintain a conservative approach and ${priceChange < -5 ? 'wait for stabilization' : 'make small, calculated moves'}.`;
               
      case 'MODERATE':
        return `Taking a balanced view of the ${tokenSymbol} market. Price at ${price} SOL with ` +
               `${priceChange.toFixed(2)}% change over 24h. Trading volume of ${volume} SOL ` +
               `suggests ${volume > 50 ? 'decent' : 'moderate'} market activity. ` +
               `I'll consider a diversified approach, possibly ${priceChange > 0 ? 'capitalizing on uptrend with partial positions' : 'averaging in on dips'}.`;
               
      case 'TREND_FOLLOWER':
        return `Analyzing the ${tokenSymbol} trend at ${price} SOL. The ${priceChange >= 0 ? 'positive' : 'negative'} trend of ` +
               `${Math.abs(priceChange).toFixed(2)}% in 24h is ${Math.abs(priceChange) > 3 ? 'significant' : 'noteworthy'}. ` +
               `Volume at ${volume} SOL shows ${volume > 100 ? 'strong' : 'some'} market interest. ` +
               `I'll likely ${priceChange >= 1 ? 'follow the upward momentum' : priceChange <= -1 ? 'follow the downward trend' : 'wait for a clearer trend'}.`;
               
      case 'CONTRARIAN':
        return `Taking a contrarian view on ${tokenSymbol} at ${price} SOL. The ${priceChange >= 0 ? 'rise' : 'drop'} of ` +
               `${Math.abs(priceChange).toFixed(2)}% may be ${Math.abs(priceChange) > 5 ? 'overextended' : 'approaching reversal'}. ` +
               `Trading volume of ${volume} SOL ${volume > 100 ? 'might indicate peak interest' : 'shows limited conviction'}. ` +
               `I'm considering ${priceChange >= 3 ? 'preparing for a potential reversal' : priceChange <= -3 ? 'looking for entry points against the trend' : 'waiting for stronger signals'}.`;
               
      default:
        return `Analyzing the current ${tokenSymbol} market conditions. Price: ${price} SOL, 24h change: ${priceChange.toFixed(2)}%, ` +
               `trading volume: ${volume} SOL. Monitoring the situation and will adjust strategy accordingly.`;
    }
  }
  
  /**
   * Process agents for social interaction with enhanced logging
   */
  public async processAgentsForSocialInteraction(batchSize: number = 15): Promise<void> {
    const activeAgentIds = await this.getActiveAgentIds();
    const selectedAgentIds = activeAgentIds.slice(0, Math.min(batchSize, 15));

    console.log(`💬 Processing ${selectedAgentIds.length} agents for REAL-TIME market chat`);

  
    const marketSentiment = await marketData.getMarketSentiment();
    let chatCount = 0;

    await pMap(
      selectedAgentIds,
      async (agentId) => {
        try {
          const agent = await this.getAgentInstance(agentId);
          if (agent) {
            await agent.socialInteraction([], marketSentiment);
            this.lastAccessTime.set(agentId, Date.now());
            chatCount++;
          }
        } catch (error) {
          console.error(`Error in social interaction for agent ${agentId}:`, error);
        }
      },
      { concurrency: this.maxConcurrent }
    );

    console.log(`✅ Real-time market chat complete: ${chatCount} agents processed`);
  }
  
  /**
   * Process agents for trading decisions with enhanced logging
   */
  public async processAgentsForTrading(batchSize: number = 50): Promise<void> {
    const activeAgentIds = await this.getActiveAgentIds();
    // Reduce batch size - focus on quality over quantity
    const selectedAgentIds = activeAgentIds.slice(0, Math.min(batchSize, 5));
    
    console.log(`💰 Processing ${selectedAgentIds.length} agents for trading decisions (reduced for speed)`);
    
    // Get market data once to share
    const marketInfo = await marketData.getMarketInfo();
    
    // First pass: Have agents analyze market and make trading decisions
    const tradesToExecute: Array<{ agentId: string; trade: any }> = [];
    
    // Track decision counts
    let decisionCount = 0;
    let errorCount = 0;
    let quotaExceededCount = 0;

    await pMap(
      selectedAgentIds,
      async (agentId) => {
        try {
          // Check if we've hit the quota limit
          if (this.apiQuotaExceeded) {
            console.log(`API quota exceeded, waiting ${this.quotaRetryDelay}ms before retrying...`);
            await new Promise(resolve => setTimeout(resolve, this.quotaRetryDelay));
            this.apiQuotaExceeded = false; // Reset after waiting
          }

          // Implement rate limiting
          const now = Date.now();
          const timeSinceLastCall = now - this.lastApiCall;
          if (timeSinceLastCall < this.rateLimitDelay) {
            await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastCall));
          }
          
          const agent = await this.getAgentInstance(agentId);
          if (agent) {
            await agent.makeTradeDecision(marketInfo);
            this.lastAccessTime.set(agentId, Date.now());
            this.lastApiCall = Date.now();
            // Gradually relax delay after successful calls
            this.rateLimitDelay = Math.max(
              this.minRateLimitDelay,
              Math.floor(this.rateLimitDelay * 0.95)
            );
            decisionCount++;
          }
        } catch (error: unknown) {
          console.error(`Error in trade decision for agent ${agentId}:`, error);
          errorCount++;
          
          // If we hit rate limit, increase the delay and mark quota as exceeded
          if (error instanceof Error && (error.message?.includes('429') || error.message?.includes('quota'))) {
            this.apiQuotaExceeded = true;
            quotaExceededCount++;
            this.rateLimitDelay = Math.min(this.rateLimitDelay * 2, this.maxRateLimitDelay);
            this.quotaRetryDelay = Math.min(this.quotaRetryDelay * 2, 60000); // Max 1 minute delay
            console.log(
              `Rate limit hit (${quotaExceededCount} times), increasing delays to ${this.rateLimitDelay}ms and ${this.quotaRetryDelay}ms`
            );
          }
        }
      },
      { concurrency: this.maxConcurrent }
    );
    
    console.log(`✅ Trading decisions complete: ${decisionCount} decisions made, ${tradesToExecute.length} trades to execute, ${errorCount} errors, ${quotaExceededCount} quota exceeded`);
    
    // If we hit quota limits too many times, suggest increasing the delay
    if (quotaExceededCount > 5) {
      console.warn('⚠️ High number of quota exceeded errors. Consider:');
      console.warn('1. Increasing MAX_CONCURRENT_AGENTS in .env');
      console.warn('2. Increasing rateLimitDelay in agent-manager.ts');
      console.warn('3. Checking your OpenAI API quota and billing status');
    }
  }
  
  /**
   * Execute a trade directly for an agent (used during simulation bootstrap)
   */
  public async executeTradeForAgent(agentId: string, inputAmount: number, inputIsSol: boolean): Promise<any> {
    try {
      const { getSelectedToken } = await import('../../config/selectedToken');
      const selectedToken = await getSelectedToken();
      const tokenSymbol = selectedToken?.symbol || 'TOKEN';
      console.log(`Executing bootstrap trade for agent ${agentId}: ${inputIsSol ? 'buy' : 'sell'} ${inputAmount} ${inputIsSol ? 'SOL' : tokenSymbol}`);
      
      // Get agent data
      const agent = await prisma.agent.findUnique({
        where: { id: agentId }
      });
      
      if (!agent) {
        console.error(`Agent ${agentId} not found for bootstrap trade`);
        return null;
      }
      
      // Verify agent has sufficient balance
      if (inputIsSol && agent.walletBalance < inputAmount) {
        console.log(`Agent ${agent.name} has insufficient SOL balance for bootstrap trade`);
        return null;
      } else if (!inputIsSol && agent.tokenBalance < inputAmount) {
        console.log(`Agent ${agent.name} has insufficient token balance for bootstrap trade`);
        return null;
      }
      
      // Execute the swap
      try {
        const result = await amm.executeSwap(
          agentId,
          inputAmount,
          inputIsSol,
          0.5 // Default slippage tolerance
        );
        
        console.log(`Bootstrap trade executed successfully for agent ${agent.name}: ${JSON.stringify(result.swapResult)}`);
        
        return result;
      } catch (error) {
        console.error(`Error executing bootstrap trade for agent ${agent.name}:`, error);
        return null;
      }
    } catch (error) {
      console.error(`Error in executeTradeForAgent:`, error);
      return null;
    }
  }
  
  // Get or create agent instance from the pool
  private async getAgentInstance(agentId: string): Promise<any> {
    try {
      // Get from pool or create new (either AutonomousAgent or LLMAutonomousAgent)
      return await this.agentPool.getAgent(agentId);
    } catch (error) {
      console.error(`Error getting agent instance ${agentId}:`, error);
      return null;
    }
  }
  
  // Clean up inactive agents to free memory
  public async cleanupInactiveAgents(): Promise<void> {
    console.log(`🧹 Cleaning up inactive agents to free memory...`);
    const beforeCleanup = this.activeAgentIds.size;
    
    // Force pool cleanup to release memory
    await this.agentPool.cleanup();
    
  
    const now = Date.now();
    const sortedByAccess = [...this.lastAccessTime.entries()]
      .sort((a, b) => a[1] - b[1])
      .slice(0, Math.floor(this.activeAgentIds.size * 0.2));
    
    for (const [id] of sortedByAccess) {
      this.lastAccessTime.delete(id);
      this.activeAgentIds.delete(id);
    }
    
    const afterCleanup = this.activeAgentIds.size;
    console.log(`✅ Cleanup complete: Removed ${beforeCleanup - afterCleanup} inactive agents from memory`);
  }
  
  // Shutdown and cleanup
  public async shutdown(): Promise<void> {
    console.log(`🛑 Shutting down agent manager...`);
    
    // Force cleanup of all agent instances
    await this.agentPool.cleanupAll();
    
    // Clear all collections
    this.activeAgentIds.clear();
    this.lastAccessTime.clear();
    
    console.log('✅ Agent manager shut down successfully');
  }

  /**
   * Set the distribution of personality types for new agents
   */
  public setPersonalityDistribution(distribution: Record<PersonalityType, number>): void {
    // Validate that the distribution sums to 1
    const total = Object.values(distribution).reduce((sum, value) => sum + value, 0);
    if (Math.abs(total - 1) > 0.0001) {
      throw new Error('Personality distribution must sum to 1');
    }
    this.personalityDistribution = distribution;
  }

  /**
   * Get a random personality type based on the current distribution
   */
  private getRandomPersonalityType(): PersonalityType {
    const random = Math.random();
    let sum = 0;
    for (const [type, probability] of Object.entries(this.personalityDistribution)) {
      sum += probability;
      if (random <= sum) {
        return type as PersonalityType;
      }
    }
    return 'MODERATE' as PersonalityType; // Fallback
  }
}
