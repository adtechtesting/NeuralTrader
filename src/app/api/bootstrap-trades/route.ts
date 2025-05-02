// src/app/api/bootstrap-trades/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/cache/dbCache';
import { amm } from '@/lib/blockchain/amm';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { count = 3 } = data;
    
    console.log(`Bootstrapping with ${count} initial trades...`);
    
    // Get random agents
    const agents = await prisma.agent.findMany({
      take: count,
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`Found ${agents.length} agents for bootstrap trades`);
    
    // Create initial trades
    const trades = [];
    const tradeMessages = [];
    
    for (const agent of agents) {
      try {
        // Random SOL amount between a fixed range
        const solAmount = 3 + (Math.random() * 7); // 3-10 SOL
        
        // Check if agent has enough balance
        if (agent.walletBalance < solAmount) {
          console.log(`Agent ${agent.name} has insufficient SOL balance for trade: ${agent.walletBalance} < ${solAmount}`);
          continue;
        }
        
        console.log(`Executing trade for agent ${agent.id}: buy with ${solAmount} SOL`);
        
        // Execute the swap
        const result = await amm.executeSwap(
          agent.id,
          solAmount,
          true, // Buy tokens with SOL
          0.5 // Default slippage tolerance
        );
        
        console.log(`Trade executed successfully: ${JSON.stringify(result.swapResult)}`);
        trades.push(result);
        
        // Create a message about the trade
        const tradeAnnouncement = `Just bought ${result.swapResult.outputAmount.toFixed(2)} NURO tokens at ${result.swapResult.effectivePrice.toFixed(6)} SOL each.`;
        
        const message = await prisma.message.create({
          data: {
            content: tradeAnnouncement,
            senderId: agent.id,
            type: 'TRADE',
            visibility: 'public',
            sentiment: 'positive',
            createdAt: new Date()
          }
        });
        
        tradeMessages.push(message);
      } catch (error) {
        console.error(`Error executing trade for agent ${agent.id}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      tradeCount: trades.length,
      messageCount: tradeMessages.length,
      message: `Successfully bootstrapped ${trades.length} trades with ${tradeMessages.length} messages`
    });
    
  } catch (error) {
    console.error('Error in bootstrap trade generation:', error);
    return NextResponse.json(
      { success: false, error: error|| 'Failed to bootstrap trades' },
      { status: 500 }
    );
  }
}
