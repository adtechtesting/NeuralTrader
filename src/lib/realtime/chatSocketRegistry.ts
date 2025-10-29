const activeConnections = new Set<WebSocket>();

let lastMessageTimestamp = new Date();

export interface ChatMessagePayload {
  id: string;
  content: string;
  sentiment: string | null;
  sender: {
    id: string;
    name: string;
    personalityType: string;
    avatarUrl?: string | null;
  };
  createdAt: string | Date;
  type: string;
}

export const registerConnection = (socket: WebSocket) => {
  activeConnections.add(socket);
};

export const unregisterConnection = (socket: WebSocket) => {
  activeConnections.delete(socket);
};

export const connectionCount = () => activeConnections.size;

export const getLastMessageTimestamp = () => lastMessageTimestamp;

const toISODate = (date: string | Date) =>
  typeof date === 'string' ? new Date(date).toISOString() : date.toISOString();

export const broadcastMessage = (message: ChatMessagePayload) => {
  const messageData = {
    type: 'new_message' as const,
    message: {
      id: message.id,
      content: message.content,
      sentiment: message.sentiment,
      sender: message.sender,
      createdAt: toISODate(message.createdAt),
      type: message.type
    }
  };

  lastMessageTimestamp = new Date();

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
};
