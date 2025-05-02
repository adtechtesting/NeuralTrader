// src/lib/simulation/scheduler.ts
import { PrismaClient } from '@prisma/client';
import { makeAgentAct } from '../agents/agent-factory';
import { getPersonalityBehavior } from '../agents/personalities';
import { getPrismaClient } from '../cache/dbCache';
import { generateGroupChat } from '../agents/messaging';
import pLimit from 'p-limit';
import cluster from 'cluster';
import os from 'os';
import { EventEmitter } from 'events';

const prisma = getPrismaClient();

// Create an event emitter for simulation events
export const simulationEvents = new EventEmitter();

// Track whether the simulation is running
let simulationActive = false;
let simulationInterval: NodeJS.Timeout | null = null;

// Worker distribution settings
const NUM_WORKERS = process.env.SIMULATION_WORKERS ? parseInt(process.env.SIMULATION_WORKERS) : 4;
const WORKER_BATCH_SIZE = 5; // Process 5 agents at a time in each worker

// Concurrency limiter for agent operations
const limit = pLimit(NUM_WORKERS);

// Track current operations to prevent overloading
const MAX_CONCURRENT_OPERATIONS = 8; // Optimized for modern computers
const MAX_QUEUE_SIZE = 100; // Increased for larger simulations
const OPERATION_TIMEOUT = 15000; // 15 seconds for more complex agent operations
let currentOperations = 0;
const operationQueue: Function[] = [];
let processingPaused = false;

// Configuration defaults
const DEFAULT_MIN_INTERVAL = 2000; // 2 seconds
const DEFAULT_MAX_INTERVAL = 5000; // 5 seconds

// Simulation phase tracking
type SimulationPhase = 'init' | 'market_analysis' | 'social' | 'trading' | 'reporting';
let currentPhase: SimulationPhase = 'init';
let phaseStartTime: number = 0;

// Global simulation stats for monitoring
const simulationStats = {
  operationsTotal: 0,
  operationsSuccess: 0,
  operationsFailed: 0,
  operationsTimedOut: 0,
  startTime: null as Date | null,
  lastAgentAction: null as Date | null,
  queueHighWatermark: 0,
  queueDropped: 0,
  memoryUsage: [] as {timestamp: number, usage: NodeJS.MemoryUsage}[],
  lastPerformanceCheck: 0,
  currentPhase: 'init' as SimulationPhase,
  phaseDurations: {} as Record<SimulationPhase, number>,
  marketStats: {
    price: 0,
    volume: 0,
    transactions: 0,
    liquidity: 0
  },
  socialStats: {
    messages: 0,
    sentiment: 0,
    topInfluencers: [] as string[]
  },
  agentStats: {
    totalAgents: 0,
    activeBuyers: 0,
    activeSellers: 0,
    mostActive: [] as string[]
  }
};

// Enhanced logging system
export const simulationLogs: {
  timestamp: number,
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: any
}[] = [];

// Maximum number of logs to keep in memory
const MAX_LOGS = 2000;

