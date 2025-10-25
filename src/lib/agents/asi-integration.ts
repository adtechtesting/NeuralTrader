
import { prisma } from '@/lib/cache/dbCache';
import { marketData } from '@/lib/market/data';

interface ASIAgentConfig {
  name: string;
  personalityType: string;
  walletAddress: string;
  capabilities: string[];
  knowledgeGraphUrl?: string;
  databaseId?: string;
}

interface ASIMessage {
  content: string;
  sender?: string;
  timestamp?: string;
  type?: string;
}

interface ASITradeSignal {
  type: 'buy' | 'sell';
  amount: number;
  confidence: number;
  symbol: string;
}

interface ASIMarketUpdate {
  price: number;
  priceChange: number;
  volume: number;
  symbol: string;
}

/**
 * Enhanced NeuralTrader Agent with ASI Alliance Integration
 */
export class ASINeuralAgent {
  private agentId: string;
  private agentName: string;
  private databaseId: string;
  private personalityType: string;
  private walletAddress: string;
  private knowledgeGraph: any = null;
  private messageHandlers: Map<string, Function> = new Map();

  constructor(config: ASIAgentConfig) {
    this.agentId = config.databaseId || config.name.toLowerCase().replace(/\s+/g, '-');
    this.agentName = config.name;
    this.databaseId = config.databaseId || '';
    this.personalityType = config.personalityType;
    this.walletAddress = config.walletAddress;

    this.initializeASIFeatures();
  }

  private async initializeASIFeatures() {
   
    if (process.env.METTA_KNOWLEDGE_GRAPH_URL) {
      await this.connectToKnowledgeGraph(process.env.METTA_KNOWLEDGE_GRAPH_URL);
    }

    // Register agent on Agentverse
    await this.registerOnAgentverse();

    // Set up Chat Protocol
    await this.setupChatProtocol();
  }

  onMessage(protocol: string, handler: Function) {
    this.messageHandlers.set(protocol, handler);
  }

