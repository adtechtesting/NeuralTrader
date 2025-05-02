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
    
    // Get stats
    const totalTransactions = await prisma.transaction.count();
    const successfulTransactions = await prisma.transaction.count({
      where: { status: 'confirmed' }
    });
    const failedTransactions = await prisma.transaction.count({
      where: { status: 'failed' }
    });
    const totalMessages = await prisma.message.count();
    const totalAgents = await prisma.agent.count();
    
    // Calculate total traded amount
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
      transactions,
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
