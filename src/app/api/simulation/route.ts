import { NextRequest, NextResponse } from 'next/server';
import { SimulationEngine } from '@/lib/simulation/engine/simulation-engine';
import { AgentManager } from '@/lib/agents/autonomous/agent-manager';
import { dbCache } from '@/lib/cache/dbCache';
import { amm } from '@/lib/blockchain/amm';
import { getCached, setCached } from '@/lib/cache/dbCache';

export const maxDuration = 60; // Increase timeout to 60 seconds

// Fallback simulation status for when the database is slow
const FALLBACK_STATUS = {
  status: 'UNKNOWN',
  currentPhase: 'UNKNOWN',
  phaseProgress: 0,
  simulationId: null,
  agentCount: 0,
  activeAgentCount: 0,
  memoryUsage: {
    used: 0,
    total: 0,
    percentage: 0,
    warning: false
  },
  marketInfo: null,
  simulationSpeed: 1,
  lastHeartbeat: Date.now()
};

// Get simulation status
export async function GET(request: NextRequest) {
  try {
    // Check cache first for frequent status requests
    const cacheKey = 'simulation_status';
    const cachedStatus = getCached(cacheKey);
    
    if (cachedStatus) {
      return NextResponse.json(cachedStatus);
    }
    
    let response;
    try {
      // Use Promise with timeout to prevent hanging
      const statusPromise = getSimulationStatus();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Simulation status query timed out')), 10000); // Increased from 2000ms to 10000ms (10 seconds)
      });
      
      response = await Promise.race([statusPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error or timeout getting simulation status:', error);
      
      // Return fallback data
      response = { 
        ...FALLBACK_STATUS,
        timestamp: Date.now(),
        error: 'Timed out fetching status'
      };
    }
    
    // Cache for 5 seconds (increased from 2 seconds)
    setCached(cacheKey, response, 5000);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting simulation status:', error);
    return NextResponse.json(
      { 
        ...FALLBACK_STATUS,
        error: 'Failed to get simulation status',
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}

// Helper function to get simulation status
async function getSimulationStatus() {
  const simulationEngine = SimulationEngine.getInstance();
  const status = await simulationEngine.getStatus();
  
  // Try to get market data, but with fallback
  let poolStats;
  try {
    const poolStatsPromise = amm.getPoolStats();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Pool stats query timed out')), 1000);
    });
    
    poolStats = await Promise.race([poolStatsPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error fetching pool stats, using fallback');
    poolStats = {
      solAmount: 1000,
      tokenAmount: 1000000,
      currentPrice: 0.001,
      tradingVolume: 0,
      tradingVolume24h: 0
    };
  }
  
  // Get agent stats
  const agentManager = AgentManager.getInstance();
  let agentStats;
  try {
    const totalAgentsPromise = agentManager.getAgentCount();
    const activeAgentsPromise = agentManager.getActiveAgentCount();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Agent count query timed out')), 1000);
    });
    
    const [totalAgents, activeAgents] = await Promise.all([
      Promise.race([totalAgentsPromise, timeoutPromise.catch(() => 0)]),
      Promise.race([activeAgentsPromise, timeoutPromise.catch(() => 0)])
    ]);
    
    agentStats = {
      totalAgents,
      activeAgents
    };
  } catch (error) {
    console.error('Error fetching agent stats, using fallback');
    agentStats = {
      totalAgents: 0,
      activeAgents: 0
    };
  }
  
  // Combine all data
  return {
    ...status,
    market: poolStats,
    agents: agentStats,
    timestamp: Date.now()
  };
}

// Start, stop, or configure simulation
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { action, config } = data;
    
    const simulationEngine = SimulationEngine.getInstance();
    
    switch (action) {
      case 'start': {
        // Configure simulation parameters for scaling
        const result = await simulationEngine.start({
          agentCount: config?.agentCount || 50, // Changed from 500 to 50
          phaseDuration: config?.phaseDuration || 30000, // 30 seconds per phase
          speed: config?.speed || 1, // Normal speed
          maxAgentsPerPhase: config?.maxAgentsPerPhase || 20, // Changed from 1000 to 20
          personalityDistribution: config?.personalityDistribution || {
            'CONSERVATIVE': 0.2,
            'MODERATE': 0.3,
            'AGGRESSIVE': 0.2,
            'TREND_FOLLOWER': 0.15,
            'CONTRARIAN': 0.15
          }
        });
        
        // Handle errors
        if (!result.success) {
          return NextResponse.json(
            { error: result.message },
            { status: 400 }
          );
        }
        
        return NextResponse.json({
          success: true,
          message: 'Simulation started successfully',
          simulationId: result.simulationId
        });
      }
      
      case 'stop': {
        const result = await simulationEngine.stop();
        
        if (!result.success) {
          return NextResponse.json(
            { error: result.message },
            { status: 400 }
          );
        }
        
        return NextResponse.json({
          success: true,
          message: 'Simulation stopped successfully'
        });
      }
      
      case 'pause': {
        const result = await simulationEngine.pause();
        
        if (!result.success) {
          return NextResponse.json(
            { error: result.message },
            { status: 400 }
          );
        }
        
        return NextResponse.json({
          success: true,
          message: 'Simulation paused successfully'
        });
      }
      
      case 'resume': {
        const result = await simulationEngine.resume();
        
        if (!result.success) {
          return NextResponse.json(
            { error: result.message },
            { status: 400 }
          );
        }
        
        return NextResponse.json({
          success: true,
          message: 'Simulation resumed successfully'
        });
      }
      
      case 'setSpeed': {
        if (typeof config?.speed !== 'number' || config.speed <= 0 || config.speed > 10) {
          return NextResponse.json(
            { error: 'Speed must be a number between 0.1 and 10' },
            { status: 400 }
          );
        }
        
        const result = simulationEngine.setSpeed(config.speed);
        
        if (!result.success) {
          return NextResponse.json(
            { error: result.message },
            { status: 400 }
          );
        }
        
        return NextResponse.json({
          success: true,
          message: `Simulation speed set to ${config.speed}x`
        });
      }
      
      case 'configure': {
        // Validate configuration
        if (config.agentCount && (typeof config.agentCount !== 'number' || config.agentCount < 1 || config.agentCount > 10000)) {
          return NextResponse.json(
            { error: 'Agent count must be between 1 and 10000' },
            { status: 400 }
          );
        }
        
        // Configure agent manager if needed
        if (config.maxConcurrent || config.maxActiveAgents) {
          const agentManager = AgentManager.getInstance();
          agentManager.setLimits(
            config.maxConcurrent || 50,
            config.maxActiveAgents || 1000
          );
        }
        
        // Set personality distribution if provided
        if (config.personalityDistribution) {
          const agentManager = AgentManager.getInstance();
          agentManager.setPersonalityDistribution(config.personalityDistribution);
        }
        
        return NextResponse.json({
          success: true,
          message: 'Simulation configured successfully',
          config
        });
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing simulation request:', error);
    return NextResponse.json(
      { error: 'Failed to process simulation request' },
      { status: 500 }
    );
  }
}
