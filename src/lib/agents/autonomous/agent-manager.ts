import { AgentPool } from '../agent-factory';
import { AutonomousAgent } from './agent-core';
import { prisma } from '../../cache/dbCache';
import { PersonalityType } from '../personalities';
import { PrismaClient } from '@prisma/client';
import { marketData } from '../../market/data';
import { amm } from '../../blockchain/amm';
import { randomBytes } from 'crypto';
import pMap from 'p-map';

/**
 * AgentManager - Manages the creation, scheduling and execution of autonomous agents
 */
export class AgentManager {
  private static instance: AgentManager;
  private agentPool: AgentPool;
  private agentIds: string[] = [];
  private activeAgentIds: Set<string> = new Set();
  private lastAccessTime: Map<string, number> = new Map();
  private maxConcurrent: number = 50; // Maximum concurrent agent operations
  private maxActiveAgents: number = 1000; // Maximum agents active at once
  private agentCacheTTL: number = 60 * 60 * 1000; // 1 hour cache TTL by default
  
  // Private constructor
  private constructor() {
    this.agentPool = new AgentPool({
      maxSize: 100,
      cleanupInterval: 5 * 60 * 1000,
      ttl: this.agentCacheTTL,
      useLLM: true // Use LLM-powered agents by default
    });
  }
  
