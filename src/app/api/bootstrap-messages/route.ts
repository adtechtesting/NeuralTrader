// src/app/api/bootstrap-messages/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/cache/dbCache';
import { getSelectedToken } from '@/lib/config/selectedToken';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { count = 5 } = data;

    console.log(`Bootstrapping with ${count} initial LLM messages...`);

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
        content: 'Welcome to NeuralTrader! The trading simulation is starting.',
        senderId: systemAgent.id,
        type: 'ANNOUNCEMENT',
        visibility: 'public',
        createdAt: new Date()
      }
    });

    console.log('Welcome message created');

    // If count is specified, use LLM agents for social interaction
    if (count > 0) {
      const agents = await prisma.agent.findMany({
        where: { active: true },
        take: count,
        orderBy: {
          createdAt: 'asc'
        }
      });

      console.log(`Found ${agents.length} active agents for LLM bootstrap messages`);

      // Use LLM agents for social interaction instead of hardcoded messages
      if (agents.length > 0) {
        try {
          // Import agent manager
          const { AgentManager } = await import('@/lib/agents/autonomous/agent-manager');
          const agentManager = AgentManager.getInstance();

          // Process agents through LLM social interaction
          const messageCount = await agentManager.processAgentsForSocialInteraction(agents.length);

          console.log(`✅ LLM agents generated ${messageCount} bootstrap messages`);

          return NextResponse.json({
            success: true,
            systemAgent: systemAgent.id,
            welcomeMessage: welcomeMessage.id,
            llmMessageCount: messageCount,
            message: `Successfully bootstrapped with LLM agents (${messageCount} messages)`
          });

        } catch (error) {
          console.error('Error in LLM bootstrap:', error);

          // Fallback to simple template messages with actual token symbol
          const selectedToken = await getSelectedToken();
          const tokenSymbol = selectedToken.symbol || 'TOKEN';

          const fallbackMessages = [
            `I'm looking at the ${tokenSymbol} token market. Initial price seems to be set at ${Math.random().toFixed(8)} SOL.`,
            `Just bought some ${tokenSymbol} tokens. I like the initial price point.`,
            `${tokenSymbol} showing interesting price action. What do you think?`,
            `Monitoring ${tokenSymbol} closely. Market seems active.`,
            `Considering a position in ${tokenSymbol}. Anyone else trading it?`
          ];

          let messageCount = 0;
          for (const agent of agents) {
            const messageContent = fallbackMessages[messageCount % fallbackMessages.length];

            await prisma.message.create({
              data: {
                content: messageContent,
                senderId: agent.id,
                type: 'CHAT',
                visibility: 'public',
                sentiment: Math.random() > 0.5 ? 'positive' : 'neutral',
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000))
              }
            });

            messageCount++;
          }

          console.log(`✅ Created ${messageCount} fallback bootstrap messages`);

          return NextResponse.json({
            success: true,
            systemAgent: systemAgent.id,
            welcomeMessage: welcomeMessage.id,
            fallbackMessageCount: messageCount,
            message: `Fallback: Created ${messageCount} template messages with ${tokenSymbol}`
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      systemAgent: systemAgent.id,
      welcomeMessage: welcomeMessage.id,
      messageCount: 1,
      message: `Successfully created welcome message`
    });

  } catch (error) {
    console.error('Error in bootstrap message generation:', error);
    return NextResponse.json(
      { success: false, error: error || 'Failed to bootstrap messages' },
      { status: 500 }
    );
  }
}
