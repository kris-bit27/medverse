import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { callApi } from '@/lib/api';
import { X, Send, Loader2, Minimize2, Maximize2, Trash2, Brain, Zap, HelpCircle, StickyNote, Check } from 'lucide-react';
import { toast } from 'sonner';

/* 🦛 Hippo icon (inline SVG for performance) */
const HippoIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.15" />
    <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontWeight="bold">🦛</text>
  </svg>
);

const QUICK_ACTIONS = [
  { label: 'Shrň klíčové body', icon: Zap, prompt: 'Shrň mi nejdůležitější body z tohoto tématu ve 5 bodech.' },
  { label: 'Vysvětli jednodušeji', icon: HelpCircle, prompt: 'Vysvětli mi toto téma jednoduše, jako bych byl student 3. ročníku.' },
  { label: 'Atestační otázky', icon: Brain, prompt: 'Jaké otázky by mohly padnout u atestace z tohoto tématu?' },
];

export const FloatingCopilot = ({ topicContent, topicTitle, topicId }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedIdx, setSavedIdx] = useState(new Set());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Ahoj! 👋 Jsem **Hippo AI** — tvůj studijní asistent.\n\nPomohu ti s tématem **${topicTitle}**.\nZeptej se mě na cokoliv nebo vyber rychlou akci.`,
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
        .map(m => `${m.role === 'user' ? 'Student' : 'Hippo'}: ${m.content}`)
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
      console.error('[Hippo]', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Nastala chyba. Zkus to znovu.',
        timestamp: Date.now()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const saveToNotes = useMutation({
    mutationFn: async (msgIndex) => {
      if (!user?.id || !topicId) throw new Error('Missing user/topic');
      const msg = messages[msgIndex];
      if (!msg) return;

      const question = messages[msgIndex - 1]?.content || '';
      const noteText = `**Hippo AI — ${new Date().toLocaleDateString('cs-CZ')}**\n\n` +
        (question ? `> ${question}\n\n` : '') +
        msg.content;

      const { error } = await supabase.from('topic_notes').insert({
        user_id: user.id,
        topic_id: topicId,
        content: noteText,
        is_private: true,
      });
      if (error) throw error;
    },
    onSuccess: (_, msgIndex) => {
      setSavedIdx(prev => new Set([...prev, msgIndex]));
      toast.success('Uloženo do poznámek!');
    },
    onError: () => toast.error('Chyba při ukládání'),
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Floating button — positioned LEFT of the float toolbar (which is at right:28px)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-7 right-44 z-[170] h-12 w-12 rounded-xl
          bg-gradient-to-br from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500
          shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40
          flex items-center justify-center transition-all hover:scale-105 active:scale-95
          border border-teal-500/30"
        title="Hippo AI — studijní asistent"
      >
        <span className="text-xl">🦛</span>
      </button>
    );
  }

  // Chat widget — positioned to not overlap float toolbar
  return (
    <div className={`fixed z-[200] transition-all duration-200 ${
      isMinimized 
        ? 'bottom-7 right-44 w-64 h-12' 
        : 'bottom-5 right-5 w-[370px] h-[520px] sm:right-44'
    }`}>
      <div className="h-full flex flex-col rounded-2xl border border-slate-700/80 bg-[#131620] shadow-2xl shadow-black/50 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-teal-900/30 to-cyan-900/20 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-sm">
              🦛
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-none tracking-wide">HIPPO AI</p>
              {!isMinimized && topicTitle && (
                <p className="text-[9px] text-slate-500 mt-0.5 truncate max-w-[170px]">{topicTitle}</p>
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
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="relative group max-w-[88%]">
                    <div className={`rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-teal-600 text-white rounded-br-sm'
                        : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-bl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    
                    {/* Save to notes button — only on assistant messages, not the welcome */}
                    {msg.role === 'assistant' && i > 0 && user && topicId && (
                      <button
                        onClick={() => !savedIdx.has(i) && saveToNotes.mutate(i)}
                        disabled={savedIdx.has(i) || saveToNotes.isPending}
                        className={`absolute -bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity
                          flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium
                          ${savedIdx.has(i) 
                            ? 'bg-green-500/20 text-green-400 cursor-default' 
                            : 'bg-slate-700 text-slate-400 hover:text-teal-300 hover:bg-slate-600 cursor-pointer'
                          }`}
                        title="Uložit do poznámek"
                      >
                        {savedIdx.has(i) ? (
                          <><Check className="w-2.5 h-2.5" /> Uloženo</>
                        ) : (
                          <><StickyNote className="w-2.5 h-2.5" /> Poznámka</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Quick actions on first message */}
              {messages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {QUICK_ACTIONS.map((a, i) => {
                    const Icon = a.icon;
                    return (
                      <button key={i} onClick={() => sendMessage(a.prompt)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400 hover:text-teal-300 hover:border-teal-600/40 transition-colors">
                        <Icon className="w-3 h-3" />
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-bl-sm px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{animationDelay:'0ms'}} />
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{animationDelay:'150ms'}} />
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{animationDelay:'300ms'}} />
                      </div>
                      <span className="text-[11px] text-slate-500">Hippo přemýšlí...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 p-2.5 border-t border-slate-800 bg-[#0e1118]">
              <div className="flex gap-1.5">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Zeptej se Hippo..."
                  disabled={loading}
                  className="flex-1 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-[13px] text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-teal-500/40 focus:border-teal-500/40 outline-none disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="px-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-30 disabled:hover:bg-teal-600 transition-colors"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
              {messages.length > 2 && (
                <button onClick={() => {
                  setMessages([{ role: 'assistant', content: `Chat vymazán! ✨\nZeptej se mě na cokoliv o **${topicTitle}**.`, timestamp: Date.now() }]);
                  setSavedIdx(new Set());
                }}
                  className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-400 mt-1.5 transition-colors">
                  <Trash2 className="w-2.5 h-2.5" /> Vymazat
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