  // Get the singleton instance
  public static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }
  
  // Set maximum concurrent operations and active agents
  public setLimits(maxConcurrent: number, maxActiveAgents: number) {
    this.maxConcurrent = maxConcurrent;
    this.maxActiveAgents = maxActiveAgents;
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
  
  // Get active agent IDs
  public async getActiveAgentIds(): Promise<string[]> {
    const now = Date.now();
    
    // Clean up stale entries
    for (const [id, lastAccess] of this.lastAccessTime.entries()) {
      if (now - lastAccess > this.agentCacheTTL) {
        this.lastAccessTime.delete(id);
        this.activeAgentIds.delete(id);
      }
    }
    
    // If we have fewer active agents than max, add more
    if (this.activeAgentIds.size < this.maxActiveAgents) {
      const allAgentIds = await this.getAgentIds();
      
      // Shuffle the array to randomize which agents are active
      const shuffled = [...allAgentIds].sort(() => 0.5 - Math.random());
      
      // Add agents up to the max active limit
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
  
  // Get all known agent IDs
  public async getAgentIds(): Promise<string[]> {
    if (this.agentIds.length === 0) {
      // Load agent IDs from database if not already loaded
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
    const selectedAgentIds = activeAgentIds.slice(0, batchSize);
    
    console.log(`🔍 Processing ${selectedAgentIds.length} agents for market analysis`);
    
    // First, get current market data once to share across all agents
    const marketInfo = await marketData.getMarketInfo();
    
    // Track success/failure counts
    let successCount = 0;
    let failureCount = 0;
    
    // Process agents in parallel with concurrency control
    await pMap(
      selectedAgentIds,
      async (agentId) => {
        try {
          const agent = await this.getAgentInstance(agentId);
          if (agent) {
            await agent.analyzeMarket(marketInfo);
            this.lastAccessTime.set(agentId, Date.now());
            successCount++;
          }
        } catch (error) {
          console.error(`Error in market analysis for agent ${agentId}:`, error);
          failureCount++;
        }
      },
      { concurrency: this.maxConcurrent }
    );
    
    console.log(`✅ Market analysis complete: ${successCount} successful, ${failureCount} failed`);
  }
  
  /**
   * Process agents for social interaction with enhanced logging
   */
  public async processAgentsForSocialInteraction(batchSize: number = 50): Promise<void> {
    const activeAgentIds = await this.getActiveAgentIds();
    const selectedAgentIds = activeAgentIds.slice(0, batchSize);
    
    console.log(`💬 Processing ${selectedAgentIds.length} agents for social interaction`);
    
    // Get most recent messages once to share across agents
    const recentMessages = await prisma.message.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: { id: true, name: true, personalityType: true } } }
    });
    
    console.log(`Found ${recentMessages.length} recent messages for agents to process`);
    
    const marketSentiment = await marketData.getMarketSentiment();
    
    // First pass: Have agents analyze messages and decide if they want to respond
    const responsesToGenerate = [];
    
    // Track success/failure
    let interactionCount = 0;
    let errorCount = 0;
    
    // Process agents in parallel with concurrency control
    await pMap(
      selectedAgentIds,
      async (agentId) => {
        try {
          const agent = await this.getAgentInstance(agentId);
          if (agent) {
            // Allow agent to analyze and decide whether to respond
            const didInteract = await agent.socialInteraction(recentMessages, marketSentiment);
            this.lastAccessTime.set(agentId, Date.now());
            interactionCount++;
            
            // Get agent state to see if they want to send a message
            const agentState = await prisma.agentState.findUnique({
              where: { agentId }
            });
            
            // Check if the agent's response contains intent to send a message
            const lastDecision = agentState?.lastDecision;
            const responseText = lastDecision?.data?.response?.toString() || '';
            
            // For LLM agents that generate responses to messages, track if a follow-up is needed
            if (
              responseText.includes('I would like to respond') || 
              responseText.includes('I will send a message') ||
              responseText.includes('I want to share my') ||
              responseText.includes('Here\'s what I would say')
            ) {
              responsesToGenerate.push(agentId);
            }
          }
        } catch (error) {
          console.error(`Error in social interaction for agent ${agentId}:`, error);
          errorCount++;
        }
      },
      { concurrency: this.maxConcurrent }
    );
    
    // Second pass: For agents who decided to respond, create actual messages
    console.log(`📝 ${responsesToGenerate.length} agents want to respond to messages`);
    
    let messageCount = 0;
    
    if (responsesToGenerate.length > 0) {
      await pMap(
        responsesToGenerate,
        async (agentId) => {
          try {
            // Get agent state to extract message content
            const agentState = await prisma.agentState.findUnique({
              where: { agentId },
              include: { agent: true }
            });
            
            if (!agentState) return;
            
            // Get agent data for sending message
            const { agent } = agentState;
            const responseText = agentState.lastDecision?.data?.response?.toString() || '';
            
            // Extract a message from the response
            // This is a simple heuristic - the LLM handling would be more sophisticated
            let messageContent = '';
            
            // Look for content that appears to be a message
            if (responseText.includes('"')) {
              // Try to extract content between quotes
              const matches = responseText.match(/"([^"]+)"/);
              if (matches && matches.length > 1) {
                messageContent = matches[1];
              }
            } else if (responseText.includes('\n\n')) {
              // Take content after double newline as likely being the message
              const parts = responseText.split('\n\n');
              messageContent = parts[parts.length - 1].trim();
            } else {
              // Just take the last 100 characters as a fallback
              messageContent = responseText.slice(-100).trim();
            }
            
            // Clean up and verify we have a valid message
            messageContent = messageContent.replace(/^(I would say:|I'll respond with:|My message:|Message:)/i, '').trim();
            
            // Only create a message if we have extracted content
            if (messageContent.length > 10) {
              console.log(`Agent ${agent.name} creating message: ${messageContent.slice(0, 30)}...`);
              
              // Create the message
              await prisma.message.create({
                data: {
                  content: messageContent,
                  senderId: agentId,
                  type: 'CHAT',
                  visibility: 'public',
                  sentiment: responseText.toLowerCase().includes('bearish') ? 'negative' : 
                             responseText.toLowerCase().includes('bullish') ? 'positive' : 'neutral',
                  mentions: []
                }
              });
              
              messageCount++;
            }
          } catch (error) {
            console.error(`Error generating message for agent ${agentId}:`, error);
          }
        },
        { concurrency: this.maxConcurrent / 2 } // Use lower concurrency for message generation
      );
    }
    
    console.log(`✅ Social interaction complete: ${interactionCount} interactions, ${messageCount} messages generated, ${errorCount} errors`);
  }
  
  /**
   * Process agents for trading decisions with enhanced logging
   */
  public async processAgentsForTrading(batchSize: number = 50): Promise<void> {
    const activeAgentIds = await this.getActiveAgentIds();
    const selectedAgentIds = activeAgentIds.slice(0, batchSize);
    
    console.log(`💰 Processing ${selectedAgentIds.length} agents for trading decisions`);
    
    // Get market data once to share
    const marketInfo = await marketData.getMarketInfo();
    
    // First pass: Have agents analyze market and make trading decisions
    const tradesToExecute = [];
    
    // Track decision counts
    let decisionCount = 0;
    let errorCount = 0;
    
    // Process agents in parallel with concurrency control
    await pMap(
      selectedAgentIds,
      async (agentId) => {
        try {
          const agent = await this.getAgentInstance(agentId);
          if (agent) {
            // Allow agent to analyze market and decide whether to trade
            await agent.makeTradeDecision(marketInfo);
            this.lastAccessTime.set(agentId, Date.now());
            decisionCount++;
            
            // Get agent state to see if they want to execute a trade
            const agentState = await prisma.agentState.findUnique({
              where: { agentId }
            });
            
            // Check if the agent's decision contains intent to trade
            const lastDecision = agentState?.lastDecision;
            const decisionText = lastDecision?.data?.decision?.toString() || '';
            
            // Check if the agent's decision contains a trade
            let tradeIntent = null;
            
            // For buy decisions
            if (
              decisionText.toLowerCase().includes('buy') || 
              decisionText.toLowerCase().includes('purchasing') ||
              decisionText.toLowerCase().includes('acquire')
            ) {
              // Try to extract the amount from the text
              const buyMatches = decisionText.match(/buy\s+(\d+(\.\d+)?)\s+(sol|tokens)/i) ||
                                decisionText.match(/purchasing\s+(\d+(\.\d+)?)\s+(sol|tokens)/i) ||
                                decisionText.match(/acquire\s+(\d+(\.\d+)?)\s+(sol|tokens)/i) ||
                                decisionText.match(/invest\s+(\d+(\.\d+)?)\s+(sol|tokens)/i);
              
              if (buyMatches && buyMatches.length > 1) {
                const amount = parseFloat(buyMatches[1]);
                const unit = buyMatches[3].toLowerCase();
                const inputIsSol = unit === 'sol';
                
                if (!isNaN(amount) && amount > 0) {
                  tradeIntent = {
                    agentId,
                    inputAmount: amount,
                    inputIsSol,
                    action: 'buy',
                    decisionText
                  };
                }
              }
            } 
            // For sell decisions
            else if (
              decisionText.toLowerCase().includes('sell') || 
              decisionText.toLowerCase().includes('selling') ||
              decisionText.toLowerCase().includes('liquidate')
            ) {
              // Try to extract the amount from the text
              const sellMatches = decisionText.match(/sell\s+(\d+(\.\d+)?)\s+(sol|tokens)/i) ||
                                 decisionText.match(/selling\s+(\d+(\.\d+)?)\s+(sol|tokens)/i) ||
                                 decisionText.match(/liquidate\s+(\d+(\.\d+)?)\s+(sol|tokens)/i);
              
              if (sellMatches && sellMatches.length > 1) {
                const amount = parseFloat(sellMatches[1]);
                const unit = sellMatches[3].toLowerCase();
                const inputIsSol = unit !== 'sol'; // If selling tokens, inputIsSol is false
                
                if (!isNaN(amount) && amount > 0) {
                  tradeIntent = {
                    agentId,
                    inputAmount: amount,
                    inputIsSol,
                    action: 'sell',
                    decisionText
                  };
                }
              }
            }
            
            // If we found a valid trade intent, add it to our execution list
            if (tradeIntent) {
              tradesToExecute.push(tradeIntent);
            }
          }
        } catch (error) {
          console.error(`Error in trading decision for agent ${agentId}:`, error);
          errorCount++;
        }
      },
      { concurrency: this.maxConcurrent }
    );
    
    // Second pass: Execute trades for agents who decided to trade
    console.log(`🔄 ${tradesToExecute.length} agents want to execute trades`);
    
    let successfulTrades = 0;
    let failedTrades = 0;
    
    if (tradesToExecute.length > 0) {
      await pMap(
        tradesToExecute,
        async (trade) => {
          try {
            console.log(`Executing trade for agent ${trade.agentId}: ${trade.action} ${trade.inputAmount} ${trade.inputIsSol ? 'SOL' : 'NURO'}`);
            
            // Get agent data
            const agent = await prisma.agent.findUnique({
              where: { id: trade.agentId }
            });
            
            if (!agent) return;
            
            // Verify agent has sufficient balance
            if (trade.inputIsSol && agent.walletBalance < trade.inputAmount) {
              console.log(`Agent ${agent.name} has insufficient SOL balance for trade`);
              failedTrades++;
              return;
            } else if (!trade.inputIsSol && agent.tokenBalance < trade.inputAmount) {
              console.log(`Agent ${agent.name} has insufficient token balance for trade`);
              failedTrades++;
              return;
            }
            
            // Execute the swap
            try {
              const result = await amm.executeSwap(
                trade.agentId,
                trade.inputAmount,
                trade.inputIsSol,
                0.5 // Default slippage tolerance
              );
              
              console.log(`Trade executed successfully for agent ${agent.name}: ${JSON.stringify(result.swapResult)}`);
              successfulTrades++;
              
              // Announce the trade in chat
              const tradeAnnouncement = trade.inputIsSol ?
                `Just bought ${result.swapResult.outputAmount.toFixed(2)} NURO tokens at ${result.swapResult.effectivePrice.toFixed(6)} SOL each.` :
                `Just sold ${trade.inputAmount} NURO tokens for ${result.swapResult.outputAmount.toFixed(4)} SOL.`;
              
              await prisma.message.create({
                data: {
                  content: tradeAnnouncement,
                  senderId: trade.agentId,
                  type: 'TRADE',
                  visibility: 'public',
                  sentiment: trade.inputIsSol ? 'positive' : 'negative',
                  mentions: []
                }
              });
            } catch (error) {
              console.error(`Error executing trade for agent ${agent.name}:`, error);
              failedTrades++;
            }
          } catch (error) {
            console.error(`Error processing trade:`, error);
            failedTrades++;
          }
        },
        { concurrency: this.maxConcurrent / 2 } // Use lower concurrency for trade execution
      );
    }
    
    console.log(`✅ Trading decisions complete: ${decisionCount} decisions made, ${successfulTrades} trades executed, ${failedTrades} trades failed, ${errorCount} errors`);
  }
  
  /**
   * Execute a trade directly for an agent (used during simulation bootstrap)
   */
  public async executeTradeForAgent(agentId: string, inputAmount: number, inputIsSol: boolean): Promise<any> {
    try {
      console.log(`Executing bootstrap trade for agent ${agentId}: ${inputIsSol ? 'buy' : 'sell'} ${inputAmount} ${inputIsSol ? 'SOL' : 'NURO'}`);
      
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
    
    // Clear some of the least recently used active agents
    const now = Date.now();
    const sortedByAccess = [...this.lastAccessTime.entries()]
      .sort((a, b) => a[1] - b[1])
      .slice(0, Math.floor(this.activeAgentIds.size * 0.2)); // Remove ~20% of least active
    
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
}
