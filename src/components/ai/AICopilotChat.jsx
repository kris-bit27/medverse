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
  const unsubscribeRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversations = async () => {
    try {
      const convs = await base44.agents.listConversations({ agent_name: agentName });
      setConversations(convs || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const createNewConversation = async () => {
    setIsLoading(true);
    try {
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
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
    setIsLoading(false);
  };

  const selectConversation = async (convId) => {
    setIsLoading(true);
    try {
      const conv = await base44.agents.getConversation(convId);
      setCurrentConversation(conv);
      setMessages(conv.messages || []);
    } catch (error) {
      console.error('Error selecting conversation:', error);
      setCurrentConversation(null);
      setMessages([]);
    }
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    
    const messageContent = input.trim();
    setInput('');
    
    let conversation = currentConversation;
    
    if (!conversation) {
      try {
        conversation = await base44.agents.createConversation({
          agent_name: agentName,
          metadata: {
            name: `Konverzace ${new Date().toLocaleDateString('cs-CZ')}`,
            context: initialContext
          }
        });
        setCurrentConversation(conversation);
        await loadConversations();
      } catch (error) {
        console.error('Error creating conversation:', error);
        return;
      }
    }

    const userMessage = { role: 'user', content: messageContent };
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    unsubscribeRef.current = unsubscribe;

    try {
      await base44.agents.addMessage(conversation, userMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsStreaming(false);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
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
