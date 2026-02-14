import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles, PlayCircle, RefreshCw, Clock, DollarSign,
  CheckCircle2, XCircle, Loader2, AlertTriangle,
  Zap, Database, BarChart3, ArrowRight, Trash2
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Čeká', color: 'bg-amber-500', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  processing: { label: 'Generuje se', color: 'bg-blue-500', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  completed: { label: 'Hotovo', color: 'bg-emerald-500', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  failed: { label: 'Chyba', color: 'bg-red-500', badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

function StatBox({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={`p-4 rounded-xl bg-slate-900/70 border border-slate-800`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${accent || 'bg-slate-800'}`}>
          <Icon className="w-4 h-4 text-slate-300" />
        </div>
        <div>
          <p className="text-lg font-bold text-white">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
          {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default function AdminBatchMonitor() {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  // Fetch queue
  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ['batch-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batch_generation_queue')
        .select(`
          *,
          topics!inner(id, title, full_text_content, bullet_points_summary, deep_dive_content, ai_model, ai_cost, ai_generated_at,
            obory!inner(name), okruhy!inner(name))
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: generating ? 10000 : false // Auto-refresh during generation
  });

  // Fetch all topics for adding to queue
  const { data: allTopics = [] } = useQuery({
    queryKey: ['all-topics-admin'],
    queryFn: async () => {
      const { data } = await supabase
        .from('topics')
        .select('id, title, full_text_content, bullet_points_summary, obory!inner(name), okruhy!inner(name)')
        .order('title');
      return data || [];
    }
  });

  // Stats
  const stats = {
    pending: queue.filter(q => q.status === 'pending').length,
    processing: queue.filter(q => q.status === 'processing').length,
    completed: queue.filter(q => q.status === 'completed').length,
    failed: queue.filter(q => q.status === 'failed').length,
    totalCost: queue.reduce((sum, q) => sum + (q.topics?.ai_cost || 0), 0),
    avgCost: queue.filter(q => q.topics?.ai_cost > 0).length > 0
      ? queue.reduce((sum, q) => sum + (q.topics?.ai_cost || 0), 0) / queue.filter(q => q.topics?.ai_cost > 0).length
      : 0
  };

  // Reset stuck items
  const resetStuck = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('batch_generation_queue')
        .update({ status: 'pending', started_at: null })
        .eq('status', 'processing');
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries(['batch-queue']); }
  });

  // Trigger async generation via DB function
  const triggerGeneration = useMutation({
    mutationFn: async (count = 3) => {
      setGenerating(true);
      const { data, error } = await supabase.rpc('process_batch_queue', { p_limit: count });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['batch-queue']);
      // Keep auto-refresh running
      setTimeout(() => setGenerating(false), 180000); // Stop after 3min
    },
    onError: () => setGenerating(false)
  });

  // Delete queue item
  const deleteItem = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('batch_generation_queue').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(['batch-queue'])
  });

  // Add topic to queue
  const [addTopicId, setAddTopicId] = useState('');
  const addToQueue = useMutation({
    mutationFn: async (topicId) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('batch_generation_queue').insert({
        topic_id: topicId,
        modes: ['fulltext', 'high_yield'],
        status: 'pending',
        priority: 5,
        created_by: userData.user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAddTopicId('');
      queryClient.invalidateQueries(['batch-queue']);
    }
  });

  // Topics not yet in queue
  const queuedTopicIds = new Set(queue.map(q => q.topic_id));
  const availableTopics = allTopics.filter(t => !queuedTopicIds.has(t.id) && (!t.full_text_content || t.full_text_content.length < 100));

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Database className="w-6 h-6 text-violet-400" />
              Batch Generation Monitor
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Sledování a řízení AI generace obsahu
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="border-slate-700 text-slate-400">
              <RefreshCw className="w-4 h-4 mr-1" /> Obnovit
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatBox icon={Clock} label="Čekající" value={stats.pending} accent="bg-amber-500/20" />
          <StatBox icon={Loader2} label="Probíhá" value={stats.processing} accent="bg-blue-500/20" />
          <StatBox icon={CheckCircle2} label="Hotovo" value={stats.completed} accent="bg-emerald-500/20" />
          <StatBox icon={XCircle} label="Chyby" value={stats.failed} accent="bg-red-500/20" />
          <StatBox icon={DollarSign} label="Celkem" value={`$${stats.totalCost.toFixed(2)}`} accent="bg-violet-500/20" />
          <StatBox icon={BarChart3} label="Ø na téma" value={`$${stats.avgCost.toFixed(2)}`} accent="bg-cyan-500/20" />
        </div>

        {/* Actions */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Trigger generation */}
              <Button
                onClick={() => triggerGeneration.mutate(3)}
                disabled={triggerGeneration.isPending || stats.pending === 0}
                className="bg-violet-600 hover:bg-violet-500 text-white"
              >
                {triggerGeneration.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <PlayCircle className="w-4 h-4 mr-2" />
                )}
                Spustit generaci ({Math.min(3, stats.pending)})
              </Button>

              {/* Reset stuck */}
              {stats.processing > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resetStuck.mutate()}
                  className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reset zaseklých ({stats.processing})
                </Button>
              )}

              {/* Add to queue */}
              <div className="flex items-center gap-2 ml-auto">
                <Select value={addTopicId} onValueChange={setAddTopicId}>
                  <SelectTrigger className="w-[250px] bg-slate-800 border-slate-700 text-slate-300 text-sm h-9">
                    <SelectValue placeholder="Přidat téma do fronty..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 max-h-64">
                    {availableTopics.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-sm">
                        <span className="text-slate-500 mr-1">{t.obory?.name?.substring(0, 3)}:</span> {t.title}
                      </SelectItem>
                    ))}
                    {availableTopics.length === 0 && (
                      <div className="p-2 text-xs text-slate-500 text-center">Všechna témata jsou ve frontě nebo mají obsah</div>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!addTopicId || addToQueue.isPending}
                  onClick={() => addToQueue.mutate(addTopicId)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 h-9"
                >
                  Přidat
                </Button>
              </div>
            </div>

            {generating && (
              <div className="mt-3 flex items-center gap-2 text-sm text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generace probíhá na pozadí... automaticky obnovuji stav
              </div>
            )}
          </CardContent>
        </Card>

        {/* Queue Table */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-300 text-lg">
              Fronta generace ({queue.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">Načítám...</div>
            ) : queue.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Fronta je prázdná. Přidejte témata výše.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {queue.map(item => {
                  const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                  const topic = item.topics;
                  const hasFulltext = topic?.full_text_content?.length > 100;
                  const hasHY = topic?.bullet_points_summary?.length > 50;

                  return (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-800/30 transition-colors">
                      {/* Priority */}
                      <span className="text-xs text-slate-600 font-mono w-6 text-center">{item.priority}</span>

                      {/* Status dot */}
                      <div className={`w-2.5 h-2.5 rounded-full ${sc.color} ${item.status === 'processing' ? 'animate-pulse' : ''}`} />

                      {/* Topic info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-200 truncate">{topic?.title}</span>
                          <Badge variant="outline" className={`text-[10px] ${sc.badge} border`}>
                            {sc.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500">
                          <span>{topic?.obory?.name} → {topic?.okruhy?.name}</span>
                          <span>Modes: {item.modes?.join(', ')}</span>
                          {topic?.ai_cost > 0 && <span className="text-emerald-500">${Number(topic.ai_cost).toFixed(2)}</span>}
                        </div>
                      </div>

                      {/* Content indicators */}
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${hasFulltext ? 'bg-emerald-400' : 'bg-slate-700'}`} title="Fulltext" />
                        <div className={`w-2 h-2 rounded-full ${hasHY ? 'bg-emerald-400' : 'bg-slate-700'}`} title="High-Yield" />
                      </div>

                      {/* Error */}
                      {item.error_message && (
                        <span className="text-xs text-red-400 max-w-[200px] truncate" title={item.error_message}>
                          {item.error_message}
                        </span>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => deleteItem.mutate(item.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors p-1"
                        title="Odstranit z fronty"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
