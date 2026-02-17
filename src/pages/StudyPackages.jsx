import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { callApi } from '@/lib/api';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FolderPlus, Search, BookOpen, Sparkles, Plus, Loader2, Trash2,
  Clock, CheckCircle2, AlertCircle, ChevronRight, Globe, Lock,
  FileText, Brain, ListChecks, GraduationCap, X, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { useAnalytics } from '@/hooks/useAnalytics';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import HTMLContent from '@/components/study/HTMLContent';

/* ─── Topic Picker Dialog ─── */
function TopicPicker({ open, onClose, onConfirm, existingIds = [] }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set(existingIds));
  const [expandedObor, setExpandedObor] = useState(null);

  const { data: topics = [] } = useQuery({
    queryKey: ['allTopicsForPicker'],
    queryFn: async () => {
      const { data } = await supabase
        .from('topics')
        .select('id, title, okruhy(name, obor_id, obory(name))')
        .not('full_text_content', 'is', null)
        .order('title');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Group by obor
  const grouped = useMemo(() => {
    const map = {};
    topics.forEach(t => {
      const obor = t.okruhy?.obory?.name || 'Ostatní';
      if (!map[obor]) map[obor] = [];
      map[obor].push(t);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0], 'cs'));
  }, [topics]);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped.map(([obor, items]) => [
      obor,
      items.filter(t => t.title.toLowerCase().includes(q))
    ]).filter(([, items]) => items.length > 0);
  }, [grouped, search]);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleObor = (items) => {
    const ids = items.map(t => t.id);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[hsl(var(--mn-accent))]" />
            Vybrat témata
            <Badge variant="secondary" className="ml-2">{selected.size} vybráno</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--mn-muted))]" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Hledat téma..."
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0 pr-1">
          {filtered.map(([obor, items]) => {
            const oborSelected = items.filter(t => selected.has(t.id)).length;
            const isExpanded = expandedObor === obor || search.trim().length > 0;
            return (
              <div key={obor}>
                <button
                  onClick={() => setExpandedObor(expandedObor === obor ? null : obor)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[hsl(var(--mn-surface-2))] transition-colors text-left"
                >
                  <ChevronRight className={`w-3.5 h-3.5 text-[hsl(var(--mn-muted))] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  <span className="text-sm font-medium text-[hsl(var(--mn-text))] flex-1">{obor}</span>
                  <span className="text-[10px] text-[hsl(var(--mn-muted))]">
                    {oborSelected > 0 && <span className="text-[hsl(var(--mn-accent))] font-bold">{oborSelected}/</span>}
                    {items.length}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); toggleObor(items); }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-accent))]"
                  >
                    {items.every(t => selected.has(t.id)) ? 'Odebrat vše' : 'Vybrat vše'}
                  </button>
                </button>

                {isExpanded && (
                  <div className="ml-5 space-y-0.5 mb-2">
                    {items.map(t => (
                      <button
                        key={t.id}
                        onClick={() => toggle(t.id)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left text-sm transition-colors ${
                          selected.has(t.id)
                            ? 'bg-[hsl(var(--mn-accent)/0.1)] text-[hsl(var(--mn-accent))]'
                            : 'hover:bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-text))]'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          selected.has(t.id)
                            ? 'bg-[hsl(var(--mn-accent))] border-[hsl(var(--mn-accent))]'
                            : 'border-[hsl(var(--mn-border))]'
                        }`}>
                          {selected.has(t.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="truncate">{t.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--mn-border))]">
          <span className="text-sm text-[hsl(var(--mn-muted))]">{selected.size} témat vybráno (max 20)</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Zrušit</Button>
            <Button
              onClick={() => { onConfirm([...selected]); onClose(); }}
              disabled={selected.size === 0 || selected.size > 20}
              className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent-2))] text-white"
            >
              Potvrdit ({selected.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Study Set Card ─── */
function SetCard({ set, onOpen }) {
  const topicCount = set.topic_ids?.length || 0;
  const statusIcon = {
    draft: <Clock className="w-3.5 h-3.5" />,
    generating: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    ready: <CheckCircle2 className="w-3.5 h-3.5" />,
    error: <AlertCircle className="w-3.5 h-3.5" />,
  }[set.status] || <Clock className="w-3.5 h-3.5" />;

  const statusColor = {
    draft: 'text-[hsl(var(--mn-muted))]',
    generating: 'text-[hsl(var(--mn-accent))]',
    ready: 'text-[hsl(var(--mn-success))]',
    error: 'text-[hsl(var(--mn-danger))]',
  }[set.status] || 'text-[hsl(var(--mn-muted))]';

  return (
    <Card
      className="group cursor-pointer hover:shadow-md transition-all hover:border-[hsl(var(--mn-accent)/0.3)]"
      onClick={() => onOpen(set.id)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[hsl(var(--mn-text))] truncate group-hover:text-[hsl(var(--mn-accent))] transition-colors">
              {set.title}
            </h3>
            {set.description && (
              <p className="text-sm text-[hsl(var(--mn-muted))] line-clamp-2 mt-0.5">{set.description}</p>
            )}
          </div>
          <div className={`flex items-center gap-1 shrink-0 ${statusColor}`}>
            {statusIcon}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-[hsl(var(--mn-muted))]">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {topicCount} témat
          </span>
          {set.ai_summary && (
            <span className="flex items-center gap-1 text-[hsl(var(--mn-accent))]">
              <Sparkles className="w-3 h-3" /> Souhrn
            </span>
          )}
          {set.ai_study_plan && (
            <span className="flex items-center gap-1 text-[hsl(var(--mn-accent))]">
              <ListChecks className="w-3 h-3" /> Plán
            </span>
          )}
          {set.ai_quiz && (
            <span className="flex items-center gap-1 text-[hsl(var(--mn-accent))]">
              <Brain className="w-3 h-3" /> Kvíz
            </span>
          )}
          <span className="ml-auto flex items-center gap-1">
            {set.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Quiz Component ─── */
function QuizPlayer({ quiz, title }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);

  if (!Array.isArray(quiz) || quiz.length === 0) {
    return <p className="text-sm text-[hsl(var(--mn-muted))]">Kvíz nebyl vygenerován.</p>;
  }

  const q = quiz[current];
  const answered = answers[current] !== undefined;
  const isCorrect = answers[current] === q.correct;
  const totalCorrect = Object.entries(answers).filter(([i, a]) => a === quiz[i]?.correct).length;

  if (showResult) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center ${
          totalCorrect / quiz.length >= 0.7 ? 'bg-[hsl(var(--mn-success)/0.1)]' : 'bg-[hsl(var(--mn-warn)/0.1)]'
        }`}>
          <span className="text-3xl font-bold text-[hsl(var(--mn-text))]">
            {totalCorrect}/{quiz.length}
          </span>
        </div>
        <p className="text-lg font-semibold text-[hsl(var(--mn-text))]">
          {totalCorrect / quiz.length >= 0.7 ? 'Výborně!' : 'Zkus to znovu'}
        </p>
        <p className="text-sm text-[hsl(var(--mn-muted))]">
          Úspěšnost: {Math.round(totalCorrect / quiz.length * 100)}%
        </p>
        <Button variant="outline" onClick={() => { setAnswers({}); setCurrent(0); setShowResult(false); }}>
          Opakovat kvíz
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[hsl(var(--mn-muted))] font-medium">
          Otázka {current + 1} / {quiz.length}
        </span>
        {q.topic_title && (
          <Badge variant="outline" className="text-[10px]">{q.topic_title}</Badge>
        )}
      </div>

      <p className="text-[hsl(var(--mn-text))] font-medium leading-relaxed">{q.question}</p>

      <div className="space-y-2">
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => !answered && setAnswers(prev => ({ ...prev, [current]: i }))}
            disabled={answered}
            className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
              answered && i === q.correct
                ? 'border-[hsl(var(--mn-success))] bg-[hsl(var(--mn-success)/0.1)] text-[hsl(var(--mn-success))]'
                : answered && i === answers[current] && i !== q.correct
                ? 'border-[hsl(var(--mn-danger))] bg-[hsl(var(--mn-danger)/0.1)] text-[hsl(var(--mn-danger))]'
                : answered
                ? 'border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))] opacity-60'
                : 'border-[hsl(var(--mn-border))] hover:border-[hsl(var(--mn-accent)/0.4)] hover:bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-text))]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {answered && q.explanation && (
        <div className="px-4 py-3 rounded-xl bg-[hsl(var(--mn-surface-2))] border border-[hsl(var(--mn-border))] text-sm text-[hsl(var(--mn-muted))]">
          <strong className="text-[hsl(var(--mn-text))]">Vysvětlení:</strong> {q.explanation}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>
          Předchozí
        </Button>
        {current < quiz.length - 1 ? (
          <Button onClick={() => setCurrent(c => c + 1)} disabled={!answered}>
            Další
          </Button>
        ) : (
          <Button onClick={() => setShowResult(true)} disabled={Object.keys(answers).length < quiz.length}
            className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent-2))] text-white">
            Vyhodnotit
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function StudyPackages() {
  const { user } = useAuth();
  const { track } = useAnalytics();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSetId = searchParams.get('id');

  const [showPicker, setShowPicker] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTopicIds, setNewTopicIds] = useState([]);
  const [activeTab, setActiveTab] = useState('summary');

  // Fetch user's study sets
  const { data: mySets = [], isLoading } = useQuery({
    queryKey: ['studySets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_sets')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch public sets
  const { data: publicSets = [] } = useQuery({
    queryKey: ['publicStudySets'],
    queryFn: async () => {
      const { data } = await supabase
        .from('study_sets')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  // Active set detail with topic names
  const { data: activeSet } = useQuery({
    queryKey: ['studySetDetail', activeSetId],
    queryFn: async () => {
      const { data: set } = await supabase
        .from('study_sets')
        .select('*')
        .eq('id', activeSetId)
        .single();
      if (!set) return null;

      // Fetch topic titles
      let topics = [];
      if (set.topic_ids?.length > 0) {
        const { data } = await supabase
          .from('topics')
          .select('id, title, okruhy(name, obory(name))')
          .in('id', set.topic_ids);
        topics = data || [];
      }
      return { ...set, topics };
    },
    enabled: !!activeSetId,
  });

  // Create set
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!newTitle.trim()) throw new Error('Zadejte název');
      if (newTopicIds.length === 0) throw new Error('Vyberte alespoň 1 téma');

      const { data, error } = await supabase
        .from('study_sets')
        .insert({
          user_id: user.id,
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          topic_ids: newTopicIds,
          status: 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Sada vytvořena');
      track('study_set_created', { topic_count: newTopicIds.length });
      setShowCreate(false);
      setNewTitle('');
      setNewDescription('');
      setNewTopicIds([]);
      queryClient.invalidateQueries({ queryKey: ['studySets'] });
      setSearchParams({ id: data.id });
    },
    onError: (e) => toast.error(e.message),
  });

  // Generate AI content
  const generateMutation = useMutation({
    mutationFn: async ({ mode }) => {
      if (!activeSet) throw new Error('No active set');
      await supabase.from('study_sets').update({ status: 'generating' }).eq('id', activeSet.id);
      queryClient.invalidateQueries({ queryKey: ['studySetDetail'] });

      return callApi('study-set-generate', {
        studySetId: activeSet.id,
        topicIds: activeSet.topic_ids,
        title: activeSet.title,
        mode,
      });
    },
    onSuccess: (data, { mode }) => {
      toast.success(mode === 'summary' ? 'Souhrn vygenerován' : mode === 'study_plan' ? 'Plán vytvořen' : 'Kvíz vygenerován');
      track('study_set_ai_generated', { mode, topic_count: activeSet?.topic_ids?.length });
      queryClient.invalidateQueries({ queryKey: ['studySetDetail'] });
      queryClient.invalidateQueries({ queryKey: ['studySets'] });
      setActiveTab(mode === 'study_plan' ? 'plan' : mode === 'quiz' ? 'quiz' : 'summary');
    },
    onError: (e) => {
      toast.error('Chyba: ' + (e.message || 'Generování selhalo'));
      supabase.from('study_sets').update({ status: 'error' }).eq('id', activeSetId);
      queryClient.invalidateQueries({ queryKey: ['studySetDetail'] });
    },
  });

  // Delete set
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('study_sets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Sada smazána');
      setSearchParams({});
      queryClient.invalidateQueries({ queryKey: ['studySets'] });
    },
  });

  // Toggle public
  const togglePublic = async () => {
    if (!activeSet) return;
    await supabase.from('study_sets').update({ is_public: !activeSet.is_public }).eq('id', activeSet.id);
    queryClient.invalidateQueries({ queryKey: ['studySetDetail'] });
    queryClient.invalidateQueries({ queryKey: ['studySets'] });
    toast.success(activeSet.is_public ? 'Sada je nyní soukromá' : 'Sada je nyní veřejná');
  };

  const parsePlan = (plan) => {
    if (!plan) return null;
    if (plan.days) return plan;
    if (typeof plan === 'string') { try { return JSON.parse(plan); } catch { return null; } }
    return null;
  };

  const parseQuiz = (quiz) => {
    if (Array.isArray(quiz)) return quiz;
    if (typeof quiz === 'string') { try { return JSON.parse(quiz); } catch { return null; } }
    return null;
  };

  /* ─── Detail View ─── */
  if (activeSetId && activeSet) {
    const plan = parsePlan(activeSet.ai_study_plan);
    const quiz = parseQuiz(activeSet.ai_quiz);

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Back + header */}
        <div>
          <button onClick={() => setSearchParams({})}
            className="text-sm text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] mb-3 flex items-center gap-1">
            ← Zpět na sady
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[hsl(var(--mn-text))]">{activeSet.title}</h1>
              {activeSet.description && (
                <p className="text-[hsl(var(--mn-muted))] mt-1">{activeSet.description}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={togglePublic} title={activeSet.is_public ? 'Zveřejněno' : 'Soukromé'}>
                {activeSet.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                if (confirm('Smazat tuto sadu?')) deleteMutation.mutate(activeSet.id);
              }} className="text-[hsl(var(--mn-danger))]">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Topics list */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--mn-text))] mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[hsl(var(--mn-accent))]" />
              Témata ({activeSet.topics?.length || 0})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {activeSet.topics?.map(t => (
                <Link key={t.id} to={`${createPageUrl('TopicDetailV5')}?id=${t.id}`}>
                  <Badge variant="outline" className="text-xs hover:border-[hsl(var(--mn-accent)/0.4)] hover:text-[hsl(var(--mn-accent))] transition-colors cursor-pointer">
                    {t.title}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Generation buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => generateMutation.mutate({ mode: 'summary' })}
            disabled={generateMutation.isPending}
            className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent-2))] text-white gap-2"
          >
            {generateMutation.isPending && generateMutation.variables?.mode === 'summary'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <FileText className="w-4 h-4" />}
            {activeSet.ai_summary ? 'Přegenerovat souhrn' : 'Vygenerovat souhrn'}
          </Button>
          <Button
            variant="outline"
            onClick={() => generateMutation.mutate({ mode: 'study_plan' })}
            disabled={generateMutation.isPending}
            className="gap-2"
          >
            {generateMutation.isPending && generateMutation.variables?.mode === 'study_plan'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ListChecks className="w-4 h-4" />}
            {plan ? 'Přegenerovat plán' : 'Studijní plán'}
          </Button>
          <Button
            variant="outline"
            onClick={() => generateMutation.mutate({ mode: 'quiz' })}
            disabled={generateMutation.isPending}
            className="gap-2"
          >
            {generateMutation.isPending && generateMutation.variables?.mode === 'quiz'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Brain className="w-4 h-4" />}
            {quiz ? 'Nový kvíz' : 'Vygenerovat kvíz'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[hsl(var(--mn-border))]">
          {[
            { key: 'summary', label: 'Souhrn', icon: FileText, has: !!activeSet.ai_summary },
            { key: 'plan', label: 'Studijní plán', icon: ListChecks, has: !!plan },
            { key: 'quiz', label: 'Kvíz', icon: Brain, has: !!quiz },
          ].map(tab => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[hsl(var(--mn-accent))] text-[hsl(var(--mn-accent))]'
                  : 'border-transparent text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))]'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.has && <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--mn-accent))]" />}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[200px]">
          {activeTab === 'summary' && (
            activeSet.ai_summary ? (
              <div className="prose prose-sm max-w-none">
                <HTMLContent content={activeSet.ai_summary} />
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="Souhrn zatím nebyl vygenerován"
                description="Klikněte na 'Vygenerovat souhrn' pro AI shrnutí klíčových bodů"
              />
            )
          )}

          {activeTab === 'plan' && (
            plan?.days ? (
              <div className="space-y-4">
                {plan.strategy_note && (
                  <p className="text-sm text-[hsl(var(--mn-muted))] italic px-4 py-3 rounded-xl bg-[hsl(var(--mn-surface-2))] border border-[hsl(var(--mn-border))]">
                    {plan.strategy_note}
                  </p>
                )}
                {plan.days.map((day, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--mn-accent)/0.1)] flex items-center justify-center text-sm font-bold text-[hsl(var(--mn-accent))]">
                          {day.day}
                        </div>
                        <div>
                          <p className="font-medium text-[hsl(var(--mn-text))]">{day.focus}</p>
                          <p className="text-xs text-[hsl(var(--mn-muted))]">~{day.duration_minutes} min</p>
                        </div>
                      </div>
                      <div className="ml-11 space-y-1.5">
                        {day.topics?.map((t, j) => (
                          <p key={j} className="text-sm text-[hsl(var(--mn-text))]">• {t}</p>
                        ))}
                        {day.activities?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {day.activities.map((a, j) => (
                              <Badge key={j} variant="secondary" className="text-[10px]">{a}</Badge>
                            ))}
                          </div>
                        )}
                        {day.tip && (
                          <p className="text-xs text-[hsl(var(--mn-accent))] mt-1">💡 {day.tip}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {plan.total_hours && (
                  <p className="text-sm text-[hsl(var(--mn-muted))] text-center">
                    Celkem: {plan.total_days} dní · ~{plan.total_hours} hodin studia
                  </p>
                )}
              </div>
            ) : (
              <EmptyState
                icon={ListChecks}
                title="Studijní plán zatím nebyl vytvořen"
                description="Klikněte na 'Studijní plán' pro AI optimalizovaný rozvrh studia"
              />
            )
          )}

          {activeTab === 'quiz' && (
            quiz ? (
              <QuizPlayer quiz={quiz} title={activeSet.title} />
            ) : (
              <EmptyState
                icon={Brain}
                title="Kvíz zatím nebyl vygenerován"
                description="Klikněte na 'Vygenerovat kvíz' pro atestační otázky z vybraných témat"
              />
            )
          )}
        </div>
      </div>
    );
  }

  /* ─── List View ─── */
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[hsl(var(--mn-text))] flex items-center gap-3">
            <GraduationCap className="w-7 h-7 text-[hsl(var(--mn-accent))]" />
            Studijní sady
          </h1>
          <p className="text-[hsl(var(--mn-muted))] mt-1">
            Sestavte si vlastní studijní materiály z témat MedVerse
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}
          className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent-2))] text-white gap-2">
          <Plus className="w-4 h-4" />
          Nová sada
        </Button>
      </div>

      {/* My sets */}
      <div>
        <h2 className="text-sm font-semibold text-[hsl(var(--mn-muted))] uppercase tracking-wider mb-3">
          Moje sady
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : mySets.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mySets.map(s => (
              <SetCard key={s.id} set={s} onOpen={(id) => setSearchParams({ id })} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FolderPlus}
            title="Zatím nemáte žádné studijní sady"
            description="Vytvořte si první sadu — vyberte témata a nechte AI připravit personalizovaný souhrn a kvíz."
            action={
              <Button onClick={() => setShowCreate(true)}
                className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent-2))] text-white gap-2">
                <Plus className="w-4 h-4" /> Vytvořit první sadu
              </Button>
            }
          />
        )}
      </div>

      {/* Public sets */}
      {publicSets.filter(s => s.user_id !== user?.id).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[hsl(var(--mn-muted))] uppercase tracking-wider mb-3">
            Veřejné sady
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicSets.filter(s => s.user_id !== user?.id).map(s => (
              <SetCard key={s.id} set={s} onOpen={(id) => setSearchParams({ id })} />
            ))}
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-[hsl(var(--mn-accent))]" />
              Nová studijní sada
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[hsl(var(--mn-text))] mb-1 block">Název</label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Např. Kardiologie — zkouškové"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[hsl(var(--mn-text))] mb-1 block">Popis (nepovinné)</label>
              <Input
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Krátký popis sady"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[hsl(var(--mn-text))]">Témata</label>
                <Button variant="outline" size="sm" onClick={() => setShowPicker(true)} className="gap-1.5">
                  <Plus className="w-3 h-3" />
                  Vybrat témata
                </Button>
              </div>
              {newTopicIds.length > 0 ? (
                <p className="text-sm text-[hsl(var(--mn-accent))] font-medium">
                  {newTopicIds.length} témat vybráno
                </p>
              ) : (
                <p className="text-sm text-[hsl(var(--mn-muted))]">Zatím nevybráno žádné téma</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Zrušit</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !newTitle.trim() || newTopicIds.length === 0}
              className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent-2))] text-white gap-2"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Vytvořit sadu
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Topic picker */}
      <TopicPicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onConfirm={setNewTopicIds}
        existingIds={newTopicIds}
      />
    </div>
  );
}
