import { AgentManager } from '../../agents/autonomous/agent-manager';
import { simulationReport } from '../reporting';
import { prisma } from '../../cache/dbCache';
import { marketData } from '../../market/data';
import { amm } from '@/lib/blockchain/amm'; // New import for bootstrapping the AMM

/**
 * Startup function to initialize the simulation environment.
 * This ensures that critical blockchain components (e.g. the AMM pool) are bootstrapped
 * before the simulation agents begin their activities.
 */
async function initializeSimulation() {
  try {
    console.log("Initializing simulation...");
    
    // Bootstrap the pool if needed
    await amm.bootstrapPool();
    
    // Continue with other initialization...
    console.log("Simulation initialization complete");
  } catch (error) {
    console.error("Error initializing simulation:", error);
    throw error;
  }
}

/**
 * SimulationEngine - Core orchestrator for the autonomous agent simulation
 * 
 * Handles the main simulation loop, phases, and coordinates all agent activities.
 * Optimized for handling thousands of agents with efficient resource management.
 */
export class SimulationEngine {
  private static instance: SimulationEngine;
  private agentManager: AgentManager;
  private status: string = 'STOPPED';
  private currentPhase: string = 'MARKET_ANALYSIS';
  private simulationInterval: NodeJS.Timeout | null = null;
  private phaseInterval: NodeJS.Timeout | null = null;
  private reportInterval: NodeJS.Timeout | null = null;
  private marketUpdateInterval: NodeJS.Timeout | null = null;
  private simulationId: string | null = null;
  private maxAgentsPerPhase = 20; // Increased from 5 to 20 for better throughput
  private phaseDuration = 300000; // 5 minutes per phase to accommodate LLM API calls
  private simulationSpeed = 1; // Multiplier for simulation speed
  private lastHeartbeat = Date.now();
  private memoryUsageWarning = false;
  private phaseStartTime = 0;
  private _agentCount = 0;
  private eventHandlers: Map<string, Function[]> = new Map();
  
  // Private constructor to enforce singleton pattern
  private constructor() {
    this.agentManager = AgentManager.getInstance();
    this.setupEventHandlers();
  }
  
  // Get the singleton instance
  public static getInstance(): SimulationEngine {
    if (!SimulationEngine.instance) {
      SimulationEngine.instance = new SimulationEngine();
    }
    return SimulationEngine.instance;
  }
  
  private setupEventHandlers() {
    // Register default handlers
    this.on('phase:complete', async (phase:any) => {
      console.log(`Phase ${phase} completed`);
    });
    
    this.on('simulation:error', async (error:any) => {
      console.error('Simulation error:', error);
      await this.logSimulationEvent('ERROR', `Simulation error: ${error.message}`);
    });
  }
  