// Add log entry with timestamp
function addLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
  const log = {
    timestamp: Date.now(),
    level,
    message,
    data
  };
  
  // Add to in-memory logs (with limit)
  simulationLogs.unshift(log);
  if (simulationLogs.length > MAX_LOGS) {
    simulationLogs.pop();
  }
  
  // Emit log event for real-time monitoring
  simulationEvents.emit('log', log);
  
  // Also log to console with prefix for easier debugging
  const prefix = `[SIM:${level.toUpperCase()}]`;
  switch (level) {
    case 'error':
      console.error(prefix, message, data ? data : '');
      break;
    case 'warn':
      console.warn(prefix, message, data ? data : '');
      break;
    case 'debug':
      console.debug(prefix, message, data ? data : '');
      break;
    default:
      console.log(prefix, message, data ? data : '');
  }
  
  // Periodically check performance metrics
  const now = Date.now();
  if (now - simulationStats.lastPerformanceCheck > 5000) { // Every 5 seconds
    simulationStats.lastPerformanceCheck = now;
    simulationStats.memoryUsage.push({
      timestamp: now,
      usage: process.memoryUsage()
    });
    
    // Keep only last 100 measurements
    if (simulationStats.memoryUsage.length > 100) {
      simulationStats.memoryUsage.shift();
    }
    
    // Log memory usage
    const memUsage = process.memoryUsage();
    addLog('debug', 'Performance metrics', {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      queue: operationQueue.length,
      activeOps: currentOperations,
      phase: currentPhase
    });
    
    // Check if we need to throttle based on memory usage
    if (memUsage.heapUsed > 1.5 * 1024 * 1024 * 1024) { // 1.5GB
      if (!processingPaused) {
        processingPaused = true;
        addLog('warn', 'Memory pressure detected - pausing agent operations temporarily');
      }
    } else if (processingPaused && memUsage.heapUsed < 1 * 1024 * 1024 * 1024) { // 1GB
      processingPaused = false;
      addLog('info', 'Memory usage normalized - resuming agent operations');
    }
  }
}

/**
 * Start the autonomous agent simulation with phased execution model
 */
