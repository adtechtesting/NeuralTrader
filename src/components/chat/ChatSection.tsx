'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X,  RefreshCw } from 'lucide-react';
import AgentAvatar from '../AgentAvatar';
import { fetchJsonWithTimeout } from '@/lib/communication/fetch-with-timeout';


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

export default function ChatSection() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentGenerating, setAgentGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Load messages when drawer opens
  useEffect(() => {
    if (open) {
      loadMessages();
    }
  }, [open]);

  // Load messages from API
  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await fetchJsonWithTimeout<MessagesApiResponse>('/api/messages?count=50', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

   /*
  const generateMessage = async () => {
    try {
      setAgentGenerating(true);

      // Generate message from a random agent
      const response = await fetchJsonWithTimeout<MessagesApiResponse>('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          count: 1, // Generate 1 message
        }),
      });

      if (response.messages && response.messages.length > 0) {
        setMessages((prevMessages) => [...prevMessages, response.messages[0]]);
      }
    } catch (error) {
      console.error('Error generating message:', error);
    } finally {
      setAgentGenerating(false);
    }
  };
  */
  // Helper to format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper to get color based on sentiment
  const getSentimentColor = (sentiment: string | null) => {
    if (!sentiment) return 'border-gray-600';
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'border-green-500';
      case 'negative':
        return 'border-red-500';
      default:
        return 'border-gray-600';
    }
  };

  return (
    <>
  
      <button
        className="fixed bottom-5 right-5 p-4 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all"
        onClick={() => setOpen(true)}
        title="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat drawer */}
      {open && (
        <div className="fixed bottom-0 right-0 w-96 h-[700px] bg-gray-950 text-gray-100 shadow-lg flex flex-col">
    
          <div className="p-4 flex items-center justify-between border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Agent Chat</h2>
            <div className="flex items-center gap-2">
              <button
                className={`p-2 rounded-full text-purple-400 hover:bg-purple-900/30 transition-all ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={loadMessages}
                disabled={loading}
                title="Refresh messages"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                className="p-2 rounded-full text-purple-400 hover:bg-purple-900/30 transition-all"
                onClick={() => setOpen(false)}
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-900/50">
            {loading ? (
              <div className="flex justify-center my-4">
                <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center items-center h-full text-gray-400 opacity-70">
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex items-start gap-2">
                  <AgentAvatar
                    name={message.sender?.name || 'Unknown'}
                    personalityType={message.sender?.personalityType || 'MODERATE'}
                    size={40}
                  />
                  <div className="flex flex-col max-w-[calc(100%-50px)]">
                    <div className="flex items-baseline mb-1">
                      <p className="text-sm font-bold text-white mr-2">
                        {message.sender?.name || 'Unknown Agent'}
                      </p>
                      <p className="text-xs text-gray-400">{formatTimestamp(message.createdAt)}</p>
                    </div>
                    <div
                      className={`p-3 bg-gray-700 rounded-tl-none rounded-lg border-l-4 ${getSentimentColor(
                        message.sentiment
                      )}`}
                    >
                      <p className="text-sm text-gray-100">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Auto-updating message section info */}
          <div className="p-4 border-t border-gray-700 text-center">
            <p className="text-xs text-gray-400">
              Messages will appear automatically as agents interact during the simulation
            </p>
          </div>
        </div>
      )}
    </>
  );
}