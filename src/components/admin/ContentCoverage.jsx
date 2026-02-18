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
      // Count queries for totals (no 1000-row limit)
      const [topicsCount, fcCount, qCount, cCount, pending] = await Promise.all([
        supabase.from('topics').select('id', { count: 'exact', head: true })
          .eq('status', 'published').not('full_text_content', 'is', null),
        supabase.from('flashcards').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('topic_concept_links').select('id', { count: 'exact', head: true }),
        supabase.from('batch_generation_queue').select('id, status'),
      ]);

      const pendingCount = (pending.data || []).filter(x => x.status === 'pending').length;
      const completedCount = (pending.data || []).filter(x => x.status === 'completed').length;
      const totalTopics = topicsCount.count || 0;

      // Get per-obor stats via obory→topics join (each obor <100 topics, no limit issue)
      const { data: oborData } = await supabase.from('obory')
        .select('name, topics!inner(id)').order('name');
      
      // Paginated fetch for topic_id sets (need distinct topic coverage)
      async function fetchAllTopicIds(table) {
        let all = [], from = 0;
        while (true) {
          const { data } = await supabase.from(table).select('topic_id').range(from, from + 999);
          if (!data || data.length === 0) break;
          all.push(...data);
          if (data.length < 1000) break;
          from += 1000;
        }
        return new Set(all.map(x => x.topic_id));
      }

      const [fcTopics, qTopics, cTopics] = await Promise.all([
        fetchAllTopicIds('flashcards'),
        fetchAllTopicIds('questions'),
        fetchAllTopicIds('topic_concept_links'),
      ]);

      const byObor = {};
      (oborData || []).forEach(o => {
        const ids = (o.topics || []).map(t => t.id);
        byObor[o.name] = {
          total: ids.length,
          fc: ids.filter(id => fcTopics.has(id)).length,
          q: ids.filter(id => qTopics.has(id)).length,
          c: ids.filter(id => cTopics.has(id)).length,
        };
      });

      return {
        totalTopics,
        fcCount: fcCount.count || 0,
        fcTopics: fcTopics.size,
        qCount: qCount.count || 0,
        qTopics: qTopics.size,
        cCount: cCount.count || 0,
        cTopics: cTopics.size,
        pendingCount,
        completedCount,
        incomplete: [],
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

  if (isLoading || !stats) return <Card><CardContent className="p-6 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></CardContent></Card>;

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
            <div key={i} className="p-4 rounded-xl bg-[hsl(var(--mn-surface-2))]/50 border">
              <item.icon className="w-5 h-5 text-[hsl(var(--mn-muted))] mb-2" />
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-[10px] text-[hsl(var(--mn-muted))] mt-1">{item.sub}</p>
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
            <div key={name} className="flex items-center justify-between text-sm py-1.5 border-b border-[hsl(var(--mn-border))]">
              <span className="text-[hsl(var(--mn-muted))]">{name}</span>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px]">{d.total} topics</Badge>
                <span className={`text-xs ${d.fc === d.total ? 'text-[hsl(var(--mn-success))]' : 'text-[hsl(var(--mn-warn))]'}`}>FC:{d.fc}/{d.total}</span>
                <span className={`text-xs ${d.q === d.total ? 'text-[hsl(var(--mn-success))]' : 'text-[hsl(var(--mn-warn))]'}`}>Q:{d.q}/{d.total}</span>
                <span className={`text-xs ${d.c === d.total ? 'text-[hsl(var(--mn-success))]' : 'text-[hsl(var(--mn-warn))]'}`}>C:{d.c}/{d.total}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Incomplete topics */}
        {s.incomplete.length > 0 && (
          <div>
            <p className="text-sm font-medium text-[hsl(var(--mn-warn))] mb-2">Neúplné topics ({s.incomplete.length})</p>
            <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {s.incomplete.map(t => (
                <div key={t.id} className="text-[hsl(var(--mn-muted))]">{t.title}</div>
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
