import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BookOpen, Brain, FileQuestion, Lightbulb, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ContentCoverage() {
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['content-coverage-stats'],
    queryFn: async () => {
      const [topics, fc, q, c, pending] = await Promise.all([
        supabase.from('topics').select('id, title, obor_id, obory:obor_id(name)', { count: 'exact' })
          .eq('status', 'published').not('full_text_content', 'is', null),
        supabase.from('flashcards').select('topic_id'),
        supabase.from('questions').select('topic_id'),
        supabase.from('topic_concept_links').select('topic_id'),
        supabase.from('batch_generation_queue').select('id, status'),
      ]);

      const topicsList = topics.data || [];
      const fcTopics = new Set((fc.data || []).map(x => x.topic_id));
      const qTopics = new Set((q.data || []).map(x => x.topic_id));
      const cTopics = new Set((c.data || []).map(x => x.topic_id));
      const pendingCount = (pending.data || []).filter(x => x.status === 'pending').length;
      const completedCount = (pending.data || []).filter(x => x.status === 'completed').length;

      const incomplete = topicsList.filter(t => !fcTopics.has(t.id) || !qTopics.has(t.id) || !cTopics.has(t.id));

      // Per-obor stats
      const byObor = {};
      topicsList.forEach(t => {
        const name = t.obory?.name || 'Ostatní';
        if (!byObor[name]) byObor[name] = { total: 0, fc: 0, q: 0, c: 0 };
        byObor[name].total++;
        if (fcTopics.has(t.id)) byObor[name].fc++;
        if (qTopics.has(t.id)) byObor[name].q++;
        if (cTopics.has(t.id)) byObor[name].c++;
      });

      return {
        totalTopics: topicsList.length,
        fcCount: (fc.data || []).length,
        fcTopics: fcTopics.size,
        qCount: (q.data || []).length,
        qTopics: qTopics.size,
        cCount: (c.data || []).length,
        cTopics: cTopics.size,
        pendingCount,
        completedCount,
        incomplete,
        byObor,
      };
    },
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const [pipelineRunning, setPipelineRunning] = React.useState(false);

  const runPipeline = async () => {
    setPipelineRunning(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://rrjohtzqqyhgqfpkvrbu.supabase.co'}/functions/v1/post-generation-pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '' },
        body: JSON.stringify({ mode: 'batch' }),
      });
      const data = await resp.json();
      toast.success(`Pipeline spuštěn pro ${data.processed} topics`);
      setTimeout(() => refetch(), 5000);
    } catch (e) {
      toast.error('Pipeline error: ' + e.message);
    }
    setPipelineRunning(false);
  };

  if (isLoading) return <Card><CardContent className="p-6 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></CardContent></Card>;

  const s = stats;
  const completePct = s.totalTopics > 0 ? Math.round((Math.min(s.fcTopics, s.qTopics, s.cTopics) / s.totalTopics) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> Content Coverage
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={runPipeline} disabled={pipelineRunning}>
              {pipelineRunning ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
              Run Pipeline
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: BookOpen, label: 'Topics', value: s.totalTopics, sub: `${s.pendingCount} pending` },
            { icon: Brain, label: 'Flashcards', value: s.fcCount, sub: `${s.fcTopics}/${s.totalTopics} topics` },
            { icon: FileQuestion, label: 'Questions', value: s.qCount, sub: `${s.qTopics}/${s.totalTopics} topics` },
            { icon: Lightbulb, label: 'Concepts', value: s.cCount, sub: `${s.cTopics}/${s.totalTopics} topics` },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border">
              <item.icon className="w-5 h-5 text-slate-400 mb-2" />
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-[10px] text-slate-500 mt-1">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Completeness bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Kompletní topics (FC + Q + C)</span>
            <span className="font-bold">{completePct}%</span>
          </div>
          <Progress value={completePct} className="h-2" />
        </div>

        {/* Per-obor */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Coverage dle oborů</p>
          {Object.entries(s.byObor).sort(([,a],[,b]) => b.total - a.total).map(([name, d]) => (
            <div key={name} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-700 dark:text-slate-300">{name}</span>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px]">{d.total} topics</Badge>
                <span className={`text-xs ${d.fc === d.total ? 'text-emerald-500' : 'text-amber-500'}`}>FC:{d.fc}/{d.total}</span>
                <span className={`text-xs ${d.q === d.total ? 'text-emerald-500' : 'text-amber-500'}`}>Q:{d.q}/{d.total}</span>
                <span className={`text-xs ${d.c === d.total ? 'text-emerald-500' : 'text-amber-500'}`}>C:{d.c}/{d.total}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Incomplete topics */}
        {s.incomplete.length > 0 && (
          <div>
            <p className="text-sm font-medium text-amber-500 mb-2">Neúplné topics ({s.incomplete.length})</p>
            <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {s.incomplete.map(t => (
                <div key={t.id} className="text-slate-500">{t.title}</div>
              ))}
            </div>
          </div>
        )}

        {/* Batch queue */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <span>Batch queue: {s.pendingCount} pending / {s.completedCount} completed</span>
        </div>
      </CardContent>
    </Card>
  );
}
