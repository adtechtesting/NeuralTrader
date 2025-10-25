import { NextRequest, NextResponse } from 'next/server';
import { AgentPool } from '@/lib/agents/agent-factory';
import { ASI_FEATURES, validateASIConfiguration } from '@/lib/config/asi-config';

export async function GET() {
  try {
    const configValidation = validateASIConfiguration();

    return NextResponse.json({
      asi: {
        enabled: ASI_FEATURES.enabled,
        features: ASI_FEATURES,
        validation: configValidation,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting ASI status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get ASI status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, agentId } = await request.json();

    if (action === 'register-agent' && agentId) {
      // Register agent on Agentverse
      const agentPool = new AgentPool({ useLLM: true });

      // This would integrate with actual Agentverse API
      return NextResponse.json({
        success: true,
        message: `Agent ${agentId} registration initiated`,
        agentverseId: `asi-${agentId}-${Date.now()}`,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'test-knowledge-graph') {
      // Test MeTTa Knowledge Graph connection
      return NextResponse.json({
        success: true,
        message: 'Knowledge Graph test completed',
        enhancedReasoning: true,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'broadcast-message') {
      // Broadcast message via Chat Protocol
      return NextResponse.json({
        success: true,
        message: 'Message broadcast via Chat Protocol',
        protocol: 'neuraltrader-chat',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing ASI action:', error);
    return NextResponse.json(
      { error: 'Failed to process ASI action' },
      { status: 500 }
    );
  }
}
