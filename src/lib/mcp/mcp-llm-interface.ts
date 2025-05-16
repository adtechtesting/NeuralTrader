import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getMcpServer, initMcpServer } from "./mcp-server";


export class McpLLMInterface {
  private mcpServerPort = process.env.MCP_SERVER_PORT 
    ? parseInt(process.env.MCP_SERVER_PORT, 10) 
    : 3030;
  private initialized = false;
  private fallbackResponses: Map<string, string> = new Map();
  private maxRetries = 2;
  private retryDelay = 1000; 
  

  private mockResponses = {
    market: "The current market shows interesting trading patterns with moderate volume. I'm monitoring key indicators for potential entry or exit points.",
    trade: "Based on my analysis, I'll maintain my current position for now, but I'm watching closely for signals to adjust my strategy.",
    social: "Interesting perspectives from other traders. I'm considering their insights alongside my own analysis.",
    default: "I've analyzed the information and have formulated a strategic approach based on my trading style."
  };
  
  /**
   * Initialize the MCP server if not already initialized
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      try {
  
        getMcpServer();
        this.initialized = true;
      } catch (error) {
    
        console.log("Starting MCP server...");
        await initMcpServer(this.mcpServerPort);
        this.initialized = true;
      }
    } catch (error) {
      console.error("Failed to initialize MCP server:", error);
      console.log("Using offline mock mode for LLM responses");
      this.initialized = true; 
    }
  }
  
  
  async generateResponse(systemPrompt: string, userPrompt: string, modelOptions: { model?: string; temperature?: number; [key: string]: any } = {}) {
    await this.initialize();
    

    const cacheKey = this.createCacheKey(systemPrompt, userPrompt);

    const fallbackResponse = this.fallbackResponses.get(cacheKey);
    

    let retries = 0;
    
    while (retries <= this.maxRetries) {
      try {

        try {
          const response = await fetch(`http://localhost:${this.mcpServerPort}/simple-completion`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              system: systemPrompt,
              user: userPrompt,
              model: "mock-llm",
              temperature: 0.7
            }),
          });
          
    
          if (response.ok) {
            const result = await response.json();
            const completion = result.completion || "No response from MCP server";

            this.fallbackResponses.set(cacheKey, completion);
            
            return completion;
          }

          throw new Error(`MCP server responded with ${response.status}`);
        } catch (error) {

          console.log("Generating local mock response");
          const mockResponse = this.generateMockResponse(systemPrompt, userPrompt);
          

          this.fallbackResponses.set(cacheKey, mockResponse);
          
          return mockResponse;
        }
      } catch (error) {
      
        if (retries === this.maxRetries || !this.isRetryableError(error)) {
          console.error("Error generating response:", error);
          
         
          if (fallbackResponse) {
            console.log("Using fallback response due to error");
            return `[FALLBACK] ${fallbackResponse}`;
          }
          

          const mockResponse = this.generateMockResponse(systemPrompt, userPrompt);
          return `[GENERATED] ${mockResponse}`;
        }
        
     
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retries + 1)));
        retries++;
      }
    }

    return fallbackResponse || this.generateMockResponse(systemPrompt, userPrompt);
  }
  
  /**
   * Generate a mock response based on prompt content
   */
  private generateMockResponse(systemPrompt: string, userPrompt: string): string {
    const combinedPrompt = (systemPrompt + " " + userPrompt).toLowerCase();
    
    if (combinedPrompt.includes('aggressive') && combinedPrompt.includes('trader')) {
      return "As an aggressive trader, I see significant opportunity in the current market conditions. I'm looking to capitalize on the volatility.";
    }
    
    if (combinedPrompt.includes('conservative') && combinedPrompt.includes('trader')) {
      return "Taking a conservative approach, I'm focused on capital preservation while seeking steady, low-risk opportunities.";
    }
    
    if (combinedPrompt.includes('market') && combinedPrompt.includes('analysis')) {
      return this.mockResponses.market;
    }
    
    if (combinedPrompt.includes('trade') || combinedPrompt.includes('decision')) {
      return this.mockResponses.trade;
    }
    
    if (combinedPrompt.includes('message') || combinedPrompt.includes('social')) {
      return this.mockResponses.social;
    }
    
    return this.mockResponses.default;
  }
  
  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    return (
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('network')
    );
  }
  
  /**
   * Create a cache key from prompts
   */
  private createCacheKey(systemPrompt: string, userPrompt: string): string {
    // Create a simple hash of the prompts
    const combinedPrompt = `${systemPrompt}:${userPrompt}`;
    let hash = 0;
    for (let i = 0; i < combinedPrompt.length; i++) {
      const char = combinedPrompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `prompt_${hash}`;
  }
  
  /**
   * LangChain-compatible invoke method to handle message arrays
   */
  async invoke(input: { messages: any[] }) {
    await this.initialize();
    
    try {
      // Extract system and user messages
      let systemContent = "";
      let userContent = "";
      
      for (const msg of input.messages) {
        if (msg instanceof SystemMessage) {
          systemContent = msg.content as string;
        } else if (msg instanceof HumanMessage) {
          userContent += (userContent ? "\n\n" : "") + (msg.content as string);
        }
      }
      
      // Generate response using the extracted messages
      const response = await this.generateResponse(systemContent, userContent);
      return response;
    } catch (error) {
      console.error("Error invoking LLM:", error);
      
      // Generate a simple fallback response
      return "I'm analyzing the market data and will provide insights shortly.";
    }
  }
}