  // Event system for extensibility
  public on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }
  
  private async emitEvent(event: string, ...args: any[]) {
    if (this.eventHandlers.has(event)) {
      for (const handler of this.eventHandlers.get(event) || []) {
        try {
          await handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      }
    }
  }
  
  // Start the simulation with configurable parameters
  public async start(config: {
    agentCount?: number,
    phaseDuration?: number,
    speed?: number,
    maxAgentsPerPhase?: number,
    personalityDistribution?: Record<string, number>
  } = {}): Promise<any> {
    if (this.status === 'RUNNING') {
      return { success: false, message: 'Simulation already running' };
    }
    
    try {
      // First, initialize the simulation environment (bootstrap the AMM pool, etc.)
      await initializeSimulation();
      
      // Apply configuration
      this._agentCount = config.agentCount || this._agentCount || 100;
      this.phaseDuration = config.phaseDuration || this.phaseDuration;
      this.simulationSpeed = config.speed || this.simulationSpeed;
      this.maxAgentsPerPhase = config.maxAgentsPerPhase || this.maxAgentsPerPhase || 5;
      
      // Create simulation record
      const simulation = await prisma.simulation.create({
        data: {
          status: 'RUNNING',
          currentPhase: 'MARKET_ANALYSIS',
          agentCount: this._agentCount,
          activeAgents: 0,
          startedAt: new Date(),
          configuration: config as any,
        }
      });
      
      this.simulationId = simulation.id;
      this.status = 'RUNNING';
      this.currentPhase = 'MARKET_ANALYSIS';
      this.lastHeartbeat = Date.now();
      
      // Initialize required number of agents with distribution
      await this.agentManager.initializeAgents(
        this._agentCount, 
        config.personalityDistribution
      );
      
      await this.logSimulationEvent('INFO', `Simulation started with ${this._agentCount} agents`);
      
      // Bootstrap the simulation with initial activity
      await this.bootstrapSimulation();
      
      // Set up market update interval (independent of simulation phases)
      this.startMarketUpdates();
      
      // Start the phase cycle
      this.startPhaseCycle();
      
      // Start periodic reporting
      this.startReporting();
      
      // Start heartbeat monitoring
      this.startHeartbeatMonitor();
      
      return { 
        success: true, 
        simulationId: this.simulationId,
        message: `Simulation started with ${this._agentCount} agents` 
      };
    } catch (error: any) {
      console.error('Failed to start simulation:', error);
      this.status = 'ERROR';
      await this.logSimulationEvent('ERROR', `Failed to start simulation: ${error.message}`);
      return { success: false, message: `Failed to start simulation: ${error.message}` };
    }
  }
  
  /**
   * Bootstrap the simulation with initial data and activity
   * to overcome the cold-start problem
   */
  private async bootstrapSimulation() {
    try {
      console.log('🚀 Bootstrapping simulation with initial activity...');
      await this.logSimulationEvent('INFO', '🚀 Bootstrapping simulation with initial activity');
      
      // 1. Check if we need to bootstrap (if there's already activity, skip it)
      const messageCount = await prisma.message.count();
      const transactionCount = await prisma.transaction.count();
      
      await this.logSimulationEvent('INFO', `Found ${messageCount} existing messages and ${transactionCount} transactions`);
      
      if (messageCount > 10 && transactionCount > 5) {
        console.log('Sufficient activity already exists, skipping bootstrap');
        await this.logSimulationEvent('INFO', '✓ Sufficient activity exists, skipping bootstrap');
        return;
      }
      
      // 2. Create a system welcome message if none exists
      if (messageCount === 0) {
        await this.logSimulationEvent('INFO', '📝 Creating system welcome message');
        
        // Find or create a system agent
        let systemAgent = await prisma.agent.findFirst({
          where: { 
            name: { contains: 'System' }
          }
        });
        
        if (!systemAgent) {
          // Create a system agent for announcements
          // Generate a random public key for the system agent
          const randomPublicKey = `sys${Date.now().toString(36)}${Math.random().toString(36).substring(2, 7)}`;
          // Use the FUNDER_PRIVATE_KEY for the system agent
          // This is a simplified approach - in a real system you might use a dedicated system key
          const systemPrivateKey = process.env.FUNDER_PRIVATE_KEY ||
            `sys_private_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 15)}`;
          
          systemAgent = await prisma.agent.create({
            data: {
              name: 'System',
              personalityType: 'MODERATE',
              personality: 'MODERATE',
              occupation: 'System Monitor',
              walletBalance: 1000,
              tokenBalance: 1000000,
              avatarUrl: '/images/system-avatar.png',
              publicKey: randomPublicKey,
              walletPrivateKey: systemPrivateKey // <-- Newly added field
            }
          });
          
          await this.logSimulationEvent('INFO', '👤 Created System agent for announcements');
        }
        
        // Create welcome message
        const welcomeMessage = await prisma.message.create({
          data: {
            content: 'Welcome to NeuralTrader! The trading simulation is starting.',
            senderId: systemAgent.id,
            type: 'ANNOUNCEMENT',
            visibility: 'public',
            createdAt: new Date()
          }
        });
        
        await this.logSimulationEvent('INFO', `✓ Created welcome message: "${welcomeMessage.content}"`);
      }
      
      // 3. Force some initial agent activity
      const activeAgentIds = await this.agentManager.getActiveAgentIds();
      await this.logSimulationEvent('INFO', `👥 Found ${activeAgentIds.length} active agents for bootstrap`);
      
      if (activeAgentIds.length > 0) {
        // Take a small batch of agents
        const initialAgents = activeAgentIds.slice(0, 5);
        
        // Process them immediately for market analysis
        await this.logSimulationEvent('INFO', `🔍 Processing ${initialAgents.length} agents for initial market analysis`);
        await this.agentManager.processAgentsForMarketAnalysis(initialAgents.length);
        
        // Force a few agents to create messages
        let messageCount = 0;
        for (const agentId of initialAgents) {
          try {
            // Get agent data
            const agent = await prisma.agent.findUnique({
              where: { id: agentId },
              select: { id: true, name: true, personalityType: true }
            });
            
            if (agent) {
              // Get selected token
              const { getSelectedToken } = await import('../../config/selectedToken');
              const selectedToken = await getSelectedToken();
              const tokenSymbol = selectedToken.symbol || 'TOKEN';
              
              // Create a market observation message
              const initialPrice = await this.getInitialPrice();
              const message = await prisma.message.create({
                data: {
                  content: `I'm looking at the ${tokenSymbol} token market. Initial price seems to be set at ${initialPrice} SOL.`,
                  senderId: agentId,
                  type: 'MARKET_UPDATE',
                  visibility: 'public',
                  sentiment: Math.random() > 0.5 ? 'positive' : 'neutral',
                  createdAt: new Date()
                }
              });
              
              messageCount++;
              console.log(`Created bootstrap message for agent ${agent.name}: "${message.content}"`);
            }
          } catch (error) {
            console.error(`Error creating bootstrap message for agent ${agentId}:`, error);
          }
        }
        
        await this.logSimulationEvent('INFO', `✓ Created ${messageCount} initial messages from agents`);
        
        // 4. Force a couple of initial trades
        let tradeCount = 0;
        for (let i = 0; i < 3; i++) {
          if (i >= initialAgents.length) break;
          
          const agentId = initialAgents[i];
          try {
            // Get agent info
            const agent = await prisma.agent.findUnique({
              where: { id: agentId },
              select: { id: true, name: true }
            });
            
            if (!agent) continue;
            
            // Buy tokens (input is SOL)
            const solAmount = 5 + (Math.random() * 10); // 5-15 SOL
            await this.logSimulationEvent('INFO', `💱 Agent ${agent.name} attempting bootstrap trade of ${solAmount.toFixed(2)} SOL`);
            
            await this.agentManager.executeTradeForAgent(agentId, solAmount, true);
            
            // Get selected token
            const { getSelectedToken } = await import('../../config/selectedToken');
            const selectedToken = await getSelectedToken();
            const tokenSymbol = selectedToken.symbol || 'TOKEN';
            
            // Create a message about the trade
            await prisma.message.create({
              data: {
                content: `Just bought some ${tokenSymbol} tokens. I like the initial price point.`,
                senderId: agentId,
                type: 'TRADE',
                visibility: 'public',
                sentiment: 'positive',
                createdAt: new Date()
              }
            });
            
            tradeCount++;
          } catch (error) {
            console.error(`Error creating bootstrap trade for agent ${agentId}:`, error);
          }
        }
        
        await this.logSimulationEvent('INFO', `✓ Executed ${tradeCount} initial trades`);
      }
      
      console.log('🎉 Simulation bootstrap complete');
      await this.logSimulationEvent('INFO', '🎉 Simulation bootstrap complete');
    } catch (error) {
      console.error('Error bootstrapping simulation:', error);
      await this.logSimulationEvent('ERROR', `Bootstrap error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get the initial token price
   */
  private async getInitialPrice(): Promise<number> {
    try {
      const marketInfo = await marketData.getMarketInfo();
      return marketInfo.price || 0.001;
    } catch (error) {
      return 0.001; // Fallback value
    }
  }
  
  // Stop the simulation and clean up resources
  public async stop(): Promise<any> {
    if (this.status !== 'RUNNING') {
      return { success: false, message: 'Simulation not running' };
    }
    
    try {
      // Clear all intervals
      if (this.simulationInterval) clearInterval(this.simulationInterval);
      if (this.phaseInterval) clearInterval(this.phaseInterval);
      if (this.reportInterval) clearInterval(this.reportInterval);
      if (this.marketUpdateInterval) clearInterval(this.marketUpdateInterval);
      
      this.simulationInterval = null;
      this.phaseInterval = null;
      this.reportInterval = null;
      this.marketUpdateInterval = null;
      
      // Update status
      this.status = 'STOPPED';
      
      // Generate final report
      if (this.simulationId) {
        await simulationReport.generateReport(this.simulationId);
        
        // Update simulation record
        await prisma.simulation.update({
          where: { id: this.simulationId },
          data: {
            status: 'STOPPED',
            endedAt: new Date()
          }
        });
      }
      
      await this.logSimulationEvent('INFO', 'Simulation stopped');
      
      // Clean up agent manager resources
      await this.agentManager.shutdown();
      
      return { success: true, message: 'Simulation stopped successfully' };
    } catch (error: any) {
      console.error('Failed to stop simulation:', error);
      this.status = 'ERROR';
      await this.logSimulationEvent('ERROR', `Failed to stop simulation: ${error.message}`);
      return { success: false, message: `Failed to stop simulation: ${error.message}` };
    }
  }
  
  // Market continues to update regardless of simulation phases
  private startMarketUpdates() {
    // Clear any existing interval
    if (this.marketUpdateInterval) {
      clearInterval(this.marketUpdateInterval);
    }
    
    // Update market every 3-10 seconds based on simulation speed
    const updateInterval = Math.floor(5000 / this.simulationSpeed);
    this.marketUpdateInterval = setInterval(async () => {
      if (this.status !== 'RUNNING') return;
      
      try {
        await marketData.updateMarketState();
        this.lastHeartbeat = Date.now();
      } catch (error) {
        console.error('Error in market update:', error);
        await this.logSimulationEvent('ERROR', `Market update error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, updateInterval);
  }
  
  // Start the phase cycle that rotates through the different simulation phases
  private startPhaseCycle() {
    if (this.phaseInterval) {
      clearInterval(this.phaseInterval);
    }
    
    // Calculate adjusted phase duration based on simulation speed
    const adjustedPhaseDuration = Math.floor(this.phaseDuration / this.simulationSpeed);
    this.phaseStartTime = Date.now();
    
    // Immediately start the first phase
    this.runCurrentPhase();
    
    // Set up the phase rotation interval
    this.phaseInterval = setInterval(() => {
      if (this.status !== 'RUNNING') return;
      
      // Move to the next phase
      this.rotatePhase();
      this.phaseStartTime = Date.now();
      
      // Run the new phase
      this.runCurrentPhase();
    }, adjustedPhaseDuration);
  }
  
  // Run the current phase of the simulation
  private async runCurrentPhase() {
    if (this.status !== 'RUNNING') return;
    
    try {
      // Update simulation record with current phase
      if (this.simulationId) {
        await prisma.simulation.update({
          where: { id: this.simulationId },
          data: { currentPhase: this.currentPhase }
        });
      }
      
      // Log phase start with emoji for better visibility
      const phaseEmoji = {
        'MARKET_ANALYSIS': '📊',
        'SOCIAL': '💬',
        'TRADING': '💰',
        'REPORTING': '📝'
      };
      
      await this.logSimulationEvent('INFO', `${phaseEmoji || '🔄'} Phase ${this.currentPhase} started`);
      
      // Process agents in batches based on the current phase
      const agentIds = await this.agentManager.getActiveAgentIds();
      const batchSize = Math.min(this.maxAgentsPerPhase, agentIds.length);
      
      await this.logSimulationEvent('INFO', `👥 Processing ${batchSize} of ${agentIds.length} active agents`);
      
      switch (this.currentPhase) {
        case 'MARKET_ANALYSIS':
          await this.agentManager.processAgentsForMarketAnalysis(batchSize);
          break;
          
        case 'SOCIAL':
          await this.agentManager.processAgentsForSocialInteraction(batchSize);
          break;
          
        case 'TRADING':
          await this.agentManager.processAgentsForTrading(batchSize);
          break;
          
        case 'REPORTING':
          // Generate interim reports during the reporting phase
          if (this.simulationId) {
            await simulationReport.generateInterimReport(this.simulationId);
          }
          
          // Also use this phase for system maintenance and cleanup
          const memoryUsage = process.memoryUsage();
          const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
          const memoryLimitMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
          
          // Log memory usage
          await this.logSimulationEvent(
            'INFO', 
            `🧠 Memory usage: ${memoryUsageMB}MB/${memoryLimitMB}MB (${Math.round(memoryUsageMB / memoryLimitMB * 100)}%)`
          );
          
          // Set warning flag if memory usage is too high
          this.memoryUsageWarning = memoryUsageMB / memoryLimitMB > 0.8;
          
          if (this.memoryUsageWarning) {
            await this.logSimulationEvent('WARNING', '⚠️ Memory usage is high, consider reducing agent count');
            
            // Force garbage collection by cleaning cached items
            await this.agentManager.cleanupInactiveAgents();
          }
          break;
      }
      
      // Log phase completion with count information based on phase type
      let completionMessage = `✅ Phase ${this.currentPhase} completed`;
      
      switch (this.currentPhase) {
        case 'MARKET_ANALYSIS':
          completionMessage += ` - ${batchSize} agents analyzed market conditions`;
          break;
        case 'SOCIAL':
          // Try to get message count for a more informative log
          try {
            const newMessageCount = await prisma.message.count({
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 60000) // Created in last minute
                }
              }
            });
            completionMessage += ` - ${newMessageCount} new messages generated`;
          } catch (error) {
            // Fallback if count fails
            completionMessage += ` - Social interactions processed`;
          }
          break;
        case 'TRADING':
          // Try to get transaction count for a more informative log
          try {
            const newTransactionCount = await prisma.transaction.count({
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 60000) // Created in last minute
                }
              }
            });
            completionMessage += ` - ${newTransactionCount} new trades executed`;
          } catch (error) {
            // Fallback if count fails
            completionMessage += ` - Trading decisions processed`;
          }
          break;
      }
      
      await this.logSimulationEvent('INFO', completionMessage);
      
      // Emit phase complete event
      await this.emitEvent('phase:complete', this.currentPhase);
      
    } catch (error) {
      console.error(`Error in phase ${this.currentPhase}:`, error);
      await this.logSimulationEvent('ERROR', `❌ Phase ${this.currentPhase} error: ${error instanceof Error ? error.message : String(error)}`);
      await this.emitEvent('simulation:error', error);
    }
  }
  
  // Rotate to the next simulation phase
  private rotatePhase() {
    switch (this.currentPhase) {
      case 'MARKET_ANALYSIS':
        this.currentPhase = 'SOCIAL';
        break;
      case 'SOCIAL':
        this.currentPhase = 'TRADING';
        break;
      case 'TRADING':
        this.currentPhase = 'REPORTING';
        break;
      case 'REPORTING':
        this.currentPhase = 'MARKET_ANALYSIS';
        break;
    }
  }
  
  // Start periodic report generation
  private startReporting() {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }
    
    // Generate a report every 5 minutes (adjusted by simulation speed)
    const reportInterval = Math.floor(300000 / this.simulationSpeed);
    this.reportInterval = setInterval(async () => {
      if (this.status !== 'RUNNING' || !this.simulationId) return;
      
      try {
        await simulationReport.generateReport(this.simulationId);
        this.lastHeartbeat = Date.now();
      } catch (error) {
        console.error('Error generating report:', error);
        await this.logSimulationEvent('ERROR', `Report generation error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, reportInterval);
  }
  
  // Start heartbeat monitor to detect and recover from stalled simulations
  private startHeartbeatMonitor() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
    
    // Check heartbeat every 30 seconds
    this.simulationInterval = setInterval(async () => {
      if (this.status !== 'RUNNING') return;
      
      const now = Date.now();
      const lastHeartbeatAge = now - this.lastHeartbeat;
      
      // If no heartbeat in 10 minutes, attempt to recover (increased due to LLM API delays)
      if (lastHeartbeatAge > 600000) {
        await this.logSimulationEvent('WARNING', `Simulation heartbeat lost for ${Math.round(lastHeartbeatAge/1000)}s, attempting recovery`);
        
        try {
          // Attempt to restart the phase
          this.runCurrentPhase();
          this.lastHeartbeat = now;
        } catch (error) {
          console.error('Failed to recover simulation:', error);
          await this.logSimulationEvent('ERROR', `Failed to recover simulation: ${error instanceof Error ? error.message : String(error)}`);
          
          // If recovery failed, pause simulation
          this.status = 'PAUSED';
          
          if (this.simulationId) {
            await prisma.simulation.update({
              where: { id: this.simulationId },
              data: { status: 'PAUSED' }
            });
          }
        }
      }
    }, 30000);
  }
  
  // Log simulation events to the database
  private async logSimulationEvent(level: 'INFO' | 'WARNING' | 'ERROR', message: string) {
    if (!this.simulationId) return;
    
    try {
      await prisma.simulationLog.create({
        data: {
          simulationId: this.simulationId,
          level,
          message,
          event: level === 'ERROR' ? 'error' : 'info', // Default event type
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log simulation event:', error);
    }
  }
  
  // Get current simulation status including progress
  public async getStatus() {
    // Calculate phase progress
    const phaseProgress = this.status === 'RUNNING' 
      ? Math.min(100, Math.round(((Date.now() - this.phaseStartTime) / this.phaseDuration) * 100))
      : 0;
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryLimitMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    
    // Get recent market data
    const marketInfo = await marketData.getMarketSummary();
    
    // Get active agent count
    const activeAgentCount = await this.agentManager.getActiveAgentCount();
    
    return {
      status: this.status,
      currentPhase: this.currentPhase,
      phaseProgress,
      simulationId: this.simulationId,
      agentCount: this._agentCount,
      activeAgentCount,
      memoryUsage: {
        used: memoryUsageMB,
        total: memoryLimitMB,
        percentage: Math.round(memoryUsageMB / memoryLimitMB * 100),
        warning: this.memoryUsageWarning
      },
      marketInfo,
      simulationSpeed: this.simulationSpeed,
      lastHeartbeat: this.lastHeartbeat
    };
  }
  
  // Pause the simulation
  public async pause() {
    if (this.status !== 'RUNNING') {
      return { success: false, message: 'Simulation not running' };
    }
    
    this.status = 'PAUSED';
    
    if (this.simulationId) {
      await prisma.simulation.update({
        where: { id: this.simulationId },
        data: { status: 'PAUSED' }
      });
    }
    
    await this.logSimulationEvent('INFO', 'Simulation paused');
    
    return { success: true, message: 'Simulation paused' };
  }
  
  // Resume a paused simulation
  public async resume() {
    if (this.status !== 'PAUSED') {
      return { success: false, message: 'Simulation not paused' };
    }
    
    this.status = 'RUNNING';
    
    if (this.simulationId) {
      await prisma.simulation.update({
        where: { id: this.simulationId },
        data: { status: 'RUNNING' }
      });
    }
    
    await this.logSimulationEvent('INFO', 'Simulation resumed');
    
    return { success: true, message: 'Simulation resumed' };
  }
  
  // Change simulation speed
  public setSpeed(speed: number) {
    if (speed <= 0 || speed > 10) {
      return { success: false, message: 'Speed must be between 0.1 and 10' };
    }
    
    this.simulationSpeed = speed;
    
    // Restart intervals with new speed
    if (this.status === 'RUNNING') {
      this.startMarketUpdates();
      this.startPhaseCycle();
      this.startReporting();
    }
    
    return { success: true, message: `Simulation speed set to ${speed}x` };
  }
  
  // Get agent count
  public getAgentCount() {
    return this._agentCount;
  }
}
