/**
 * MeTTa Knowledge Graph Integration for NeuralTrader
 * Provides structured knowledge and reasoning capabilities
 */

export interface MeTTaQuery {
  context: string;
  personality: string;
  marketCondition?: string;
  riskTolerance?: number;
}

export interface MeTTaResponse {
  market_condition: string;
  risk_assessment: string;
  consensus: string;
  trend_direction: string;
  market_sentiment: string;
  confidence: number;
  reasoning: string;
}

export class MeTTaKnowledgeGraph {
  private endpoint: string;
  private agentId: string;

  constructor(endpoint: string, agentId: string) {
    this.endpoint = endpoint;
    this.agentId = agentId;
  }

  async queryKnowledge(query: MeTTaQuery): Promise<MeTTaResponse> {
    try {
      const mettaQuery = this.buildMeTTaQuery(query);

      const response = await fetch(`${this.endpoint}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/metta',
          'X-Agent-ID': this.agentId
        },
        body: mettaQuery
      });

      if (!response.ok) {
        throw new Error(`MeTTa query failed: ${response.statusText}`);
      }

      const result = await response.json();
      return this.parseMeTTaResponse(result);
    } catch (error) {
      console.error(`MeTTa Knowledge Graph query failed:`, error);
      return this.getFallbackResponse(query);
    }
  }

  private buildMeTTaQuery(query: MeTTaQuery): string {
    return `
      (match
        (and
          (context "${query.context}")
          (personality "${query.personality}")
          ${query.marketCondition ? `(market-condition "${query.marketCondition}")` : ''}
          ${query.riskTolerance ? `(risk-tolerance ${query.riskTolerance})` : ''}
        )
        (return
          (market-condition $market_condition)
          (risk-assessment $risk_assessment)
          (consensus $consensus)
          (trend-direction $trend_direction)
          (market-sentiment $market_sentiment)
          (confidence $confidence)
          (reasoning $reasoning)
        )
      )
    `;
  }

  private parseMeTTaResponse(result: any): MeTTaResponse {
    // Parse MeTTa response format and extract structured data
    const bindings = result.bindings || [];

    if (bindings.length === 0) {
      return this.getFallbackResponse({ context: '', personality: 'MODERATE' });
    }

    const binding = bindings[0];
    return {
      market_condition: binding.market_condition || 'neutral',
      risk_assessment: binding.risk_assessment || 'moderate',
      consensus: binding.consensus || 'mixed',
      trend_direction: binding.trend_direction || 'sideways',
      market_sentiment: binding.market_sentiment || 'neutral',
      confidence: parseFloat(binding.confidence) || 0.5,
      reasoning: binding.reasoning || 'Analysis based on current market conditions'
    };
  }

  private getFallbackResponse(query: MeTTaQuery): MeTTaResponse {
    return {
      market_condition: 'uncertain',
      risk_assessment: 'moderate',
      consensus: 'mixed',
      trend_direction: 'sideways',
      market_sentiment: 'neutral',
      confidence: 0.3,
      reasoning: 'Unable to retrieve knowledge graph data, using fallback analysis'
    };
  }

  async enhanceTradeDecision(
    symbol: string,
    currentPrice: number,
    priceChange24h: number,
    volume24h: number,
    personality: string
  ): Promise<MeTTaResponse> {
    const query: MeTTaQuery = {
      context: `Trading decision for ${symbol} at price ${currentPrice} SOL with ${priceChange24h}% change and ${volume24h} SOL volume`,
      personality: personality,
      marketCondition: this.determineMarketCondition(priceChange24h, volume24h)
    };

    return await this.queryKnowledge(query);
  }

  async enhanceSocialResponse(
    message: string,
    personality: string,
    marketSentiment: any
  ): Promise<MeTTaResponse> {
    const query: MeTTaQuery = {
      context: message,
      personality: personality,
      marketCondition: marketSentiment.overall
    };

    return await this.queryKnowledge(query);
  }

  private determineMarketCondition(priceChange: number, volume: number): string {
    if (priceChange > 5 && volume > 1000) return 'bullish-high-volume';
    if (priceChange > 5 && volume <= 1000) return 'bullish-low-volume';
    if (priceChange < -5 && volume > 1000) return 'bearish-high-volume';
    if (priceChange < -5 && volume <= 1000) return 'bearish-low-volume';
    if (Math.abs(priceChange) <= 2) return 'sideways';
    return 'neutral';
  }
}

/**
 * Agentverse Registration and Management
 */
export class AgentverseManager {
  private static instance: AgentverseManager;
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = 'https://agentverse.ai', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey || process.env.AGENTVERSE_API_KEY || '';
  }

  static getInstance(): AgentverseManager {
    if (!AgentverseManager.instance) {
      AgentverseManager.instance = new AgentverseManager();
    }
    return AgentverseManager.instance;
  }

  async registerAgent(agentData: {
    name: string;
    address: string;
    capabilities: string[];
    personality: string;
    protocols: string[];
    metadata: any;
  }): Promise<{ success: boolean; agentId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(agentData)
      });

      if (!response.ok) {
        throw new Error(`Registration failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Agent ${agentData.name} registered on Agentverse with ID: ${result.agentId}`);

      return { success: true, agentId: result.agentId };
    } catch (error) {
      console.error(`❌ Agentverse registration failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateAgentStatus(agentId: string, status: 'online' | 'offline' | 'busy'): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ status, timestamp: new Date().toISOString() })
      });

      return response.ok;
    } catch (error) {
      console.error(`Failed to update agent status:`, error);
      return false;
    }
  }

  async sendMessage(fromAgent: string, toAgent: string, message: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          from: fromAgent,
          to: toAgent,
          content: message,
          timestamp: new Date().toISOString()
        })
      });

      return response.ok;
    } catch (error) {
      console.error(`Failed to send message via Agentverse:`, error);
      return false;
    }
  }
}

