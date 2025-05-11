import { NextRequest, NextResponse } from 'next/server';
import { AgentManager, PERSONALITIES } from '@/lib/agents/manager';
import { saveAgent } from '@/lib/agents/storage';
import { requestAirdrop } from '@/lib/blockchain/faucet';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Agent-test API ', body);
    
    const { action } = body;
    
    if (!action) {
      console.log('Missing action in request');
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }
    
    
    if (action === 'create-agent') {
      const { agentName, personalityType } = body;
      console.log(`Create agent request: name=${agentName}, personality=${personalityType}`);
      

      if (!agentName || !personalityType) {
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
      

      const agentManager = await AgentManager.create(agentName, personalityType);
      
     
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
        message: `Agent "${agentName}" created successfully`,
        agent: {
          id: savedAgent.id,
          name: savedAgent.name,
          personality: savedAgent.personality,
          publicKey: savedAgent.publicKey,
          balance: savedAgent.walletBalance,
          createdAt: savedAgent.createdAt
        }
      });
    } 
    else if (action === 'request-airdrop') {
      const { publicKey, airdropAmount } = body;
      console.log(`Airdrop request: publicKey=${publicKey}, amount=${airdropAmount}`);
      
 
      if (!publicKey) {
        console.log('Missing public key');
        return NextResponse.json(
          { success: false, error: 'Public key is required' },
          { status: 400 }
        );
      }
      
 
      try {
        const result = await requestAirdrop(publicKey, airdropAmount || 1);
        console.log('Airdrop result:', result);
   
        const { success, ...restOfResult } = result;
        
        return NextResponse.json({
          success: true,
          message: `Airdrop of ${airdropAmount || 1} SOL requested successfully`,
          ...restOfResult
        });
      } catch (airDropError) {
        console.error('Error during airdrop:', airDropError);
        return NextResponse.json(
          { success: false, error: airDropError instanceof Error ? airDropError.message : String(airDropError) },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: `Invalid action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in agent-test API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 