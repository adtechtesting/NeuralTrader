import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/cache/dbCache';

// Get all agents
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    const personalityType = url.searchParams.get('personalityType') || undefined;
    const creatorWallet = url.searchParams.get('creatorWallet') || undefined;

    // Build where clause (optional filters)
    const where: Record<string, any> = {};

    if (creatorWallet) {
      where.creatorWallet = creatorWallet;
    }

    if (personalityType) {
      where.personalityType = personalityType;
    }

    // Get total count
    const totalAgents = await prisma.agent.count({ where });

    // Get paginated agents from database
    const agents = await prisma.agent.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        personalityType: true,
        personality: true,
        occupation: true,
        publicKey: true,
        walletBalance: true,
        tokenBalance: true,
        createdAt: true,
        creatorWallet: true,
      } as any
    });

    // Get stats
    const allAgents = await prisma.agent.findMany({
      where,
      select: {
        personalityType: true,
        occupation: true,
        walletBalance: true,
      }
    });

    const personalityDistribution = allAgents.reduce((acc, agent) => {
      acc[agent.personalityType] = (acc[agent.personalityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const occupationDistribution = allAgents.reduce((acc, agent) => {
      if (agent.occupation) {
        acc[agent.occupation] = (acc[agent.occupation] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const successfullyFunded = allAgents.filter(a => a.walletBalance > 0).length;
    const failedToFund = allAgents.length - successfullyFunded;
    const totalFunded = allAgents.reduce((sum, a) => sum + (a.walletBalance || 0), 0);

    const stats = {
      totalAgents: allAgents.length,
      successfullyFunded,
      failedToFund,
      totalFunded,
      personalityDistribution,
      occupationDistribution,
    };

    // Format agents for response
    const formattedAgents = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      personalityType: agent.personalityType,
      personality: agent.personality,
      occupation: agent.occupation || 'Trader',
      publicKey: agent.publicKey,
      balance: agent.walletBalance || 0,
      creatorWallet: agent.creatorWallet,
      createdAt: agent.createdAt.toString(),
    }));

    return NextResponse.json({
      success: true,
      agents: formattedAgents,
      stats,
      pagination: {
        page,
        pageSize,
        totalAgents,
        totalPages: Math.ceil(totalAgents / pageSize)
      }
    });
  } catch (error) {
    console.error('Error getting agents:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
