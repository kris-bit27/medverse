import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useStudyTracking } from '@/hooks/useStudyTracking';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TopicNotes from '@/components/TopicNotes';
import FlashcardGenerator from '@/components/FlashcardGenerator';
import ContentFeedback from '@/components/ContentFeedback';
import { FloatingCopilot } from '@/components/FloatingCopilot';
import MedicalContent, { extractToc, TableOfContents, useActiveTocId } from '@/components/MedicalContent';
import {
  BookOpen, Zap, Layers, StickyNote, Sparkles,
  ArrowLeft, ChevronRight, Clock, FileText, AlertTriangle,
  Brain, CheckCircle2, Copy, Check, List, PanelLeftClose
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

/* ─── Obor colors — dynamic ─── */
const _COLORS = [
  { text: 'text-red-500 dark:text-red-400', bg: 'bg-red-500/10' },
  { text: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500/10' },
  { text: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  { text: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-500/10' },
  { text: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-500/10' },
  { text: 'text-pink-500 dark:text-pink-400', bg: 'bg-pink-500/10' },
  { text: 'text-cyan-500 dark:text-cyan-400', bg: 'bg-cyan-500/10' },
  { text: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10' },
  { text: 'text-[hsl(var(--mn-accent))] dark:text-teal-400', bg: 'bg-teal-500/10' },
  { text: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-500/10' },
  { text: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-500/10' },
  { text: 'text-lime-500 dark:text-lime-400', bg: 'bg-lime-500/10' },
  { text: 'text-sky-500 dark:text-sky-400', bg: 'bg-sky-500/10' },
  { text: 'text-violet-500 dark:text-violet-400', bg: 'bg-violet-500/10' },
  { text: 'text-fuchsia-500 dark:text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
];
const _tc = {};
const getTheme = (n) => {
  if (!n) return { text: 'text-[hsl(var(--mn-accent))]', bg: 'bg-[hsl(var(--mn-accent)/0.1)]' };
  if (_tc[n]) return _tc[n];
  let h = 0;
  for (let i = 0; i < n.length; i++) h = ((h << 5) - h + n.charCodeAt(i)) | 0;
  _tc[n] = _COLORS[Math.abs(h) % _COLORS.length];
  return _tc[n];
};

const TABS = [
  { id: 'fulltext', label: 'Plný text', icon: BookOpen, field: 'full_text_content' },
  { id: 'highyield', label: 'High-Yield', icon: Zap, field: 'bullet_points_summary' },
  { id: 'deepdive', label: 'Deep Dive', icon: Layers, field: 'deep_dive_content' },
];

/* ─── Sub-components ─── */
function WarningsBanner({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <div className="rounded-xl border border-[hsl(var(--mn-warn)/0.3)] bg-[hsl(var(--mn-warn)/0.06)] p-4 mt-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[hsl(var(--mn-warn))] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-[hsl(var(--mn-warn))] mb-1">Vyžaduje ověření</p>
          {warnings.map((w, i) => (
            <p key={i} className="text-sm text-[hsl(var(--mn-warn)/0.8)]">
              {typeof w === 'string' ? w : w.message || JSON.stringify(w)}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function SourcesList({ sources }) {
  if (!sources?.length) return null;
  return (
    <div className="rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface))]/50 p-4">
      <h4 className="text-sm font-medium text-[hsl(var(--mn-muted))] mb-3 flex items-center gap-2 mn-ui-font">
        <FileText className="w-4 h-4" /> Zdroje ({sources.length})
      </h4>
      <div className="flex flex-wrap gap-2">
        {sources.map((s, i) => (
          <Badge key={i} variant="outline" className="text-xs">
            {typeof s === 'string' ? s : s.title || `Zdroj ${i + 1}`}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function AIMetadata({ topic }) {
  if (!topic.ai_model) return null;
  const name = topic.ai_model.includes('opus') ? 'Opus 4' : topic.ai_model.includes('sonnet') ? 'Sonnet 4' : topic.ai_model;
  return (
    <span className="text-xs text-[hsl(var(--mn-muted))] flex items-center gap-1.5">
      <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--mn-accent)/0.6)]" />
      {name}
      {topic.ai_confidence > 0 && <span>• {Math.round(topic.ai_confidence * 100)}%</span>}
    </span>
  );
}

function CopyBtn({ content }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(content); setOk(true); setTimeout(() => setOk(false), 2000); }}
      className="p-2 rounded-xl bg-[hsl(var(--mn-surface-2))]/80 text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] opacity-0 group-hover:opacity-100 transition-opacity"
      title="Kopírovat"
    >
      {ok ? <Check className="w-4 h-4 text-[hsl(var(--mn-accent))]" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

/* ═══════════════════════════════════════
   MAIN
   ═══════════════════════════════════════ */
export default function TopicDetailV5() {
  const topicId = new URLSearchParams(window.location.search).get('id');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('fulltext');
  const [showNotes, setShowNotes] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showToc, setShowToc] = useState(true);

  const activeId = useActiveTocId();

  // Study tracking — auto-records session open/close + duration
  const { trackEvent, trackTabSwitch } = useStudyTracking(topicId);

  // Track tab switches
  const handleTabSwitch = (tabId) => {
    setActiveTab(tabId);
    trackTabSwitch(tabId);
  };

  const { data: topic, isLoading } = useQuery({
    queryKey: ['topic-v5', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('*, obory:obor_id(id, name, slug), okruhy:okruh_id(id, name, slug)')
        .eq('id', topicId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!topicId
  });

  // Fetch content counts for this topic
  const { data: contentCounts } = useQuery({
    queryKey: ['topic-counts', topicId],
    queryFn: async () => {
      const [fc, q] = await Promise.all([
        supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('topic_id', topicId),
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topicId),
      ]);
      return { flashcards: fc.count || 0, questions: q.count || 0 };
    },
    enabled: !!topicId
  });

  useEffect(() => {
    if (!topic) return;
    if (topic.full_text_content?.length > 100) { setActiveTab('fulltext'); return; }
    if (topic.bullet_points_summary?.length > 50) { setActiveTab('highyield'); return; }
    if (topic.deep_dive_content?.length > 50) setActiveTab('deepdive');
  }, [topic]);

  const currentContent = topic ? (
    activeTab === 'fulltext' ? topic.full_text_content :
    activeTab === 'highyield' ? topic.bullet_points_summary :
    topic.deep_dive_content
  ) : null;

  const toc = useMemo(() => extractToc(currentContent), [currentContent]);
  const hasToc = toc.length > 2;

  // Loading / not found
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--mn-bg))] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[hsl(var(--mn-accent))] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!topic) {
    return (
      <div className="min-h-screen bg-[hsl(var(--mn-bg))] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-[hsl(var(--mn-muted))] dark:text-[hsl(var(--mn-muted))] mb-2">Téma nenalezeno</h2>
          <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" /> Zpět</Button>
        </div>
      </div>
    );
  }

  const theme = getTheme(topic.obory?.name);
  const wordCount = topic.full_text_content ? Math.round(topic.full_text_content.split(/\s+/).length) : 0;
  const readTime = Math.max(1, Math.round(wordCount / 200));
  const sidebarOpen = showNotes || showFlashcards;

  return (
    <div className="min-h-screen bg-[hsl(var(--mn-bg))]">

      {/* ── Sticky Header ── */}
      <div className="border-b border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface))] sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--mn-muted))] mn-ui-font min-w-0">
              <button onClick={() => navigate(createPageUrl('StudiumV2'))} className="hover:text-[hsl(var(--mn-accent))] transition-colors shrink-0">
                Studium
              </button>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              <span className={`${theme.text} shrink-0`}>{topic.obory?.name}</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 hidden sm:block" />
              <span className="text-[hsl(var(--mn-muted))] truncate hidden sm:block">{topic.okruhy?.name}</span>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* TOC toggle */}
              {hasToc && (
                <button
                  onClick={() => setShowToc(!showToc)}
                  className={`p-2 rounded-xl border transition-all mn-ui-font text-sm ${
                    showToc
                      ? 'bg-[hsl(var(--mn-accent)/0.1)] text-[hsl(var(--mn-accent))] border-[hsl(var(--mn-accent)/0.3)]'
                      : 'bg-[hsl(var(--mn-elevated))] text-[hsl(var(--mn-muted))] border-[hsl(var(--mn-border))]'
                  }`}
                  title={showToc ? 'Skrýt obsah' : 'Zobrazit obsah'}
                >
                  {showToc ? <PanelLeftClose className="w-4 h-4" /> : <List className="w-4 h-4" />}
                </button>
              )}

              <button onClick={() => { setShowNotes(!showNotes); setShowFlashcards(false); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all mn-ui-font ${
                  showNotes ? 'bg-[hsl(var(--mn-warn)/0.1)] text-[hsl(var(--mn-warn))] border-[hsl(var(--mn-warn)/0.3)]'
                  : 'bg-[hsl(var(--mn-elevated))] text-[hsl(var(--mn-muted))] border-[hsl(var(--mn-border))]'
                }`}>
                <StickyNote className="w-4 h-4" />
                <span className="hidden sm:inline">Poznámky</span>
              </button>
              <button onClick={() => { setShowFlashcards(!showFlashcards); setShowNotes(false); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all mn-ui-font ${
                  showFlashcards ? 'bg-[hsl(var(--mn-accent)/0.1)] text-[hsl(var(--mn-accent))] border-[hsl(var(--mn-accent)/0.3)]'
                  : 'bg-[hsl(var(--mn-elevated))] text-[hsl(var(--mn-muted))] border-[hsl(var(--mn-border))]'
                }`}>
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline">Kartičky</span>
                {contentCounts?.flashcards > 0 && (
                  <span className="text-[10px] bg-[hsl(var(--mn-accent)/0.2)] text-[hsl(var(--mn-accent))] px-1.5 py-0.5 rounded-full font-bold">{contentCounts.flashcards}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Title section ── */}
      <div className="bg-[hsl(var(--mn-surface))] border-b border-[hsl(var(--mn-border))]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={`text-xs ${theme.text} border-current/30 ${theme.bg}`}>{topic.obory?.name}</Badge>
            <Badge variant="outline" className="text-xs text-[hsl(var(--mn-muted))] border-[hsl(var(--mn-border))]">{topic.okruhy?.name}</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--mn-text))] mb-2 mn-serif-font" style={{ letterSpacing: '-0.02em' }}>
            {topic.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mn-ui-font">
            <AIMetadata topic={topic} />
            {wordCount > 0 && (
              <span className="text-xs text-[hsl(var(--mn-muted))] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> ~{readTime} min
              </span>
            )}
            {contentCounts?.flashcards > 0 && (
              <span className="text-xs text-[hsl(var(--mn-accent))] flex items-center gap-1">
                <Brain className="w-3.5 h-3.5" /> {contentCounts.flashcards} kartiček
              </span>
            )}
            {contentCounts?.questions > 0 && (
              <Link to={`${createPageUrl('TestGeneratorV2')}`} 
                className="text-xs text-[hsl(var(--mn-accent-2))] hover:text-[hsl(var(--mn-accent))] flex items-center gap-1 transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5" /> {contentCounts.questions} otázek
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">

        {/* Tabs + Feedback */}
        <div className="flex items-center justify-between gap-2 mb-5">
          <div className="inline-flex gap-1 p-1 rounded-xl bg-[hsl(var(--mn-surface-2))] border border-[hsl(var(--mn-border))]">
            {TABS.map(tab => {
              const has = topic[tab.field]?.length > 50;
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => has && handleTabSwitch(tab.id)} disabled={!has}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all mn-ui-font ${
                    active ? 'bg-[hsl(var(--mn-elevated))]/80 text-[hsl(var(--mn-text))] shadow-sm'
                    : has ? 'text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))]'
                    : 'text-[hsl(var(--mn-muted))] cursor-not-allowed'
                  }`}>
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {has && active && <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                </button>
              );
            })}
          </div>
          <ContentFeedback topicId={topicId} topicTitle={topic.title} />
        </div>

        {/* ── Main grid: TOC | Content | Sidebar ── */}
        <div className="flex gap-6 items-start">

          {/* TOC — left column, collapsible */}
          {showToc && hasToc && !sidebarOpen && (
            <div className="hidden lg:block w-56 xl:w-64 shrink-0 sticky top-[120px]">
              <TableOfContents toc={toc} activeId={activeId} topicTitle={topic.title} onClose={() => setShowToc(false)} />
            </div>
          )}

          {/* Content — flexible center */}
          <div className="flex-1 min-w-0">
            {currentContent ? (
              <div className="group relative rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface))] shadow-sm">
                <div className="absolute top-4 right-4 z-10">
                  <CopyBtn content={currentContent} />
                </div>
                <div className="p-5 sm:p-8">
                  <MedicalContent content={currentContent} />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface))] p-12 text-center">
                <BookOpen className="w-12 h-12 text-[hsl(var(--mn-muted))] dark:text-slate-700 mx-auto mb-3" />
                <p className="text-[hsl(var(--mn-muted))] font-medium mb-1">Obsah se připravuje</p>
                <p className="text-sm text-[hsl(var(--mn-muted))] mb-4">Toto téma bude brzy dostupné s plným textem, kartičkami a testovými otázkami.</p>
                {contentCounts?.flashcards > 0 && (
                  <p className="text-xs text-[hsl(var(--mn-accent))]">✓ {contentCounts.flashcards} kartiček už je připraveno</p>
                )}
              </div>
            )}

            {/* Warnings / Verification needed */}
            {currentContent && <WarningsBanner warnings={topic.warnings} />}

            {/* Sources */}
            {currentContent && topic.sources?.length > 0 && (
              <div className="mt-4"><SourcesList sources={topic.sources} /></div>
            )}

            {/* Learning Objectives */}
            {topic.learning_objectives?.length > 0 && (
              <div className="mt-4 rounded-xl border border-teal-100 dark:border-teal-900/30 bg-teal-50/50 dark:bg-teal-950/10 p-5">
                <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-3 flex items-center gap-2 mn-ui-font">
                  <CheckCircle2 className="w-4 h-4" /> Cíle studia
                </h3>
                <ul className="space-y-2">
                  {topic.learning_objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[hsl(var(--mn-muted))]">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right sidebar — notes or flashcards */}
          {sidebarOpen && (
            <div className="hidden lg:block w-80 xl:w-96 shrink-0 sticky top-[120px] max-h-[calc(100vh-140px)] overflow-y-auto">
              {showNotes && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-[hsl(var(--mn-surface))] p-5">
                  <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3 flex items-center gap-2 mn-ui-font">
                    <StickyNote className="w-4 h-4" /> Moje poznámky
                  </h3>
                  <TopicNotes topicId={topicId} />
                </div>
              )}
              {showFlashcards && (
                <div className="rounded-xl border border-teal-200 dark:border-teal-500/20 bg-[hsl(var(--mn-surface))] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-2 mn-ui-font">
                      <Brain className="w-4 h-4" /> AI Kartičky
                    </h3>
                    {contentCounts?.flashcards > 0 && (
                      <Link to={`${createPageUrl('ReviewToday')}?topic=${topicId}`}
                        className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-medium">
                        Procvičit →
                      </Link>
                    )}
                  </div>
                  <FlashcardGenerator topicId={topicId} topicContent={topic.full_text_content || topic.bullet_points_summary} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile: notes/flashcards below content */}
        {sidebarOpen && (
          <div className="lg:hidden mt-6">
            {showNotes && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-[hsl(var(--mn-surface))] p-5">
                <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3 flex items-center gap-2 mn-ui-font">
                  <StickyNote className="w-4 h-4" /> Moje poznámky
                </h3>
                <TopicNotes topicId={topicId} />
              </div>
            )}
            {showFlashcards && (
              <div className="rounded-xl border border-teal-200 dark:border-teal-500/20 bg-[hsl(var(--mn-surface))] p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-2 mn-ui-font">
                    <Brain className="w-4 h-4" /> AI Kartičky
                  </h3>
                  {contentCounts?.flashcards > 0 && (
                    <Link to={`${createPageUrl('ReviewToday')}?topic=${topicId}`}
                      className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-medium">
                      Procvičit →
                    </Link>
                  )}
                </div>
                <FlashcardGenerator topicId={topicId} topicContent={topic.full_text_content || topic.bullet_points_summary} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating AI Copilot */}
      <FloatingCopilot 
        topicContent={topic.full_text_content || topic.bullet_points_summary || ''} 
        topicTitle={topic.title}
        topicId={topicId}
      />
    </div>
  );
}
