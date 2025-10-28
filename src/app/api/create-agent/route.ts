import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/cache/dbCache';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const CREATION_FEE = 0.05; // SOL
const VALID_PERSONALITIES = [
  'CONSERVATIVE',
  'MODERATE', 
  'AGGRESSIVE',
  'TREND_FOLLOWER',
  'CONTRARIAN',
  'TECHNICAL',
  'FUNDAMENTAL',
  'EMOTIONAL',
  'WHALE',
  'NOVICE'
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      personalityType, 
      initialBalance = 5, 
      occupation = 'Trader', 
      walletPublicKey, 
      walletSignature,
      customBehaviors = []
    } = body;

    // Validate input
    if (!name || !personalityType) {
      return NextResponse.json(
        { success: false, error: 'Agent name and personality type are required' },
        { status: 400 }
      );
    }

    if (!walletPublicKey || !walletSignature) {
      return NextResponse.json(
        { success: false, error: 'Wallet connection required for agent creation fee' },
        { status: 400 }
      );
    }

    // Check if personality type is valid
    if (!VALID_PERSONALITIES.includes(personalityType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid personality type. Choose one of: ${VALID_PERSONALITIES.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Generate wallet for the agent
    const agentKeypair = Keypair.generate();
    const agentPublicKey = agentKeypair.publicKey.toString();
    const agentPrivateKey = bs58.encode(agentKeypair.secretKey);

    // Get personality description
    const personalityDescriptions: Record<string, string> = {
      CONSERVATIVE: 'A cautious trader who prioritizes capital preservation with minimal risk',
      MODERATE: 'A balanced trader seeking equilibrium between risk and reward',
      AGGRESSIVE: 'A bold trader pursuing high-risk, high-reward opportunities',
      TREND_FOLLOWER: 'A momentum trader who follows market trends and price action',
      CONTRARIAN: 'A counter-trend trader who goes against prevailing sentiment',
      TECHNICAL: 'A chart-focused trader relying on patterns and indicators',
      FUNDAMENTAL: 'A value investor focusing on intrinsic worth and utility',
      EMOTIONAL: 'An impulsive trader driven by feelings and market buzz',
      WHALE: 'A large capital trader with significant market influence',
      NOVICE: 'A learning trader seeking guidance and building experience'
    };

    // Create agent in database
    const agent = await prisma.agent.create({
      data: {
        name,
        personalityType,
        personality: personalityDescriptions[personalityType] || 'AI Trading Agent',
        occupation,
        publicKey: agentPublicKey,
        creatorWallet: walletPublicKey,
        walletPrivateKey: agentPrivateKey,
        walletBalance: initialBalance,
        tokenBalance: 0,
        active: true,
        llmProvider: 'GROQ', // Default to Groq
        customBehaviors: customBehaviors && customBehaviors.length > 0 ? customBehaviors : [],
      } as any
    });

    // Log the creation activity
    await prisma.activityLog.create({
      data: {
        action: 'agent_created',
        actor: agent.id,
        details: {
          name,
          personalityType,
          occupation,
          creationFee: CREATION_FEE,
          creatorWallet: walletPublicKey,
          initialBalance,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date()
      }
    });

    console.log(`✅ Agent created: ${name} (${personalityType}) - ID: ${agent.id}`);

    return NextResponse.json({
      success: true,
      message: `${name} created successfully! Agent creation fee: ${CREATION_FEE} SOL (Devnet)`,
      agent: {
        id: agent.id,
        name: agent.name,
        personality: agent.personality,
        personalityType: agent.personalityType,
        publicKey: agent.publicKey,
        balance: agent.walletBalance,
        occupation: agent.occupation,
        creatorWallet: walletPublicKey,
        createdAt: agent.createdAt
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
