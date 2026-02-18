import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, RefreshCw, Clock, DollarSign,
  CheckCircle2, XCircle, Loader2, AlertTriangle,
  Zap, Database, BarChart3, Trash2, ShieldAlert, Send, Search
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  pending: { label: 'Čeká', color: 'bg-[hsl(var(--mn-warn))]', badge: 'bg-[hsl(var(--mn-warn))]/20 text-[hsl(var(--mn-warn))] border-[hsl(var(--mn-warn))]/30' },
  processing: { label: 'Generuje se', color: 'bg-[hsl(var(--mn-accent-2))]', badge: 'bg-[hsl(var(--mn-accent-2))]/20 text-[hsl(var(--mn-accent-2))] border-[hsl(var(--mn-accent-2))]/30' },
  completed: { label: 'Hotovo', color: 'bg-[hsl(var(--mn-success))]', badge: 'bg-[hsl(var(--mn-success))]/20 text-[hsl(var(--mn-success))] border-[hsl(var(--mn-success))]/30' },
  failed: { label: 'Chyba', color: 'bg-[hsl(var(--mn-danger))]', badge: 'bg-[hsl(var(--mn-danger))]/20 text-[hsl(var(--mn-danger))] border-[hsl(var(--mn-danger))]/30' },
};

function StatBox({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="p-4 rounded-xl bg-[hsl(var(--mn-surface))]/70 border border-[hsl(var(--mn-border))]">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${accent || 'bg-[hsl(var(--mn-surface-2))]'}`}>
          <Icon className="w-4 h-4 text-[hsl(var(--mn-muted))]" />
        </div>
        <div>
          <p className="text-lg font-bold text-[hsl(var(--mn-text))]">{value}</p>
          <p className="text-xs text-[hsl(var(--mn-muted))]">{label}</p>
          {sub && <p className="text-[10px] text-[hsl(var(--mn-muted))] mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default function AdminBatchMonitor() {
  const queryClient = useQueryClient();

  // Fetch queue
  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ['batch-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batch_generation_queue')
        .select(`*, topics!inner(id, title, full_text_content, bullet_points_summary, ai_model, ai_cost, ai_generated_at, obory!inner(name), okruhy!inner(name))`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch active batches
  const { data: batches = [] } = useQuery({
    queryKey: ['anthropic-batches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('anthropic_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch cost tracking
  const { data: dailyCosts = [] } = useQuery({
    queryKey: ['daily-costs'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_daily_costs', { days_back: 7 });
      return data || [];
    },
  });

  // Stats
  const stats = {
    pending: queue.filter(q => q.status === 'pending').length,
    processing: queue.filter(q => q.status === 'processing').length,
    completed: queue.filter(q => q.status === 'completed').length,
    failed: queue.filter(q => q.status === 'failed').length,
  };

  const totalTrackedCost = dailyCosts.reduce((sum, d) => sum + Number(d.total_cost || 0), 0);
  const estimatedBatchCost = stats.pending * 0.064;

  // Reset stuck items
  const resetStuck = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('batch_generation_queue')
        .update({ status: 'pending', started_at: null, error_message: 'Manual reset' })
        .eq('status', 'processing');
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Zaseklé items resetovány');
      queryClient.invalidateQueries(['batch-queue']);
    }
  });

  // Submit to Anthropic Batch API (SAFE - no real-time API calls)
  const submitBatch = useMutation({
    mutationFn: async (limit) => {
      const resp = await supabase.functions.invoke('batch-api-submit', {
        body: { limit, modes: ['fulltext', 'high_yield'] }
      });
      if (resp.error) throw new Error(resp.error.message);
      return resp.data;
    },
    onSuccess: (data) => {
      toast.success(`Batch odeslán! ID: ${data.batch_id?.substring(0, 20)}... | ${data.total_requests} requestů | Est: $${data.cost_estimate?.toFixed(2)}`);
      queryClient.invalidateQueries(['batch-queue', 'anthropic-batches']);
    },
    onError: (err) => toast.error(`Batch submit failed: ${err.message}`)
  });

  // Poll batch results
  const pollBatch = useMutation({
    mutationFn: async () => {
      const resp = await supabase.functions.invoke('batch-api-poll', {
        body: { mode: 'auto' }
      });
      if (resp.error) throw new Error(resp.error.message);
      return resp.data;
    },
    onSuccess: (data) => {
      if (data.status === 'ended' && data.processed) {
        toast.success(`Batch zpracován! ${data.succeeded} úspěšných, ${data.errored} chyb | $${data.actual_cost?.toFixed(2)}`);
      } else if (data.status === 'in_progress') {
        toast.info(`Batch stále probíhá... ${JSON.stringify(data.request_counts || {})}`);
      } else {
        toast.info(`Batch status: ${data.status || 'unknown'}`);
      }
      queryClient.invalidateQueries(['batch-queue', 'anthropic-batches']);
    },
    onError: (err) => toast.error(`Poll failed: ${err.message}`)
  });

  // Delete queue item
  const deleteItem = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('batch_generation_queue').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(['batch-queue'])
  });

  // Generate single topic via Edge Function (SAFE - only 1 at a time)
  const generateSingle = useMutation({
    mutationFn: async () => {
      const resp = await supabase.functions.invoke('batch-generate', { body: {} });
      if (resp.error) throw new Error(resp.error.message);
      return resp.data;
    },
    onSuccess: (data) => {
      if (data.processed === 0) {
        toast.info('Fronta je prázdná');
      } else {
        toast.success(`✅ "${data.title}" | $${data.cost}`);
      }
      queryClient.invalidateQueries(['batch-queue']);
    },
    onError: (err) => toast.error(`Generace selhala: ${err.message}`)
  });

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--mn-text))] flex items-center gap-2">
              <Database className="w-6 h-6 text-[hsl(var(--mn-accent))]" />
              Batch Generation Monitor
            </h1>
            <p className="text-sm text-[hsl(var(--mn-muted))] mt-1">
              Bezpečná generace přes Anthropic Batch API (50% sleva, bez waste)
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))]">
            <RefreshCw className="w-4 h-4 mr-1" /> Obnovit
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatBox icon={Clock} label="Čekající" value={stats.pending} accent="bg-[hsl(var(--mn-warn))]/20" />
          <StatBox icon={Loader2} label="Probíhá" value={stats.processing} accent="bg-[hsl(var(--mn-accent-2))]/20" />
          <StatBox icon={CheckCircle2} label="Hotovo" value={stats.completed} accent="bg-[hsl(var(--mn-success))]/20" />
          <StatBox icon={XCircle} label="Chyby" value={stats.failed} accent="bg-[hsl(var(--mn-danger))]/20" />
          <StatBox icon={DollarSign} label="API cost (7d)" value={`$${totalTrackedCost.toFixed(2)}`} accent="bg-[hsl(var(--mn-accent))]/20" />
          <StatBox icon={BarChart3} label="Odhad zbytku" value={`$${estimatedBatchCost.toFixed(0)}`} sub="Batch API 50%" accent="bg-cyan-500/20" />
        </div>

        {/* SAFETY WARNING */}
        <div className="rounded-xl border border-[hsl(var(--mn-warn))]/30 bg-[hsl(var(--mn-warn))]/5 p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[hsl(var(--mn-warn))] flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-[hsl(var(--mn-warn))]">Bezpečnostní režim aktivní</p>
            <p className="text-[hsl(var(--mn-muted))] mt-1">
              Masová generace je dostupná POUZE přes Anthropic Batch API (50% sleva, žádné retries/waste).
              Tlačítko "Generovat 1 topic" volá Messages API pro testování — max 1 topic najednou.
            </p>
          </div>
        </div>

        {/* Actions */}
        <Card className="bg-[hsl(var(--mn-surface))]/50 border-[hsl(var(--mn-border))]">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Batch API Submit */}
              <Button
                onClick={() => submitBatch.mutate(stats.pending)}
                disabled={submitBatch.isPending || stats.pending === 0}
                className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent))] text-[hsl(var(--mn-text))]"
              >
                {submitBatch.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Odeslat Batch API ({stats.pending} topics, ~${estimatedBatchCost.toFixed(0)})
              </Button>

              {/* Poll results */}
              <Button
                variant="outline"
                onClick={() => pollBatch.mutate()}
                disabled={pollBatch.isPending}
                className="border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))]"
              >
                {pollBatch.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Zkontrolovat výsledky
              </Button>

              {/* Single topic test */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateSingle.mutate()}
                disabled={generateSingle.isPending || stats.pending === 0}
                className="border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))]"
              >
                {generateSingle.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                Test: Generovat 1 topic
              </Button>

              {/* Reset stuck */}
              {stats.processing > 0 && (
                <Button
                  variant="outline" size="sm"
                  onClick={() => resetStuck.mutate()}
                  className="border-[hsl(var(--mn-warn))]/30 text-[hsl(var(--mn-warn))] hover:bg-[hsl(var(--mn-warn))]/10"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reset zaseklých ({stats.processing})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Batches */}
        {batches.length > 0 && (
          <Card className="bg-[hsl(var(--mn-surface))]/50 border-[hsl(var(--mn-border))]">
            <CardHeader className="pb-3">
              <CardTitle className="text-[hsl(var(--mn-muted))] text-lg">📦 Anthropic Batches</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[hsl(var(--mn-border))]">
                {batches.map(b => (
                  <div key={b.id} className="flex items-center gap-4 px-5 py-3">
                    <Badge variant="outline" className={
                      b.status === 'processed' ? 'bg-[hsl(var(--mn-success))]/20 text-[hsl(var(--mn-success))] border-[hsl(var(--mn-success))]/30' :
                      b.status === 'in_progress' ? 'bg-[hsl(var(--mn-accent-2))]/20 text-[hsl(var(--mn-accent-2))] border-[hsl(var(--mn-accent-2))]/30 animate-pulse' :
                      'bg-[hsl(var(--mn-muted)/0.2)] text-[hsl(var(--mn-muted))]'
                    }>{b.status}</Badge>
                    <span className="text-sm text-[hsl(var(--mn-muted))] font-mono">{b.batch_id?.substring(0, 25)}...</span>
                    <span className="text-sm text-[hsl(var(--mn-muted))]">{b.total_requests} req</span>
                    {b.actual_cost && <span className="text-sm text-[hsl(var(--mn-success))]">${Number(b.actual_cost).toFixed(2)}</span>}
                    {b.cost_estimate && !b.actual_cost && <span className="text-sm text-[hsl(var(--mn-warn))]">~${Number(b.cost_estimate).toFixed(2)}</span>}
                    <span className="text-xs text-[hsl(var(--mn-muted))] ml-auto">{new Date(b.created_at).toLocaleString('cs')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Queue Table */}
        <Card className="bg-[hsl(var(--mn-surface))]/50 border-[hsl(var(--mn-border))]">
          <CardHeader className="pb-3">
            <CardTitle className="text-[hsl(var(--mn-muted))] text-lg">
              Fronta generace ({queue.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-[hsl(var(--mn-muted))]">Načítám...</div>
            ) : queue.length === 0 ? (
              <div className="p-8 text-center text-[hsl(var(--mn-muted))]">Fronta je prázdná.</div>
            ) : (
              <div className="divide-y divide-[hsl(var(--mn-border))] max-h-[500px] overflow-y-auto">
                {queue.slice(0, 100).map(item => {
                  const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                  const topic = item.topics;
                  const hasFulltext = topic?.full_text_content?.length > 100;
                  const hasHY = topic?.bullet_points_summary?.length > 50;

                  return (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[hsl(var(--mn-surface-2))]/30 transition-colors">
                      <span className="text-xs text-[hsl(var(--mn-muted))] font-mono w-6 text-center">{item.priority}</span>
                      <div className={`w-2.5 h-2.5 rounded-full ${sc.color} ${item.status === 'processing' ? 'animate-pulse' : ''}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[hsl(var(--mn-text))] dark:text-[hsl(var(--mn-text))] truncate">{topic?.title}</span>
                          <Badge variant="outline" className={`text-[10px] ${sc.badge} border`}>{sc.label}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[hsl(var(--mn-muted))]">
                          <span>{topic?.obory?.name}</span>
                          <span>Modes: {item.modes?.join(', ')}</span>
                          {topic?.ai_cost > 0 && <span className="text-[hsl(var(--mn-success))]">${Number(topic.ai_cost).toFixed(3)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${hasFulltext ? 'bg-[hsl(var(--mn-success))]' : 'bg-[hsl(var(--mn-elevated))]'}`} title="Fulltext" />
                        <div className={`w-2 h-2 rounded-full ${hasHY ? 'bg-[hsl(var(--mn-success))]' : 'bg-[hsl(var(--mn-elevated))]'}`} title="High-Yield" />
                      </div>
                      {item.error_message && (
                        <span className="text-xs text-[hsl(var(--mn-danger))] max-w-[200px] truncate" title={item.error_message}>{item.error_message}</span>
                      )}
                      <button onClick={() => deleteItem.mutate(item.id)} className="text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-danger))] transition-colors p-1" title="Odstranit">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {queue.length > 100 && (
                  <div className="p-3 text-center text-xs text-[hsl(var(--mn-muted))]">... a dalších {queue.length - 100} položek</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
