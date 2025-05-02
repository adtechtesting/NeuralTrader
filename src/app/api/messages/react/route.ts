import { NextRequest, NextResponse } from 'next/server';
import { reactToMessage } from '@/lib/agents/messaging';

// POST: Add a reaction to a message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, agentId, reactionType } = body;
    
    if (!messageId || !agentId || !reactionType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: messageId, agentId, and reactionType'
        },
        { status: 400 }
      );
    }
    
    const reaction = await reactToMessage(messageId, agentId, reactionType);
    
    return NextResponse.json({
      success: true,
      reaction
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
