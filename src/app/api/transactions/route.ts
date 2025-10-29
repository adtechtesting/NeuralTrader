// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get query params
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const page = parseInt(url.searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    // ✅ Get transactions with CORRECT status value
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 3600000) }, // 1 hour
        status: 'CONFIRMED' // ✅ Uppercase
      },
      take: limit,
      skip,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        fromAgent: {
          select: {
            name: true,
            personalityType: true,
            walletBalance: true,
            tokenBalance: true
          }
        }
      }
    });
    
    // ✅ Process transactions with all required fields
    const processedTransactions = transactions.map(tx => {
      const processed: any = { ...tx };
      
      // Convert dates to timestamps
      if (processed.createdAt) {
        processed.timestamp = new Date(processed.createdAt).getTime();
      }
      if (processed.confirmedAt) {
        processed.confirmedTimestamp = new Date(processed.confirmedAt).getTime();
      }
      
      // Map agent data
      if (processed.fromAgent) {
        processed.agent = {
          name: processed.fromAgent.name,
          displayName: processed.fromAgent.name,
          personalityType: processed.fromAgent.personalityType,
          avatarUrl: `/agents/${processed.fromAgent.personalityType.toLowerCase()}.png`
        };
      }

      // ✅ Extract price from details JSON
      if (processed.details && typeof processed.details === 'object') {
        processed.price = processed.details.price || 0;
      }

      // ✅ Ensure type is uppercase
      if (!processed.type) {
        processed.type = processed.amount > 0 ? 'BUY' : 'SELL';
      } else {
        processed.type = processed.type.toUpperCase();
      }
      
      return processed;
    });
    
    // ✅ Get stats with CORRECT status values
    const totalTransactions = await prisma.transaction.count();
    const successfulTransactions = await prisma.transaction.count({
      where: { status: 'CONFIRMED' } // ✅ Uppercase
    });
    const failedTransactions = await prisma.transaction.count({
      where: { status: 'FAILED' } // ✅ Uppercase
    });
    const totalMessages = await prisma.message.count();
    const totalAgents = await prisma.agent.count();
    
    const totalTradedResult = await prisma.transaction.aggregate({
      _sum: {
        amount: true
      },
      where: {
        status: 'CONFIRMED' // ✅ Uppercase
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
