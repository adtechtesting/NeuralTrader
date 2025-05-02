import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all agents
export async function GET(request: NextRequest) {
  try {
    // Get pagination parameters from query
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    const personalityType = url.searchParams.get('personalityType') || undefined;
    
    // Get agents with pagination
    const agents = await prisma.agent.findMany({
      where: personalityType ? { personalityType } : undefined,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' }
    });
    
    // Get total count for pagination
    const totalAgents = await prisma.agent.count({
      where: personalityType ? { personalityType } : undefined
    });
    
    // Get stats
    const stats = await prisma.simulationStats.findFirst({
      where: { id: 'stats' }
    });
    
    // Remove private keys for security and map field names
    const secureAgents = agents.map(agent => {
      const { walletPrivateKey, walletBalance, ...rest } = agent;
      return {
        ...rest,
        balance: walletBalance || 0, // Map walletBalance to balance for compatibility
      };
    });
    
    return NextResponse.json({
      success: true,
      agents: secureAgents,
      pagination: {
        page,
        pageSize,
        totalAgents,
        totalPages: Math.ceil(totalAgents / pageSize)
      },
      stats
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
