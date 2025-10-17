import { prisma } from '../cache/dbCache';
import { PersonalityType } from './personalities';


/**
 * Agent Messaging System
 * 
 * Handles creation, retrieval, and analysis of agent messages
 */
export const messagingSystem = {
  async createMessage(
    senderId: string, 
    content: string, 
    options: {
      type?: string;
      visibility?: string;
      mentions?: string[];
      receiverId?: string;
      sentiment?: string;
      influence?: number;
      tokenSymbols?: string[];
    } = {}
  ) {
    return prisma.message.create({
      data: {
        content,
        senderId,
        type: options.type || 'CHAT',
        visibility: options.visibility || 'public',
        mentions: options.mentions || [],
        receiverId: options.receiverId || null,
        sentiment: options.sentiment || null,
        influence: options.influence || null
      }
    });
  },
  
  async storeMessage(data: { agentId: string, content: string }) {
    // Simple wrapper for createMessage with default options
    return this.createMessage(data.agentId, data.content);
  },
  
  getOverallSentiment() {
    // Return default sentiment if not calculated yet
    return {
      positive: 0.5,
      negative: 0.2,
      neutral: 0.3,
      count: 0
    };
  },
  
  async generateMessage(agentId: string, personalityType: string, marketSentiment: number) {
    // Generate a templated message based on agent personality and market conditions
    const messageType = marketSentiment > 0.5 ? 'MARKET_RISE' : 'MARKET_FALL';
    
    const { getSelectedToken } = await import('../config/selectedToken');
    const selectedToken = await getSelectedToken();
    
    const context = {
      pctChange: Math.abs(marketSentiment - 0.5) * 10,
      price: 0.0001 + Math.random() * 0.01,
      tokenSymbol: selectedToken.symbol || 'TOKEN'
    };
    
    return this.generateTemplatedMessage(
      personalityType as PersonalityType, 
      messageType, 
      context
    );
  },
  
  async getRecentMessages(limit: number = 20) {
    return prisma.message.findMany({
      take: limit,
      where: {
        visibility: 'public'
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        sender: {
          select: {
            name: true,
            personalityType: true,
            avatarUrl: true
          }
        }
      }
    });
  },
  
  async getMessagesBySender(senderId: string, limit: number = 20) {
    return prisma.message.findMany({
      take: limit,
      where: {
        senderId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  },
  
  async getMessagesByMention(mention: string, limit: number = 20) {
    return prisma.message.findMany({
      take: limit,
      where: {
        mentions: {
          has: mention
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        sender: {
          select: {
            name: true,
            personalityType: true
          }
        }
      }
    });
  },
  
  async getMessagesAboutMarket(limit: number = 20) {
    return prisma.message.findMany({
      take: limit,
      where: {
        OR: [
          { type: 'MARKET_UPDATE' },
          { type: 'PRICE_COMMENT' },
          { type: 'TRADE_SIGNAL' }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        sender: {
          select: {
            name: true,
            personalityType: true
          }
        }
      }
    });
  },
  
  async getMessageSentiment() {
    const recentMessages = await prisma.message.findMany({
      take: 100,
      where: {
        sentiment: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    
    recentMessages.forEach(message => {
      if (message.sentiment === 'positive') positive++;
      else if (message.sentiment === 'negative') negative++;
      else neutral++;
    });
    
    const total = positive + negative + neutral;
    
    return {
      positive: total > 0 ? positive / total : 0,
      negative: total > 0 ? negative / total : 0,
      neutral: total > 0 ? neutral / total : 0,
      messageCount: total
    };
  },
  
  generateTemplatedMessage(
    agentType: PersonalityType,
    messageType: string,
    context: any
  ): string {
    // Set of templated messages to reduce LLM calls for common scenarios
    const templates: Record<string, string[]> = {
      MARKET_RISE: [
        "The market is looking bullish today! $TOKEN up {pctChange}%.",
        "Price action for $TOKEN is strong, up {pctChange}% in the session.",
        "Seeing good momentum for $TOKEN, now up {pctChange}%.",
        "$TOKEN making moves today, up {pctChange}%. What do you think?",
        "Green day for $TOKEN! Price up {pctChange}% and looking strong."
      ],
      MARKET_FALL: [
        "$TOKEN down {pctChange}% today. Watching support levels.",
        "Bearish action for $TOKEN, down {pctChange}% in today's session.",
        "Seeing some selling pressure on $TOKEN, now down {pctChange}%.",
        "$TOKEN pulling back {pctChange}% from recent highs.",
        "Red day for $TOKEN markets with a {pctChange}% drop."
      ],
      BUY_SIGNAL: [
        "Just bought more $TOKEN at these levels.",
        "Adding to my $TOKEN position at {price}.",
        "Accumulating $TOKEN on this dip. Great opportunity.",
        "Entered a new $TOKEN position. Charts look promising.",
        "Buying $TOKEN here makes sense to me. Good risk/reward."
      ],
      SELL_SIGNAL: [
        "Taking some profits on $TOKEN after the recent run.",
        "Reducing my $TOKEN exposure at these levels.",
        "Selling a portion of my $TOKEN holdings to lock in gains.",
        "Exiting my $TOKEN position. Will look to re-enter lower.",
        "Taking money off the table with $TOKEN. Risk management first."
      ]
    };
    
    // Personality-specific weights to make certain personalities more likely
    // to use certain message types
    const typeWeights: Record<PersonalityType, Record<string, number>> = {
      CONSERVATIVE: {
        MARKET_RISE: 0.3,
        MARKET_FALL: 0.5,
        BUY_SIGNAL: 0.2,
        SELL_SIGNAL: 0.6
      },
      AGGRESSIVE: {
        MARKET_RISE: 0.7,
        MARKET_FALL: 0.3,
        BUY_SIGNAL: 0.8,
        SELL_SIGNAL: 0.2
      },
      MODERATE: {
        MARKET_RISE: 0.5,
        MARKET_FALL: 0.5,
        BUY_SIGNAL: 0.5,
        SELL_SIGNAL: 0.5
      },
      CONTRARIAN: {
        MARKET_RISE: 0.3,
        MARKET_FALL: 0.7,
        BUY_SIGNAL: 0.3,
        SELL_SIGNAL: 0.7
      },
      TREND_FOLLOWER: {
        MARKET_RISE: 0.7,
        MARKET_FALL: 0.3,
        BUY_SIGNAL: 0.7,
        SELL_SIGNAL: 0.3
      },
      TECHNICAL:{
        MARKET_RISE: 0.9,
        MARKET_FALL: 0.4,
        BUY_SIGNAL: 0.3,
        SELL_SIGNAL: 0.6
      } ,
      FUNDAMENTAL:{
        MARKET_RISE: 0.7,
        MARKET_FALL: 0.5,
        BUY_SIGNAL: 0.2,
        SELL_SIGNAL: 0.3
      },
      EMOTIONAL:{
        MARKET_RISE: 0.8,
        MARKET_FALL: 0.4,
        BUY_SIGNAL: 0.1,
        SELL_SIGNAL: 0.2
      },
      WHALE:{
        MARKET_RISE: 0.3,
        MARKET_FALL: 0.5,
        BUY_SIGNAL: 0.2,
        SELL_SIGNAL: 0.6
      },
      NOVICE:{
        MARKET_RISE: 0.3,
        MARKET_FALL: 0.5,
        BUY_SIGNAL: 0.2,
        SELL_SIGNAL: 0.6
      }
      
    };
    
    // Generate random threshold based on personality
    const threshold = Math.random();
    const weight = typeWeights[agentType]?.[messageType] || 0.5;
    
    // If random threshold is greater than the weight for this message type,
    // choose a different message type that's more aligned with the personality
    let actualMessageType = messageType;
    if (threshold > weight) {
      if (agentType === 'CONSERVATIVE' && messageType === 'BUY_SIGNAL') {
        actualMessageType = 'MARKET_FALL';
      } else if (agentType === 'AGGRESSIVE' && messageType === 'SELL_SIGNAL') {
        actualMessageType = 'MARKET_RISE';
      } else if (agentType === 'CONTRARIAN' && messageType === 'MARKET_RISE') {
        actualMessageType = 'MARKET_FALL';
      }
    }
    
    // Get templates for the chosen message type
    const messageTemplates = templates[actualMessageType] || templates.MARKET_RISE;
    
    // Select a random template
    const templateIndex = Math.floor(Math.random() * messageTemplates.length);
    let message = messageTemplates[templateIndex];
    
    // Replace placeholders with context values
    message = message.replace('{pctChange}', context.pctChange?.toFixed(2) || '0.5');
    message = message.replace('{price}', context.price?.toFixed(4) || '0.0001');
    message = message.replace('$TOKEN', context.tokenSymbol || 'NURO');
    
    return message;
  }
};

export async function reactToMessage(messageId: string,agentId:string, reactionType: string) {
  await prisma.message.update({
    where: { id: messageId },
    data: {
      reactions: {
        create: {
          agentId:agentId,
          type:reactionType
        }
      }
    }
  });

  
}
export async function generateGroupChat(messageCount: number): Promise<void> {
  try {
    // Fetch selected token
    const { getSelectedToken } = await import('../config/selectedToken');
    const selectedToken = await getSelectedToken();
    
    // Fetch random active agents
    const agents = await prisma.agent.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        personalityType: true
      },
      take: Math.min(messageCount, 50), // Cap at 50 agents to avoid overload
    });

    if (agents.length === 0) {
      console.warn('No active agents found for group chat');
      return;
    }

    // Fetch real market data
    let marketSentiment = 0.5;
    let currentPrice = 0;
    let priceChange = 0;
    
    try {
      const { marketData } = await import('../market/data');
      const marketInfo = await marketData.getMarketInfo();
      
      currentPrice = marketInfo.price || 0;
      priceChange = marketInfo.priceChange24h || 0;
      
      // Calculate sentiment based on price change
      // Positive change = bullish (>0.5), negative = bearish (<0.5)
      marketSentiment = priceChange > 0 ? 0.7 : 0.3;
      
      console.log(`Market data for ${selectedToken.symbol}: Price=${currentPrice}, Change=${priceChange}%, Sentiment=${marketSentiment}`);
    } catch (error) {
      console.warn('Could not fetch market data, using random sentiment:', error);
      marketSentiment = Math.random();
    }

    // Generate messages for each agent
    const messagePromises = agents.slice(0, messageCount).map(async (agent) => {
      try {
        // Generate message content using messagingSystem
        const content = await messagingSystem.generateMessage(
          agent.id,
          agent.personalityType,
          marketSentiment
        );

        // Determine sentiment based on message type
        const messageType = marketSentiment > 0.5 ? 'MARKET_RISE' : 'MARKET_FALL';
        const sentiment = messageType === 'MARKET_RISE' ? 'positive' : 'negative';

        // Create message
        await messagingSystem.createMessage(agent.id, content, {
          type: messageType === 'MARKET_RISE' ? 'MARKET_UPDATE' : 'PRICE_COMMENT',
          sentiment,
          visibility: 'public'
        });
      } catch (error) {
        console.error(`Error generating message for agent ${agent.id}:`, error);
      }
    });

    // Wait for all messages to be created
    await Promise.all(messagePromises);

    console.log(`Generated ${Math.min(messageCount, agents.length)} group chat messages for ${selectedToken.symbol}`);
  } catch (error) {
    console.error('Error generating group chat:', error);
    throw error;
  }
}