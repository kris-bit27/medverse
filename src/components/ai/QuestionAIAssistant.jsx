import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Send, Loader2, Bot, Save, FileDown, Sparkles } from 'lucide-react';
import ChatMessage from './ChatMessage';
import jsPDF from 'jspdf';

export default function QuestionAIAssistant({ question, user, onNoteSaved }) {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open && !conversation) {
      initConversation();
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: 'question_agent',
      metadata: {
        name: `Otázka: ${question.title}`,
        question_id: question.id,
        question_title: question.title
      }
    });
    setConversation(conv);
    
    // Send initial context
    const contextMessage = {
      role: 'user',
      content: `Pracuji s touto otázkou:\n\nNázev: ${question.title}\n\nText otázky: ${question.question_text}\n\n${question.answer_rich ? `Odpověď: ${question.answer_rich}` : ''}`
    };
    setMessages([contextMessage]);
    
    setIsStreaming(true);
    const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
    });
    
    await base44.agents.addMessage(conv, contextMessage);
    
    setTimeout(() => {
      unsubscribe();
      setIsStreaming(false);
    }, 30000);
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    
    const userMessage = { role: 'user', content: input.trim() };
    setInput('');
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });

    await base44.agents.addMessage(conversation, userMessage);
    
    setTimeout(() => {
      unsubscribe();
      setIsStreaming(false);
    }, 30000);
  };

  const saveAsNote = async () => {
    if (messages.length < 2) return;
    
    setIsSavingNote(true);
    const aiResponses = messages
      .filter(m => m.role === 'assistant')
      .map(m => m.content)
      .join('\n\n---\n\n');
    
    await base44.entities.UserNote.create({
      user_id: user.id,
      entity_type: 'question',
      entity_id: question.id,
      content: aiResponses,
      is_ai_generated: true
    });
    
    setIsSavingNote(false);
    if (onNoteSaved) onNoteSaved();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPos = 20;

    // Title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    const titleLines = doc.splitTextToSize(question.title, maxWidth);
    doc.text(titleLines, margin, yPos);
    yPos += titleLines.length * 8 + 10;

    // Question text
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Otázka:', margin, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');
    const questionLines = doc.splitTextToSize(question.question_text, maxWidth);
    doc.text(questionLines, margin, yPos);
    yPos += questionLines.length * 6 + 10;

    // AI Responses
    const aiResponses = messages.filter(m => m.role === 'assistant');
    if (aiResponses.length > 0) {
      doc.setFont(undefined, 'bold');
      doc.text('AI Asistent:', margin, yPos);
      yPos += 8;
      doc.setFont(undefined, 'normal');
      
      aiResponses.forEach((msg, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        const responseLines = doc.splitTextToSize(msg.content, maxWidth);
        doc.text(responseLines, margin, yPos);
        yPos += responseLines.length * 6 + 5;
      });
    }

    doc.save(`${question.title.substring(0, 30)}.pdf`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { label: 'Vysvětli podrobněji', prompt: 'Vysvětli tuto otázku a odpověď podrobněji.' },
    { label: 'Zjednoduš', prompt: 'Zjednoduš tuto otázku a odpověď pro studenta medicíny.' },
    { label: 'Klíčové body', prompt: 'Shrň klíčové body této otázky do odrážek.' },
    { label: 'Testová otázka', prompt: 'Přeformuluj tuto otázku jako testovou otázku s možnostmi A, B, C, D.' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="w-4 h-4 text-teal-600" />
          AI Asistent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-teal-600" />
            AI Asistent - {question.title.substring(0, 40)}...
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-[60vh]">
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            {quickActions.map((action, idx) => (
              <Button
                key={idx}
                variant="secondary"
                size="sm"
                onClick={() => {
                  setInput(action.prompt);
                }}
                disabled={isStreaming}
              >
                {action.label}
              </Button>
            ))}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.slice(1).map((msg, idx) => (
                <ChatMessage 
                  key={idx} 
                  message={msg} 
                  isStreaming={isStreaming && idx === messages.length - 2 && msg.role === 'assistant'}
                />
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex gap-2 mb-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Zeptejte se na cokoliv k této otázce..."
                className="min-h-[44px] max-h-[100px] resize-none"
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
            
            {/* Save & Export actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveAsNote}
                disabled={messages.length < 2 || isSavingNote}
                className="flex-1"
              >
                {isSavingNote ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Uložit jako poznámku
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                disabled={messages.length < 2}
                className="flex-1"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export do PDF
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}