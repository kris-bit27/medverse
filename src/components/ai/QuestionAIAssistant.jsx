import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
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

function ConfidenceBadge({ confidence }) {
  if (!confidence?.level) return null;
  const level = String(confidence.level).toLowerCase();

  const label = level === 'high' ? 'High'
    : level === 'medium' ? 'Medium'
    : level === 'low' ? 'Low'
    : confidence.level;

  const cls =
    level === 'high'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
      : level === 'medium'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200';

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
        {label}
      </span>
      {confidence?.reason ? (
        <span className="text-xs text-[hsl(var(--mn-muted))]">
          {confidence.reason}
        </span>
      ) : null}
    </div>
  );
}

function SourcesBlock({ citations }) {
  const internal = citations?.internal || [];
  const external = citations?.external || [];

  if ((!internal || internal.length === 0) && (!external || external.length === 0)) {
    return null;
  }

  return (
    <div className="mt-2 rounded-lg border border-[hsl(var(--mn-border))] p-3">
      <div className="text-xs font-semibold text-[hsl(var(--mn-muted))] dark:text-[hsl(var(--mn-text))] mb-2">
        Zdroje
      </div>

      {internal?.length > 0 && (
        <div className="mb-2">
          <div className="text-xs font-medium text-[hsl(var(--mn-muted))] dark:text-[hsl(var(--mn-muted))] mb-1">
            Interní
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {internal.map((c, idx) => (
              <li key={`i-${idx}`} className="text-xs text-[hsl(var(--mn-muted))] dark:text-[hsl(var(--mn-muted))]">
                {c.title || c.name || c.id || 'Interní zdroj'}
                {c.section_hint ? <span className="text-[hsl(var(--mn-muted))]"> — {c.section_hint}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {external?.length > 0 && (
        <div>
          <div className="text-xs font-medium text-[hsl(var(--mn-muted))] dark:text-[hsl(var(--mn-muted))] mb-1">
            Externí
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {external.map((c, idx) => (
              <li key={`e-${idx}`} className="text-xs text-[hsl(var(--mn-muted))] dark:text-[hsl(var(--mn-muted))]">
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    {c.title || c.url}
                  </a>
                ) : (
                  <span>{c.title || 'Externí zdroj'}</span>
                )}
                {c.publisher || c.year ? (
                  <span className="text-[hsl(var(--mn-muted))]">
                    {c.publisher ? ` — ${c.publisher}` : ''}
                    {c.year ? ` (${c.year})` : ''}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function QuestionAIAssistant({ question, user, onNoteSaved, topic: topicProp }) {
  const [open, setOpen] = useState(false);

  const [topic, setTopic] = useState(topicProp || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [aiMode, setAiMode] = useState('EXAM'); // EXAM | CHAT

  const scrollRef = useRef(null);

  const entityContext = useMemo(() => {
    return {
      entityType: 'question',
      entityId: question?.id,
      question,
      topic
    };
  }, [question, topic]);

  useEffect(() => {
    if (!open) return;

    // Init messages with context (user-visible)
    if (messages.length === 0) {
      const ctx = [
        `Pracuji s touto otázkou:`,
        ``,
        `Název: ${question?.title || ''}`,
        ``,
        `Text otázky: ${question?.question_text || ''}`,
        ``,
        question?.answer_rich ? `Odpověď (pokud existuje): ${question.answer_rich}` : ''
      ]
        .filter(Boolean)
        .join('\n');

      setMessages([{ role: 'user', content: ctx, meta: { isContext: true } }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    // Load topic if not provided
    const loadTopic = async () => {
      if (!open) return;
      if (topicProp) return;
      if (topic) return;

      const topicId = question?.linked_topic_id || question?.topic_id || question?.topic?.id;
      if (!topicId) return;

      try {
        const t = await supabase.from('topics').select('*').eq('id', topicId).single().then(r => r.data);
        setTopic(t);
      } catch (e) {
        // silent fail (assistant can still work with question-only)
        console.warn('Failed to load topic:', e);
      }
    };
    loadTopic();
  }, [open, topicProp, topic, question]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const runLLM = async ({ mode, userPrompt, allowWeb = false }) => {
    setIsLoading(true);
    try {
      const res = await callApi('invokeEduLLM', {
        mode,
        entityContext,
        userPrompt,
        allowWeb
      });

      // Backend wrapper vždy vrací jednotný tvar
      const assistantMessage = {
        role: 'assistant',
        content: res.text || res.data?.text || '⚠️ Prázdná odpověď',
        meta: { 
          mode: res.mode || res.data?.mode || mode, 
          citations: res.citations || res.data?.citations || { internal: [], external: [] }, 
          confidence: res.confidence || res.data?.confidence || { level: 'low', reason: 'Neznámá' },
          cache: res.cache || res.data?.cache || { hit: false }
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (e) {
      const errMsg = e?.message || 'Chyba při volání AI.';
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ ${errMsg}`,
          meta: { mode, confidence: { level: 'low', reason: 'Volání selhalo nebo není dostupné.' }, cache: { hit: false } }
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const prompt = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);

    if (aiMode === 'EXAM') {
      // V EXAM režimu generujeme strukturovanou odpověď
      await runLLM({
        mode: 'question_exam_answer',
        userPrompt: prompt,
        allowWeb: false
      });
    } else {
      // V CHAT režimu používáme volný chat (bez změny uložených odpovědí)
      await runLLM({
        mode: 'copilot_chat',
        userPrompt: prompt,
        allowWeb: false
      });
    }
  };

  const saveAsNote = async () => {
    if (messages.length < 2 || !user?.id) return;

    setIsSavingNote(true);
    try {
      const aiMsgs = messages.filter(m => m.role === 'assistant');
      const content = aiMsgs
        .map((m, i) => {
          const c = m.meta?.confidence;
          const cit = m.meta?.citations;

          const header = `### AI odpověď ${i + 1}${m.meta?.mode ? ` (${m.meta.mode})` : ''}`;
          const conf = c?.level
            ? `**Confidence:** ${String(c.level).toUpperCase()}${c.reason ? ` — ${c.reason}` : ''}`
            : '';
          const sources =
            (cit?.internal?.length || cit?.external?.length)
              ? [
                  '',
                  '**Zdroje:**',
                  ...(cit?.internal?.length
                    ? ['- Interní:', ...cit.internal.map(x => `  - ${x.title || x.name || x.id || 'Interní zdroj'}${x.section_hint ? ` — ${x.section_hint}` : ''}`)]
                    : []),
                  ...(cit?.external?.length
                    ? ['- Externí:', ...cit.external.map(x => `  - ${(x.title || x.url || 'Externí zdroj')}${x.url ? ` (${x.url})` : ''}`)]
                    : [])
                ].join('\n')
              : '';

          return [header, conf, '', m.content, sources].filter(Boolean).join('\n');
        })
        .join('\n\n---\n\n');

      await supabase.from('user_notes').insert({
        user_id: user.id,
        topic_id: question.id,
        note_text: content,
      });

      if (onNoteSaved) onNoteSaved();
    } finally {
      setIsSavingNote(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPos = 20;

    const addBlock = (text, fontSize = 12, bold = false, spacing = 6) => {
      doc.setFontSize(fontSize);
      doc.setFont(undefined, bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((ln) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(ln, margin, yPos);
        yPos += spacing;
      });
      yPos += 4;
    };

    addBlock(question.title || 'Otázka', 16, true, 8);
    addBlock('Otázka:', 12, true, 7);
    addBlock(question.question_text || '', 11, false, 6);

    const aiResponses = messages.filter(m => m.role === 'assistant');
    if (aiResponses.length > 0) {
      addBlock('AI Asistent:', 12, true, 7);

      aiResponses.forEach((msg, idx) => {
        addBlock(`Odpověď ${idx + 1}${msg.meta?.mode ? ` (${msg.meta.mode})` : ''}`, 11, true, 6);
        if (msg.meta?.confidence?.level) {
          const c = msg.meta.confidence;
          addBlock(`Confidence: ${String(c.level).toUpperCase()}${c.reason ? ` — ${c.reason}` : ''}`, 10, false, 5);
        }
        addBlock(msg.content || '', 11, false, 6);

        const cit = msg.meta?.citations;
        const internal = cit?.internal || [];
        const external = cit?.external || [];
        if (internal.length || external.length) {
          addBlock('Zdroje:', 10, true, 5);
          if (internal.length) {
            addBlock(`Interní: ${internal.map(x => x.title || x.name || x.id).filter(Boolean).join(' | ')}`, 9, false, 4);
          }
          if (external.length) {
            addBlock(`Externí: ${external.map(x => x.url || x.title).filter(Boolean).join(' | ')}`, 9, false, 4);
          }
        }
        addBlock(' ', 10, false, 4);
      });
    }

    doc.save(`${(question.title || 'otazka').substring(0, 30)}.pdf`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const examQuickActions = [
    { label: 'Zkoušková odpověď', mode: 'question_exam_answer', prompt: 'Vypracuj zkouškovou odpověď k této otázce.' },
    { label: 'High-yield', mode: 'question_high_yield', prompt: 'Shrň to high-yield (max 10 odrážek) + časté chyby.' },
    { label: 'Quiz (5 MCQ)', mode: 'question_quiz', prompt: 'Vytvoř 5 MCQ otázek s A–D a vysvětlením.' },
    { label: 'Zjednoduš', mode: 'question_simplify', prompt: 'Vysvětli jednoduše pro medika, ale fakticky správně.' },
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
        <DialogHeader className="px-6 py-4 border-b border-[hsl(var(--mn-border))]">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-teal-600" />
              AI Asistent — {(question.title || '').substring(0, 40)}{(question.title || '').length > 40 ? '…' : ''}
            </DialogTitle>
            <div className="flex gap-1 bg-[hsl(var(--mn-surface-2))] rounded-lg p-1">
              <Button
                variant={aiMode === 'EXAM' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setAiMode('EXAM')}
                className={aiMode === 'EXAM' ? 'bg-teal-600 hover:bg-teal-700' : ''}
              >
                EXAM
              </Button>
              <Button
                variant={aiMode === 'CHAT' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setAiMode('CHAT')}
                className={aiMode === 'CHAT' ? 'bg-teal-600 hover:bg-teal-700' : ''}
              >
                CHAT
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-[60vh]">
          {/* Quick actions - pouze v EXAM režimu */}
          {aiMode === 'EXAM' && (
            <div className="flex flex-wrap gap-2 p-4 border-b border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))]">
              {examQuickActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    setMessages(prev => [...prev, { role: 'user', content: action.prompt }]);
                    await runLLM({ mode: action.mode, userPrompt: action.prompt, allowWeb: false });
                  }}
                  disabled={isLoading}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Info banner pro CHAT režim */}
          {aiMode === 'CHAT' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💬 CHAT režim: Volný rozhovor pro doplňující dotazy. Nepoužívá se pro generování oficiálních odpovědí.
              </p>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div ref={scrollRef} className="space-y-4">
              {messages.slice(1).map((msg, idx) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <div key={idx} className="space-y-2">
                    <ChatMessage
                      message={msg}
                      isStreaming={false}
                    />
                    {isAssistant ? (
                      <div className="pl-2 space-y-2">
                        <ConfidenceBadge confidence={msg.meta?.confidence} />
                        {msg.meta?.cache?.hit && (
                          <span className="inline-flex items-center text-xs text-[hsl(var(--mn-muted))]">
                            🔄 Cached response
                          </span>
                        )}
                        <SourcesBlock citations={msg.meta?.citations} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--mn-muted))]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generuji odpověď…
                </div>
              ) : null}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-[hsl(var(--mn-border))]">
            <div className="flex gap-2 mb-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Zeptejte se na cokoliv k této otázce…"
                className="min-h-[44px] max-h-[120px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isLoading ? (
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