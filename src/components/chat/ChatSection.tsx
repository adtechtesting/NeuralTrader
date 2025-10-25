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

  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop <= clientHeight + 100;
    setIsAtBottom(isNearBottom);
  }, []);

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

    loadMessages();
    connectWebSocket();

    const pollInterval = setInterval(loadMessages, 10000);

    return () => {
      clearInterval(pollInterval);
      if (socket) socket.close();
    };
  }, [open, loadMessages]);

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

  const getSentimentColor = (sentiment: string | null) => {
    if (!sentiment) return 'border-white/10';
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'border-green-400/30';
      case 'negative': return 'border-red-400/30';
      case 'neutral': return 'border-white/20';
      default: return 'border-white/10';
    }
  };

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

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setIsAtBottom(true);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        className="fixed bottom-6 right-6 p-4 bg-white text-black rounded-full shadow-lg transition-all
                  hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50
                  z-50"
        onClick={() => setOpen(true)}
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
            {messages.length > 9 ? '9+' : messages.length}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-0 right-0 w-full sm:w-96 h-[70vh] sm:h-[80vh] bg-black/60 backdrop-blur-2xl text-white shadow-2xl flex flex-col
                       rounded-tl-2xl border border-white/10 overflow-hidden z-50">
          {/* Header */}
          <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center gap-3">
            
              <h2 className="text-lg font-bold text-white">Agent Chat</h2>
              {loading && (
                <span className="text-xs bg-white/10 text-white/80 px-2 py-1 rounded-full border border-white/10">
                  Loading...
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadMessages}
                disabled={loading}
                className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'text-white'
                }`}
                aria-label="Refresh messages"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border-l-4 border-red-500 p-3 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Messages container */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40"
          >
            {messages.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-full text-white/40">
                <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs mt-1 text-white/30">Agents will appear here when they chat</p>
              </div>
            ) : (
              <>
                {groupedMessages.map((group, groupIndex) => (
                  <div key={`${group.sender.id}-${groupIndex}`} className="message-group">
                    <div className="flex items-start gap-3 mb-2">
                      <AgentAvatar
                        name={group.sender.name}
                        personalityType={group.sender.personalityType}
                        size={36}
                      />
                      <div className="flex-1">
                        <div className="flex items-baseline mb-2">
                          <span className="font-semibold text-sm text-white">
                            {group.sender.name}
                          </span>
                          <span className="ml-2 text-xs text-white/40">
                            {formatTimestamp(group.messages[0].createdAt)}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {group.messages.map((message) => (
                            <div
                              key={message.id}
                              className={`p-3 rounded-xl max-w-[85%] sm:max-w-[80%] bg-white/5 backdrop-blur-sm border ${
                                getSentimentColor(message.sentiment)
                              } hover:bg-white/10 transition-colors`}
                            >
                              <p className="text-sm text-white leading-relaxed">{message.content}</p>
                              {message.sentiment && (
                                <span className={`text-xs mt-2 inline-block px-2 py-1 rounded-full ${
                                  message.sentiment === 'positive' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                  message.sentiment === 'negative' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                  'bg-white/10 text-white/70 border border-white/20'
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
              className="absolute bottom-20 right-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white p-2 rounded-full shadow-lg border border-white/10
                       transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
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
          <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 bg-black/50 text-white text-sm rounded-l-xl px-4 py-3 border border-white/10 focus:outline-none focus:border-white/30 transition-colors placeholder-white/40"
                disabled
                aria-label="Message input"
              />
              <button
                className="bg-white text-black px-4 py-3 rounded-r-xl font-semibold
                          transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90"
                disabled
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-white/40 mt-3 text-center">
              Agents will chat automatically during simulation
            </p>
          </div>
        </div>
      )}
    </>
  );
}
