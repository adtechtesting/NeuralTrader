import { NextRequest, NextResponse } from 'next/server';
import { getAgents, getAgentCountsByPersonality } from '@/lib/agents/storage';

export async function GET() {
  try {
    // Get all agents (without private keys for security)
    const agents = getAgents().map(agent => ({
      id: agent.id,
      name: agent.name,
      personality: agent.personality,
      personalityType: agent.personalityType,
      publicKey: agent.publicKey,
      balance: agent.walletBalance,
      createdAt: agent.createdAt
    }));
    
    // Get distribution stats
    const personalityCounts = getAgentCountsByPersonality();
    
    return NextResponse.json({
      success: true,
      agents,
      stats: {
        total: agents.length,
        personalityCounts
      }
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
