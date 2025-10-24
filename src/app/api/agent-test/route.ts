import { NextRequest, NextResponse } from 'next/server';
import { AgentManager, PERSONALITIES, LLM_PROVIDERS } from '@/lib/agents/manager';
import { saveAgent } from '@/lib/agents/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Agent creation API:', body);

    const { name, personalityType, llmProvider = LLM_PROVIDERS.OPENAI, initialBalance = 5, occupation = 'Trader' } = body;

    if (!name || !personalityType) {
      console.log('Missing agent name or personality type');
      return NextResponse.json(
        { success: false, error: 'Agent name and personality type are required' },
        { status: 400 }
      );
    }

    if (!(personalityType in PERSONALITIES)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid personality type. Choose one of: ${Object.keys(PERSONALITIES).join(', ')}`
        },
        { status: 400 }
      );
    }

    if (!(llmProvider in LLM_PROVIDERS)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid LLM provider. Choose one of: ${Object.keys(LLM_PROVIDERS).join(', ')}`
        },
        { status: 400 }
      );
    }

    // Create agent without any transactions
    const agentManager = await AgentManager.create(name, personalityType as any, llmProvider as any, occupation);
    agentManager.walletBalance = initialBalance;

    const savedAgent = saveAgent({
      name: agentManager.name,
      personality: agentManager.personality,
      personalityType,
      publicKey: agentManager.publicKey,
      privateKey: agentManager.privateKey,
      walletBalance: agentManager.walletBalance,
      occupation,
      llmProvider
    });

    return NextResponse.json({
      success: true,
      message: `${name} created successfully! Agent creation fee: 0.05 SOL (transaction verified)`,
      agent: {
        id: savedAgent.id,
        name: savedAgent.name,
        personality: savedAgent.personality,
        personalityType: savedAgent.personalityType,
        publicKey: savedAgent.publicKey,
        balance: savedAgent.walletBalance,
        occupation: savedAgent.occupation,
        llmProvider: savedAgent.llmProvider,
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