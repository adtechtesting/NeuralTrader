import { NextRequest, NextResponse } from 'next/server';
import { AgentManager, PERSONALITIES } from '@/lib/agents/manager';
import { saveAgent } from '@/lib/agents/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, personalityType } = body;
    
    // Validate input
    if (!name || !personalityType) {
      return NextResponse.json(
        { success: false, error: 'Agent name and personality type are required' },
        { status: 400 }
      );
    }
    
    // Check if personality type is valid
    if (!(personalityType in PERSONALITIES)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid personality type. Choose one of: ${Object.keys(PERSONALITIES).join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    // Create the agent
    const agentManager = await AgentManager.create(name, personalityType);
    
    // Save the agent to storage
    const savedAgent = saveAgent({
      name: agentManager.name,
      personality: agentManager.personality,
      personalityType,
      publicKey: agentManager.publicKey,
      privateKey: agentManager.privateKey,
      walletBalance: agentManager.walletBalance
    });
    
    return NextResponse.json({
      success: true,
      agent: {
        id: savedAgent.id,
        name: savedAgent.name,
        personality: savedAgent.personality,
        publicKey: savedAgent.publicKey,
        balance: savedAgent.walletBalance,
        createdAt: savedAgent.createdAt
      }
    });
  } catch (error) {
    console.error('Error in agent creation API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