export async function startSimulation(config = {
  minInterval: DEFAULT_MIN_INTERVAL,
  maxInterval: DEFAULT_MAX_INTERVAL,
  messageChance: 0.4, // 40% chance of sending a message 
  tradeChance: 0.6,   // 60% chance of making a trade decision
  batchSize: WORKER_BATCH_SIZE, // Use worker batch size
  maxAgents: 50,      // Maximum active agents in simulation
  phaseDuration: 60000, // Each phase runs for 1 minute by default
  enableChatMessages: true, // Enable group chat messages
  enableMarketEvents: true, // Enable market events
  enablePersistence: true,  // Enable DB persistence for long-running simulations
  debugMode: false          // Enable extra debugging
}) {
  try {
    if (simulationActive) {
      addLog('info', "Simulation is already running", { config });
      return {
        status: 'already_running',
        config
      };
    }
    
    // Reset simulation stats
    simulationActive = true;
    simulationStats.startTime = new Date();
    simulationStats.operationsTotal = 0;
    simulationStats.operationsSuccess = 0;
    simulationStats.operationsFailed = 0;
    simulationStats.operationsTimedOut = 0;
    simulationStats.queueHighWatermark = 0;
    simulationStats.queueDropped = 0;
    simulationStats.memoryUsage = [];
    simulationStats.lastPerformanceCheck = Date.now();
    simulationStats.phaseDurations = {
      init: 0,
      market_analysis: 0,
      social: 0,
      trading: 0,
      reporting: 0
    };
    
    // Reset market and agent stats
    simulationStats.marketStats = {
      price: 0,
      volume: 0,
      transactions: 0,
      liquidity: 0
    };
    
    simulationStats.socialStats = {
      messages: 0,
      sentiment: 0,
      topInfluencers: []
    };
    
    simulationStats.agentStats = {
      totalAgents: 0,
      activeBuyers: 0,
      activeSellers: 0,
      mostActive: []
    };
    
    // Clear existing logs
    simulationLogs.length = 0;
    
    // Set current phase to initialization
    currentPhase = 'init';
    phaseStartTime = Date.now();
    
    addLog('info', "Starting autonomous agent simulation", { config, phase: currentPhase });
    
    // Log initial memory usage
    const initialMemory = process.memoryUsage();
    addLog('debug', "Initial memory state", {
      heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(initialMemory.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(initialMemory.rss / 1024 / 1024) + 'MB'
    });
    
    // Count active agents
    const agentCount = await prisma.agent.count({
      where: { active: true }
    });
    
    addLog('info', `Found ${agentCount} active agents`, { config });
    simulationStats.agentStats.totalAgents = agentCount;
    
    // If we have no active agents, activate a batch
    if (agentCount === 0) {
      const activationCount = Math.min(config.maxAgents || 50, 500); // Cap at 500 agents
      addLog('info', `No active agents found, activating ${activationCount} agents`);
      
      await prisma.agent.updateMany({
        where: { active: false },
        data: { active: true },
        take: activationCount
      });
      
      simulationStats.agentStats.totalAgents = activationCount;
    }
    
    // Ensure agent pool is ready
    addLog('info', "Initializing agent pool");
    
    // Log simulation start to database
    await prisma.simulationLog.create({
      data: {
        event: 'simulation_started',
        details: { 
          config,
          agentCount: simulationStats.agentStats.totalAgents
        },
        timestamp: new Date()
      }
    });
    
    // Initial social phase - generate some chat messages
    if (config.enableChatMessages) {
      addLog('info', "Generating initial chat messages");
      
      try {
        // Use the messaging system to generate initial chatter
        const messageCount = Math.min(10, Math.floor(agentCount * 0.1)); // 10% of agents or max 10
        await generateGroupChat(messageCount);
        addLog('info', `Generated ${messageCount} initial messages`);
      } catch (error) {
        addLog('error', "Failed to generate initial messages", { error });
      }
    }
    
    // Schedule the first phase
    scheduleNextPhase(config);
    
    return {
      status: 'started',
      startTime: simulationStats.startTime,
      config,
      agentCount: simulationStats.agentStats.totalAgents
    };
  } catch (error) {
    // If anything goes wrong during startup, make sure we don't leave simulation in a bad state
    simulationActive = false;
    addLog('error', "Error starting simulation", { 
      error: error instanceof Error ? { 
        message: error.message, 
        stack: error.stack 
      } : String(error) 
    });
    
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Stop the autonomous agent simulation
 */
export function stopSimulation() {
  if (!simulationActive) {
    addLog('info', "Simulation is not running");
    return {
      status: 'not_running'
    };
  }
  
  simulationActive = false;
  if (simulationInterval) {
    clearTimeout(simulationInterval);
    simulationInterval = null;
  }
  
  // Get final memory usage
  const finalMemory = process.memoryUsage();
  
  // Clear any pending operations
  const pendingCount = operationQueue.length;
  operationQueue.length = 0;
  currentOperations = 0;
  
  const duration = simulationStats.startTime 
    ? Math.round((Date.now() - simulationStats.startTime.getTime()) / 1000)
    : 0;
  
  // Log detailed stop information
  addLog('info', "Simulation stopped", {
    duration: `${duration} seconds`,
    pendingOperations: pendingCount,
    operationsTotal: simulationStats.operationsTotal,
    operationsSuccess: simulationStats.operationsSuccess,
    operationsFailed: simulationStats.operationsFailed,
    operationsTimedOut: simulationStats.operationsTimedOut,
    queueHighWatermark: simulationStats.queueHighWatermark,
    queueDropped: simulationStats.queueDropped,
    finalMemory: {
      heapUsed: Math.round(finalMemory.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(finalMemory.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(finalMemory.rss / 1024 / 1024) + 'MB'
    }
  });
  
  // Log simulation end to database
  prisma.simulationLog.create({
    data: {
      event: 'simulation_stopped',
      details: {
        duration: duration,
        operationsTotal: simulationStats.operationsTotal,
        operationsSuccess: simulationStats.operationsSuccess,
        operationsFailed: simulationStats.operationsFailed,
        operationsTimedOut: simulationStats.operationsTimedOut,
        queueHighWatermark: simulationStats.queueHighWatermark,
        queueDropped: simulationStats.queueDropped,
        memoryUsage: {
          heapUsed: Math.round(finalMemory.heapUsed / 1024 / 1024),
          rss: Math.round(finalMemory.rss / 1024 / 1024)
        }
      },
      timestamp: new Date()
    }
  }).catch(err => addLog('error', "Error logging simulation end to database", err));
  
  return {
    status: 'stopped',
    stats: {
      duration: duration,
      operationsTotal: simulationStats.operationsTotal,
      operationsSuccess: simulationStats.operationsSuccess,
      operationsFailed: simulationStats.operationsFailed,
      operationsTimedOut: simulationStats.operationsTimedOut
    },
    logs: simulationLogs.slice(0, 100) // Return most recent logs
  };
}

/**
 * Get the current status of the simulation
 */
export function getSimulationStatus() {
  return {
    active: simulationActive,
    stats: simulationStats,
    queue: {
      current: operationQueue.length,
      activeOperations: currentOperations,
      highWatermark: simulationStats.queueHighWatermark
    },
    simulationLogs: simulationLogs // Expose the in-memory logs to the API
  };
}

/**
 * Schedule the next batch of agent actions
 */
async function scheduleNextBatch(config) {
  // Always check if simulation is still active
  if (!simulationActive) return;
  
  // Clear any existing interval to prevent duplicates
  if (simulationInterval) {
    clearTimeout(simulationInterval);
    simulationInterval = null;
  }
  
  try {
    // Safety check for config
    const safeConfig = {
      batchSize: config?.batchSize || 1,
      minInterval: config?.minInterval || DEFAULT_MIN_INTERVAL,
      maxInterval: config?.maxInterval || DEFAULT_MAX_INTERVAL
    };
    
    addLog('debug', "Scheduling next batch", { 
      batchSize: safeConfig.batchSize,
      queueSize: operationQueue.length, 
      activeOperations: currentOperations
    });
    
    // Select agents for this batch
    const agents = await selectAgentsForAction(safeConfig.batchSize);
    
    if (agents.length === 0) {
      addLog('warn', "No agents found or all agents are inactive. Stopping simulation.");
      stopSimulation();
      return;
    }
    
    addLog('debug', `Selected ${agents.length} agents for next batch`);
    
    // Safety check - don't create more operations if we're already overloaded
    if (operationQueue.length < MAX_QUEUE_SIZE) {
      // Queue operations for each selected agent
      for (const agent of agents) {
        queueAgentAction(agent);
      }
      
      // Update high watermark if needed
      if (operationQueue.length > simulationStats.queueHighWatermark) {
        simulationStats.queueHighWatermark = operationQueue.length;
      }
    } else {
      addLog('warn', `Queue at capacity (${operationQueue.length}/${MAX_QUEUE_SIZE}). Skipping batch.`);
      simulationStats.queueDropped += agents.length;
    }
    
    // Check if simulation is still active before scheduling next batch
    if (!simulationActive) return;
    
    // Schedule the next batch with safe interval values
    const minInt = Math.max(500, safeConfig.minInterval); // Minimum 500ms
    const maxInt = Math.max(minInt + 500, safeConfig.maxInterval); // At least 500ms more than min
    
    const nextInterval = Math.floor(
      minInt + Math.random() * (maxInt - minInt)
    );
    
    addLog('debug', `Scheduling next batch in ${nextInterval}ms`);
    
    simulationInterval = setTimeout(() => {
      // Safety check - use try/catch to prevent unhandled exceptions
      try {
        if (simulationActive) {
          scheduleNextBatch(config);
        }
      } catch (err) {
        addLog('error', "Error in scheduleNextBatch timeout handler", { 
          error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err)
        });
      }
    }, nextInterval);
    
  } catch (error) {
    addLog('error', "Error in agent batch scheduler", { 
      error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error)
    });
    
    // Log error to database
    prisma.simulationLog.create({
      data: {
        event: 'batch_scheduling_error',
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date()
      }
    }).catch(err => addLog('error', "Error logging batch error to database", err));
    
    // Check if simulation is still active before retrying
    if (!simulationActive) return;
    
    // If there's an error, wait a bit and try again
    addLog('info', "Will retry batch scheduling in 5 seconds");
    
    simulationInterval = setTimeout(() => {
      // Safety check - use try/catch to prevent unhandled exceptions
      try {
        if (simulationActive) {
          scheduleNextBatch(config);
        }
      } catch (err) {
        addLog('error', "Error in scheduleNextBatch error recovery", { 
          error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err)
        });
      }
    }, 5000);
  }
}

// Cache for agents to reduce database load
let agentCache: any[] = [];
let agentCacheLastUpdate = 0;
const AGENT_CACHE_TTL = 60000; // 1 minute cache TTL

/**
 * Select agents for the next action based on their activity levels
 */
async function selectAgentsForAction(count: number): Promise<any[]> {
  try {
    const now = Date.now();
    
    // Check if we need to refresh the cache
    if (agentCache.length === 0 || now - agentCacheLastUpdate > AGENT_CACHE_TTL) {
      console.log("Refreshing agent cache...");
      
      // Fetch active agents with limited fields
      agentCache = await prisma.agent.findMany({
        where: {
          active: true  // Only consider active agents
        },
        select: {
          id: true,
          name: true,
          personalityType: true,
          balance: true,
          socialInfluence: true,
          messageFrequency: true  // Used for weighting
        },
        take: 100 // Limit to 100 agents max for performance
      });
      
      agentCacheLastUpdate = now;
    }
    
    if (agentCache.length === 0) {
      return [];
    }
    
    // Calculate weights based on personality and message frequency
    const agentsWithWeights = agentCache.map(agent => {
      const personality = getPersonalityBehavior(agent.personalityType);
      
      // Combine base message frequency with personality traits
      const activityWeight = (agent.messageFrequency || 0.5) * 
                            (personality.tradeFrequency + personality.messageFrequency) / 2;
      
      return {
        ...agent,
        weight: activityWeight
      };
    });
    
    // Select agents using weighted random selection, limited by count and queue capacity
    const maxToSelect = Math.min(count, agentsWithWeights.length, MAX_QUEUE_SIZE - operationQueue.length);
    const selectedAgents = [];
    const availableAgents = [...agentsWithWeights];
    
    for (let i = 0; i < maxToSelect; i++) {
      const selected = selectWeightedRandom(availableAgents);
      if (selected) {
        selectedAgents.push(selected.agent);
        
        // Remove from available pool to avoid duplicates
        const index = availableAgents.findIndex(a => a.id === selected.agent.id);
        if (index >= 0) {
          availableAgents.splice(index, 1);
        }
      }
    }
    
    return selectedAgents;
  } catch (error) {
    console.error("Error selecting agents:", error);
    return []; // Return empty array to continue simulation safely
  }
}

/**
 * Select a random item based on weights
 */
function selectWeightedRandom(items: Array<{ weight: number, [key: string]: any }>) {
  // Calculate total weight
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  
  if (totalWeight <= 0) return null;
  
  // Get a random point within the total weight
  const randomWeight = Math.random() * totalWeight;
  
  // Find the item that corresponds to that weight
  let cumulativeWeight = 0;
  for (const item of items) {
    cumulativeWeight += item.weight;
    if (randomWeight <= cumulativeWeight) {
      return { agent: item, weight: item.weight };
    }
  }
  
  // Fallback to first item
  return items.length > 0 ? { agent: items[0], weight: items[0].weight } : null;
}

/**
 * Queue an agent action operation
 */
function queueAgentAction(agent) {
  // Check if queue is already at capacity
  if (operationQueue.length >= MAX_QUEUE_SIZE) {
    addLog('warn', `Queue is full (${operationQueue.length} items). Dropping operation for agent ${agent.name}.`);
    simulationStats.queueDropped++;
    return;
  }
  
  const operation = async () => {
    const startTime = Date.now();
    const operationId = `op_${startTime}_${Math.floor(Math.random() * 1000)}`;
    simulationStats.operationsTotal++;
    simulationStats.lastAgentAction = new Date();
    
    addLog('debug', `Starting agent operation ${operationId}`, {
      agent: {
        id: agent.id,
        name: agent.name,
        type: agent.personalityType
      }
    });
    
    // Setup operation timeout
    const operationTimeout = setTimeout(() => {
      simulationStats.operationsTimedOut++;
      addLog('error', `Operation ${operationId} for agent ${agent.name} timed out after ${OPERATION_TIMEOUT}ms`);
      
      // Log timeout error (only if simulation is still active)
      if (simulationActive) {
        prisma.simulationLog.create({
          data: {
            event: 'agent_action_timeout',
            agentId: agent.id,
            details: { timeout: OPERATION_TIMEOUT, operationId },
            timestamp: new Date()
          }
        }).catch(err => addLog('error', "Error logging timeout to database", err));
      }
      
      // Force completion to unblock queue
      currentOperations--;
      processQueue();
    }, OPERATION_TIMEOUT);
    
    try {
      addLog('info', `Agent ${agent.name} (${agent.personalityType}) is taking action...`);
      
      // Capture memory before agent action
      const beforeMem = process.memoryUsage();
      
      // Make the agent act autonomously
      const result = await makeAgentAct(agent.id);
      
      // Capture memory after agent action
      const afterMem = process.memoryUsage();
      const memDiff = {
        heapUsed: Math.round((afterMem.heapUsed - beforeMem.heapUsed) / 1024 / 1024) + 'MB',
        heapTotal: Math.round((afterMem.heapTotal - beforeMem.heapTotal) / 1024 / 1024) + 'MB',
        rss: Math.round((afterMem.rss - beforeMem.rss) / 1024 / 1024) + 'MB'
      };
      
      // Calculate operation duration
      const duration = Date.now() - startTime;
      
      // Clear timeout since operation completed
      clearTimeout(operationTimeout);
      
      if (result.success) {
        simulationStats.operationsSuccess++;
        addLog('info', `Agent ${agent.name} action completed successfully in ${duration}ms`, {
          operationId,
          duration,
          memoryDelta: memDiff
        });
      } else {
        simulationStats.operationsFailed++;
        addLog('error', `Agent ${agent.name} action failed after ${duration}ms`, {
          operationId,
          duration,
          error: result.error,
          memoryDelta: memDiff
        });
      }
    } catch (error) {
      // Clear timeout since operation errored out
      clearTimeout(operationTimeout);
      
      simulationStats.operationsFailed++;
      addLog('error', `Error in agent operation for ${agent.name}`, {
        operationId,
        duration: Date.now() - startTime,
        error: error instanceof Error ? { 
          message: error.message, 
          stack: error.stack 
        } : String(error)
      });
      
      // Log error (only if simulation is still active)
      if (simulationActive) {
        prisma.simulationLog.create({
          data: {
            event: 'agent_action_error',
            agentId: agent.id,
            details: { 
              error: error instanceof Error ? error.message : String(error),
              operationId
            },
            timestamp: new Date()
          }
        }).catch(err => addLog('error', "Error logging agent error to database", err));
      }
    } finally {
      currentOperations--;
      processQueue(); // Process next operation if any
    }
  };
  
  // Add to operation queue
  operationQueue.push(operation);
  
  // Start processing the queue if possible
  processQueue();
}

/**
 * Process the next operation in the queue if capacity allows
 */
function processQueue() {
  // Process operations from the queue if we have capacity
  while (currentOperations < MAX_CONCURRENT_OPERATIONS && operationQueue.length > 0) {
    const operation = operationQueue.shift();
    if (operation) {
      currentOperations++;
      addLog('debug', `Starting queued operation (${operationQueue.length} remaining in queue, ${currentOperations}/${MAX_CONCURRENT_OPERATIONS} active)`);
      
      operation().catch(err => {
        addLog('error', "Unhandled error in operation", { 
          error: err instanceof Error ? { 
            message: err.message, 
            stack: err.stack 
          } : String(err)
        });
        currentOperations--; // Ensure we decrement even on fatal errors
      });
    }
  }
}
