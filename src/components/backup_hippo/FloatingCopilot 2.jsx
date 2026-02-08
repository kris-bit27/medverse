import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { MessageCircle, X, Send, Loader2, Minimize2, Maximize2 } from 'lucide-react';

export const FloatingCopilot = ({ topicContent, topicTitle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call copilot Edge Function
      const { data, error } = await supabase.functions.invoke('copilot-chat', {
        body: {
          question: userMessage.content,
          context: topicContent || '',
          conversationHistory: messages.slice(-6) // Last 3 exchanges
        }
      });

      if (error) throw error;

      const assistantMessage = {
        role: 'assistant',
        content: data.answer,
        metadata: data.metadata,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('[Copilot] Error:', error);

      const errorMessage = {
        role: 'assistant',
        content: '❌ Omlouvám se, něco se pokazilo. Zkus to prosím znovu.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Floating button (when closed)
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        {messages.length > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center"
          >
            {messages.length}
          </Badge>
        )}
      </div>
    );
  }

  // Chat widget (when open)
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      }`}
    >
      <Card className="h-full flex flex-col shadow-2xl">
        {/* Header */}
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">
                💬 Copilot
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                Beta
              </Badge>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0"
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {!isMinimized && topicTitle && (
            <p className="text-xs text-muted-foreground mt-1">
              Ptej se na: {topicTitle}
            </p>
          )}
        </CardHeader>

        {!isMinimized && (
          <>
            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">
                    Zeptej se mě na cokoliv o tomto tématu! 👋
                  </p>
                  <div className="mt-4 space-y-2 text-xs">
                    <p className="font-medium">Příklady:</p>
                    <p className="text-left">• Co je to Killip klasifikace?</p>
                    <p className="text-left">• Jaké jsou hlavní příznaky?</p>
                    <p className="text-left">• Vysvětli mi patofyziologii</p>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.metadata && (
                      <p className="text-xs opacity-70 mt-1">
                        💰 ${msg.metadata.cost?.total || '0'}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input */}
            <div className="flex-shrink-0 p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Zeptej se..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  size="sm"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="w-full mt-2 text-xs"
                >
                  Clear chat
                </Button>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