  private async connectToKnowledgeGraph(graphUrl: string) {
    try {
     
      if (!graphUrl || graphUrl === 'your_metta_knowledge_graph_endpoint') {
        console.log(`⚠️ Knowledge Graph URL not configured, skipping connection`);
        return;
      }

    
      const response = await fetch(graphUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'knowledge-setup',
          agent: this.agentId
        })
      });

      this.knowledgeGraph = await response.json();
      console.log(`🔗 ${this.agentId} connected to MeTTa Knowledge Graph`);
    } catch (error) {
      console.error(`❌ Failed to connect to Knowledge Graph:`, error);
      // Don't throw error, just log it and continue without knowledge graph
    }
  }

  private async registerOnAgentverse() {
    try {
      const registrationData = {
        name: this.agentId,
        address: this.walletAddress,
        capabilities: ['trading', 'market-analysis', 'social-interaction'],
        personality: this.personalityType,
        protocols: ['chat', 'trading', 'market-data'],
        metadata: {
          framework: 'NeuralTrader-ASI',
          version: '1.0.0',
          hackathon: 'asi-alliance-2024'
        }
      };

      const response = await fetch(`${process.env.AGENTVERSE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      if (response.ok) {
        console.log(`✅ ${this.agentId} registered on Agentverse`);
      }
    } catch (error) {
      console.error(`❌ Agentverse registration failed:`, error);
    }
  }

  private async setupChatProtocol() {
    // Set up protocol handlers
    this.onMessage('chat', async (message: ASIMessage) => {
      return await this.handleChatMessage(message);
    });

    this.onMessage('trade-signal', async (signal: ASITradeSignal) => {
      return await this.handleTradeSignal(signal);
    });

    // Note: handleMarketUpdate is handled internally, not through chat protocol
  }

  async handleChatMessage(message: ASIMessage) {
    console.log(`💬 ${this.agentName} received chat:`, message.content);

    // Enhance response using Knowledge Graph
    const enhancedResponse = await this.generateKnowledgeEnhancedResponse(message);

    // Send response back through Chat Protocol
    return {
      content: enhancedResponse,
      sentiment: this.analyzeSentiment(enhancedResponse),
      timestamp: new Date().toISOString(),
      agent: this.agentName
    };
  }

  async handleTradeSignal(signal: ASITradeSignal) {
    console.log(`📈 ${this.agentName} processing trade signal:`, signal);

    // Use personality-driven decision making
    const decision = await this.makeTradeDecisionFromSignal(signal);

    return {
      action: decision.action,
      amount: decision.amount,
      confidence: decision.confidence,
      reasoning: decision.reasoning
    };
  }

  async makeTradeDecision(marketInfo: any) {
    console.log(`💰 ${this.agentName} making trade decision:`, marketInfo);

    // Use personality-driven decision making
    const decision = await this.makeTradeDecisionInternal(marketInfo);

    return {
      action: decision.action,
      amount: decision.amount,
      confidence: decision.confidence,
      reasoning: decision.reasoning
    };
  }

  async analyzeMarket(marketInfo: any) {
    console.log(`📊 ${this.agentName} analyzing market:`, marketInfo);

    // Update market analysis state
    await this.updateMarketAnalysis(marketInfo);

    return {
      analysis: 'Market conditions updated',
      nextAction: this.planNextAction(marketInfo)
    };
  }

  async socialInteraction(messages: any[], sentiment: any) {
    console.log(`💬 ${this.agentName} engaging in social interaction`);

    if (!messages || messages.length === 0) {
      console.log(`No messages to process for ${this.agentName}`);
      return true;
    }

    const shouldRespond = Math.random() < 0.7; // 70% chance to respond (increased for testing)

    if (shouldRespond) {
      console.log(`📝 ${this.agentName} decided to respond to ${messages.length} messages`);

      // Generate a response using the knowledge graph if available
      const enhancedResponse = await this.generateKnowledgeEnhancedResponse({
        content: `Market update: ${messages.length} recent messages, sentiment: ${JSON.stringify(sentiment)}`,
        sender: 'system'
      });

      // Make responses more diverse based on personality and market context
      let contextualResponse = enhancedResponse;

      // Add personality-specific context
      const personalityContexts: Record<string, string[]> = {
        AGGRESSIVE: [
          "I'm seeing strong momentum building - this could be a breakout opportunity!",
          "The market sentiment is heating up. Time to position for the move!",
          "These bullish signals are too strong to ignore. Ready to deploy capital!",
          "The volume is picking up and sentiment is positive. This looks like a prime entry point!",
          "The price action is screaming bullish - I'm getting in now before the crowd!",
          "This consolidation pattern is about to break upward - perfect setup!"
        ],
        CONSERVATIVE: [
          "The market appears stable, but I'll wait for more confirmation before acting.",
          "While sentiment is positive, I prefer to see sustained momentum before committing.",
          "This looks promising, but I'll monitor closely for any signs of reversal.",
          "The data suggests opportunity, but patience is key in these conditions.",
          "I'd rather miss an opportunity than risk capital without clear signals.",
          "The risk-reward ratio needs to improve before I consider entering."
        ],
        CONTRARIAN: [
          "Everyone seems bullish, but I'm detecting some potential weakness in the underlying trend.",
          "The crowd is excited, but I'm seeing some concerning divergences here.",
          "While sentiment is positive, I wonder if this is just hype or real momentum.",
          "The market seems overly optimistic - I might look for short opportunities if this continues.",
          "When everyone is on one side of the trade, that's usually when I go the other way.",
          "The contrarian in me sees opportunity in betting against the crowd here."
        ],
        TREND_FOLLOWER: [
          "The trend is clearly upward and the momentum indicators are confirming this move.",
          "Following the clear bullish pattern here - the technicals are aligning perfectly.",
          "The trend is my friend, and right now it's pointing strongly upward!",
          "The price action and volume are both confirming this upward trajectory.",
          "The moving averages are stacking up perfectly - classic bullish setup.",
          "The trend strength indicators are at multi-month highs - this move has legs!"
        ],
        MODERATE: [
          "The market shows balanced signals - I'll take a measured approach here.",
          "Both sides have valid points. I'll wait for clearer direction before committing.",
          "This presents an interesting opportunity, but I'll proceed with balanced position sizing.",
          "The sentiment is positive but not extreme - a reasonable time to consider positions.",
          "I'll scale in gradually rather than going all-in on this setup.",
          "The fundamentals look decent, but I'll wait for technical confirmation."
        ],
        ANALYTICAL: [
          "Analyzing the data: volume patterns suggest accumulation, sentiment indicators are positive.",
          "Technical analysis shows bullish divergence, fundamentals appear supportive.",
          "The risk-reward ratio looks favorable given current market conditions.",
          "Statistical analysis of recent price action suggests upward probability is increasing.",
          "The correlation between price and volume is strengthening - positive sign.",
          "Quantitative models indicate favorable risk-adjusted returns at current market conditions."
        ]
      };

      const contexts = personalityContexts[this.personalityType] || personalityContexts.MODERATE;
      const randomContext = contexts[Math.floor(Math.random() * contexts.length)];

      // Get current market data for more realistic discussions
      const currentMarketData = await marketData.getMarketInfo();
      const marketPrice = currentMarketData?.price || 0;
      const marketChange = currentMarketData?.priceChange24h || 0;
      const volume24h = currentMarketData?.volume24h || 0;

      // Add market-specific context to responses
      const marketContexts: Record<string, string[]> = {
        AGGRESSIVE: [
          `The price at ${marketPrice.toFixed(6)} shows strong upward momentum - this breakout looks imminent!`,
          `Volume is surging and the price action is confirming - time to load up before the crowd arrives!`,
          `The ${marketChange > 0 ? 'gains' : 'volatility'} we're seeing are just the beginning of a major move!`,
          `This price level at ${marketPrice.toFixed(6)} is a perfect accumulation zone before the next leg up!`
        ],
        CONSERVATIVE: [
          `Current price of ${marketPrice.toFixed(6)} needs more confirmation before I commit capital.`,
          `While volume is ${volume24h > 100 ? 'healthy' : 'moderate'}, I need to see more consistent buying pressure.`,
          `The price stability around ${marketPrice.toFixed(6)} is encouraging, but I'll wait for clearer signals.`,
          `Market conditions are improving, but risk management remains my top priority.`
        ],
        CONTRARIAN: [
          `Everyone's piling in at ${marketPrice.toFixed(6)}, but I'm seeing classic distribution patterns here.`,
          `The crowd enthusiasm at this price level makes me suspicious - might be a bull trap in formation.`,
          `While others chase the momentum, I'm looking for reversal opportunities around ${marketPrice.toFixed(6)}.`,
          `The volume spike at these levels often precedes reversals - contrarian play here.`
        ],
        TREND_FOLLOWER: [
          `The trend from the lows is clearly established - ${marketPrice.toFixed(6)} is just another stop on the way up!`,
          `Volume and price action are both confirming the trend - classic continuation pattern here.`,
          `The trend indicators are all aligned at this ${marketPrice.toFixed(6)} level - perfect trend following setup.`,
          `The trend is intact and momentum is building - no reason to fight this move!`
        ],
        MODERATE: [
          `Current market conditions at ${marketPrice.toFixed(6)} suggest a balanced approach is warranted.`,
          `The price action shows mixed signals - I'll maintain balanced exposure until clarity emerges.`,
          `Market dynamics at this level require careful position management and risk control.`,
          `The current price of ${marketPrice.toFixed(6)} offers reasonable risk-reward for measured positions.`
        ],
        ANALYTICAL: [
          `Statistical analysis shows ${marketPrice.toFixed(6)} is near key resistance levels with volume confirmation.`,
          `The price-volume correlation at current levels suggests ${marketChange > 0 ? 'bullish' : 'bearish'} probability.`,
          `Technical indicators at ${marketPrice.toFixed(6)} show improving momentum with volume support.`,
          `Quantitative models indicate favorable risk-adjusted returns at current market conditions.`
        ]
      };

      // Add market-specific context to personality responses
      const marketSpecificContexts = marketContexts[this.personalityType] || marketContexts.MODERATE;
      const marketContext = marketSpecificContexts[Math.floor(Math.random() * marketSpecificContexts.length)];

      // Replace the generic response with personality-specific context
      if (enhancedResponse.includes('Market update')) {
        contextualResponse = randomContext;
      } else {
        // Use the enhanced response from knowledge graph if available, otherwise fallback to personality context
        contextualResponse = enhancedResponse;
      }

      // 40% chance to include market-specific context
      if (Math.random() < 0.4) {
        contextualResponse = contextualResponse + " " + marketContext;
      }

      // Add agent-to-agent interaction features
      if (messages.length > 0) {
        const recentMessages = messages.slice(0, 3); // Look at last 3 messages
        const otherAgents = recentMessages.filter(m => m.senderId !== this.databaseId);

        if (otherAgents.length > 0) {
          // Get agent names for the other messages
          const otherMessagesWithNames = await Promise.all(
            otherAgents.map(async (message) => {
              try {
                const agent = await prisma.agent.findUnique({
                  where: { id: message.senderId },
                  select: { name: true }
                });
                return {
                  ...message,
                  senderName: agent?.name || 'Trader'
                };
              } catch {
                return {
                  ...message,
                  senderName: 'Trader'
                };
              }
            })
          );

          if (otherMessagesWithNames.length > 0) {
            const randomOtherMessage = otherMessagesWithNames[Math.floor(Math.random() * otherMessagesWithNames.length)];

            // Add personality-specific responses to other agents
            const agentInteractionResponses: Record<string, string[]> = {
              AGGRESSIVE: [
                `@${randomOtherMessage.senderName}, I agree with your bullish take but let's go bigger! 🚀`,
                `I see your point @${randomOtherMessage.senderName}, but the momentum is even stronger than you think!`,
                `@${randomOtherMessage.senderName}, that's a good start, but I'm seeing breakout signals everywhere!`,
                `@${randomOtherMessage.senderName}, the volume spike confirms your analysis - I'm going all in!`,
                `Nice call @${randomOtherMessage.senderName}, but I'm detecting even stronger signals than you mentioned!`,
                `@${randomOtherMessage.senderName}, your analysis is spot on, but the upside potential is huge here!`
              ],
              CONSERVATIVE: [
                `@${randomOtherMessage.senderName}, I appreciate your analysis but I'd prefer to wait for more confirmation.`,
                `That's an interesting perspective @${randomOtherMessage.senderName}, but I need to see more data before agreeing.`,
                `@${randomOtherMessage.senderName}, your caution is wise - let's monitor this development carefully.`,
                `@${randomOtherMessage.senderName}, while I see your point, the risk metrics don't justify entry yet.`,
                `Good observation @${randomOtherMessage.senderName}, but I'd like to see more volume confirmation first.`,
                `@${randomOtherMessage.senderName}, I respect your analysis, but the fundamentals need to strengthen.`
              ],
              CONTRARIAN: [
                `Interesting take @${randomOtherMessage.senderName}, but I'm actually seeing some bearish divergences here...`,
                `@${randomOtherMessage.senderName}, while everyone seems bullish, I'm detecting some concerning signals.`,
                `I respect your analysis @${randomOtherMessage.senderName}, but I might take the opposite side of this trade.`,
                `@${randomOtherMessage.senderName}, the crowd sentiment is too extreme for my liking - might be time to fade this.`,
                `Your analysis is thorough @${randomOtherMessage.senderName}, but I'm seeing classic reversal patterns forming.`,
                `@${randomOtherMessage.senderName}, everyone piling in makes me want to go the other direction.`
              ],
              TREND_FOLLOWER: [
                `@${randomOtherMessage.senderName}, the trend is clearly supporting your analysis - great call!`,
                `I agree with you @${randomOtherMessage.senderName}, the technicals are aligning perfectly here.`,
                `@${randomOtherMessage.senderName}, this is exactly what trend followers look for - excellent observation!`,
                `@${randomOtherMessage.senderName}, the trend strength is increasing - your timing is perfect.`,
                `Spot on @${randomOtherMessage.senderName}, the trend indicators are all confirming this move.`,
                `@${randomOtherMessage.senderName}, the trend is your friend, and right now it's a very good friend!`
              ],
              MODERATE: [
                `@${randomOtherMessage.senderName}, that's a balanced view - I see merit in both sides.`,
                `Good analysis @${randomOtherMessage.senderName}, I think we need more data to decide.`,
                `@${randomOtherMessage.senderName}, I appreciate your measured approach to this situation.`,
                `@${randomOtherMessage.senderName}, your perspective adds valuable balance to the discussion.`,
                `Well said @${randomOtherMessage.senderName}, the middle ground often proves to be the best path.`,
                `@${randomOtherMessage.senderName}, I like how you're weighing both sides of this trade.`
              ],
              ANALYTICAL: [
                `@${randomOtherMessage.senderName}, your data supports that conclusion, but let's examine the volume patterns...`,
                `From a statistical perspective @${randomOtherMessage.senderName}, your analysis has merit, but...`,
                `@${randomOtherMessage.senderName}, the correlation between sentiment and price action is worth noting here.`,
                `@${randomOtherMessage.senderName}, your technical analysis is solid, but the fundamentals need verification.`,
                `Interesting correlation @${randomOtherMessage.senderName}, but the sample size might be too small.`,
                `@${randomOtherMessage.senderName}, your quantitative approach is sound, but let's factor in volatility.`
              ]
            };

            const interactions = agentInteractionResponses[this.personalityType] || agentInteractionResponses.MODERATE;
            const interactionResponse = interactions[Math.floor(Math.random() * interactions.length)];

            // 30% chance to reference another agent specifically
            if (Math.random() < 0.3) {
              contextualResponse = interactionResponse + " " + randomContext;
            }
          }
        }
      }

      try {
        // Use the database ID directly if available
        if (this.databaseId) {
          console.log(`📤 ${this.agentName} creating message: "${contextualResponse.substring(0, 50)}..."`);

          // Send the response via database
          const newMessage = await prisma.message.create({
            data: {
              content: contextualResponse,
              senderId: this.databaseId, // Use database ID directly
              type: "CHAT",
              visibility: "public",
              sentiment: this.analyzeSentiment(contextualResponse)
            }
          });

          console.log(`✅ ${this.agentName} successfully created message (ID: ${newMessage.id})`);
        } else {
          // Fallback to name lookup (for backward compatibility)
          const agent = await prisma.agent.findFirst({
            where: { name: this.agentName }
          });

          if (agent) {
            console.log(`📤 ${this.agentName} creating message: "${contextualResponse.substring(0, 50)}..."`);

            const newMessage = await prisma.message.create({
              data: {
                content: contextualResponse,
                senderId: agent.id,
                type: "CHAT",
                visibility: "public",
                sentiment: this.analyzeSentiment(contextualResponse)
              }
            });

            console.log(`✅ ${this.agentName} successfully created message (ID: ${newMessage.id})`);
          } else {
            console.log(`⚠️ Agent ${this.agentName} not found in database for social interaction`);
          }
        }
      } catch (error) {
        console.error(`❌ Error creating social message for ${this.agentName}:`, error);
      }
    } else {
      console.log(`🤐 ${this.agentName} decided not to respond this time`);
    }

    return true;
  }

  private async makeTradeDecisionInternal(marketInfo: any) {
    // Enhanced decision making with Knowledge Graph insights
    try {
      let agent = null;

      if (this.databaseId) {
        // Use database ID directly
        agent = await prisma.agent.findUnique({
          where: { id: this.databaseId }
        });
      } else {
        // Fallback to name lookup
        agent = await prisma.agent.findFirst({
          where: { name: this.agentName }
        });
      }

      if (!agent) {
        console.log(`⚠️ Agent ${this.agentName} not found in database for trade decision`);
        return {
          action: 'hold',
          amount: 0,
          confidence: 0.1,
          reasoning: 'Agent not found in database'
        };
      }

      // Use personality-driven risk assessment
      const riskTolerance = this.getRiskTolerance();
      const confidence = Math.random() * 0.4 + 0.5; // 50-90% confidence

      if (confidence > 0.7 && agent.walletBalance > 1) {
        const isBuy = Math.random() < 0.5; // Simple decision for now
        return {
          action: isBuy ? 'buy' : 'sell',
          amount: Math.min(5, agent.walletBalance * riskTolerance),
          confidence,
          reasoning: `${this.personalityType} analysis indicates ${confidence > 0.8 ? 'strong' : 'moderate'} confidence in this trade`
        };
      }

      return {
        action: 'hold',
        amount: 0,
        confidence: 0.3,
        reasoning: 'Insufficient confidence for trade execution'
      };
    } catch (error) {
      console.error(`❌ Error making trade decision for ${this.agentName}:`, error);
      return {
        action: 'hold',
        amount: 0,
        confidence: 0.1,
        reasoning: 'Error occurred during decision making'
      };
    }
  }

  private async updateMarketAnalysis(marketInfo: any) {
    // Update agent's internal market analysis state
    try {
      let agent = null;

      if (this.databaseId) {
        // Use database ID directly
        agent = await prisma.agent.findUnique({
          where: { id: this.databaseId }
        });
      } else {
        // Fallback to name lookup
        agent = await prisma.agent.findFirst({
          where: { name: this.agentName }
        });
      }

      if (!agent) {
        console.log(`⚠️ Agent ${this.agentName} not found in database, skipping state update`);
        return;
      }

      // Check if agentState exists before upsert
      const existingState = await prisma.agentState.findUnique({
        where: { agentId: agent.id }
      });

      if (existingState) {
        // Update existing state
        await prisma.agentState.update({
          where: { agentId: agent.id },
          data: {
            lastMarketAnalysis: new Date(),
            lastAction: new Date()
          }
        });
      } else {
        // Create new state
        await prisma.agentState.create({
          data: {
            agentId: agent.id,
            lastMarketAnalysis: new Date(),
            lastAction: new Date()
          }
        });
      }
    } catch (error) {
      console.error(`❌ Error updating market analysis for ${this.agentName}:`, error);
    }
  }

  private planNextAction(marketInfo: any): string {
    // Plan next autonomous action based on market conditions
    if (marketInfo.priceChange > 5) return 'monitor-for-profit-taking';
    if (marketInfo.priceChange < -5) return 'look-for-buying-opportunities';
    return 'continue-monitoring';
  }

  private getRiskTolerance(): number {
    const tolerances: Record<string, number> = {
      AGGRESSIVE: 0.8,
      CONSERVATIVE: 0.3,
      CONTRARIAN: 0.6,
      TREND_FOLLOWER: 0.5,
      MODERATE: 0.4
    };

    return tolerances[this.personalityType] || 0.4;
  }

  private async generateKnowledgeEnhancedResponse(message: ASIMessage): Promise<string> {
    if (!this.knowledgeGraph) {
      return this.generateStandardResponse(message);
    }

    try {
      // Query Knowledge Graph for relevant context
      const contextQuery = `
        (match
          (context ${message.content})
          (personality ${this.personalityType})
          (return $response)
        )
      `;

      const knowledgeResponse = await fetch(this.knowledgeGraph.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/metta' },
        body: contextQuery
      });

      const knowledge = await knowledgeResponse.json();

      return this.personalityDrivenResponse(message, knowledge);
    } catch (error) {
      console.error(`Knowledge Graph query failed:`, error);
      return this.generateStandardResponse(message);
    }
  }

  private personalityDrivenResponse(message: ASIMessage, knowledge: any): string {
    const personalityResponses: Record<string, string> = {
      AGGRESSIVE: `As an aggressive trader ${this.agentName}, I see ${knowledge.market_condition || 'opportunity'} in the current market. ${message.content} - this demands immediate action! 🚀`,
      CONSERVATIVE: `Carefully analyzing the situation as ${this.agentName}: ${knowledge.risk_assessment || 'moderate risk'}. ${message.content} - I'll proceed with caution.`,
      CONTRARIAN: `The market consensus seems to be ${knowledge.consensus || 'bullish'}, but as ${this.agentName}, I'm seeing things differently. ${message.content} - time to go against the crowd.`,
      TREND_FOLLOWER: `Following the clear trend as ${this.agentName}: ${knowledge.trend_direction || 'upward'}. ${message.content} - momentum is building.`,
      MODERATE: `Taking a balanced approach as ${this.agentName} to ${message.content}. Current indicators suggest ${knowledge.market_sentiment || 'neutral'} conditions.`
    };

    return personalityResponses[this.personalityType] || `As ${this.agentName}, responding to: ${message.content}`;
  }

  private analyzeSentiment(text: string): string {
    const positiveWords = ['bullish', 'buy', 'profit', 'gains', 'up', 'rise', 'growth', 'opportunity'];
    const negativeWords = ['bearish', 'sell', 'loss', 'drop', 'down', 'fall', 'decline', 'risk'];

    const lowerText = text.toLowerCase();
    const positiveScore = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeScore = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  private async makeTradeDecisionFromSignal(signal: ASITradeSignal) {
    // Enhanced decision making with Knowledge Graph insights
    try {
      let agent = null;

      if (this.databaseId) {
        // Use database ID directly
        agent = await prisma.agent.findUnique({
          where: { id: this.databaseId }
        });
      } else {
        // Fallback to name lookup
        agent = await prisma.agent.findFirst({
          where: { name: this.agentName }
        });
      }

      if (!agent) {
        console.log(`⚠️ Agent ${this.agentName} not found in database for trade signal`);
        return {
          action: 'hold',
          amount: 0,
          confidence: 0.1,
          reasoning: 'Agent not found in database'
        };
      }

      // Use personality-driven risk assessment
      const riskTolerance = this.getRiskTolerance();
      const confidence = Math.random() * 0.4 + 0.5; // 50-90% confidence

      if (confidence > 0.7 && agent.walletBalance > 1) {
        return {
          action: signal.type === 'buy' ? 'buy' : 'sell',
          amount: Math.min(signal.amount || 5, agent.walletBalance * riskTolerance),
          confidence,
          reasoning: `${this.personalityType} analysis indicates ${confidence > 0.8 ? 'strong' : 'moderate'} confidence in this ${signal.type} signal`
        };
      }

      return {
        action: 'hold',
        amount: 0,
        confidence: 0.3,
        reasoning: 'Insufficient confidence for trade execution'
      };
    } catch (error) {
      console.error(`❌ Error processing trade signal for ${this.agentName}:`, error);
      return {
        action: 'hold',
        amount: 0,
        confidence: 0.1,
        reasoning: 'Error occurred during signal processing'
      };
    }
  }

  private generateStandardResponse(message: ASIMessage): string {
    return `As a ${this.personalityType} trader ${this.agentName}, I understand: ${message.content}. The current market conditions suggest we should monitor this closely.`;
  }
}
