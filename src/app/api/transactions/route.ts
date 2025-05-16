// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get query params
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const page = parseInt(url.searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    // Get transactions with pagination
    const transactions = await prisma.transaction.findMany({
      take: limit,
      skip,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        fromAgent: {
          select: {
            name: true,
            personalityType: true
          }
        }
      }
    });
    

    const processedTransactions = transactions.map(tx => {
    
      const processed: any = { ...tx };
      

      if (processed.createdAt) {
        processed.timestamp = new Date(processed.createdAt).getTime();
      }
      if (processed.confirmedAt) {
        processed.confirmedTimestamp = new Date(processed.confirmedAt).getTime();
      }
      

      if (processed.fromAgent) {
        processed.agent = {
          displayName: processed.fromAgent.name,
          personalityType: processed.fromAgent.personalityType,
          avatarUrl: `/agents/${processed.fromAgent.personalityType.toLowerCase()}.png`
        };
      }

      if (!processed.type) {
        processed.type = processed.amount > 0 ? 'buy' : 'sell';
      }
      
      return processed;
    });
    

    const totalTransactions = await prisma.transaction.count();
    const successfulTransactions = await prisma.transaction.count({
      where: { status: 'confirmed' }
    });
    const failedTransactions = await prisma.transaction.count({
      where: { status: 'failed' }
    });
    const totalMessages = await prisma.message.count();
    const totalAgents = await prisma.agent.count();
    

    const totalTradedResult = await prisma.transaction.aggregate({
      _sum: {
        amount: true
      },
      where: {
        status: 'confirmed'
      }
    });
    const totalTraded = totalTradedResult._sum.amount || 0;
    
    return NextResponse.json({
      success: true,
      transactions: processedTransactions,
      stats: {
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        totalMessages,
        totalAgents,
        totalTraded
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalTransactions / limit),
        totalCount: totalTransactions
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
