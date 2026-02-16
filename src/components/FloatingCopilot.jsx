import React, { useState, useRef, useEffect } from 'react';
import { callApi } from '@/lib/api';
import { X, Send, Loader2, Minimize2, Maximize2, Trash2, Sparkles, Brain, Zap, HelpCircle } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Shrň klíčové body', icon: Zap, prompt: 'Shrň mi nejdůležitější body z tohoto tématu ve 5 bodech.' },
  { label: 'Vysvětli jednodušeji', icon: HelpCircle, prompt: 'Vysvětli mi toto téma jednoduše, jako bych byl student 3. ročníku.' },
  { label: 'Atestační otázky', icon: Brain, prompt: 'Jaké otázky by mohly padnout u atestace z tohoto tématu?' },
];

export const FloatingCopilot = ({ topicContent, topicTitle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Ahoj! 👋 Jsem tvůj AI Copilot.\n\nPomohu ti s tématem **${topicTitle}**.\nZeptej se mě na cokoliv nebo použij rychlou akci níže.`,
        timestamp: Date.now()
      }]);
    }
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, topicTitle]);

  const sendMessage = async (text) => {
    if (!text?.trim() || loading) return;

    const userMsg = { role: 'user', content: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const recentHistory = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'Student' : 'Copilot'}: ${m.content}`)
        .join('\n');

      const conversationContext = recentHistory
        ? `\n\n=== PŘEDCHOZÍ KONVERZACE ===\n${recentHistory}\n=== KONEC ===`
        : '';

      const data = await callApi('invokeEduLLM', {
        mode: 'copilot',
        entityContext: { entityType: 'topic', topic: { title: topicTitle } },
        userPrompt: `${text}${conversationContext}`,
        pageContext: topicContent ? topicContent.substring(0, 6000) : '',
        allowWeb: false,
      });

      const answer = data.text || data.answer || (typeof data === 'string' ? data : 'Omlouvám se, nepodařilo se vygenerovat odpověď.');
      setMessages(prev => [...prev, { role: 'assistant', content: answer, timestamp: Date.now() }]);
    } catch (err) {
      console.error('[Copilot]', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Nastala chyba. Zkus to znovu.',
        timestamp: Date.now()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Floating button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full 
          bg-gradient-to-br from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500
          shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40
          flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        title="AI Copilot"
      >
        <Sparkles className="h-6 w-6 text-white" />
        {messages.length > 1 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {messages.filter(m => m.role === 'assistant').length - 1}
          </span>
        )}
      </button>
    );
  }

  // Chat widget
  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-200 ${
      isMinimized ? 'w-72 h-14' : 'w-[380px] h-[560px]'
    }`}>
      <div className="h-full flex flex-col rounded-2xl border border-slate-700 bg-[#131620] shadow-2xl shadow-black/50 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#131620] to-[#161a28] border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">AI Copilot</p>
              {!isMinimized && topicTitle && (
                <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[180px]">📚 {topicTitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-teal-600 text-white rounded-br-md'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-md'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {/* Quick actions on first message */}
              {messages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_ACTIONS.map((a, i) => {
                    const Icon = a.icon;
                    return (
                      <button key={i} onClick={() => sendMessage(a.prompt)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300 hover:text-teal-300 hover:border-teal-600/50 transition-colors">
                        <Icon className="w-3 h-3" />
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{animationDelay:'0ms'}} />
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{animationDelay:'150ms'}} />
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{animationDelay:'300ms'}} />
                      </div>
                      <span className="text-xs text-slate-500">Přemýšlím...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 p-3 border-t border-slate-800 bg-[#0e1118]">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Zeptej se mě..."
                  disabled={loading}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-30 disabled:hover:bg-teal-600 transition-colors"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              {messages.length > 2 && (
                <button onClick={() => {
                  setMessages([{ role: 'assistant', content: `Chat vymazán! ✨\nZeptej se mě na cokoliv o **${topicTitle}**.`, timestamp: Date.now() }]);
                }}
                  className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-400 mt-2 transition-colors">
                  <Trash2 className="w-3 h-3" /> Vymazat chat
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
