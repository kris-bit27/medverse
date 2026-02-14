import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TopicNotes from '@/components/TopicNotes';
import FlashcardGenerator from '@/components/FlashcardGenerator';
import ReactMarkdown from 'react-markdown';
import {
  BookOpen, Zap, Layers, StickyNote, Sparkles,
  ArrowLeft, ChevronRight, Clock, FileText, AlertTriangle,
  Brain, CheckCircle2, Copy, Check, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

/* ─── Obor color map ─── */
const OBOR_COLORS = {
  'Chirurgie': { accent: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-400' },
  'Vnitřní lékařství': { accent: '#3b82f6', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  'Neurologie': { accent: '#a855f7', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  'Pediatrie': { accent: '#22c55e', bg: 'bg-green-500/10', text: 'text-green-400' },
  'Anesteziologie a intenzivní medicína': { accent: '#f97316', bg: 'bg-orange-500/10', text: 'text-orange-400' },
  'Gynekologie a porodnictví': { accent: '#ec4899', bg: 'bg-pink-500/10', text: 'text-pink-400' },
  'Interna': { accent: '#06b6d4', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
};
const getTheme = (name) => OBOR_COLORS[name] || { accent: '#64748b', bg: 'bg-slate-500/10', text: 'text-slate-400' };

/* ─── Reading progress bar ─── */
function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const winH = window.innerHeight;
      const docH = document.documentElement.scrollHeight - winH;
      setProgress(docH > 0 ? Math.min((window.scrollY / docH) * 100, 100) : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-slate-900">
      <div
        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/* ─── Content section tabs ─── */
const CONTENT_TABS = [
  { id: 'fulltext', label: 'Plný text', icon: BookOpen, field: 'full_text_content' },
  { id: 'highyield', label: 'High-Yield', icon: Zap, field: 'bullet_points_summary' },
  { id: 'deepdive', label: 'Deep Dive', icon: Layers, field: 'deep_dive_content' },
];

/* ─── Markdown renderer with enhanced styling ─── */
function MedicalMarkdown({ content }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-2 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title="Kopírovat text"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
      </button>
      <div className="prose prose-invert prose-slate max-w-none
        prose-headings:text-slate-100 prose-headings:font-semibold prose-headings:border-b prose-headings:border-slate-800 prose-headings:pb-2 prose-headings:mb-4
        prose-h2:text-xl prose-h2:mt-8
        prose-h3:text-lg prose-h3:border-0 prose-h3:pb-0
        prose-p:text-slate-300 prose-p:leading-relaxed
        prose-strong:text-violet-300 prose-strong:font-semibold
        prose-li:text-slate-300
        prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline
        prose-table:border-slate-700
        prose-th:bg-slate-800/50 prose-th:text-slate-300 prose-th:border-slate-700
        prose-td:border-slate-700/50 prose-td:text-slate-300
        prose-code:text-amber-300 prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded
        prose-blockquote:border-violet-500/50 prose-blockquote:bg-slate-800/30 prose-blockquote:rounded-r-lg prose-blockquote:py-1
      ">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

/* ─── Warning banner ─── */
function WarningsBanner({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-300 mb-2">Vyžaduje ověření</p>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-200/70 flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─── Sources section ─── */
function SourcesList({ sources }) {
  if (!sources?.length) return null;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Zdroje ({sources.length})
      </h4>
      <div className="flex flex-wrap gap-2">
        {sources.map((s, i) => (
          <Badge key={i} variant="outline" className="text-xs text-slate-400 border-slate-700 bg-slate-800/50">
            {typeof s === 'string' ? s : s.title || `Zdroj ${i + 1}`}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/* ─── AI metadata badge ─── */
function AIMetadata({ topic }) {
  if (!topic.ai_model) return null;
  const modelName = topic.ai_model.includes('opus') ? 'Opus 4' :
                    topic.ai_model.includes('sonnet') ? 'Sonnet 4' : topic.ai_model;
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Sparkles className="w-3.5 h-3.5 text-amber-500/60" />
      <span>{modelName}</span>
      {topic.ai_cost > 0 && <span>• ${Number(topic.ai_cost).toFixed(2)}</span>}
    </div>
  );
}

/* ─── Main ─── */
export default function TopicDetailV5() {
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('id');

  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('fulltext');
  const [showNotes, setShowNotes] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const contentRef = useRef(null);

  // Fetch topic
  const { data: topic, isLoading } = useQuery({
    queryKey: ['topic-v5', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select(`
          *,
          obory:obor_id(id, name, slug),
          okruhy:okruh_id(id, name, slug)
        `)
        .eq('id', topicId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!topicId
  });

  // Auto-select first available tab
  useEffect(() => {
    if (!topic) return;
    if (topic.full_text_content?.length > 100) { setActiveTab('fulltext'); return; }
    if (topic.bullet_points_summary?.length > 50) { setActiveTab('highyield'); return; }
    if (topic.deep_dive_content?.length > 50) { setActiveTab('deepdive'); return; }
  }, [topic]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-slate-700 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Načítám téma...</p>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-slate-300 mb-2">Téma nenalezeno</h2>
          <Button variant="outline" onClick={() => navigate(-1)} className="border-slate-700 text-slate-400">
            <ArrowLeft className="w-4 h-4 mr-2" /> Zpět
          </Button>
        </div>
      </div>
    );
  }

  const theme = getTheme(topic.obory?.name);
  const wordCount = topic.full_text_content ? Math.round(topic.full_text_content.split(/\s+/).length) : 0;
  const readTime = Math.max(1, Math.round(wordCount / 200));
  const currentContent = activeTab === 'fulltext' ? topic.full_text_content :
                         activeTab === 'highyield' ? topic.bullet_points_summary :
                         topic.deep_dive_content;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <ReadingProgress />

      {/* Header */}
      <div className="border-b border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <button onClick={() => navigate(createPageUrl('StudiumV2'))} className="hover:text-slate-300 transition-colors">
              Studium
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className={theme.text}>{topic.obory?.name}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-400">{topic.okruhy?.name}</span>
          </div>

          {/* Title area */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`text-xs ${theme.text} border-current/30 ${theme.bg}`}>
                  {topic.obory?.name}
                </Badge>
                <Badge variant="outline" className="text-xs text-slate-400 border-slate-700">
                  {topic.okruhy?.name}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">{topic.title}</h1>
              {topic.description && (
                <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{topic.description}</p>
              )}
              
              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <AIMetadata topic={topic} />
                {wordCount > 0 && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> ~{readTime} min čtení • {wordCount} slov
                  </span>
                )}
                {topic.sources?.length > 0 && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> {topic.sources.length} zdrojů
                  </span>
                )}
              </div>
            </div>

            {/* Back button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="border-slate-700 text-slate-400 hover:text-white shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Zpět
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6" ref={contentRef}>
        {/* Content Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {CONTENT_TABS.map(tab => {
            const hasContent = topic[tab.field]?.length > 50;
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => hasContent && setActiveTab(tab.id)}
                disabled={!hasContent}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : hasContent
                    ? 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:bg-slate-800/70 hover:text-slate-300'
                    : 'bg-slate-900/20 text-slate-600 border border-slate-800/50 cursor-not-allowed'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {hasContent && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Notes & Flashcards toggles */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              showNotes 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-900/50 text-slate-500 border border-slate-800 hover:text-slate-300'
            }`}
          >
            <StickyNote className="w-4 h-4" />
            <span className="hidden sm:inline">Poznámky</span>
          </button>
          <button
            onClick={() => setShowFlashcards(!showFlashcards)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              showFlashcards
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-slate-900/50 text-slate-500 border border-slate-800 hover:text-slate-300'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Kartičky</span>
          </button>
        </div>

        {/* Warnings */}
        <WarningsBanner warnings={topic.warnings} />

        {/* Main Content */}
        {currentContent ? (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/30 p-6 sm:p-8">
            <MedicalMarkdown content={currentContent} />
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">Obsah pro tento režim zatím není k dispozici</p>
          </div>
        )}

        {/* Sources */}
        {currentContent && (
          <div className="mt-4">
            <SourcesList sources={topic.sources} />
          </div>
        )}

        {/* Notes Section */}
        {showNotes && (
          <div className="mt-6 rounded-xl border border-amber-500/20 bg-slate-900/50 p-5">
            <TopicNotes topicId={topicId} />
          </div>
        )}

        {/* Flashcards Section */}
        {showFlashcards && (
          <div className="mt-6 rounded-xl border border-cyan-500/20 bg-slate-900/50 p-5">
            <FlashcardGenerator
              topicId={topicId}
              topicContent={topic.full_text_content || topic.bullet_points_summary}
            />
          </div>
        )}

        {/* Learning Objectives */}
        {topic.learning_objectives?.length > 0 && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-5">
            <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Cíle studia
            </h3>
            <ul className="space-y-2">
              {topic.learning_objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="text-violet-400 font-mono text-xs mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  {obj}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
