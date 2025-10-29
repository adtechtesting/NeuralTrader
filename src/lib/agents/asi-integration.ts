// src/lib/agents/asi-integration.ts

import { prisma } from '@/lib/cache/dbCache';
import { marketData } from '@/lib/market/data';
import { getSelectedToken } from '@/lib/config/selectedToken';

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

  constructor(config: ASIAgentConfig) {
    this.agentId = config.databaseId || config.name.toLowerCase().replace(/\s+/g, '-');
    this.agentName = config.name;
    this.databaseId = config.databaseId || '';
    this.personalityType = config.personalityType;
    this.walletAddress = config.walletAddress;

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

    // Enhance response using Knowledge Graph
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

    // Execute trade if decision is buy or sell
    if ((decision.action === 'buy' || decision.action === 'sell') && decision.amount > 0.1) {
      await this.executeTrade(decision);
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
    // Personality prompts for LLM (kept for future use, templates handle most responses)
    const personalityPrompts: Record<string, string> = {
      AGGRESSIVE: `You are an AGGRESSIVE crypto trader. THRIVE on volatility, use CAPS and 🚀💎. Say "LFG!!", "SEND IT", "APE IN". Trade large (2-4 SOL). When price moves 5%+, go ALL IN!`,

      CONSERVATIVE: `You are CONSERVATIVE risk-averse. Prioritize capital preservation, say "need confirmation", "monitoring closely", "proceeding with caution". Small positions (0.3-1 SOL).`,

      CONTRARIAN: `You are CONTRARIAN - go AGAINST the crowd. When everyone's bullish, you're bearish 😏. Say "classic top signal", "fade the herd", "exit liquidity". LOVE being different.`,

      TREND_FOLLOWER: `You are TREND_FOLLOWER who respects momentum. Follow the trend, reference "moving averages", "breakouts", "momentum indicators" 📈. Buy up, sell down.`,

      MODERATE: `You are MODERATE balanced trader. See both sides, say "measured approach", "scaling in", "balanced risk-reward". Avoid extremes. Medium positions (1-2 SOL).`,

      EMOTIONAL: `You are EMOTIONAL panic trader. FOMO at tops, panic sell at bottoms. Say "OMG!!", "WHY DID I...", "I CAN'T RESIST!" 😱😭🤯. Check prices every 30 seconds.`,

      WHALE: `You are WHALE with deep pockets. Talk about "accumulating 1000+ tokens", "exit liquidity", "strategic positioning" 🐋🐳. Trade 5-10 SOL. Thank retail for liquidity.`,

      NOVICE: `You are NOVICE learning to trade. Ask "is this normal?", "what do pros think?", "still learning" 🤔📚. Small test trades (0.3-0.5 SOL). Seek guidance.`,

      TECHNICAL: `You are TECHNICAL analyst. Reference "RSI", "MACD", "support/resistance", "Fibonacci" 📊. Analyze patterns, data-driven decisions.`,

      FUNDAMENTAL: `You are FUNDAMENTAL analyst. Focus on tokenomics, utility, adoption. Ignore "short-term noise", analyze "long-term value". Buy strong projects, hold.`
    };

    const prompt = `${personalityPrompts[this.personalityType] || personalityPrompts.MODERATE}

MARKET DATA:
- Token: ${context.tokenSymbol}
- Price: ${context.price.toFixed(6)} SOL
- 24h Change: ${context.priceChange > 0 ? '+' : ''}${context.priceChange.toFixed(2)}%
- Volume: ${context.volume.toFixed(0)} SOL
- Activity: ${context.buyCount} buys, ${context.sellCount} sells

Generate ONE natural chat message (1-2 sentences) reacting to this data in your personality style.
MUST mention ${context.tokenSymbol}!
Use personality traits and emojis.
NO generic "As a trader" phrases!`;

    // LLM generation disabled for now - using fast templates (ensures <100ms response)

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

      const inputIsSol = decision.action === 'buy';
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
