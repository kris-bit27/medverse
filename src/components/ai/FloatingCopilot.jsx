import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Send, Loader2, Plus, MessageSquare, X, Bot, AlertCircle } from 'lucide-react';
import ChatMessage from './ChatMessage';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function FloatingCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  const loadConversations = async () => {
    try {
      const convs = await base44.agents.listConversations({ agent_name: 'copilot' });
      setConversations(convs || []);
      
      // Auto-select most recent conversation
      if (convs && convs.length > 0 && !currentConversation) {
        selectConversation(convs[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Nepodařilo se načíst konverzace');
    }
  };

  const createNewConversation = async () => {
    setIsLoading(true);
    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'copilot',
        metadata: {
          name: `Konverzace ${new Date().toLocaleDateString('cs-CZ')}`
        }
      });
      setCurrentConversation(conv);
      setMessages([]);
      await loadConversations();
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Nepodařilo se vytvořit novou konverzaci');
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
      toast.error('Nepodařilo se načíst konverzaci');
    }
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    
    const messageContent = input.trim();
    setInput('');
    
    let convToUse = currentConversation;
    
    if (!convToUse) {
      setIsLoading(true);
      try {
        convToUse = await base44.agents.createConversation({
          agent_name: 'copilot',
          metadata: {
            name: `Konverzace ${new Date().toLocaleDateString('cs-CZ')}`
          }
        });
        setCurrentConversation(convToUse);
        await loadConversations();
      } catch (error) {
        console.error('Error creating conversation:', error);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }

    // Sestavení pageContext pro invokeEduLLM
    const pageContext = {
      pathname: window.location.pathname,
      title: document.title,
      topicId: extractTopicIdFromUrl(window.location.pathname)
    };

    const userMessage = { 
      role: 'user', 
      content: messageContent,
      pageContext 
    };
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    const unsubscribe = base44.agents.subscribeToConversation(
      convToUse.id,
      (data) => {
        setMessages(data.messages || []);
      }
    );

    try {
      await base44.agents.addMessage(convToUse, userMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Nepodařilo se odeslat zprávu');
      setIsStreaming(false);
      unsubscribe();
      return;
    }
    
    setTimeout(() => {
      unsubscribe();
      setIsStreaming(false);
    }, 30000);
  };

  const extractTopicIdFromUrl = (pathname) => {
    // Extrahuje topicId z URL typu /topic/123 nebo /TopicDetail?id=123
    const match = pathname.match(/\/topic\/([^/]+)/);
    if (match) return match[1];
    
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('topicId') || null;
  };

  const getContextualGreeting = () => {
    const path = window.location.pathname;
    const title = document.title;
    
    if (path.includes('TopicDetail') || path.includes('/topic/')) {
      const topicMatch = title.match(/^([^|]+)/);
      const topicName = topicMatch ? topicMatch[1].trim() : 'toto téma';
      return `Vidím, že studuješ ${topicName}, chceš s něčím pomoci?`;
    }
    
    if (path.includes('Atestace') || path.includes('OkruhDetail')) {
      return 'Vidím, že procházíš atestační okruhy. Na co se chceš zeptat?';
    }
    
    if (path.includes('QuestionDetail')) {
      return 'Řešíš konkrétní otázku? Můžu ti pomoci ji pochopit.';
    }
    
    if (path.includes('Logbook')) {
      return 'Doplňuješ logbook? Rád ti pomůžu s kategorizací nebo popisem.';
    }
    
    return 'Začněte konverzaci';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 transition-all hover:shadow-xl"
            >
              <Bot className="w-6 h-6 text-white" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheet with Chat */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:w-[500px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <SheetTitle className="text-lg">Hippo</SheetTitle>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={createNewConversation}
                disabled={isLoading}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Nová
              </Button>
            </div>
          </SheetHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 px-6 py-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500/10 to-cyan-600/10 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-teal-600" />
                </div>
                <p className="font-semibold text-slate-900 dark:text-white mb-2">
                  {getContextualGreeting()}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[280px]">
                  Zeptejte se Hippa na pomoc s porozuměním medicíně
                </p>
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
                <div ref={scrollRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
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
                className="bg-teal-600 hover:bg-teal-700 flex-shrink-0"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}