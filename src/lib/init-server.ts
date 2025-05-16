import { initMcpServer } from './mcp/mcp-server';

const MCP_SERVER_PORT = process.env.MCP_SERVER_PORT 
  ? parseInt(process.env.MCP_SERVER_PORT, 10) 
  : 3035;

let serverInitialized = false;

export async function initializeServers() {
  if (serverInitialized) {
    console.log('Servers already initialized');
    return;
  }

  try {
    // Start the MCP server
    console.log(`Starting MCP server on port ${MCP_SERVER_PORT}...`);
    await initMcpServer(MCP_SERVER_PORT);
    serverInitialized = true;
    console.log('MCP server started successfully');
  } catch (error) {
    console.error('Failed to initialize servers:', error);

  }
}


if (typeof window === 'undefined') { 
  initializeServers().catch(console.error);
}