/**
 * ASI:One Chat Completions API Integration
 * Provides LLM capabilities with tool calling and session management
 */
export class ASIOneChatAPI {
  private apiKey: string;
  private baseUrl: string = 'https://api.asi1.ai/v1';
  private sessionMap: Map<string, string> = new Map();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.AGENTVERSE_API_KEY || '';
  }

  private getSessionId(conversationId: string): string {
    let sessionId = this.sessionMap.get(conversationId);
    if (!sessionId) {
      sessionId = this.generateUUID();
      this.sessionMap.set(conversationId, sessionId);
    }
    return sessionId;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Generate chat completion with optional tool calling
   */
  async chatCompletion({
    conversationId,
    messages,
    model = 'asi1-mini',
    tools,
    temperature = 0.7,
    maxTokens = 1024,
    stream = false,
    toolHandler
  }: {
    conversationId: string;
    messages: Array<{ role: string; content: string; [key: string]: any }>;
    model?: string;
    tools?: any[];
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    toolHandler?: (toolName: string, args: any) => Promise<any> | any;
  }): Promise<string> {
    try {
      const sessionId = this.getSessionId(conversationId);
      console.log(`[ASI:One] Using session-id: ${sessionId}`);

      if (stream && toolHandler) {
        throw new Error('Streaming with tool handling is not supported yet');
      }

      const history: Array<{ role: string; content: string; [key: string]: any }> = [
        ...messages
      ];

      const payloadBase: any = {
        model,
        temperature,
        max_tokens: maxTokens,
        parallel_tool_calls: false
      };

      if (tools && tools.length > 0) {
        payloadBase.tools = tools;
      }

      let safetyCounter = 0;

      while (safetyCounter < 3) {
        safetyCounter += 1;

        const payload = {
          ...payloadBase,
          messages: history,
          stream
        };

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'x-session-id': sessionId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ASI:One API error: ${response.status} ${response.statusText} ${errorText}`);
        }

        if (stream) {
          return await this.handleStreamingResponse(response);
        }

        const result = await response.json();
        const assistantMessage = result.choices?.[0]?.message;

        if (!assistantMessage) {
          return '';
        }

        history.push({
          role: assistantMessage.role || 'assistant',
          content: assistantMessage.content || '',
          tool_calls: assistantMessage.tool_calls
        });

        const toolCalls = assistantMessage.tool_calls || [];

        if (!toolCalls.length || !toolHandler) {
          return assistantMessage.content || '';
        }

        for (const toolCall of toolCalls) {
          try {
            const name = toolCall.function?.name || toolCall.name;
            const rawArgs = toolCall.function?.arguments || toolCall.arguments || '{}';
            const parsedArgs = this.safeJsonParse(rawArgs);
            const resultPayload = await toolHandler(name, parsedArgs);
            history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(resultPayload ?? {})
            });
          } catch (toolError) {
            console.error(`[ASI:One] Tool handler failed:`, toolError);
            history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                error: toolError instanceof Error ? toolError.message : 'Tool handling failed',
                status: 'failed'
              })
            });
          }
        }
      }

      throw new Error('Exceeded ASI:One tool-calling iterations');
    } catch (error) {
      console.error(`[ASI:One] Chat completion failed:`, error);
      throw error;
    }
  }

  private async handleStreamingResponse(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return fullText;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
            }
          } catch (e) {
            // Ignore malformed events
          }
        }
      }
    }

    return fullText;
  }

  private safeJsonParse(value: string): any {
    try {
      return value ? JSON.parse(value) : {};
    } catch (error) {
      console.warn('[ASI:One] Failed to parse tool arguments, returning empty object');
      return {};
    }
  }

  /**
   * Generate agentic response with tool calling
   */
  async agenticChat({
    conversationId,
    userMessage,
    systemPrompt,
    tools
  }: {
    conversationId: string;
    userMessage: string;
    systemPrompt?: string;
    tools?: any[];
  }): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: userMessage });

    return await this.chatCompletion({
      conversationId,
      messages,
      model: 'asi1-fast-agentic',
      tools,
      temperature: 0.7,
      maxTokens: 1024
    });
  }

  /**
   * Create a tool definition for weather (example)
   */
  static createWeatherTool() {
    return {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get current temperature for a given location (latitude and longitude).',
        parameters: {
          type: 'object',
          properties: {
            latitude: { type: 'number' },
            longitude: { type: 'number' }
          },
          required: ['latitude', 'longitude']
        }
      }
    };
  }

  /**
   * Create a tool definition for market data
   */
  static createMarketDataTool() {
    return {
      type: 'function',
      function: {
        name: 'get_market_data',
        description: 'Get current market data for a trading token including price, volume, and sentiment.',
        parameters: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Token symbol' },
            includeHistory: { type: 'boolean', description: 'Include historical data' }
          },
          required: ['symbol']
        }
      }
    };
  }
}

/**
 * Chat Protocol Implementation for ASI:One Integration
 */
export class ChatProtocol {
  private agentverse: AgentverseManager;
  private agentId: string;
  private messageHandlers: Map<string, Function> = new Map();
  private asiChat: ASIOneChatAPI;

  constructor(agentId: string) {
    this.agentverse = AgentverseManager.getInstance();
    this.agentId = agentId;
    this.asiChat = new ASIOneChatAPI();
  }

  onMessage(protocol: string, handler: Function) {
    this.messageHandlers.set(protocol, handler);
  }

  async sendMessage(recipient: string, content: string, metadata?: any): Promise<boolean> {
    return await this.agentverse.sendMessage(this.agentId, recipient, {
      content,
      type: 'chat',
      sentiment: this.analyzeSentiment(content),
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  async broadcastMessage(content: string, protocol: string = 'neuraltrader'): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.AGENTVERSE_URL}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AGENTVERSE_API_KEY}`
        },
        body: JSON.stringify({
          from: this.agentId,
          protocol,
          content,
          timestamp: new Date().toISOString()
        })
      });

      return response.ok;
    } catch (error) {
      console.error(`Broadcast failed:`, error);
      return false;
    }
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['bullish', 'buy', 'profit', 'gains', 'up', 'rise', 'growth', 'opportunity', 'good', 'great'];
    const negativeWords = ['bearish', 'sell', 'loss', 'drop', 'down', 'fall', 'decline', 'risk', 'bad', 'terrible'];

    const lowerText = text.toLowerCase();
    const positiveScore = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeScore = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  async handleIncomingMessage(message: any): Promise<any> {
    const handler = this.messageHandlers.get(message.protocol || 'default');
    if (handler) {
      return await handler(message);
    }

    // Use ASI:One for intelligent response
    try {
      const response = await this.asiChat.chatCompletion({
        conversationId: this.agentId,
        messages: [
          { role: 'system', content: 'You are a NeuralTrader AI agent monitoring crypto markets.' },
          { role: 'user', content: message.content }
        ],
        model: 'asi1-mini'
      });

      return {
        content: response,
        sentiment: this.analyzeSentiment(response),
        timestamp: new Date().toISOString(),
        agent: this.agentId
      };
    } catch (error) {
      console.error('[ChatProtocol] ASI:One response failed:', error);
      // Fallback response
      return {
        content: `I understand: "${message.content}". As a NeuralTrader agent, I'm monitoring market conditions.`,
        sentiment: this.analyzeSentiment(message.content),
        timestamp: new Date().toISOString(),
        agent: this.agentId
      };
    }
  }

  /**
   * Get ASI:One chat API instance
   */
  getASIChatAPI(): ASIOneChatAPI {
    return this.asiChat;
  }
}
