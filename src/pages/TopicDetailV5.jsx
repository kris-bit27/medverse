import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TopicNotes from '@/components/TopicNotes';
import FlashcardGenerator from '@/components/FlashcardGenerator';
import MedicalContent from '@/components/MedicalContent';
import {
  BookOpen, Zap, Layers, StickyNote, Sparkles,
  ArrowLeft, ChevronRight, Clock, FileText, AlertTriangle,
  Brain, CheckCircle2, Copy, Check
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
const getTheme = (name) => OBOR_COLORS[name] || { accent: '#14b8a6', bg: 'bg-teal-500/10', text: 'text-teal-400' };

/* ─── Content tabs config ─── */
const CONTENT_TABS = [
  { id: 'fulltext', label: 'Plný text', icon: BookOpen, field: 'full_text_content' },
  { id: 'highyield', label: 'High-Yield', icon: Zap, field: 'bullet_points_summary' },
  { id: 'deepdive', label: 'Deep Dive', icon: Layers, field: 'deep_dive_content' },
];

/* ─── Warning banner ─── */
function WarningsBanner({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-300 mb-2">Vyžaduje ověření</p>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-200/70 flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                {typeof w === 'string' ? w : w.message || JSON.stringify(w)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─── Sources ─── */
function SourcesList({ sources }) {
  if (!sources?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
      <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2 mn-ui-font">
        <FileText className="w-4 h-4" />
        Zdroje ({sources.length})
      </h4>
      <div className="flex flex-wrap gap-2">
        {sources.map((s, i) => (
          <Badge key={i} variant="outline" className="text-xs text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700">
            {typeof s === 'string' ? s : s.title || `Zdroj ${i + 1}`}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/* ─── AI metadata ─── */
function AIMetadata({ topic }) {
  if (!topic.ai_model) return null;
  const modelName = topic.ai_model.includes('opus') ? 'Opus 4' :
                    topic.ai_model.includes('sonnet') ? 'Sonnet 4' : topic.ai_model;
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Sparkles className="w-3.5 h-3.5 text-teal-500/60" />
      <span>{modelName}</span>
      {topic.ai_confidence > 0 && <span>• {Math.round(topic.ai_confidence * 100)}%</span>}
      {topic.ai_cost > 0 && <span>• ${Number(topic.ai_cost).toFixed(2)}</span>}
    </div>
  );
}

/* ─── Copy button ─── */
function CopyButton({ content }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-400 hover:text-slate-700 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
      title="Kopírovat text"
    >
      {copied ? <Check className="w-4 h-4 text-teal-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════ */
export default function TopicDetailV5() {
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('id');

  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('fulltext');
  const [showNotes, setShowNotes] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);

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

  // Auto-select first available tab
  useEffect(() => {
    if (!topic) return;
    if (topic.full_text_content?.length > 100) { setActiveTab('fulltext'); return; }
    if (topic.bullet_points_summary?.length > 50) { setActiveTab('highyield'); return; }
    if (topic.deep_dive_content?.length > 50) setActiveTab('deepdive');
  }, [topic]);

  /* ─── Loading / Not found ─── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0c0f16] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0c0f16] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-slate-600 dark:text-slate-300 mb-2">Téma nenalezeno</h2>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Zpět
          </Button>
        </div>
      </div>
    );
  }

  const theme = getTheme(topic.obory?.name);
  const wordCount = topic.full_text_content ? Math.round(topic.full_text_content.split(/\s+/).length) : 0;
  const readTime = Math.max(1, Math.round(wordCount / 200));
  const currentContent = activeTab === 'fulltext' ? topic.full_text_content
    : activeTab === 'highyield' ? topic.bullet_points_summary
    : topic.deep_dive_content;

  /* ─── Render ─── */
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c0f16]">

      {/* ── Header ── */}
      <div className="border-b border-slate-200 dark:border-[#2a2f42] bg-white dark:bg-[#131620]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-[#5f637a] mb-4 mn-ui-font">
            <button onClick={() => navigate(createPageUrl('StudiumV2'))} className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Studium
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className={theme.text}>{topic.obory?.name}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 dark:text-slate-400">{topic.okruhy?.name}</span>
          </div>

          {/* Title */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`text-xs ${theme.text} border-current/30 ${theme.bg}`}>
                  {topic.obory?.name}
                </Badge>
                <Badge variant="outline" className="text-xs text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700">
                  {topic.okruhy?.name}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#e8eaef] mb-3 mn-serif-font" style={{ letterSpacing: '-0.02em' }}>
                {topic.title}
              </h1>
              {topic.description && (
                <p className="text-slate-500 dark:text-[#9498b0] text-sm leading-relaxed max-w-2xl">{topic.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-4 mn-ui-font">
                <AIMetadata topic={topic} />
                {wordCount > 0 && (
                  <span className="text-xs text-slate-400 dark:text-[#5f637a] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> ~{readTime} min • {wordCount} slov
                  </span>
                )}
                {topic.sources?.length > 0 && (
                  <span className="text-xs text-slate-400 dark:text-[#5f637a] flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> {topic.sources.length} zdrojů
                  </span>
                )}
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => navigate(-1)}
              className="border-slate-300 dark:border-[#2a2f42] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shrink-0">
              <ArrowLeft className="w-4 h-4 mr-1" /> Zpět
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* Tabs bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="inline-flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#191d29] border border-slate-200 dark:border-[#2a2f42]">
            {CONTENT_TABS.map(tab => {
              const hasContent = topic[tab.field]?.length > 50;
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => hasContent && setActiveTab(tab.id)} disabled={!hasContent}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all mn-ui-font ${
                    isActive ? 'bg-white dark:bg-[#1f2333] text-slate-900 dark:text-[#e8eaef] shadow-sm'
                    : hasContent ? 'text-slate-500 dark:text-[#5f637a] hover:text-slate-700 dark:hover:text-[#9498b0]'
                    : 'text-slate-300 dark:text-[#2a2f42] cursor-not-allowed'
                  }`}>
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {hasContent && isActive && <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          <button onClick={() => { setShowNotes(!showNotes); setShowFlashcards(false); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all border mn-ui-font ${
              showNotes ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
              : 'bg-white dark:bg-[#191d29] text-slate-500 dark:text-[#5f637a] border-slate-200 dark:border-[#2a2f42] hover:text-slate-700 dark:hover:text-slate-300'
            }`}>
            <StickyNote className="w-4 h-4" />
            <span className="hidden sm:inline">Poznámky</span>
          </button>
          <button onClick={() => { setShowFlashcards(!showFlashcards); setShowNotes(false); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all border mn-ui-font ${
              showFlashcards ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/30'
              : 'bg-white dark:bg-[#191d29] text-slate-500 dark:text-[#5f637a] border-slate-200 dark:border-[#2a2f42] hover:text-slate-700 dark:hover:text-slate-300'
            }`}>
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Kartičky</span>
          </button>
        </div>

        <WarningsBanner warnings={topic.warnings} />

        {/* ── Main Content Card ── */}
        {currentContent ? (
          <div className="group relative rounded-xl border border-slate-200 dark:border-[#2a2f42] bg-white dark:bg-[#131620] shadow-sm">
            <div className="absolute top-4 right-4 z-10">
              <CopyButton content={currentContent} />
            </div>
            <div className="p-6 sm:p-8 lg:p-10">
              <MedicalContent
                content={currentContent}
                showToc={!showNotes && !showFlashcards}
                topicTitle={topic.title}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-[#2a2f42] bg-white dark:bg-[#131620] p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 dark:text-[#5f637a]">Obsah pro tento režim zatím není k dispozici</p>
          </div>
        )}

        {currentContent && topic.sources?.length > 0 && (
          <div className="mt-4"><SourcesList sources={topic.sources} /></div>
        )}

        {/* ── Notes ── */}
        {showNotes && (
          <div className="mt-6 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-white dark:bg-[#131620] p-5">
            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3 flex items-center gap-2 mn-ui-font">
              <StickyNote className="w-4 h-4" /> Moje poznámky
            </h3>
            <TopicNotes topicId={topicId} />
          </div>
        )}

        {/* ── Flashcards ── */}
        {showFlashcards && (
          <div className="mt-6 rounded-xl border border-teal-200 dark:border-teal-500/20 bg-white dark:bg-[#131620] p-5">
            <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-300 mb-3 flex items-center gap-2 mn-ui-font">
              <Brain className="w-4 h-4" /> AI Kartičky
            </h3>
            <FlashcardGenerator topicId={topicId} topicContent={topic.full_text_content || topic.bullet_points_summary} />
          </div>
        )}

        {/* ── Learning Objectives ── */}
        {topic.learning_objectives?.length > 0 && (
          <div className="mt-6 rounded-xl border border-teal-100 dark:border-teal-900/30 bg-teal-50/50 dark:bg-teal-950/10 p-5">
            <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-3 flex items-center gap-2 mn-ui-font">
              <CheckCircle2 className="w-4 h-4" /> Cíle studia
            </h3>
            <ul className="space-y-2">
              {topic.learning_objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
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
