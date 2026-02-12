import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { MessageCircle, X, Send, Loader2, Minimize2, Maximize2, Trash2 } from 'lucide-react';

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

  // Load welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `👋 Ahoj! Jsem tvůj Copilot pro studium.\n\nZeptej se mě na cokoliv o tématu "${topicTitle}"!\n\nNapříklad:\n• Jaké jsou hlavní příznaky?\n• Vysvětli mi patofyziologii\n• Co je důležité si zapamatovat?`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [isOpen, topicTitle]);

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
      // Build conversation history for context (last 6 messages = 3 exchanges)
      const recentHistory = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'Student' : 'Copilot'}: ${m.content}`)
        .join('\n');

      const conversationContext = recentHistory
        ? `\n\n=== PŘEDCHOZÍ KONVERZACE ===\n${recentHistory}\n=== KONEC KONVERZACE ===`
        : '';

      const data = await base44.functions.invoke('invokeEduLLM', {
        mode: 'copilot',
        entityContext: {
          entityType: 'topic',
          topic: { title: topicTitle },
        },
        userPrompt: `${userMessage.content}${conversationContext}`,
        pageContext: topicContent ? topicContent.substring(0, 6000) : '',
        allowWeb: false,
      });

      const answerText = data.text || data.answer || (typeof data === 'string' ? data : 'Omlouvám se, nepodařilo se mi vygenerovat odpověď.');

      const assistantMessage = {
        role: 'assistant',
        content: answerText,
        metadata: data.metadata,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('[Copilot] Error:', error);

      const errorMessage = {
        role: 'assistant',
        content: '❌ Omlouvám se, něco se pokazilo. Zkus to prosím znovu nebo se zeptej jinak.',
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
    setMessages([{
      role: 'assistant',
      content: `Chat vymazán! ✨\n\nZeptej se mě na cokoliv o tématu "${topicTitle}".`,
      timestamp: new Date().toISOString()
    }]);
  };

  // Floating button (closed state)
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-16 w-16 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          title="Otevřít Copilot"
        >
          <MessageCircle className="h-7 w-7" />
        </Button>
        {messages.length > 1 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
          >
            {messages.length - 1}
          </Badge>
        )}
      </div>
    );
  }

  // Chat widget (open state)
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      }`}
    >
      <Card className="h-full flex flex-col shadow-2xl border-2">
        {/* Header */}
        <CardHeader className="flex-shrink-0 pb-3 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">
                  Copilot
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Claude Haiku 4
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0"
                title={isMinimized ? "Rozbalit" : "Minimalizovat"}
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
                title="Zavřít"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {!isMinimized && topicTitle && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
              📚 {topicTitle}
            </p>
          )}
        </CardHeader>

        {!isMinimized && (
          <>
            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
                        : 'bg-gray-100 text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                    {msg.metadata?.cost && (
                      <p className="text-xs opacity-70 mt-1.5 flex items-center gap-1">
                        💰 ${msg.metadata.cost.total}
                        <span className="opacity-50">•</span>
                        <span className="opacity-70">
                          {msg.metadata.tokensUsed?.input_tokens + msg.metadata.tokensUsed?.output_tokens || 0} tokens
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-2.5 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600">Přemýšlím...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input */}
            <div className="flex-shrink-0 p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Zeptej se..."
                  disabled={loading}
                  className="flex-1 bg-white"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  size="sm"
                  className="bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {messages.length > 1 && (
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearChat}
                    className="flex-1 text-xs h-8"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Vymazat chat
                  </Button>
                  <div className="text-xs text-muted-foreground flex items-center">
                    {messages.length} zpráv
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
