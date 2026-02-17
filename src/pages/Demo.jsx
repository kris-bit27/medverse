import MedVerseLogo from "@/components/MedVerseLogo";
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import MedicalContent from '@/components/MedicalContent';
import {
  ArrowRight, BookOpen, Brain, Zap, RefreshCw, 
  CheckCircle2, XCircle, Loader2, GraduationCap, Sparkles,
  Clock, FileText, Layers
} from 'lucide-react';

const loginUrl = `/login?redirectTo=${encodeURIComponent('/Dashboard')}`;

// Specific obory to show in demo
const DEMO_OBORY = ['Kardiologie', 'Chirurgie', 'Pediatrie', 'Gynekologie a porodnictví', 'Ortopedie a traumatologie pohybového ústrojí'];

// ─── Flashcard component ───
function FlashcardDemo({ cards }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[idx];
  if (!card) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-[hsl(var(--mn-muted))]">
        <span>{card.obor}</span>
        <span>{idx + 1} / {cards.length}</span>
      </div>
      <div
        onClick={() => setFlipped(!flipped)}
        className="relative min-h-[220px] rounded-2xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface))] p-6 cursor-pointer hover:border-[hsl(var(--mn-accent)/0.4)] transition-all group"
      >
        <div className="absolute top-4 right-4">
          <Badge variant="outline" className="text-[10px]">
            {flipped ? 'Odpověď' : 'Otázka'}
          </Badge>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={flipped ? 'back' : 'front'}
            initial={{ opacity: 0, rotateX: -15 }}
            animate={{ opacity: 1, rotateX: 0 }}
            exit={{ opacity: 0, rotateX: 15 }}
            transition={{ duration: 0.2 }}
            className="pt-4"
          >
            {!flipped ? (
              <p className="text-lg font-medium leading-relaxed">{card.question}</p>
            ) : (
              <div>
                <p className="text-base leading-relaxed text-[hsl(var(--mn-muted))]">{card.answer}</p>
                <p className="text-xs text-[hsl(var(--mn-muted))] mt-4 italic">📖 {card.topic}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-[hsl(var(--mn-muted))] group-hover:text-[hsl(var(--mn-accent))] transition-colors">
          Klikněte pro {flipped ? 'otázku' : 'odpověď'}
        </p>
      </div>
      <div className="flex justify-center gap-2">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIdx(i); setFlipped(false); }}
            className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-[hsl(var(--mn-accent))] w-6' : 'bg-[hsl(var(--mn-border))]'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── MCQ component ───
function MCQDemo({ questions }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const q = questions[idx];
  if (!q) return null;

  const handleSelect = (key) => {
    if (selected) return;
    setSelected(key);
    setShowExplanation(true);
  };

  const nextQ = () => {
    setIdx((idx + 1) % questions.length);
    setSelected(null);
    setShowExplanation(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-[hsl(var(--mn-muted))]">
        <Badge variant="outline" className="text-[10px]">{q.obor}</Badge>
        <span>{idx + 1} / {questions.length}</span>
      </div>
      <p className="text-base font-medium leading-relaxed">{q.question_text}</p>
      <div className="space-y-2">
        {Object.entries(q.options || {}).map(([key, text]) => {
          const isCorrect = key === q.correct_answer;
          const isSelected = key === selected;
          let cls = 'border-[hsl(var(--mn-border))] hover:border-[hsl(var(--mn-accent)/0.4)]';
          if (selected) {
            if (isCorrect) cls = 'border-emerald-500 bg-emerald-500/10';
            else if (isSelected) cls = 'border-red-500 bg-red-500/10';
            else cls = 'border-[hsl(var(--mn-border))] opacity-50';
          }
          return (
            <button key={key} onClick={() => handleSelect(key)} disabled={!!selected}
              className={`w-full text-left p-4 rounded-xl border ${cls} transition-all flex items-start gap-3`}
            >
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                selected && isCorrect ? 'bg-emerald-500 text-white' :
                selected && isSelected ? 'bg-red-500 text-white' :
                'bg-[hsl(var(--mn-surface-2))]'
              }`}>
                {selected && isCorrect ? <CheckCircle2 className="w-4 h-4" /> :
                 selected && isSelected ? <XCircle className="w-4 h-4" /> : key}
              </span>
              <span className="text-sm leading-relaxed">{text}</span>
            </button>
          );
        })}
      </div>
      {showExplanation && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-[hsl(var(--mn-surface-2))] border border-[hsl(var(--mn-border))] text-sm leading-relaxed text-[hsl(var(--mn-muted))]"
        >
          <p className="font-medium text-[hsl(var(--mn-text))] mb-1">Vysvětlení:</p>
          {q.explanation}
        </motion.div>
      )}
      {selected && (
        <Button onClick={nextQ} variant="outline" className="w-full">
          Další otázka <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
}

// ─── Topic preview — portal style ───
function TopicPreview({ topic }) {
  const [mode, setMode] = useState('fulltext');
  if (!topic) return null;

  const content = mode === 'fulltext' ? topic.full_text_content : topic.bullet_points_summary;
  const wordCount = topic.full_text_content ? Math.round(topic.full_text_content.split(/\s+/).length) : 0;
  const readTime = Math.max(1, Math.round(wordCount / 200));

  // Truncate for demo — show first ~3000 chars then fade out
  const truncated = content ? content.slice(0, 4000) : '';
  const isTruncated = content && content.length > 4000;

  return (
    <div className="space-y-4">
      {/* Topic header — mirroring TopicDetailV5 style */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs text-teal-600 dark:text-teal-400 border-teal-500/30 bg-teal-500/10">{topic.obor}</Badge>
          {topic.okruh && <Badge variant="outline" className="text-xs text-[hsl(var(--mn-muted))] border-[hsl(var(--mn-border))]">{topic.okruh}</Badge>}
        </div>
        <h3 className="text-xl sm:text-2xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
          {topic.title}
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[hsl(var(--mn-muted))]">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-teal-500" /> {topic.ai_model?.includes('opus') ? 'Opus 4' : 'Sonnet 4'}
          </span>
          {wordCount > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> ~{readTime} min
            </span>
          )}
        </div>
      </div>

      {/* Content tabs — matching TopicDetailV5 */}
      <div className="inline-flex gap-1 p-1 rounded-xl bg-[hsl(var(--mn-surface-2))] border border-[hsl(var(--mn-border))]">
        {[
          { id: 'fulltext', label: 'Plný text', icon: BookOpen, has: !!topic.full_text_content },
          { id: 'highyield', label: 'High-Yield', icon: Zap, has: !!topic.bullet_points_summary },
        ].map(tab => (
          <button key={tab.id} onClick={() => tab.has && setMode(tab.id)} disabled={!tab.has}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === tab.id
                ? 'bg-[hsl(var(--mn-surface))] text-[hsl(var(--mn-text))] shadow-sm'
                : tab.has
                ? 'text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))]'
                : 'text-[hsl(var(--mn-muted))] opacity-40 cursor-not-allowed'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.has && mode === tab.id && <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
          </button>
        ))}
      </div>

      {/* Content — using MedicalContent component like the real portal */}
      <div className="relative rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface))] shadow-sm">
        <div className="p-5 sm:p-8">
          <MedicalContent content={truncated} />
        </div>
        {/* Fade overlay if truncated */}
        {isTruncated && (
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[hsl(var(--mn-surface))] via-[hsl(var(--mn-surface)/0.8)] to-transparent rounded-b-xl flex items-end justify-center pb-6">
            <Button
              className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)] text-white shadow-lg"
              onClick={() => window.location.href = loginUrl}
            >
              Zaregistrujte se pro plný obsah
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN DEMO ───
export default function Demo() {
  const [activeTab, setActiveTab] = useState('topic');
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Fetch 1 good topic per target obor
        const picks = [];
        for (const oborName of DEMO_OBORY) {
          const { data } = await supabase.from('topics')
            .select('id, title, full_text_content, bullet_points_summary, ai_model, obory:obor_id(name), okruhy:okruh_id(name)')
            .not('full_text_content', 'is', null)
            .not('bullet_points_summary', 'is', null)
            .eq('obory.name', oborName)
            .order('title')
            .limit(50);
          // Filter to ones that actually matched the obor join and have good content
          const matched = (data || []).filter(t => t.obory?.name === oborName && (t.full_text_content?.length || 0) > 5000);
          if (matched.length) {
            const pick = matched[Math.floor(Math.random() * matched.length)];
            picks.push({ ...pick, obor: pick.obory?.name, okruh: pick.okruhy?.name });
          }
        }
        setTopics(picks);
        if (picks.length) setSelectedTopic(picks[0]);

        // Fetch flashcards from picked topics
        if (picks.length) {
          const { data: fc } = await supabase.from('flashcards')
            .select('question, answer, difficulty, topics:topic_id(title, obory:obor_id(name))')
            .in('topic_id', picks.map(p => p.id))
            .limit(50);
          const mapped = (fc || []).filter(f => f.question && f.answer).map(f => ({
            question: f.question, answer: f.answer,
            topic: f.topics?.title, obor: f.topics?.obory?.name || '',
          }));
          setFlashcards(mapped.sort(() => Math.random() - 0.5).slice(0, 8));
        }

        // Fetch MCQs from different obory for variety
        const { data: mcq } = await supabase.from('questions')
          .select('question_text, options, correct_answer, explanation, topics:topic_id(title, obory:obor_id(name))')
          .not('options', 'is', null)
          .not('explanation', 'is', null)
          .limit(100);
        const goodMcq = (mcq || []).filter(q => q.options && Object.keys(q.options).length >= 3 && q.explanation?.length > 40);
        setQuestions(goodMcq.sort(() => Math.random() - 0.5).slice(0, 5).map(q => ({
          ...q, obor: q.topics?.obory?.name || ''
        })));
      } catch (e) {
        console.error('Demo fetch error:', e);
      }
      setLoading(false);
    })();
  }, []);

  const tabs = [
    { id: 'topic', label: 'Studijní obsah', icon: BookOpen, desc: 'Full-text a high-yield shrnutí' },
    { id: 'flashcards', label: 'Kartičky', icon: Brain, desc: 'Spaced repetition flashcards' },
    { id: 'mcq', label: 'Testové otázky', icon: Zap, desc: 'MCQ s vysvětlením' },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--mn-bg))] text-[hsl(var(--mn-text))]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--mn-bg)/0.85)] backdrop-blur-xl border-b border-[hsl(var(--mn-border)/0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to={createPageUrl('Landing')} className="flex items-center gap-3">
            <MedVerseLogo size={36} />
            <span className="font-bold text-lg">MedVerse</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-[hsl(var(--mn-muted))]" onClick={() => window.location.href = loginUrl}>
              Přihlásit se
            </Button>
            <Button size="sm" className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)] text-white" onClick={() => window.location.href = loginUrl}>
              Začít zdarma <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-28 pb-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          <Badge variant="outline" className="mb-4">
            <GraduationCap className="w-3 h-3 mr-1" /> Živá ukázka z databáze
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Vyzkoušejte reálný obsah MedVerse
          </h1>
          <p className="text-[hsl(var(--mn-muted))] max-w-xl mx-auto">
            Vše co vidíte je skutečný AI-generovaný obsah z naší databáze — studijní materiály, flashcards a testové otázky napříč obory.
          </p>
        </div>
      </section>

      {/* Tabs + Content */}
      <section className="pb-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Tab selector */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  activeTab === tab.id
                    ? 'border-[hsl(var(--mn-accent)/0.5)] bg-[hsl(var(--mn-accent)/0.05)]'
                    : 'border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface)/0.5)] hover:border-[hsl(var(--mn-accent)/0.2)]'
                }`}
              >
                <tab.icon className={`w-5 h-5 mb-2 ${activeTab === tab.id ? 'text-[hsl(var(--mn-accent))]' : 'text-[hsl(var(--mn-muted))]'}`} />
                <p className="text-sm font-semibold">{tab.label}</p>
                <p className="text-xs text-[hsl(var(--mn-muted))] mt-0.5 hidden sm:block">{tab.desc}</p>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-[hsl(var(--mn-accent))]" />
              <p className="text-sm text-[hsl(var(--mn-muted))]">Načítám obsah z databáze…</p>
            </div>
          ) : (
            <div>
              {/* ─── TOPIC TAB ─── */}
              {activeTab === 'topic' && (
                <div className="grid lg:grid-cols-[220px_1fr] gap-6">
                  {/* Sidebar — topic list */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[hsl(var(--mn-muted))] uppercase tracking-wider mb-2 px-1">Témata z 5 oborů</p>
                    {topics.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTopic(t)}
                        className={`w-full text-left p-3 rounded-xl text-sm transition-all ${
                          selectedTopic?.id === t.id
                            ? 'bg-[hsl(var(--mn-accent)/0.1)] border border-[hsl(var(--mn-accent)/0.3)]'
                            : 'hover:bg-[hsl(var(--mn-surface-2))] border border-transparent'
                        }`}
                      >
                        <p className="font-medium leading-tight line-clamp-2">{t.title}</p>
                        <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">{t.obor}</p>
                      </button>
                    ))}
                  </div>
                  {/* Main content */}
                  <TopicPreview topic={selectedTopic} />
                </div>
              )}

              {/* ─── FLASHCARDS TAB ─── */}
              {activeTab === 'flashcards' && (
                <Card className="border-[hsl(var(--mn-border))] max-w-2xl mx-auto">
                  <CardContent className="p-6">
                    {flashcards.length ? <FlashcardDemo cards={flashcards} /> :
                    <p className="text-center py-12 text-[hsl(var(--mn-muted))]">Žádné kartičky k zobrazení</p>}
                  </CardContent>
                </Card>
              )}

              {/* ─── MCQ TAB ─── */}
              {activeTab === 'mcq' && (
                <Card className="border-[hsl(var(--mn-border))] max-w-2xl mx-auto">
                  <CardContent className="p-6">
                    {questions.length ? <MCQDemo questions={questions} /> :
                    <p className="text-center py-12 text-[hsl(var(--mn-muted))]">Žádné otázky k zobrazení</p>}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 relative rounded-3xl border border-[hsl(var(--mn-accent)/0.3)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--mn-accent)/0.1)] via-transparent to-[hsl(var(--mn-accent-2)/0.05)]" />
            <div className="relative p-8 sm:p-10 text-center">
              <h2 className="text-xl sm:text-2xl font-bold mb-3">Líbí se vám obsah?</h2>
              <p className="text-[hsl(var(--mn-muted))] mb-6 max-w-md mx-auto text-sm">
                Zaregistrujte se a získejte plný přístup ke všem 1 468 tématům, flashcards, testům a AI copilotu.
              </p>
              <Button
                size="lg"
                className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)] text-white shadow-lg shadow-[hsl(var(--mn-accent)/0.25)]"
                onClick={() => window.location.href = loginUrl}
              >
                Vytvořit účet zdarma <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
