import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/cache/dbCache';
import { getCached, setCached } from '@/lib/cache/dbCache';
import { messagingSystem } from '@/lib/agents/messaging';

export const maxDuration = 60; // Increase timeout to 60 seconds

// Fallback empty messages
const FALLBACK_MESSAGES = {
  messages: [],
  count: 0,
  totalCount: 0,
  sentiment: {
    bullish: 0.5,
    bearish: 0.3,
    neutral: 0.2
  },
  timestamp: Date.now()
};

// Get messages with pagination and caching
export async function GET(request: NextRequest) {
  try {
    // Parse URL parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || searchParams.get('count') || '30');
    const offset = parseInt(searchParams.get('offset') || '0');
    const since = searchParams.get('since'); // Timestamp to get messages since
    
    // Validate parameters
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid limit. Must be between 1 and 100.' },
        { status: 400 }
      );
    }
    
    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { error: 'Invalid offset. Must be a non-negative integer.' },
        { status: 400 }
      );
    }
    
    // Define a cache key based on parameters
    const cacheKey = `messages_${limit}_${offset}${since ? `_since_${since}` : ''}`;
    
    // Try to get from cache first if not requesting by timestamp
    if (!since) {
      const cachedMessages = getCached(cacheKey);
      
      if (cachedMessages) {
        return NextResponse.json({
          success: true,
          ...cachedMessages,
          cached: true
        });
      }
    }
    
    // Build the query
    let whereClause = {};
    
    if (since) {
      const sinceDate = new Date(parseInt(since));
      if (!isNaN(sinceDate.getTime())) {
        whereClause = {
          createdAt: {
            gt: sinceDate
          }
        };
      }
    }
    
    // Try to get messages with a timeout
    let messages = [];
    let totalCount = 0;
    let usesFallback = false;
    
    try {
      // Use Promise with timeout to prevent hanging
      const messagesPromise = prisma.message.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              personalityType: true,
              avatarUrl: true
            }
          }
        }
      });
      
      const countPromise = prisma.message.count({
        where: whereClause
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Message query timed out')), 3000); // Increased timeout to 3s
      });
      
      // Run both queries in parallel with timeout
      //@ts-ignore
      [messages, totalCount] = await Promise.all([
        Promise.race([messagesPromise, timeoutPromise]),
        Promise.race([countPromise, timeoutPromise.catch(() => 0)])
      ]);
    } catch (error) {
      console.error('Error or timeout fetching messages:', error);
      usesFallback = true;
      
      // Return empty array for messages if there's an error
      messages = [];
      totalCount = 0;
    }
    
    // Get the current overall sentiment or use fallback
    let overallSentiment;
    try {
      overallSentiment = messagingSystem.getOverallSentiment();
    } catch (error) {
      console.error('Error getting message sentiment:', error);
      overallSentiment = {
        bullish: 0.5,
        bearish: 0.3,
        neutral: 0.2
      };
    }
    
    // Prepare response data
    const responseData = {
      messages,
      count: messages.length,
      totalCount,
      offset,
      limit,
      sentiment: overallSentiment,
      timestamp: Date.now()
    };
    
    // Cache the result for longer (60 seconds) if not requesting by timestamp
    if (!since) {
      setCached(cacheKey, responseData, 60000); // Increased to 60 seconds
    }
    
    return NextResponse.json({
      success: true,
      ...responseData,
      usesFallback // Fixed variable name
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { 
        success: true,
        ...FALLBACK_MESSAGES,
        error: error instanceof Error ? error.message : String(error),
        usesFallback: true // Fixed variable name
      },
      { status: 200 } // Return 200 even on error for better UI experience
    );
  }
}

// Post new message (manual posting for testing)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Handle legacy API pattern for generating messages
    if (data.agentId && !data.content) {
      // Generate a message for this agent using the messaging system
      const agent = await prisma.agent.findUnique({
        where: { id: data.agentId },
        select: { id: true, personalityType: true }
      });
      
      if (!agent) {
        return NextResponse.json(
          { success: false, error: 'Agent not found' },
          { status: 404 }
        );
      }
      
      // Get current market sentiment
      const marketSentiment = await prisma.marketState.findFirst({
        where: { type: 'SENTIMENT' },
        select: { data: true }
      });
      
      const sentimentValue = marketSentiment?.data?.valueOf || 0;
      
      // Generate content based on personality and market conditions
      const content = await messagingSystem.generateMessage(
        agent.id,
        agent.personalityType,
        parseFloat(sentimentValue.toString())
      );
      
      // Store the generated message
      const messageId = await messagingSystem.storeMessage({
        agentId: agent.id,
        content
      });
      
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              personalityType: true,
              avatarUrl: true
            }
          }
        }
      });
      
      // Invalidate messages cache
      const cacheKeys = [
        'messages_30_0',
        'messages_50_0',
        'messages_20_0'
      ];
      
      for (const key of cacheKeys) {
        setCached(key, null, 0);
      }
      
      return NextResponse.json({
        success: true,
        message,
        generated: true
      });
    }
    // Handle generating multiple messages for a group chat
    else if (data.count && !data.agentId && !data.content) {
      const count = Math.min(parseInt(data.count), 5); // Limiting to 5 messages max for performance
      
      // Get random agents
      const agents = await prisma.agent.findMany({
        take: count,
        orderBy: { createdAt: 'asc' },
        select: { id: true, personalityType: true }
      });
      
      // Get current market sentiment
      const marketSentiment = await prisma.marketState.findFirst({
        where: { type: 'SENTIMENT' },
        select: { data: true }
      });
      
      const sentimentValue = marketSentiment?.data?.value || 0;
      
      // Generate and store messages for each agent
      const messagePromises = agents.map(async (agent) => {
        // Generate content
        const content = await messagingSystem.generateMessage(
          agent.id,
          agent.personalityType,
          parseFloat(sentimentValue.toString())
        );
        
        // Store message
        const messageId = await messagingSystem.storeMessage({
          agentId: agent.id,
          content
        });
        
        // Retrieve complete message with agent data
        return prisma.message.findUnique({
          where: { id: messageId },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                personalityType: true,
                avatarUrl: true
              }
            }
          }
        });
      });
      
      const messages = await Promise.all(messagePromises);
      
      // Invalidate messages cache
      const cacheKeys = [
        'messages_30_0',
        'messages_50_0',
        'messages_20_0'
      ];
      
      for (const key of cacheKeys) {
        setCached(key, null, 0);
      }
      
      return NextResponse.json({
        success: true,
        messages,
        generated: true,
        count: messages.length
      });
    } 
    // Handle explicit message posting
    else if (data.agentId && data.content) {
      // Validate agent exists
      const agent = await prisma.agent.findUnique({
        where: { id: data.agentId }
      });
      
      if (!agent) {
        return NextResponse.json(
          { success: false, error: 'Agent not found' },
          { status: 404 }
        );
      }
      
      // Store the message using the messaging system
      const messageId = await messagingSystem.storeMessage({
        agentId: data.agentId,
        content: data.content
      });
      
      // Invalidate messages cache
      const cacheKeys = [
        'messages_30_0',
        'messages_50_0',
        'messages_20_0'
      ];
      
      for (const key of cacheKeys) {
        setCached(key, null, 0);
      }
      
      return NextResponse.json({
        success: true,
        messageId,
        timestamp: Date.now()
      });
    }
    else {
      return NextResponse.json(
        { success: false, error: 'Invalid request. Provide either agentId+content, agentId alone, or count.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing message request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
