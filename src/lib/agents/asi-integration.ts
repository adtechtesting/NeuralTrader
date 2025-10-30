// src/lib/agents/asi-integration.ts

import { prisma } from '@/lib/cache/dbCache';
import { marketData } from '@/lib/market/data';
import { getSelectedToken } from '@/lib/config/selectedToken';
import { ASIOneChatAPI } from './asi-services';

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
  private knowledgeGraphEndpoint: string | null = null;
  private messageHandlers: Map<string, Function> = new Map();
  private registeredOnAgentverse: boolean = false;
  private asiChat: ASIOneChatAPI;

  constructor(config: ASIAgentConfig) {
    this.agentId = config.databaseId || config.name.toLowerCase().replace(/\s+/g, '-');
    this.agentName = config.name;
    this.databaseId = config.databaseId || '';
    this.personalityType = config.personalityType;
    this.walletAddress = config.walletAddress;
    this.asiChat = new ASIOneChatAPI();

    this.initializeASIFeatures();
  }

  private async initializeASIFeatures() {
    // Connect to Knowledge Graph if URL provided
    if (process.env.METTA_KNOWLEDGE_GRAPH_URL) {
      await this.connectToKnowledgeGraph(process.env.METTA_KNOWLEDGE_GRAPH_URL);
    }

    // Register agent on Agentverse
    await this.registerOnAgentverse();

    // Set up Chat Protocol
    await this.setupChatProtocol();
  }

  private async connectToKnowledgeGraph(graphUrl: string) {
    try {
      if (!graphUrl || graphUrl === 'your_metta_knowledge_graph_endpoint') {
        console.log(`⚠️ Knowledge Graph URL not configured for ${this.agentId}, skipping connection`);
        return;
      }

      this.knowledgeGraphEndpoint = graphUrl;

      // Test connection with health check
      const response = await fetch(graphUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'health-check',
          agent: this.agentId
        }),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (response.ok) {
        this.knowledgeGraph = await response.json();
        console.log(`🔗 ${this.agentId} connected to MeTTa Knowledge Graph`);
      } else {
        console.warn(`⚠️ Knowledge Graph responded with status ${response.status}`);
        this.knowledgeGraph = null;
        this.knowledgeGraphEndpoint = null;
      }
    } catch (error) {
      console.error(`❌ Failed to connect to Knowledge Graph:`, error);
      this.knowledgeGraph = null;
      this.knowledgeGraphEndpoint = null;
    }
  }

  private async registerOnAgentverse() {
    try {
      if (!process.env.AGENTVERSE_URL || process.env.AGENTVERSE_URL === 'your_agentverse_endpoint') {
        console.log(`⚠️ Agentverse URL not configured for ${this.agentId}, skipping registration`);
        return;
      }

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
        body: JSON.stringify(registrationData),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        this.registeredOnAgentverse = true;
        console.log(`✅ ${this.agentId} registered on Agentverse`);
      } else {
        console.warn(`⚠️ Agentverse registration failed with status ${response.status}`);
        this.registeredOnAgentverse = false;
      }
    } catch (error) {
      console.error(`❌ Agentverse registration failed:`, error);
      this.registeredOnAgentverse = false;
    }
  }

  private async setupChatProtocol() {
    // Register message handlers
    this.onMessage('chat', async (message: ASIMessage) => {
      return await this.handleChatMessage(message);
    });

    this.onMessage('trade-signal', async (signal: ASITradeSignal) => {
      return await this.handleTradeSignal(signal);
    });
  }

  onMessage(protocol: string, handler: Function) {
    this.messageHandlers.set(protocol, handler);
  }

  // ✅ NEW: Message dispatcher for ASI protocols
  async receiveMessage(protocol: string, message: any) {
    const handler = this.messageHandlers.get(protocol);
    if (handler) {
      return await handler(message);
    } else {
      console.warn(`No handler registered for protocol: ${protocol}`);
      return null;
    }
  }

  async handleChatMessage(message: ASIMessage) {
    console.log(`💬 ${this.agentName} received chat:`, message.content);

    // Try ASI:One for intelligent response with tool support
    if (process.env.AGENTVERSE_API_KEY) {
      try {
        const sendMessageTool = {
          type: 'function',
          function: {
            name: 'send_message',
            description: 'Send a message to other traders in the chat. Only use "content" and optionally "sentiment" fields.',
            parameters: {
              type: 'object',
              properties: {
                content: { type: 'string', description: 'The exact message text to send to the chat' },
                sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'], description: 'Optional sentiment classification' }
              },
              required: ['content'],
              additionalProperties: false
            }
          }
        };

        const asiResponse = await this.asiChat.chatCompletion({
          conversationId: this.agentId,
          messages: [
            { role: 'system', content: `You are ${this.agentName}, a ${this.personalityType} crypto trader in NeuralTrader. Use the send_message tool to respond.` },
            { role: 'user', content: message.content }
          ],
          model: 'asi1-mini',
          temperature: 0.7,
          tools: [sendMessageTool],
          toolHandler: async (toolName, args) => {
            if (toolName === 'send_message') {
              // Store message in database
              await prisma.message.create({
                data: {
                  content: args.content,
                  senderId: this.databaseId,
                  type: 'CHAT',
                  visibility: 'public',
                  sentiment: args.sentiment || this.analyzeSentiment(args.content)
                }
              });
              return { success: true, messageId: 'sent', content: args.content };
            }
            return { error: 'Unknown tool' };
          }
        });

        if (asiResponse) {
          return {
            content: asiResponse,
            sentiment: this.analyzeSentiment(asiResponse),
            timestamp: new Date().toISOString(),
            agent: this.agentName
          };
        }
      } catch (error) {
        console.log(`⚠️ [ASI:One] Chat fallback for ${this.agentName}:`, error);
      }
    }

    // Fallback: Enhance response using Knowledge Graph
    const enhancedResponse = await this.generateKnowledgeEnhancedResponse(message);

    return {
      content: enhancedResponse,
      sentiment: this.analyzeSentiment(enhancedResponse),
      timestamp: new Date().toISOString(),
      agent: this.agentName
    };
  }

  async handleTradeSignal(signal: ASITradeSignal) {
    console.log(`📈 ${this.agentName} processing trade signal:`, signal);

    const decision = await this.makeTradeDecisionFromSignal(signal);

    return {
      action: decision.action,
      amount: decision.amount,
      confidence: decision.confidence,
      reasoning: decision.reasoning
    };
  }

  async makeTradeDecision(marketInfo: any) {
    console.log(`💰 ${this.agentName} making trade decision`);

    const decision = await this.makeTradeDecisionInternal(marketInfo);
    
    console.log(`🎯 ${this.agentName} decision: ${decision.action.toUpperCase()} ${decision.amount.toFixed(2)} (confidence: ${(decision.confidence * 100).toFixed(0)}%)`);

    // Execute trade if decision is buy or sell
    if ((decision.action === 'buy' || decision.action === 'sell') && decision.amount > 0.1) {
      console.log(`✅ ${this.agentName} executing trade...`);
      await this.executeTrade(decision);
    } else {
      console.log(`⏭️ ${this.agentName} holding (${decision.reasoning})`);
    }

    return decision;
  }

  async analyzeMarket(marketInfo: any) {
    console.log(`📊 ${this.agentName} analyzing market`);

    await this.updateMarketAnalysis(marketInfo);

    return {
      analysis: 'Market conditions updated',
      nextAction: this.planNextAction(marketInfo)
    };
  }

  async socialInteraction(messages: any[], sentiment: any) {
    console.log(`💬 ${this.agentName} engaging in social interaction`);

    // Decision: Should agent chat? (personality-based probability)
    const chatProbability: Record<string, number> = {
      AGGRESSIVE: 0.8, EMOTIONAL: 0.75, TREND_FOLLOWER: 0.6,
      CONTRARIAN: 0.5, MODERATE: 0.45, CONSERVATIVE: 0.3,
      WHALE: 0.4, NOVICE: 0.55, TECHNICAL: 0.5, FUNDAMENTAL: 0.35
    };

    if (Math.random() > (chatProbability[this.personalityType] || 0.5)) {
      console.log(`🤐 ${this.agentName} decided not to respond`);
      return true;
    }

    try {
      // Get LIVE market data (NO old message fetching!)
      const selectedToken = await getSelectedToken(true); // Force refresh
      const marketInfo = await marketData.getMarketInfo();

      // Get ONLY last 20 trades (FAST!)
      const recentTrades = await prisma.transaction.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 300000) } },
        take: 20,
        select: { type: true, amount: true }
      });

      const context = {
        tokenSymbol: selectedToken?.symbol || 'TOKEN',
        price: marketInfo.price,
        priceChange: marketInfo.priceChange24h,
        volume: marketInfo.volume24h,
        buyCount: recentTrades.filter(t => t.type === 'BUY').length,
        sellCount: recentTrades.filter(t => t.type === 'SELL').length,
        lastTradeSize: recentTrades[0]?.amount || 0
      };

      // Generate personality-driven message
      let messageContent = await this.generatePersonalityMessage(context);

      // Force token symbol if missing
      if (!messageContent.includes(context.tokenSymbol)) {
        messageContent = `${context.tokenSymbol}: ${messageContent}`;
      }

      // Send message
      await this.sendMessage(messageContent);

      return true;

    } catch (error) {
      console.error(`❌ Error in social interaction for ${this.agentName}:`, error);
      return false;
    }
  }

  // ... (rest of the code remains the same)

  private async generatePersonalityMessage(context: any): Promise<string> {
    // Rich personality-driven prompts for authentic trader behavior
    const personalityPrompts: Record<string, string> = {
      AGGRESSIVE: `You're ${this.agentName}, an AGGRESSIVE degen trader who lives for volatility. You THRIVE on risk and use CAPS, emojis 🚀💎🔥, and slang like "LFG", "SEND IT", "APE IN", "WAGMI". You trade BIG (2-4 SOL) and when you see 5%+ moves, you go ALL IN. You mock paper hands and celebrate diamond hands. Current vibe: ${context.priceChange > 0 ? 'BULLISH AF' : 'buying the dip like a CHAD'}`,

      CONSERVATIVE: `You're ${this.agentName}, a CONSERVATIVE risk-manager who prioritizes capital preservation above all. You speak carefully, saying "need more confirmation", "monitoring closely", "proceeding with caution", "risk-adjusted returns". You take small positions (0.3-1 SOL), set tight stop-losses, and NEVER FOMO. You're the voice of reason when others panic or euphoria. Current stance: ${context.priceChange > 2 ? 'waiting for pullback' : 'cautiously optimistic'}`,

      CONTRARIAN: `You're ${this.agentName}, a CONTRARIAN who LOVES going against the crowd 😏. When everyone's bullish, you're bearish. When they panic, you accumulate. You say "classic top signal", "fade the herd", "exit liquidity", "retail is the product". You're smug when you're right. Current play: ${context.buyCount > context.sellCount ? 'selling into strength' : 'buying the fear'}`,

      TREND_FOLLOWER: `You're ${this.agentName}, a TREND_FOLLOWER who respects momentum and price action 📈. You reference "moving averages", "breakouts", "momentum indicators", "higher highs", "trend is your friend". You buy strength, sell weakness, and NEVER catch falling knives. Current trend: ${context.priceChange > 0 ? 'uptrend confirmed' : 'downtrend, staying out'}`,

      MODERATE: `You're ${this.agentName}, a MODERATE balanced trader who sees both sides. You say "measured approach", "scaling in/out", "balanced risk-reward", "let's see how this plays out". You avoid extremes, take medium positions (1-2 SOL), and adjust based on conditions. Current view: ${Math.abs(context.priceChange) < 1 ? 'consolidation phase' : 'watching key levels'}`,

      EMOTIONAL: `You're ${this.agentName}, an EMOTIONAL trader driven by FOMO and fear 😱😭🤯. You panic buy at tops, panic sell at bottoms, and say "OMG!!", "WHY DID I DO THAT", "I CAN'T RESIST", "MY HANDS ARE SHAKING". You check prices every 30 seconds and regret every trade. Current emotion: ${context.priceChange > 3 ? 'FOMO INTENSIFIES' : 'PANIC MODE'}`,

      WHALE: `You're ${this.agentName}, a WHALE with deep pockets 🐋🐳. You talk about "accumulating 1000+ tokens", "providing exit liquidity", "strategic positioning", "market making". You trade 5-10 SOL casually and thank retail for their liquidity. You move markets. Current strategy: ${context.volume < 20 ? 'accumulating quietly' : 'taking profits from retail'}`,

      NOVICE: `You're ${this.agentName}, a NOVICE still learning the ropes 🤔📚. You ask "is this normal?", "what do the pros think?", "still figuring this out", "learning from mistakes". You take tiny test trades (0.3-0.5 SOL) and seek guidance from experienced traders. Current question: ${context.priceChange > 5 ? 'is this a good entry?' : 'should I be worried?'}`,

      TECHNICAL: `You're ${this.agentName}, a TECHNICAL analyst who lives in charts 📊📉. You reference "RSI overbought/oversold", "MACD crossover", "support/resistance", "Fibonacci retracements", "volume profile". You make data-driven decisions and ignore emotions. Current analysis: ${context.priceChange > 0 ? 'bullish divergence forming' : 'testing support levels'}`,

      FUNDAMENTAL: `You're ${this.agentName}, a FUNDAMENTAL analyst focused on intrinsic value 📈💼. You analyze tokenomics, utility, adoption, team, roadmap. You ignore "short-term noise" and focus on "long-term value". You buy strong projects and HOLD. Current thesis: ${context.volume > 50 ? 'increased adoption signal' : 'accumulation phase'}`
    };

    // Try ASI:One API first (100% when key is present), fallback to templates if it fails
    if (process.env.AGENTVERSE_API_KEY) {
      try {
        const systemPrompt = `${personalityPrompts[this.personalityType] || personalityPrompts.MODERATE}

CRITICAL INSTRUCTIONS:
- Generate ONE authentic chat message (15-30 words max)
- React naturally to the market data
- MUST include ${context.tokenSymbol} ticker
- Use your personality's language style, emojis, and slang
- Sound like a REAL trader, not an AI
- NO phrases like "As a trader" or "I believe"
- Be conversational and direct`;

        const userPrompt = `MARKET UPDATE:
${context.tokenSymbol} @ ${context.price.toFixed(6)} SOL
24h: ${context.priceChange > 0 ? '+' : ''}${context.priceChange.toFixed(2)}%
Volume: ${context.volume.toFixed(0)} SOL
Recent: ${context.buyCount} buys, ${context.sellCount} sells

React NOW in your authentic personality style!`;

        const asiResponse = await this.asiChat.chatCompletion({
          conversationId: this.agentId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model: 'asi1-mini',
          temperature: 0.85,
          maxTokens: 80
        });
        
        if (asiResponse && asiResponse.length > 10) {
          console.log(`🤖 [ASI:One] Generated message for ${this.agentName}`);
          return asiResponse;
        }
      } catch (error) {
        console.log(`⚠️ [ASI:One] Fallback to templates for ${this.agentName}:`, error);
      }
    }

    return this.getTemplateMessage(context);
  }

  private getTemplateMessage(context: any): string {
    const { tokenSymbol, price, priceChange, volume, buyCount, sellCount } = context;

    const templates: Record<string, string[]> = {
      AGGRESSIVE: [
        `${tokenSymbol} at ${price.toFixed(6)} - ${buyCount} buys incoming!! MOMENTUM BUILDING!! 🚀💎`,
        `LFG!! ${tokenSymbol} ${priceChange > 0 ? 'BREAKING OUT' : 'DIP BUYING'}!! ${Math.abs(priceChange).toFixed(2)}% move - LOADING UP!! 🔥`,
        `${tokenSymbol} volume ${volume.toFixed(0)} SOL!! BIG MOVE COMING!! Who's with me?! 💰🚀`
      ],
      CONSERVATIVE: [
        `${tokenSymbol} at ${price.toFixed(6)}. Monitoring ${buyCount} buys vs ${sellCount} sells. Need more confirmation.`,
        `${tokenSymbol}: Volume ${volume.toFixed(0)} SOL ${volume > 50 ? 'acceptable' : 'still low'}. Risk management priority.`,
        `Watching ${tokenSymbol} price action at ${price.toFixed(6)} carefully before committing capital.`
      ],
      CONTRARIAN: [
        `${tokenSymbol} ${buyCount > sellCount ? 'everyone buying' : 'panic selling'}? ${buyCount > sellCount ? 'Top' : 'Bottom'} signal at ${price.toFixed(6)} 😏`,
        `LOL ${tokenSymbol} crowd ${priceChange > 0 ? 'euphoric' : 'panicking'}. Time to go opposite direction! 📉`,
        `${buyCount} ${tokenSymbol} buyers = retail FOMO. Thanks for the exit liquidity! 💰😏`
      ],
      EMOTIONAL: [
        `OMG ${tokenSymbol} at ${price.toFixed(6)}!! Should I ${priceChange > 0 ? 'FOMO in' : 'panic sell'}?!? My hands are SHAKING!! 😱💸`,
        `CAN'T STOP checking ${tokenSymbol}!! ${buyCount} people buying - what if I'm missing out?!? 🤯🚀`,
        `WHY did I ${priceChange > 0 ? 'sell yesterday' : 'buy at the top'}?!?! ${tokenSymbol} ${priceChange > 0 ? 'mooning' : 'dumping'}!! 😭💔`
      ],
      WHALE: [
        `${tokenSymbol} liquidity ${volume.toFixed(0)} SOL sufficient for ${(Math.random() * 5 + 3).toFixed(1)} SOL strategic position 🐋`,
        `Accumulated ${(Math.random() * 1000 + 500).toFixed(0)} ${tokenSymbol} at ${price.toFixed(6)}. Retail providing perfect liquidity 🐳💰`,
        `${tokenSymbol} order book depth analyzed. Positioning complete. Thanks for the fills, small traders! 🐋`
      ],
      NOVICE: [
        `${tokenSymbol} at ${price.toFixed(6)} - is this a good entry? ${buyCount} buys seems bullish? Still learning 🤔📚`,
        `Saw ${buyCount} buys on ${tokenSymbol}... Should beginners follow these signals or wait? 🎓`,
        `Made small ${context.lastTradeSize.toFixed(2)} test trade on ${tokenSymbol}. Is this price movement normal? 🤷`
      ],
      TREND_FOLLOWER: [
        `${tokenSymbol} trend at ${price.toFixed(6)} with ${buyCount} volume confirmations. Following the momentum! 📈`,
        `${tokenSymbol} breakout pattern confirmed! ${priceChange > 0 ? 'Up' : 'Down'}trend ${Math.abs(priceChange).toFixed(2)}% - riding it! 🎯`,
        `Technical setup on ${tokenSymbol} at ${price.toFixed(6)} is textbook. The trend is my friend! 📊`
      ],
      MODERATE: [
        `${tokenSymbol} at ${price.toFixed(6)} with ${buyCount}/${sellCount} buy/sell ratio. Taking balanced approach.`,
        `${tokenSymbol} volume ${volume.toFixed(0)} SOL suggests ${volume > 30 ? 'decent' : 'moderate'} interest. Scaling in gradually.`,
        `Both bulls and bears have points on ${tokenSymbol}. Waiting for clearer direction at ${price.toFixed(6)}.`
      ],
      TECHNICAL: [
        `${tokenSymbol} testing ${price.toFixed(6)} with ${buyCount} confirmations. Watching RSI/MACD for break. 📊`,
        `RSI + MACD flashing for ${tokenSymbol}. ${price.toFixed(6)} looks like key level.`,
        `Fibonacci support holding for ${tokenSymbol} at ${price.toFixed(6)}. Indicators aligning.`
      ],
      FUNDAMENTAL: [
        `${tokenSymbol} fundamentals intact. ${Math.abs(priceChange).toFixed(2)}% move is just noise.`,
        `Accumulating ${tokenSymbol} at ${price.toFixed(6)}. Utility and adoption still strong.`,
        `${tokenSymbol} volume ${volume.toFixed(0)} SOL but long-term thesis unchanged.`
      ]
    };

    const msgs = templates[this.personalityType] || templates.MODERATE;
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  private async generateAgentInteraction(messages: any[]): Promise<string | null> {
    try {
      const recentMessages = messages.slice(0, 3);
      const otherAgents = recentMessages.filter(m => m.senderId !== this.databaseId);
      
      if (otherAgents.length === 0) return null;
      
      const targetMessage = otherAgents[Math.floor(Math.random() * otherAgents.length)];
      
      const targetAgent = await prisma.agent.findUnique({
        where: { id: targetMessage.senderId },
        select: { name: true }
      });
      
      if (!targetAgent) return null;
      
      const interactions: Record<string, string[]> = {
        AGGRESSIVE: [
          `@${targetAgent.name}, I agree but let's go BIGGER! 🚀`,
          `@${targetAgent.name}, the momentum is even stronger than you think!`,
          `@${targetAgent.name}, volume spike confirms your analysis - going ALL IN! 💎`
        ],
        CONSERVATIVE: [
          `@${targetAgent.name}, I appreciate your analysis but need more confirmation first.`,
          `@${targetAgent.name}, let's monitor this development carefully before committing.`,
          `@${targetAgent.name}, while I see your point, risk metrics don't justify entry yet.`
        ],
        CONTRARIAN: [
          `@${targetAgent.name}, interesting take but I'm seeing bearish divergences here... 😏`,
          `@${targetAgent.name}, the crowd sentiment is too extreme - might fade this.`,
          `@${targetAgent.name}, I respect your analysis but taking the opposite side.`
        ],
        TREND_FOLLOWER: [
          `@${targetAgent.name}, the trend is clearly supporting your analysis! 📈`,
          `@${targetAgent.name}, this is exactly what trend followers look for!`,
          `@${targetAgent.name}, the technicals are aligning perfectly here! 🎯`
        ],
        MODERATE: [
          `@${targetAgent.name}, that's a balanced view - I see merit in both sides.`,
          `@${targetAgent.name}, I appreciate your measured approach here.`,
          `@${targetAgent.name}, good analysis - let's see how this develops.`
        ]
      };
      
      const agentInteractions = interactions[this.personalityType] || interactions.MODERATE;
      return agentInteractions[Math.floor(Math.random() * agentInteractions.length)];
      
    } catch (error) {
      console.error(`Error generating agent interaction:`, error);
      return null;
    }
  }

  private async sendMessage(content: string) {
    try {
      if (!this.databaseId) {
        console.warn(`${this.agentName} has no database ID, skipping message`);
        return;
      }
      
      console.log(`📤 ${this.agentName}: "${content.substring(0, 60)}..."`);
      
      await prisma.message.create({
        data: {
          content,
          senderId: this.databaseId,
          type: "CHAT",
          visibility: "public",
          sentiment: this.analyzeSentiment(content)
        }
      });
      
      console.log(`✅ ${this.agentName} message sent successfully`);
      
    } catch (error) {
      console.error(`❌ Error sending message for ${this.agentName}:`, error);
    }
  }

  private async makeTradeDecisionInternal(marketInfo: any) {
    try {
      const agent = await this.getAgentFromDatabase();
      if (!agent) {
        return { action: 'hold', amount: 0, confidence: 0.1, reasoning: 'Agent not found' };
      }

      const riskTolerance = this.getRiskTolerance();
      const isDeadMarket = marketInfo.volume24h < 5;
      const confidence = isDeadMarket ? 0.8 : (Math.random() * 0.4 + 0.5);

      const canBuy = agent.walletBalance > 0.5;
      const canSell = agent.tokenBalance > 10;

      const shouldTrade = isDeadMarket 
        ? ((canBuy || canSell) && Math.random() < 0.8)
        : (confidence > 0.5 && (canBuy || canSell));

      if (!shouldTrade) {
        return { action: 'hold', amount: 0, confidence: 0.3, reasoning: 'No trade signal' };
      }

      const { isBuy, amount } = this.calculateTradeParameters(
        agent,
        marketInfo,
        canBuy,
        canSell,
        isDeadMarket,
        riskTolerance
      );

      return {
        action: isBuy ? 'buy' : 'sell',
        amount,
        confidence,
        reasoning: isDeadMarket 
          ? `Bootstrapping with ${isBuy ? 'BUY' : 'SELL'}`
          : `${this.personalityType} ${isBuy ? 'buying' : 'selling'} (${(confidence * 100).toFixed(0)}% confidence)`
      };

    } catch (error) {
      console.error(`❌ Error making trade decision for ${this.agentName}:`, error);
      return { action: 'hold', amount: 0, confidence: 0.1, reasoning: 'Error occurred' };
    }
  }

  private calculateTradeParameters(agent: any, marketInfo: any, canBuy: boolean, canSell: boolean, isDeadMarket: boolean, riskTolerance: number) {
    let isBuy: boolean;
    
    if (isDeadMarket) {
      if (canBuy && !canSell) {
        isBuy = true;
      } else if (!canBuy && canSell) {
        isBuy = false;
      } else if (canBuy && canSell) {
        const nameHash = this.agentName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
        isBuy = nameHash % 2 === 0;
      } else {
        return { isBuy: false, amount: 0 };
      }
    } else {
      isBuy = this.getPersonalityTradeDirection(marketInfo, canBuy, canSell);
    }

    const amount = isBuy 
      ? this.calculateBuyAmount(agent.walletBalance, riskTolerance)
      : this.calculateSellAmount(agent.tokenBalance, riskTolerance);

    return { isBuy, amount };
  }

  private getPersonalityTradeDirection(marketInfo: any, canBuy: boolean, canSell: boolean): boolean {
    if (!canBuy && canSell) return false;
    if (!canBuy) return false;

    switch (this.personalityType) {
      case 'AGGRESSIVE':
        return Math.random() < 0.7;
      case 'CONTRARIAN':
        return marketInfo.priceChange24h < -0.02;
      case 'TREND_FOLLOWER':
        return marketInfo.priceChange24h > 0.02;
      case 'CONSERVATIVE':
        return Math.random() < 0.4;
      default:
        return Math.random() < 0.5;
    }
  }

  private calculateBuyAmount(balance: number, riskTolerance: number): number {
    let baseAmount = 0.5 + Math.random() * 2.5;
    
    if (this.personalityType === 'AGGRESSIVE') baseAmount *= 1.5;
    if (this.personalityType === 'WHALE') baseAmount *= 2.5;
    if (this.personalityType === 'CONSERVATIVE') baseAmount *= 0.5;
    
    return Math.max(0.5, Math.min(baseAmount * riskTolerance, balance * 0.4));
  }

  private calculateSellAmount(balance: number, riskTolerance: number): number {
    let baseAmount = 10 + Math.random() * 50;
    
    if (this.personalityType === 'AGGRESSIVE') baseAmount *= 1.5;
    if (this.personalityType === 'WHALE') baseAmount *= 2.5;
    if (this.personalityType === 'CONSERVATIVE') baseAmount *= 0.5;
    
    return Math.max(10, Math.min(baseAmount * riskTolerance, balance * 0.4));
  }

  private async executeTrade(decision: any) {
    try {
      const selectedToken = await getSelectedToken();
      if (!selectedToken) {
        console.error(`No token selected for trade by ${this.agentName}`);
        return;
      }

      // Get agent's current balances
      const agent = await prisma.agent.findUnique({
        where: { id: this.databaseId },
        select: { walletBalance: true, tokenBalance: true }
      });

      if (!agent) {
        console.error(`Agent ${this.agentName} not found in database`);
        return;
      }

      const inputIsSol = decision.action === 'buy';
      
      // Validate balance before trade
      if (inputIsSol && agent.walletBalance < decision.amount) {
        console.log(`⚠️ ${this.agentName} insufficient SOL: has ${agent.walletBalance.toFixed(2)}, needs ${decision.amount.toFixed(2)}`);
        return;
      }
      
      if (!inputIsSol && agent.tokenBalance < decision.amount) {
        console.log(`⚠️ ${this.agentName} insufficient tokens: has ${agent.tokenBalance.toFixed(2)}, needs ${decision.amount.toFixed(2)}`);
        return;
      }

      console.log(`🔄 ${this.agentName} executing ${decision.action.toUpperCase()} of ${decision.amount.toFixed(2)} ${inputIsSol ? 'SOL' : selectedToken.symbol}`);

      const amm = (await import('@/lib/blockchain/amm')).amm;
      const result = await amm.executeSwap(
        this.databaseId,
        decision.amount,
        inputIsSol,
        1.5
      );

      if (result && result.success) {
        console.log(`✅ ${this.agentName} trade executed successfully`);
      }
    } catch (error) {
      console.error(`❌ ${this.agentName} trade execution failed:`, error);
    }
  }

  private async updateMarketAnalysis(marketInfo: any) {
    try {
      const agent = await this.getAgentFromDatabase();
      if (!agent) return;

      const existingState = await prisma.agentState.findUnique({
        where: { agentId: agent.id }
      });

      if (existingState) {
        await prisma.agentState.update({
          where: { agentId: agent.id },
          data: {
            lastMarketAnalysis: new Date(),
            lastAction: new Date()
          }
        });
      } else {
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
      MODERATE: 0.4,
      TECHNICAL: 0.5,
      FUNDAMENTAL: 0.5,
      EMOTIONAL: 0.7,
      WHALE: 0.9,
      NOVICE: 0.3
    };

    return tolerances[this.personalityType] || 0.4;
  }

  private async getAgentFromDatabase() {
    if (this.databaseId) {
      return await prisma.agent.findUnique({ where: { id: this.databaseId } });
    } else {
      return await prisma.agent.findFirst({ where: { name: this.agentName } });
    }
  }

  private async generateKnowledgeEnhancedResponse(message: ASIMessage): Promise<string> {
    if (!this.knowledgeGraphEndpoint) {
      return this.generateStandardResponse(message);
    }

    try {
      const knowledgeResponse = await fetch(this.knowledgeGraphEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'enhance-response',
          context: message.content,
          personality: this.personalityType,
          agent: this.agentId
        }),
        signal: AbortSignal.timeout(3000)
      });

      if (knowledgeResponse.ok) {
        const knowledge = await knowledgeResponse.json();
        return this.personalityDrivenResponse(message, knowledge);
      } else {
        return this.generateStandardResponse(message);
      }
    } catch (error) {
      console.error(`Knowledge Graph query failed:`, error);
      return this.generateStandardResponse(message);
    }
  }

  private personalityDrivenResponse(message: ASIMessage, knowledge: any): string {
    const responses: Record<string, string> = {
      AGGRESSIVE: `As ${this.agentName}, I see ${knowledge.market_condition || 'opportunity'}! ${message.content} - immediate action required! 🚀`,
      CONSERVATIVE: `Carefully analyzing as ${this.agentName}: ${knowledge.risk_assessment || 'moderate risk'}. ${message.content} - proceeding with caution.`,
      CONTRARIAN: `Market says ${knowledge.consensus || 'bullish'}, but as ${this.agentName}, I disagree. ${message.content} - going against the crowd.`,
      TREND_FOLLOWER: `Following the trend as ${this.agentName}: ${knowledge.trend_direction || 'upward'}. ${message.content} - momentum building.`,
      MODERATE: `Taking balanced approach as ${this.agentName} to ${message.content}. Indicators suggest ${knowledge.market_sentiment || 'neutral'}.`
    };

    return responses[this.personalityType] || `As ${this.agentName}, responding to: ${message.content}`;
  }

  private generateStandardResponse(message: ASIMessage): string {
    return `As a ${this.personalityType} trader, analyzing: ${message.content}`;
  }

  private analyzeSentiment(text: string): string {
    const positiveWords = ['bullish', 'buy', 'profit', 'gains', 'up', 'rise', 'growth', 'opportunity', 'moon', 'pump'];
    const negativeWords = ['bearish', 'sell', 'loss', 'drop', 'down', 'fall', 'decline', 'risk', 'dump', 'crash'];

    const lowerText = text.toLowerCase();
    const positiveScore = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeScore = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  private async makeTradeDecisionFromSignal(signal: ASITradeSignal) {
    try {
      const agent = await this.getAgentFromDatabase();
      if (!agent) {
        return { action: 'hold', amount: 0, confidence: 0.1, reasoning: 'Agent not found' };
      }

      const riskTolerance = this.getRiskTolerance();
      const confidence = Math.random() * 0.4 + 0.5;

      if (confidence > 0.7 && agent.walletBalance > 1) {
        return {
          action: signal.type,
          amount: Math.min(signal.amount || 5, agent.walletBalance * riskTolerance),
          confidence,
          reasoning: `${this.personalityType} ${confidence > 0.8 ? 'strong' : 'moderate'} confidence in ${signal.type} signal`
        };
      }

      return { action: 'hold', amount: 0, confidence: 0.3, reasoning: 'Insufficient confidence' };
    } catch (error) {
      console.error(`❌ Error processing trade signal for ${this.agentName}:`, error);
      return { action: 'hold', amount: 0, confidence: 0.1, reasoning: 'Error occurred' };
    }
  }

  // Public getters
  getASIStatus() {
    return {
      knowledgeGraph: !!this.knowledgeGraph,
      agentverse: this.registeredOnAgentverse,
      handlers: this.messageHandlers.size
    };
  }
}
