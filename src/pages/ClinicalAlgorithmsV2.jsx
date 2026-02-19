import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  GitBranch, Search, ArrowLeft, ChevronRight, RotateCcw, ArrowRight,
  Heart, Brain, Activity, Wind, Stethoscope, AlertTriangle, Zap, HeartPulse,
  CheckCircle, XCircle, ArrowDown,
} from 'lucide-react';

const ICONS = { Heart, Brain, Activity, Wind, Stethoscope, AlertTriangle, Zap, HeartPulse, GitBranch };

const CAT_CONFIG = {
  'urgentní': { label: 'Urgentní medicína', color: '#ef4444' },
  'kardiologie': { label: 'Kardiologie', color: '#ec4899' },
  'interní': { label: 'Interní medicína', color: '#10b981' },
  'neurologie': { label: 'Neurologie', color: '#a855f7' },
  'pneumologie': { label: 'Pneumologie', color: '#3b82f6' },
};

const STEP_COLORS = {
  green: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.4)', text: '#22c55e', icon: CheckCircle },
  red: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.4)', text: '#ef4444', icon: XCircle },
  orange: { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.4)', text: '#f97316', icon: AlertTriangle },
};

export default function ClinicalAlgorithmsV2() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialAlgo = searchParams.get('algo') || null;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAlgo, setSelectedAlgo] = useState(null);
  const [currentStepId, setCurrentStepId] = useState(null);
  const [history, setHistory] = useState([]);

  const { data: algorithms = [], isLoading } = useQuery({
    queryKey: ['clinical-algorithms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinical_algorithms')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('title');
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (initialAlgo && algorithms.length > 0 && !selectedAlgo) {
      const found = algorithms.find(a => a.slug === initialAlgo);
      if (found) openAlgo(found);
    }
  }, [initialAlgo, algorithms]);

  const categories = useMemo(() => ['all', ...new Set(algorithms.map(a => a.category).filter(Boolean))], [algorithms]);

  const filteredAlgos = useMemo(() => {
    let list = algorithms;
    if (selectedCategory !== 'all') list = list.filter(a => a.category === selectedCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.title?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [algorithms, selectedCategory, searchQuery]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const a of filteredAlgos) {
      const cat = a.category || 'ostatní';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(a);
    }
    return groups;
  }, [filteredAlgos]);

  const openAlgo = (algo) => {
    setSelectedAlgo(algo);
    const startId = algo.steps?.start || Object.keys(algo.steps?.steps || {})[0];
    setCurrentStepId(startId);
    setHistory([]);
    setSearchParams({ algo: algo.slug });
  };

  const closeAlgo = () => {
    setSelectedAlgo(null);
    setCurrentStepId(null);
    setHistory([]);
    setSearchParams({});
  };

  const goToStep = (stepId) => {
    setHistory(prev => [...prev, currentStepId]);
    setCurrentStepId(stepId);
  };

  const goBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setCurrentStepId(prev);
  };

  const restart = () => {
    const startId = selectedAlgo.steps?.start;
    setCurrentStepId(startId);
    setHistory([]);
  };

  // ───── ALGORITHM DETAIL (STEPPER) ─────
  if (selectedAlgo) {
    const stepsData = selectedAlgo.steps?.steps || {};
    const currentStep = stepsData[currentStepId];
    const cat = CAT_CONFIG[selectedAlgo.category] || {};
    const totalSteps = Object.keys(stepsData).length;
    const stepNumber = history.length + 1;
    const Icon = ICONS[selectedAlgo.icon] || GitBranch;

    if (!currentStep) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <p className="text-[hsl(var(--mn-muted))]">Krok nenalezen</p>
          <Button onClick={restart} variant="outline" className="mt-4">Restart</Button>
        </div>
      );
    }

    const isEndpoint = currentStep.type === 'endpoint';
    const isAction = currentStep.type === 'action';
    const isQuestion = currentStep.type === 'question';
    const isCritical = currentStep.highlight === 'critical';
    const endColor = STEP_COLORS[currentStep.color] || null;

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Back */}
        <button onClick={closeAlgo} className="flex items-center gap-1.5 text-sm text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Zpět na algoritmy
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${cat.color || '#888'} 15%, transparent)` }}>
              <Icon className="w-4 h-4" style={{ color: cat.color }} />
            </div>
            <span className="mn-caption" style={{ color: cat.color }}>
              {cat.label?.toUpperCase()}{selectedAlgo.source_guideline ? ` · ${selectedAlgo.source_guideline}` : ''}
            </span>
          </div>
          <h1 className="mn-serif-font text-[22px] sm:text-[26px] font-bold">{selectedAlgo.title}</h1>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {history.map((_, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color || '#888' }} />
          ))}
          <div className="w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-[hsl(var(--mn-bg))]" style={{ background: cat.color || '#888', ringColor: cat.color }} />
          {!isEndpoint && <div className="flex-1 h-px bg-[hsl(var(--mn-border))]" />}
          <span className="text-xs text-[hsl(var(--mn-muted))] mn-mono-font">Krok {stepNumber}</span>
        </div>

        {/* Step Card */}
        <div
          className="rounded-2xl mb-6 border-2 overflow-hidden"
          style={{
            background: 'hsl(var(--mn-surface))',
            borderColor: isEndpoint && endColor ? endColor.border
              : isCritical ? 'rgba(239,68,68,0.4)'
              : 'hsl(var(--mn-border))',
          }}
        >
          {/* Step type indicator */}
          {isCritical && !isEndpoint && (
            <div className="px-4 py-1.5 text-xs font-bold text-white flex items-center gap-1.5" style={{ background: '#ef4444' }}>
              <AlertTriangle className="w-3 h-3" /> KRITICKÝ KROK
            </div>
          )}
          {isEndpoint && endColor && (
            <div className="px-4 py-1.5 text-xs font-bold flex items-center gap-1.5" style={{ background: endColor.bg, color: endColor.text }}>
              {React.createElement(endColor.icon, { className: 'w-3 h-3' })}
              {currentStep.color === 'green' ? 'VÝSLEDEK' : currentStep.color === 'red' ? 'URGENTNÍ' : 'POZOR'}
            </div>
          )}

          <div className="p-5">
            {/* Step type badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: isQuestion ? 'rgba(59,130,246,0.1)' : isAction ? 'rgba(249,115,22,0.1)' : endColor?.bg || 'rgba(34,197,94,0.1)',
                  color: isQuestion ? '#3b82f6' : isAction ? '#f97316' : endColor?.text || '#22c55e',
                }}>
                {isQuestion ? 'ROZHODNUTÍ' : isAction ? 'AKCE' : 'VÝSLEDEK'}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-lg font-bold mb-3">{currentStep.title}</h2>

            {/* Description */}
            {currentStep.description && (
              <div className="text-sm text-[hsl(var(--mn-muted))] whitespace-pre-line leading-relaxed">
                {currentStep.description}
              </div>
            )}

            {/* Options (for questions) */}
            {isQuestion && currentStep.options && (
              <div className="mt-5 space-y-2">
                {currentStep.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => goToStep(opt.next)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface))] text-left transition-all hover:border-[hsl(var(--mn-accent)/0.4)] hover:bg-[hsl(var(--mn-surface-2))]"
                  >
                    <ArrowRight className="w-4 h-4 text-[hsl(var(--mn-accent))] flex-shrink-0" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Next button (for actions) */}
            {isAction && currentStep.next && (
              <div className="mt-5">
                <Button
                  onClick={() => goToStep(currentStep.next)}
                  className="w-full"
                  style={{ background: cat.color || 'hsl(var(--mn-accent))', color: '#fff' }}
                >
                  Pokračovat
                  <ArrowDown className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 text-sm text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Předchozí krok
          </button>
          <button onClick={restart} className="flex items-center gap-1.5 text-sm text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
            Restart
          </button>
        </div>
      </div>
    );
  }

  // ───── ALGORITHM LIST VIEW ─────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <div>
        <Link to={createPageUrl('ToolsHub')} className="flex items-center gap-1.5 text-sm text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Klinické nástroje
        </Link>
        <span className="mn-caption text-[hsl(var(--mn-accent))]">KLINICKÉ ALGORITMY</span>
        <h1 className="mn-serif-font text-[28px] sm:text-[32px] font-bold mt-1">Algoritmy</h1>
        <p className="text-[hsl(var(--mn-muted))] mt-2">
          {algorithms.length} interaktivních rozhodovacích stromů dle aktuálních guidelines
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--mn-muted))]" />
          <Input
            placeholder="Hledat (BLS, sepse, ACS...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Obor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny obory</SelectItem>
            {categories.filter(c => c !== 'all').map((cat) => (
              <SelectItem key={cat} value={cat}>{CAT_CONFIG[cat]?.label || cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Algorithm list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[hsl(var(--mn-accent))] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredAlgos.length === 0 ? (
        <div className="text-center py-20 text-[hsl(var(--mn-muted))]">Žádné algoritmy nenalezeny</div>
      ) : (
        Object.entries(grouped).map(([cat, catAlgos]) => {
          const conf = CAT_CONFIG[cat] || {};
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: conf.color || '#888' }} />
                <span className="mn-caption" style={{ color: conf.color }}>{conf.label?.toUpperCase() || cat.toUpperCase()}</span>
                <span className="text-xs text-[hsl(var(--mn-muted))]">({catAlgos.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {catAlgos.map((algo) => {
                  const AlgoIcon = ICONS[algo.icon] || GitBranch;
                  const ac = CAT_CONFIG[algo.category] || {};
                  const stepCount = Object.keys(algo.steps?.steps || {}).length;
                  return (
                    <button
                      key={algo.slug}
                      onClick={() => openAlgo(algo)}
                      className="group flex items-start gap-3 p-4 rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))] text-left transition-all hover:border-[color-mix(in_srgb,var(--a-color)_30%,hsl(var(--mn-border)))] hover:-translate-y-0.5"
                      style={{ '--a-color': ac.color || '#888', boxShadow: 'var(--mn-shadow-1)' }}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${ac.color || '#888'} 12%, transparent)` }}>
                        <AlgoIcon className="w-4 h-4" style={{ color: ac.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold group-hover:text-[hsl(var(--mn-accent))] transition-colors">{algo.title}</div>
                        <p className="text-xs text-[hsl(var(--mn-muted))] line-clamp-2 mt-0.5">{algo.description}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-[hsl(var(--mn-muted))] mn-mono-font">{stepCount} kroků</span>
                          {algo.source_guideline && (
                            <span className="text-[10px] text-[hsl(var(--mn-muted))]">{algo.source_guideline}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[hsl(var(--mn-muted))] opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
