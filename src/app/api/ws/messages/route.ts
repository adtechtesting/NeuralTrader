import { NextRequest } from 'next/server';
import { prisma } from '@/lib/cache/dbCache';

// Store active WebSocket connections
const activeConnections = new Set<WebSocket>();

// Track message creation timestamps for real-time updates
let lastMessageTimestamp = new Date();

export async function GET(req: NextRequest) {
  // Upgrade to WebSocket connection
  const upgradeHeader = req.headers.get('upgrade');

  if (upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  // @ts-ignore - Next.js WebSocket upgrade
  const { socket, response } = Deno.upgradeWebSocket(req);

  console.log('🔗 New WebSocket connection established');

  // Add to active connections
  activeConnections.add(socket);

  // Send recent messages on connection
  try {
    const recentMessages = await prisma.message.findMany({
      where: {
        createdAt: {
          gte: lastMessageTimestamp
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            personalityType: true
          }
        }
      }
    });

    if (recentMessages.length > 0) {
      socket.send(JSON.stringify({
        type: 'initial_messages',
        messages: recentMessages.reverse().map(msg => ({
          id: msg.id,
          content: msg.content,
          sentiment: msg.sentiment,
          sender: msg.sender,
          createdAt: msg.createdAt,
          type: msg.type
        }))
      }));
    }
  } catch (error) {
    console.error('Error sending initial messages:', error);
  }

  // Handle incoming messages (if needed for chat features)
  socket.onmessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 WebSocket message received:', data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  // Handle connection close
  socket.onclose = () => {
    console.log('🔌 WebSocket connection closed');
    activeConnections.delete(socket);
  };

  socket.onerror = (error: Event) => {
    console.error('❌ WebSocket error:', error);
    activeConnections.delete(socket);
  };

  return response;
}

// Function to broadcast new messages to all connected clients
export async function broadcastMessage(message: any) {
  const messageData = {
    type: 'new_message',
    message: {
      id: message.id,
      content: message.content,
      sentiment: message.sentiment,
      sender: message.sender,
      createdAt: message.createdAt,
      type: message.type
    }
  };

  // Update last message timestamp
  lastMessageTimestamp = new Date();

  // Send to all active connections
  for (const connection of activeConnections) {
    if (connection.readyState === WebSocket.OPEN) {
      try {
        connection.send(JSON.stringify(messageData));
      } catch (error) {
        console.error('Error broadcasting message:', error);
        activeConnections.delete(connection);
      }
    } else {
      activeConnections.delete(connection);
    }
  }
}

// Export for use in other API routes
export { activeConnections };
