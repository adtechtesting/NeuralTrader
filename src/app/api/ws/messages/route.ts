import { NextRequest } from 'next/server';
import { prisma } from '@/lib/cache/dbCache';
import {
  registerConnection,
  unregisterConnection,
  getLastMessageTimestamp
} from '@/lib/realtime/chatSocketRegistry';

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
  registerConnection(socket);

  // Send recent messages on connection
  try {
    const lastMessageTimestamp = getLastMessageTimestamp();
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
    unregisterConnection(socket);
  };

  socket.onerror = (error: Event) => {
    console.error('❌ WebSocket error:', error);
    unregisterConnection(socket);
  };

  return response;
}
