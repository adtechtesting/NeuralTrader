'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, RefreshCw, Send, AlertCircle } from 'lucide-react';
import AgentAvatar from '../AgentAvatar';
import { fetchJsonWithTimeout } from '@/lib/communication/fetch-with-timeout';
import { useRouter } from 'next/navigation';

interface MessagesApiResponse {
  messages: Message[];
}

interface Message {
  id: string;
  content: string;
  sentiment: string | null;
  type: string;
  sender: {
    id: string;
    name: string;
    personalityType: string;
  };
  createdAt: string;
}

// Cache for message timestamps to prevent duplicates
const messageCache = new Set<string>();

export default function ChatSection() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentGenerating, setAgentGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Scroll to bottom when messages change and user is at bottom
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  // Handle scroll events for auto-scroll
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop <= clientHeight + 100;
    setIsAtBottom(isNearBottom);
  }, []);

  // Load messages with deduplication
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJsonWithTimeout<MessagesApiResponse>('/api/messages?count=50', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      if (data.messages) {
        const newMessages = data.messages.filter(msg => !messageCache.has(msg.id));
        newMessages.forEach(msg => messageCache.add(msg.id));

        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));
          return [...uniqueNewMessages, ...prev].sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and setup WebSocket for real-time updates
  useEffect(() => {
    if (!open) return;

    let socket: WebSocket | null = null;
    let retryCount = 0;
    const maxRetries = 3;

    const connectWebSocket = () => {
      try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/api/ws/messages`;
        socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message && message.id && !messageCache.has(message.id)) {
              messageCache.add(message.id);
              setMessages(prev => {
                const exists = prev.some(m => m.id === message.id);
                return exists ? prev : [...prev, message].sort((a, b) =>
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
              });
            }
          } catch (e) {
            console.error('Error processing WebSocket message:', e);
          }
        };

        socket.onclose = () => {
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`WebSocket closed. Attempting to reconnect (${retryCount}/${maxRetries})...`);
            setTimeout(connectWebSocket, Math.min(1000 * Math.pow(2, retryCount), 10000));
          } else {
            console.error('Max reconnection attempts reached');
            setError('Connection lost. Please refresh to reconnect.');
          }
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
        setError('Failed to connect to chat server.');
      }
    };

    // Initial load
    loadMessages();
    connectWebSocket();

    // Polling fallback (every 10 seconds)
    const pollInterval = setInterval(loadMessages, 10000);

    return () => {
      clearInterval(pollInterval);
      if (socket) socket.close();
    };
  }, [open, loadMessages]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Get color based on sentiment
  const getSentimentColor = (sentiment: string | null) => {
    if (!sentiment) return 'border-gray-600';
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'border-green-500';
      case 'negative': return 'border-red-500';
      case 'neutral': return 'border-blue-400';
      default: return 'border-gray-600';
    }
  };

  // Group messages by sender for better readability
  const groupedMessages = messages.reduce<{sender: Message['sender'], messages: Message[]}[]>((groups, message) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.sender.id === message.sender.id) {
      lastGroup.messages.push(message);
    } else {
      groups.push({
        sender: message.sender,
        messages: [message]
      });
    }
    return groups;
  }, []);

  // Scroll to bottom handler
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setIsAtBottom(true);
    }
  };

  return (
    <>
      <button
        className="fixed bottom-5 right-5 p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all
                  hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50
                  z-50"
        onClick={() => setOpen(true)}
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {messages.length > 9 ? '9+' : messages.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-0 right-0 w-full sm:w-96 h-[70vh] sm:h-[80vh] bg-gray-900 text-gray-100 shadow-xl flex flex-col
                       rounded-tl-lg border border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="p-3 sm:p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold text-white">Agent Chat</h2>
              {loading && (
                <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                  Loading...
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadMessages}
                disabled={loading}
                className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'text-purple-400 hover:text-purple-300'
                }`}
                aria-label="Refresh messages"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-900/50 border-l-4 border-red-500 p-3 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Messages container */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-gray-900/50"
          >
            {messages.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1 text-gray-500">Agents will appear here when they chat</p>
              </div>
            ) : (
              <>
                {groupedMessages.map((group, groupIndex) => (
                  <div key={`${group.sender.id}-${groupIndex}`} className="message-group">
                    <div className="flex items-start gap-3 mb-1">
                      <AgentAvatar
                        name={group.sender.name}
                        personalityType={group.sender.personalityType}
                        size={36}
                      />
                      <div className="flex-1">
                        <div className="flex items-baseline mb-1">
                          <span className="font-medium text-sm text-white">
                            {group.sender.name}
                          </span>
                          <span className="ml-2 text-xs text-gray-400">
                            {formatTimestamp(group.messages[0].createdAt)}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {group.messages.map((message, msgIndex) => (
                            <div
                              key={message.id}
                              className={`p-2.5 rounded-lg max-w-[85%] sm:max-w-[80%] ${
                                getSentimentColor(message.sentiment).replace('border-l-4', 'border-2')
                              }`}
                            >
                              <p className="text-sm text-gray-100">{message.content}</p>
                              {message.sentiment && (
                                <span className={`text-xs mt-1 inline-block px-1.5 py-0.5 rounded ${
                                  message.sentiment === 'positive' ? 'bg-green-900/30 text-green-300' :
                                  message.sentiment === 'negative' ? 'bg-red-900/30 text-red-300' :
                                  'bg-blue-900/30 text-blue-300'
                                }`}>
                                  {message.sentiment}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Scroll to bottom button */}
          {!isAtBottom && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-20 right-4 bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-full shadow-lg
                       transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Scroll to bottom"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>
          )}

          {/* Input area */}
          <div className="p-3 border-t border-gray-700 bg-gray-800">
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 text-white text-sm rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled
                aria-label="Message input"
              />
              <button
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-r-lg
                          transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Agents will chat automatically during simulation
            </p>
          </div>
        </div>
      )}
    </>
  );
}