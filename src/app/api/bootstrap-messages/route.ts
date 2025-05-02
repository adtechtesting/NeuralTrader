// src/app/api/bootstrap-messages/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/cache/dbCache';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { count = 5 } = data;
    
    console.log(`Bootstrapping with ${count} initial messages...`);
    
    // First, ensure we have a system agent
    let systemAgent = await prisma.agent.findFirst({
      where: { name: { contains: 'System' } }
    });
    
    if (!systemAgent) {
      // Generate a unique public key for the system agent
      const randomPublicKey = `sys${Date.now().toString(36)}${Math.random().toString(36).substring(2, 7)}`;
      
      // Use the FUNDER_PRIVATE_KEY for the system agent
      const systemPrivateKey = process.env.FUNDER_PRIVATE_KEY || 
        `sys_private_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 15)}`;
      
      console.log('Creating system agent...');
      
      // Create a system agent for announcements
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
          walletPrivateKey: systemPrivateKey
        }
      });
      
      console.log(`System agent created with ID: ${systemAgent.id}`);
    }
    
    // Create welcome message
    const welcomeMessage = await prisma.message.create({
      data: {
        content: 'Welcome to NeuralTrader! The trading simulation is starting. Agents will begin trading soon.',
        senderId: systemAgent.id,
        type: 'ANNOUNCEMENT',
        visibility: 'public',
        createdAt: new Date()
      }
    });
    
    console.log('Welcome message created');
    
    // If count is specified, get random agents and generate messages
    const agents = await prisma.agent.findMany({
      take: count,
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`Found ${agents.length} agents for bootstrap messages`);
    
    // Create initial market messages
    const messages = [];
    const marketInitMessages = [
      "Looking at the NURO token market. Initial price seems interesting.",
      "Just discovered this new NURO token. What do you all think?",
      "Watching this NURO token closely. Anyone else trading it?",
      "The NURO token market seems to be gaining attention.",
      "Considering adding NURO to my portfolio. Any thoughts?",
      "NURO token has an interesting premise. Worth investing?",
      "Has anyone analyzed the NURO token charts yet?",
      "I've been tracking NURO for a while, considering a position.",
      "What's everyone's take on the NURO tokenomics?",
      "Thinking of buying some NURO tokens. Seems promising."
    ];
    
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const messageIndex = i % marketInitMessages.length;
      
      const message = await prisma.message.create({
        data: {
          content: marketInitMessages[messageIndex],
          senderId: agent.id,
          type: 'CHAT',
          visibility: 'public',
          sentiment: Math.random() > 0.5 ? 'positive' : 'neutral',
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000)) // Randomize timestamps
        }
      });
      
      messages.push(message);
    }
    
    // Invalidate message cache
    return NextResponse.json({
      success: true,
      systemAgent: systemAgent.id,
      welcomeMessage: welcomeMessage.id,
      messageCount: messages.length,
      message: `Successfully bootstrapped ${messages.length + 1} messages`
    });
    
  } catch (error) {
    console.error('Error in bootstrap message generation:', error);
    return NextResponse.json(
      { success: false, error: error || 'Failed to bootstrap messages' },
      { status: 500 }
    );
  }
}
