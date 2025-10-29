
import express, { Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import cors from "cors";
import { createServer } from "http";


const transports: { [sessionId: string]: SSEServerTransport } = {};
let app: express.Express | null = null;
let serverInstance: any = null;
let httpServer: any = null;


interface McpServerReturn {
  app: express.Express;
  agent: any;
}

/**
 * Validate required environment variables for the MCP server
 * @returns {boolean} True if all required variables are present, false if using fallbacks
 */
function validateEnvironment() {
  const requiredEnvVars = {
    SOLANA_PRIVATE_KEY: process.env.SOLANA_PRIVATE_KEY,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missingVars.join(", ")}`);
    console.warn("Please add them to your .env file or set them in your environment");
    
  
    const isDevelopment = process.env.NODE_ENV !== "production";
    if (isDevelopment) {
      console.log("Using development fallbacks for missing environment variables");
      
      if (!process.env.NEXT_PUBLIC_RPC_URL) {
        process.env.NEXT_PUBLIC_RPC_URL = "http://localhost:8899";
        console.log("Using local Solana RPC endpoint");
      }
      

      return false;
    }
    
  
    if (!isDevelopment) {
      throw new Error(
        `Missing required environment variables for MCP server: ${missingVars.join(", ")}`
      );
    }
    
    return false;
  }
  
  return true;
}

/**
 * Simple mock LLM response generator
 */
function generateMockLLMResponse(systemPrompt: string, userPrompt: string) {

  if (userPrompt.toLowerCase().includes('aggressive')) {
    return "As an aggressive trader, I see this as a great opportunity to take action. The market conditions look favorable for making bold moves.";
  } else if (userPrompt.toLowerCase().includes('conservative')) {
    return "Taking a conservative approach, I'd recommend caution in the current market. It's better to secure our position and minimize risk.";
  } else if (userPrompt.toLowerCase().includes('analytical')) {
    return "Analyzing the data objectively, I can see several interesting patterns in the market indicators that suggest a potential opportunity.";
  } else if (userPrompt.toLowerCase().includes('market')) {
    return "The current market conditions show some interesting patterns. There's moderate trading volume, with sentiment leaning slightly bullish.";
  } else if (userPrompt.toLowerCase().includes('trade')) {
    return "After evaluating the current position and market conditions, a balanced approach seems appropriate. Consider adjusting positions incrementally.";
  } else {
    return "I've analyzed the information and have some insights to share. The current situation presents both opportunities and challenges that require careful consideration.";
  }
}


export async function initMcpServer(port: number = 3030): Promise<McpServerReturn> {
  if (app && serverInstance) {
    console.log("MCP server already initialized");
    return { app: app as express.Express, agent: serverInstance };
  }

  try {

    const isValid = validateEnvironment();

    const isDevelopment = process.env.NODE_ENV !== "production";
    console.log(`Running in ${isDevelopment ? "development" : "production"} mode`);


    app = express();
    app.use(cors());
    app.use(express.json());
    

    app.get("/health", (_req: Request, res: Response) => {
      res.status(200).json({ 
        status: "ok", 
        envStatus: isValid ? "complete" : "missing-vars",
        timestamp: new Date().toISOString(),
        mode: isDevelopment ? "development" : "production",
        openai: false
      });
    });

 
    app.post("/simple-completion", async (req: Request, res: Response) => {
      try {
        const { system, user, model = "mock-llm", temperature = 0.7 } = req.body;
        
        if (!user) {
          return res.status(400).json({ error: "Missing user prompt" });
        }
        
        console.log(`[MCP] Processing completion request with model ${model}`);

        const completion = generateMockLLMResponse(system || "", user);
        
        res.json({ 
          completion,
          model: "mock-llm",
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error processing completion request:", error);
        res.status(500).json({ 
          error: "Failed to generate completion",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    });


    if (isValid && process.env.SOLANA_PRIVATE_KEY && process.env.NEXT_PUBLIC_RPC_URL) {
  
      
      
      const serverOptions = {
        name: "neural-trader-agent",
        version: "0.1.0",
      };
      
    
    
      
     
      app.get("/sse", async (_req: Request, res: Response) => {
        console.log("Received connection on /sse");
        const transport = new SSEServerTransport('/messages', res);
        
    
        transports[transport.sessionId] = transport;
        
        res.on("close", () => {
          console.log(`Connection closed for session ${transport.sessionId}`);
          delete transports[transport.sessionId];
        });
        
    
       
       
      });
      

      app.post("/messages", async (req: Request, res: Response) => {
        const sessionId = req.query.sessionId as string;
        console.log(`Received message for session ${sessionId}`);
        
        const transport = transports[sessionId];
        if (transport) {
          await transport.handlePostMessage(req, res);
        } else {
          res.status(400).send('No transport found for sessionId');
        }
      });
    } else {
      console.warn("Solana integration not available due to missing configuration");
      app.get("/sse", (_req: Request, res: Response) => {
        res.status(503).send('Solana Agent Kit not configured');
      });
      app.post("/messages", (_req: Request, res: Response) => {
        res.status(503).send('Solana Agent Kit not configured');
      });
    }
    
  
    httpServer = createServer(app);
    

    return new Promise((resolve, reject) => {
      httpServer.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`Port ${port} is already in use. The MCP server may already be running.`);
          console.log(`Trying to connect to existing server on port ${port}...`);
          
          // If the server is already running, we can still return the app
          if (app) {
            resolve({ app: app as express.Express, agent: serverInstance });
          } else {
            reject(new Error(`Cannot create MCP server - port ${port} is in use`));
          }
        } else {
          reject(err);
        }
      });
      
      // Try to start server
      httpServer.listen(port, () => {
        console.log(`MCP server started on port ${port}`);
        if (!isValid) {
          console.log("Running in limited mode due to missing environment variables.");
        }
        resolve({ app: app as express.Express, agent: serverInstance });
      });
    });
  } catch (error) {
    console.error(
      "Failed to initialize MCP server:", 
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

/**
 * Get the MCP server instance if it exists
 */
export function getMcpServer(): McpServerReturn {
  if (!serverInstance || !app) {
    throw new Error("MCP server not initialized. Call initMcpServer first.");
  }
  // Use type assertion since we've checked for null
  return { app: app as express.Express, agent: serverInstance };
}

/**
 * Shutdown the MCP server
 */
export function shutdownMcpServer() {
  if (httpServer) {
    console.log("Shutting down MCP server");
    // Close the HTTP server
    httpServer.close();
    httpServer = null;
  }
  
  if (app) {
    console.log("Cleaning up MCP resources");
    // Close all transports
    Object.values(transports).forEach(transport => {
      try {
        // Clean up any resources
      } catch (error) {
        console.error("Error closing transport:", error);
      }
    });
    // Clear transports
    Object.keys(transports).forEach(key => delete transports[key]);
    app = null;
    serverInstance = null;
  }
}