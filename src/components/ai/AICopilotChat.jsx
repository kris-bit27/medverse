import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Plus, MessageSquare } from 'lucide-react';
import ChatMessage from './ChatMessage';

export default function AICopilotChat({ agentName = 'copilot', initialContext = null }) {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversations = async () => {
    const convs = await base44.agents.listConversations({ agent_name: agentName });
    setConversations(convs || []);
  };

  const createNewConversation = async () => {
    setIsLoading(true);
    const conv = await base44.agents.createConversation({
      agent_name: agentName,
      metadata: {
        name: `Konverzace ${new Date().toLocaleDateString('cs-CZ')}`,
        context: initialContext
      }
    });
    setCurrentConversation(conv);
    setMessages([]);
    await loadConversations();
    setIsLoading(false);
  };

  const selectConversation = async (convId) => {
    setIsLoading(true);
    const conv = await base44.agents.getConversation(convId);
    setCurrentConversation(conv);
    setMessages(conv.messages || []);
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    
    const messageContent = input.trim();
    setInput('');
    
    if (!currentConversation) {
      await createNewConversation();
    }

    const userMessage = { role: 'user', content: messageContent };
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    const unsubscribe = base44.agents.subscribeToConversation(
      currentConversation?.id || conversations[0]?.id,
      (data) => {
        setMessages(data.messages || []);
      }
    );

    await base44.agents.addMessage(currentConversation, userMessage);
    
    setTimeout(() => {
      unsubscribe();
      setIsStreaming(false);
    }, 30000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-teal-600" />
          <span className="font-semibold text-slate-900 dark:text-white">AI Copilot</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={createNewConversation}
          disabled={isLoading}
        >
          <Plus className="w-4 h-4 mr-1" />
          Nová konverzace
        </Button>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
            <MessageSquare className="w-12 h-12 mb-4 text-slate-300" />
            <p className="text-sm">Začněte konverzaci s AI asistentem</p>
            <p className="text-xs mt-1">Zeptejte se na cokoliv o vašich studijních materiálech</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <ChatMessage 
                key={idx} 
                message={msg} 
                isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napište zprávu..."
            className="min-h-[44px] max-h-[120px] resize-none"
            disabled={isStreaming}
          />
          <Button 
            onClick={sendMessage} 
            disabled={!input.trim() || isStreaming}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}