import { NextRequest, NextResponse } from 'next/server';
import { getAgents } from '@/lib/agents/storage';

// Get all agents
export async function GET(request: NextRequest) {
  try {
   
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    const personalityType = url.searchParams.get('personalityType') || undefined;

    
    let agents = getAgents();

    // Filter by personality type if provided
    if (personalityType) {
      agents = agents.filter(agent => agent.personalityType === personalityType);
    }

    // Paginate
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedAgents = agents.slice(startIndex, endIndex);

    // Get total count
    const totalAgents = agents.length;

    // Remove private keys for security
    const secureAgents = paginatedAgents.map(agent => {
      const { privateKey, ...rest } = agent;
      return rest;
    });

    return NextResponse.json({
      success: true,
      agents: secureAgents,
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
