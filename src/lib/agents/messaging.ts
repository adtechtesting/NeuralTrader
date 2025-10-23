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
    try {
      // Import LLM agent system
      const { AgentPool } = await import('./agent-factory');
      const agentPool = new AgentPool({ maxSize: 50, useLLM: true });

      // Get the LLM agent
      const llmAgent = await agentPool.getAgent(agentId) as any;

      if (!llmAgent) {
        console.warn(`LLM Agent ${agentId} not found, using template fallback`);
        throw new Error(`LLM Agent ${agentId} not found`);
      }

      // Get market data and recent messages for context
      const { marketData } = await import('../market/data');
      const marketInfo = await marketData.getMarketInfo();
      const sentiment = await marketData.getMarketSentiment();

      // Get recent messages for context
      const recentMessages = await this.getRecentMessages(5);

      // Use LLM agent's social interaction method
      const success = await llmAgent.socialInteraction(recentMessages, sentiment);

      if (success) {
        // Check if LLM agent actually created a message
        const latestMessages = await this.getRecentMessages(1);
        const latestMessage = latestMessages.find(m => m.senderId === agentId);

        if (latestMessage && latestMessage.content) {
          console.log(`✅ LLM generated message for ${personalityType}: ${latestMessage.content.substring(0, 50)}...`);
          return latestMessage.content;
        } else {
          console.warn(`LLM social interaction succeeded but no message created for agent ${agentId}`);
        }
      }

      console.warn(`LLM social interaction failed for agent ${agentId}, using template fallback`);
      throw new Error("LLM social interaction failed");

    } catch (error) {
      console.error(`LLM message generation failed for agent ${agentId}:`, error);

      // Fallback to enhanced template system with personality-driven messages
      const messageType = marketSentiment > 0.5 ? 'MARKET_RISE' : 'MARKET_FALL';

      const { getSelectedToken } = await import('../config/selectedToken');
      const selectedToken = await getSelectedToken();

      // Get market info for context
      const { marketData } = await import('../market/data');
      const marketInfo = await marketData.getMarketInfo();

      // Choose personality-appropriate message type based on weights
      const typeWeights = (messagingSystem as any).typeWeights[personalityType as PersonalityType] || (messagingSystem as any).typeWeights.MODERATE;
      const threshold = Math.random();
      const weight = typeWeights[messageType] || 0.5;

      let actualMessageType = messageType;
      if (threshold > weight) {
        if (personalityType === 'AGGRESSIVE' && threshold > 0.7) {
          actualMessageType = 'AGGRESSIVE_TALK';
        } else if (personalityType === 'CONSERVATIVE' && threshold > 0.8) {
          actualMessageType = 'CONSERVATIVE_TALK';
        } else if (personalityType === 'CONTRARIAN' && threshold > 0.8) {
          actualMessageType = 'CONTRARIAN_TALK';
        } else {
          const highWeightTypes = Object.keys(typeWeights).filter(type => typeWeights[type] > 0.6);
          if (highWeightTypes.length > 0) {
            actualMessageType = highWeightTypes[Math.floor(Math.random() * highWeightTypes.length)];
          }
        }
      }

      const context = {
        pctChange: Math.abs(marketSentiment - 0.5) * 10,
        price: marketInfo?.price || (0.0001 + Math.random() * 0.01),
        tokenSymbol: selectedToken.symbol || 'TOKEN'
      };

      const templateMessage = this.generateTemplatedMessage(
        personalityType as PersonalityType,
        actualMessageType,
        context
      );

      console.log(`✅ Template fallback for ${personalityType}: ${templateMessage.substring(0, 50)}...`);
      return templateMessage;
    }
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
        "Green day for $TOKEN! Price up {pctChange}% and looking strong.",
        "$TOKEN showing serious strength! This could be the breakout we've been waiting for.",
        "Bulls are in control of $TOKEN! {pctChange}% gains and climbing.",
        "Excellent price action on $TOKEN today. Up {pctChange}% and building momentum."
      ],
      MARKET_FALL: [
        "$TOKEN down {pctChange}% today. Watching support levels.",
        "Bearish action for $TOKEN, down {pctChange}% in today's session.",
        "Seeing some selling pressure on $TOKEN, now down {pctChange}%.",
        "$TOKEN pulling back {pctChange}% from recent highs.",
        "Red day for $TOKEN markets with a {pctChange}% drop.",
        "$TOKEN taking a breather after the recent run. Down {pctChange}%.",
        "Market sentiment turning cautious on $TOKEN with {pctChange}% decline."
      ],
      BUY_SIGNAL: [
        "Just bought some $TOKEN at these levels.",
        "Adding to my $TOKEN position at {price}.",
        "Accumulating $TOKEN on this dip. Great opportunity.",
        "Entered a new $TOKEN position. Charts look promising.",
        "Buying $TOKEN here makes sense to me. Good risk/reward.",
        "Loading up on $TOKEN! These prices won't last long.",
        "Aggressively accumulating $TOKEN while it's undervalued.",
        "Strategic entry into $TOKEN at these attractive levels."
      ],
      SELL_SIGNAL: [
        "Taking some profits on $TOKEN after the recent run.",
        "Reducing my $TOKEN exposure at these levels.",
        "Selling a portion of my $TOKEN holdings to lock in gains.",
        "Exiting my $TOKEN position. Will look to re-enter lower.",
        "Taking money off the table with $TOKEN. Risk management first.",
        "Trimming $TOKEN position after solid gains. Smart money moves.",
        "Securing profits from $TOKEN while the market is hot."
      ],
      AGGRESSIVE_TALK: [
        "$TOKEN is primed for a massive pump! Getting in heavy before the crowd.",
        "This $TOKEN setup is screaming buy! All in or nothing!",
        "Watching $TOKEN like a hawk - ready to strike when momentum builds.",
        "$TOKEN showing monster potential! Not for the weak-handed.",
        "Aggressive traders unite! $TOKEN is our next target.",
        "$TOKEN price action is insane! {pctChange}% move and climbing fast.",
        "Just loaded up on $TOKEN - this thing is going to moon! 🚀",
        "$TOKEN breaking out hard! Time to go big or go home."
      ],
      CONSERVATIVE_TALK: [
        "$TOKEN showing steady growth. Considering a modest position.",
        "Carefully analyzing $TOKEN fundamentals before any moves.",
        "Market data for $TOKEN looks promising but waiting for confirmation.",
        "Risk-adjusted returns on $TOKEN appear favorable. Small position only.",
        "$TOKEN trending up {pctChange}% but I'll wait for more data.",
        "Monitoring $TOKEN closely before committing capital.",
        "Analyzing $TOKEN chart patterns and volume before entry."
      ],
      CONTRARIAN_TALK: [
        "Everyone's bullish on $TOKEN? That makes me suspicious...",
        "When the crowd loves $TOKEN, I start looking for exit signals.",
        "Going against the grain on $TOKEN. Market sentiment seems too optimistic.",
        "While others chase $TOKEN pumps, I'm looking for real value.",
        "$TOKEN hype is building but I'm staying cautious.",
        "Market consensus on $TOKEN seems overly bullish. Time to be contrarian."
      ]
    };
    
    // Personality-specific weights to make certain personalities more likely
    // to use certain message types
    const typeWeights: Record<PersonalityType, Record<string, number>> = {
      CONSERVATIVE: {
        MARKET_RISE: 0.3,
        MARKET_FALL: 0.5,
        BUY_SIGNAL: 0.2,
        SELL_SIGNAL: 0.6,
        AGGRESSIVE_TALK: 0.1,
        CONSERVATIVE_TALK: 0.8,
        CONTRARIAN_TALK: 0.2
      },
      AGGRESSIVE: {
        MARKET_RISE: 0.7,
        MARKET_FALL: 0.3,
        BUY_SIGNAL: 0.8,
        SELL_SIGNAL: 0.2,
        AGGRESSIVE_TALK: 0.9,
        CONSERVATIVE_TALK: 0.1,
        CONTRARIAN_TALK: 0.1
      },
      MODERATE: {
        MARKET_RISE: 0.5,
        MARKET_FALL: 0.5,
        BUY_SIGNAL: 0.5,
        SELL_SIGNAL: 0.5,
        AGGRESSIVE_TALK: 0.3,
        CONSERVATIVE_TALK: 0.3,
        CONTRARIAN_TALK: 0.3
      },
      CONTRARIAN: {
        MARKET_RISE: 0.3,
        MARKET_FALL: 0.7,
        BUY_SIGNAL: 0.3,
        SELL_SIGNAL: 0.7,
        AGGRESSIVE_TALK: 0.2,
        CONSERVATIVE_TALK: 0.2,
        CONTRARIAN_TALK: 0.9
      },
      TREND_FOLLOWER: {
        MARKET_RISE: 0.7,
        MARKET_FALL: 0.3,
        BUY_SIGNAL: 0.7,
        SELL_SIGNAL: 0.3,
        AGGRESSIVE_TALK: 0.6,
        CONSERVATIVE_TALK: 0.2,
        CONTRARIAN_TALK: 0.2
      },
      TECHNICAL:{
        MARKET_RISE: 0.9,
        MARKET_FALL: 0.4,
        BUY_SIGNAL: 0.3,
        SELL_SIGNAL: 0.6,
        AGGRESSIVE_TALK: 0.4,
        CONSERVATIVE_TALK: 0.4,
        CONTRARIAN_TALK: 0.2
      } ,
      FUNDAMENTAL:{
        MARKET_RISE: 0.7,
        MARKET_FALL: 0.5,
        BUY_SIGNAL: 0.2,
        SELL_SIGNAL: 0.3,
        AGGRESSIVE_TALK: 0.2,
        CONSERVATIVE_TALK: 0.7,
        CONTRARIAN_TALK: 0.3
      },
      EMOTIONAL:{
        MARKET_RISE: 0.8,
        MARKET_FALL: 0.4,
        BUY_SIGNAL: 0.1,
        SELL_SIGNAL: 0.2,
        AGGRESSIVE_TALK: 0.7,
        CONSERVATIVE_TALK: 0.2,
        CONTRARIAN_TALK: 0.3
      },
      WHALE:{
        MARKET_RISE: 0.3,
        MARKET_FALL: 0.5,
        BUY_SIGNAL: 0.2,
        SELL_SIGNAL: 0.6,
        AGGRESSIVE_TALK: 0.5,
        CONSERVATIVE_TALK: 0.3,
        CONTRARIAN_TALK: 0.4
      },
      NOVICE:{
        MARKET_RISE: 0.3,
        MARKET_FALL: 0.5,
        BUY_SIGNAL: 0.2,
        SELL_SIGNAL: 0.6,
        AGGRESSIVE_TALK: 0.4,
        CONSERVATIVE_TALK: 0.4,
        CONTRARIAN_TALK: 0.3
      }
    };
    
    // Generate random threshold based on personality
    const threshold = Math.random();
    const weight = typeWeights[agentType]?.[messageType] || 0.5;

    // If random threshold is greater than the weight for this message type,
    // choose a different message type that's more aligned with the personality
    let actualMessageType = messageType;
    if (threshold > weight) {
      // Choose personality-appropriate message type
      if (agentType === 'AGGRESSIVE') {
        actualMessageType = Math.random() < 0.7 ? 'AGGRESSIVE_TALK' : (Math.random() < 0.5 ? 'BUY_SIGNAL' : 'MARKET_RISE');
      } else if (agentType === 'CONSERVATIVE') {
        actualMessageType = Math.random() < 0.8 ? 'CONSERVATIVE_TALK' : 'MARKET_FALL';
      } else if (agentType === 'CONTRARIAN') {
        actualMessageType = Math.random() < 0.8 ? 'CONTRARIAN_TALK' : (Math.random() < 0.5 ? 'SELL_SIGNAL' : 'MARKET_FALL');
      } else {
        // Default personality-appropriate selection
        const personalityMessages = typeWeights[agentType];
        if (personalityMessages) {
          const availableTypes = Object.keys(personalityMessages).filter(type =>
            personalityMessages[type] > 0.4
          );
          if (availableTypes.length > 0) {
            actualMessageType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
          }
        }
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
    message = message.replace('$TOKEN', context.tokenSymbol || 'TOKEN');
    
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

        // Determine sentiment based on message type and personality
        const messageType = marketSentiment > 0.5 ? 'MARKET_RISE' : 'MARKET_FALL';

        // Choose personality-appropriate message type
        let actualMessageType = messageType;
        const personalityWeights = (messagingSystem as any).typeWeights[agent.personalityType as PersonalityType];
        if (personalityWeights) {
          const threshold = Math.random();
          const weight = personalityWeights[messageType] || 0.5;

          if (threshold > weight) {
            // Choose personality-specific message type
            if (agent.personalityType === 'AGGRESSIVE' && threshold > 0.7) {
              actualMessageType = 'AGGRESSIVE_TALK';
            } else if (agent.personalityType === 'CONSERVATIVE' && threshold > 0.8) {
              actualMessageType = 'CONSERVATIVE_TALK';
            } else if (agent.personalityType === 'CONTRARIAN' && threshold > 0.8) {
              actualMessageType = 'CONTRARIAN_TALK';
            } else {
              // Choose from high-weight personality options
              const highWeightTypes = Object.keys(personalityWeights).filter(type =>
                personalityWeights[type] > 0.6
              );
              if (highWeightTypes.length > 0) {
                actualMessageType = highWeightTypes[Math.floor(Math.random() * highWeightTypes.length)];
              }
            }
          }
        }

        // Determine sentiment based on message type
        let sentiment = 'neutral';
        if (actualMessageType === 'MARKET_RISE' || actualMessageType === 'BUY_SIGNAL' || actualMessageType === 'AGGRESSIVE_TALK') {
          sentiment = 'positive';
        } else if (actualMessageType === 'MARKET_FALL' || actualMessageType === 'SELL_SIGNAL' || actualMessageType === 'CONTRARIAN_TALK') {
          sentiment = 'negative';
        }

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