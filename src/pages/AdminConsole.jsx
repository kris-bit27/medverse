/**
 * AdminConsole.jsx — Unified Admin Hub for MedVerse
 * Tabs: Dashboard | AI Generování | Přehled obsahu | Správa
 */
import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { 
  Activity, BarChart3, BookOpen, CheckCircle2, ChevronRight, Clock,
  DollarSign, FileText, FolderTree, GraduationCap, Loader2, Plus,
  RefreshCw, RotateCcw, Shield, Sparkles, Stethoscope, Users, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { canAccessAdmin } from '@/components/utils/permissions';
import ContentCoverage from '@/components/admin/ContentCoverage';

/* ================================================================
   TAB: DASHBOARD
   ================================================================ */
function DashboardTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminDashStats'],
    queryFn: async () => {
      const [tRes, uRes, qRes, bRes] = await Promise.all([
        supabase.from('topics').select('status, full_text_content, bullet_points_summary'),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('batch_generation_queue').select('status'),
      ]);
      const t = tRes.data || [];
      const b = bRes.data || [];
      return {
        topics: { total: t.length, published: t.filter(x => x.status === 'published').length,
          withFt: t.filter(x => x.full_text_content).length, withHy: t.filter(x => x.bullet_points_summary).length },
        users: uRes.count || 0, questions: qRes.count || 0,
        queue: { pending: b.filter(x => x.status === 'pending').length, processing: b.filter(x => x.status === 'processing').length,
          completed: b.filter(x => x.status === 'completed').length, failed: b.filter(x => x.status === 'failed').length }
      };
    },
    refetchInterval: 15000
  });

  if (isLoading) return <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  const s = stats;
  const pct = s.topics.total > 0 ? Math.round((s.topics.withFt / s.topics.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Topics', value: s.topics.total, icon: BookOpen, color: 'text-blue-600' },
          { label: 'S obsahem', value: s.topics.withFt, icon: FileText, color: 'text-green-600' },
          { label: 'Published', value: s.topics.published, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Uživatelé', value: s.users, icon: Users, color: 'text-purple-600' },
        ].map((m, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-sm text-[hsl(var(--mn-muted))]">{m.label}</p><p className={`text-2xl font-bold ${m.color}`}>{m.value}</p></div>
            <m.icon className="w-8 h-8 opacity-20" />
          </CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Pokrytí obsahem</h3>
          <span className="text-sm text-[hsl(var(--mn-muted))]">{pct}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div><p className="font-bold text-blue-600">{s.topics.withFt}</p><p className="text-[hsl(var(--mn-muted))]">fulltext</p></div>
          <div><p className="font-bold text-purple-600">{s.topics.withHy}</p><p className="text-[hsl(var(--mn-muted))]">high-yield</p></div>
          <div><p className="font-bold text-[hsl(var(--mn-muted))]">{s.topics.total - s.topics.withFt}</p><p className="text-[hsl(var(--mn-muted))]">bez obsahu</p></div>
        </div>
      </CardContent></Card>

      {(s.queue.pending > 0 || s.queue.processing > 0) && (
        <Card className="border-blue-200 dark:border-blue-800"><CardContent className="p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <div><p className="font-medium">Generování běží</p>
          <p className="text-sm text-[hsl(var(--mn-muted))]">{s.queue.processing} zpracovává · {s.queue.pending} čeká · {s.queue.completed} hotovo</p></div>
        </CardContent></Card>
      )}

      <div>
        <h3 className="font-semibold mb-3">Správa obsahu</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { label: 'Taxonomie', desc: 'Obory, okruhy, témata', icon: FolderTree, page: 'AdminTaxonomy', color: 'from-amber-500 to-orange-600' },
            { label: 'Otázky', desc: 'Testové otázky', icon: GraduationCap, page: 'AdminQuestions', color: 'from-teal-500 to-cyan-600' },
            { label: 'Články', desc: 'Klinické přehledy', icon: BookOpen, page: 'AdminArticles', color: 'from-blue-500 to-indigo-600' },
          ].map((a, i) => (
            <Link key={i} to={createPageUrl(a.page)}>
              <Card className="hover:shadow-md transition-all group cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center shrink-0`}>
                    <a.icon className="w-5 h-5 text-[hsl(var(--mn-text))]" />
                  </div>
                  <div className="min-w-0"><p className="font-medium group-hover:text-teal-600 transition-colors">{a.label}</p>
                  <p className="text-xs text-[hsl(var(--mn-muted))]">{a.desc}</p></div>
                  <ChevronRight className="w-4 h-4 text-[hsl(var(--mn-muted))] ml-auto shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Systém</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { label: 'Uživatelé', desc: 'Správa rolí a přístupů', icon: Users, page: 'AdminUsers', color: 'from-emerald-500 to-teal-600' },
            { label: 'AI Náklady', desc: 'Cost management', icon: DollarSign, page: 'AdminCostAnalytics', color: 'from-green-500 to-emerald-600' },
            { label: 'Audit', desc: 'Historie změn', icon: FileText, page: 'AdminAudit', color: 'from-slate-500 to-slate-700' },
          ].map((a, i) => (
            <Link key={i} to={createPageUrl(a.page)}>
              <Card className="hover:shadow-md transition-all group cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center shrink-0`}>
                    <a.icon className="w-5 h-5 text-[hsl(var(--mn-text))]" />
                  </div>
                  <div className="min-w-0"><p className="font-medium group-hover:text-teal-600 transition-colors">{a.label}</p>
                  <p className="text-xs text-[hsl(var(--mn-muted))]">{a.desc}</p></div>
                  <ChevronRight className="w-4 h-4 text-[hsl(var(--mn-muted))] ml-auto shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   TAB: AI GENERATION
   ================================================================ */
function AIGenerationTab() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [subTab, setSubTab] = useState('monitor');
  const [selObor, setSelObor] = useState('all');
  const [filter, setFilter] = useState('without_content');
  const [selIds, setSelIds] = useState(new Set());

  const { data: qs } = useQuery({
    queryKey: ['bqStats'], refetchInterval: 10000,
    queryFn: async () => {
      const { data } = await supabase.from('batch_generation_queue').select('status');
      const c = { pending: 0, processing: 0, completed: 0, failed: 0 };
      (data || []).forEach(x => { if (c[x.status] !== undefined) c[x.status]++; });
      return c;
    }
  });

  const { data: recent = [] } = useQuery({
    queryKey: ['bqRecent'], refetchInterval: 10000,
    queryFn: async () => {
      const { data } = await supabase.from('batch_generation_queue')
        .select('id, status, result, topics!inner(title, obory!inner(name))')
        .order('completed_at', { ascending: false, nullsFirst: false }).limit(25);
      return data || [];
    }
  });

  const resetFailed = useMutation({
    mutationFn: () => supabase.from('batch_generation_queue')
      .update({ status: 'pending', started_at: null, completed_at: null, error_message: null, result: null })
      .eq('status', 'failed'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bqStats'] }); qc.invalidateQueries({ queryKey: ['bqRecent'] }); toast.success('Failed resetovány'); }
  });

  const resetStuck = useMutation({
    mutationFn: () => supabase.from('batch_generation_queue')
      .update({ status: 'pending', started_at: null }).eq('status', 'processing'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bqStats'] }); toast.success('Processing resetovány'); }
  });

  const { data: obory = [] } = useQuery({
    queryKey: ['obList'],
    queryFn: async () => { const { data } = await supabase.from('obory').select('id, name').order('name'); return data || []; }
  });

  const { data: qTopics = [], isLoading: tLoad } = useQuery({
    queryKey: ['tForQ', selObor, filter], enabled: subTab === 'add',
    queryFn: async () => {
      let q = supabase.from('topics').select('id, title, full_text_content, bullet_points_summary, obor_id, obory!inner(name)').order('title');
      if (selObor !== 'all') q = q.eq('obor_id', selObor);
      if (filter === 'without_content') q = q.is('full_text_content', null);
      else if (filter === 'without_summary') q = q.not('full_text_content', 'is', null).is('bullet_points_summary', null);
      const { data } = await q; return data || [];
    }
  });

  const { data: existQ = [] } = useQuery({
    queryKey: ['existQ'], enabled: subTab === 'add',
    queryFn: async () => {
      const { data } = await supabase.from('batch_generation_queue').select('topic_id').in('status', ['pending', 'processing']);
      return (data || []).map(d => d.topic_id);
    }
  });

  const avail = useMemo(() => { const s = new Set(existQ); return qTopics.filter(t => !s.has(t.id)); }, [qTopics, existQ]);

  const addToQ = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selIds);
      const items = ids.map(id => ({ topic_id: id, modes: ['fulltext', 'high_yield'], status: 'pending', priority: 1, created_by: user?.id }));
      for (let i = 0; i < items.length; i += 50) {
        const { error } = await supabase.from('batch_generation_queue').insert(items.slice(i, i + 50));
        if (error) throw error;
      }
      return ids.length;
    },
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ['bqStats'] }); qc.invalidateQueries({ queryKey: ['existQ'] }); setSelIds(new Set()); toast.success(`${n} přidáno do fronty`); }
  });

  const st = qs || { pending: 0, processing: 0, completed: 0, failed: 0 };
  const tot = st.pending + st.processing + st.completed + st.failed;
  const pct = tot > 0 ? Math.round((st.completed / tot) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-[hsl(var(--mn-surface-2))] rounded-lg p-1 w-fit">
        {[{ id: 'monitor', label: 'Monitoring' }, { id: 'add', label: 'Přidat do fronty' }].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${subTab === t.id ? 'bg-[hsl(var(--mn-surface))] dark:bg-slate-700 shadow-sm' : 'text-[hsl(var(--mn-muted))] hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'monitor' && (<>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: 'Pending', v: st.pending, c: 'text-amber-600', I: Clock },
            { l: 'Processing', v: st.processing, c: 'text-blue-600', I: Loader2, spin: st.processing > 0 },
            { l: 'Completed', v: st.completed, c: 'text-green-600', I: CheckCircle2 },
            { l: 'Failed', v: st.failed, c: 'text-red-600', I: XCircle },
          ].map((m, i) => (
            <Card key={i}><CardContent className="p-3 flex items-center justify-between">
              <div><p className="text-xs text-[hsl(var(--mn-muted))]">{m.l}</p><p className={`text-xl font-bold ${m.c}`}>{m.v}</p></div>
              <m.I className={`w-6 h-6 opacity-20 ${m.spin ? 'animate-spin' : ''}`} />
            </CardContent></Card>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm text-[hsl(var(--mn-muted))] w-12 text-right">{pct}%</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {st.failed > 0 && <Button variant="outline" size="sm" onClick={() => resetFailed.mutate()}><RotateCcw className="w-4 h-4 mr-1" />Reset {st.failed} failed</Button>}
          {st.processing > 0 && <Button variant="outline" size="sm" onClick={() => resetStuck.mutate()}><RefreshCw className="w-4 h-4 mr-1" />Reset zaseklé</Button>}
          <Button variant="ghost" size="sm" onClick={() => { qc.invalidateQueries({ queryKey: ['bqStats'] }); qc.invalidateQueries({ queryKey: ['bqRecent'] }); }}>
            <RefreshCw className="w-4 h-4 mr-1" />Refresh
          </Button>
        </div>

        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Poslední zpracované</CardTitle></CardHeader>
          <CardContent className="p-0"><div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-[hsl(var(--mn-surface-2))] sticky top-0 text-xs">
                <tr><th className="text-left p-2.5">Topic</th><th className="text-left p-2.5 hidden md:table-cell">Obor</th>
                <th className="text-center p-2.5">Status</th><th className="text-right p-2.5 hidden md:table-cell">Cost</th></tr>
              </thead>
              <tbody className="divide-y">
                {recent.map(item => {
                  const cost = item.result ? Object.values(item.result).reduce((s, r) => s + parseFloat(r?.cost || 0), 0) : 0;
                  return (
                    <tr key={item.id} className="hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-[hsl(var(--mn-surface-2))]/50">
                      <td className="p-2.5 max-w-xs truncate">{item.topics?.title}</td>
                      <td className="p-2.5 hidden md:table-cell text-[hsl(var(--mn-muted))] text-xs">{item.topics?.obory?.name}</td>
                      <td className="p-2.5 text-center">
                        <Badge variant={item.status === 'completed' ? 'default' : item.status === 'failed' ? 'destructive' : 'outline'}
                          className={item.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right hidden md:table-cell text-[hsl(var(--mn-muted))] text-xs">{cost > 0 ? `$${cost.toFixed(3)}` : '—'}</td>
                    </tr>);
                })}
                {recent.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-[hsl(var(--mn-muted))]">Fronta je prázdná</td></tr>}
              </tbody>
            </table>
          </div></CardContent>
        </Card>
      </>)}

      {subTab === 'add' && (<>
        <div className="flex flex-wrap gap-3">
          <Select value={selObor} onValueChange={v => { setSelObor(v); setSelIds(new Set()); }}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Všechny obory" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Všechny obory</SelectItem>
              {obory.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filter} onValueChange={v => { setFilter(v); setSelIds(new Set()); }}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="without_content">Bez fulltextu</SelectItem>
              <SelectItem value="without_summary">Bez high-yield</SelectItem>
              <SelectItem value="all_draft">Všechny</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between bg-[hsl(var(--mn-surface-2))] rounded-lg p-3">
          <div className="flex items-center gap-3">
            <Checkbox checked={avail.length > 0 && selIds.size === avail.length}
              onCheckedChange={() => setSelIds(p => p.size === avail.length ? new Set() : new Set(avail.map(t => t.id)))} />
            <span className="text-sm">{selIds.size} z {avail.length} vybráno</span>
            {existQ.length > 0 && <Badge variant="outline" className="text-xs">{existQ.length} ve frontě</Badge>}
          </div>
          <Button size="sm" disabled={selIds.size === 0 || addToQ.isPending} onClick={() => addToQ.mutate()}>
            {addToQ.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Přidat ({selIds.size})
          </Button>
        </div>

        <Card><CardContent className="p-0"><div className="max-h-80 overflow-y-auto">
          {tLoad ? <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
          : avail.length === 0 ? <div className="p-8 text-center text-[hsl(var(--mn-muted))]"><CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-500" />Vše má obsah nebo je ve frontě</div>
          : <table className="w-full text-sm">
              <thead className="border-b bg-[hsl(var(--mn-surface-2))] sticky top-0 text-xs">
                <tr><th className="w-10 p-2.5"></th><th className="text-left p-2.5">Topic</th><th className="text-left p-2.5 hidden md:table-cell">Obor</th></tr>
              </thead>
              <tbody className="divide-y">
                {avail.map(t => (
                  <tr key={t.id} className="hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-[hsl(var(--mn-surface-2))]/30">
                    <td className="p-2.5 text-center">
                      <Checkbox checked={selIds.has(t.id)} onCheckedChange={ch => setSelIds(p => { const n = new Set(p); ch ? n.add(t.id) : n.delete(t.id); return n; })} />
                    </td>
                    <td className="p-2.5 max-w-xs truncate">{t.title}</td>
                    <td className="p-2.5 hidden md:table-cell text-[hsl(var(--mn-muted))] text-xs">{t.obory?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>}
        </div></CardContent></Card>
      </>)}
    </div>
  );
}

/* ================================================================
   TAB: CONTENT OVERVIEW
   ================================================================ */
function ContentOverviewTab() {
  const [expandedObor, setExpandedObor] = useState(null);

  const { data: oborStats = [], isLoading } = useQuery({
    queryKey: ['oborStats'],
    queryFn: async () => {
      const { data } = await supabase.from('obory')
        .select('id, name, topics(id, status, full_text_content, bullet_points_summary)')
        .order('name');
      return (data || []).map(o => {
        const t = o.topics || [];
        return { id: o.id, name: o.name, total: t.length,
          published: t.filter(x => x.status === 'published').length,
          withFt: t.filter(x => x.full_text_content).length,
          withHy: t.filter(x => x.bullet_points_summary).length,
          empty: t.filter(x => !x.full_text_content).length };
      }).sort((a, b) => b.total - a.total);
    }
  });

  const { data: expTopics = [] } = useQuery({
    queryKey: ['oborTopics', expandedObor],
    queryFn: async () => {
      const { data } = await supabase.from('topics')
        .select('id, title, status, full_text_content, bullet_points_summary, ai_model')
        .eq('obor_id', expandedObor).order('title');
      return data || [];
    },
    enabled: !!expandedObor
  });

  const totals = useMemo(() => oborStats.reduce((a, o) => ({
    total: a.total + o.total, published: a.published + o.published,
    withFt: a.withFt + o.withFt, withHy: a.withHy + o.withHy, empty: a.empty + o.empty
  }), { total: 0, published: 0, withFt: 0, withHy: 0, empty: 0 }), [oborStats]);

  if (isLoading) return <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { v: totals.total, l: 'Celkem', c: '' },
          { v: totals.published, l: 'Published', c: 'text-green-600' },
          { v: totals.withFt, l: 'Fulltext', c: 'text-blue-600' },
          { v: totals.withHy, l: 'High-yield', c: 'text-purple-600' },
          { v: totals.empty, l: 'Bez obsahu', c: 'text-[hsl(var(--mn-muted))]' },
        ].map((m, i) => (
          <Card key={i}><CardContent className="p-3 text-center">
            <p className={`text-xl font-bold ${m.c}`}>{m.v}</p>
            <p className="text-xs text-[hsl(var(--mn-muted))]">{m.l}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="space-y-1.5">
        {oborStats.map(obor => {
          const isExp = expandedObor === obor.id;
          const pct = obor.total > 0 ? Math.round((obor.withFt / obor.total) * 100) : 0;
          return (
            <Card key={obor.id} className={isExp ? 'ring-2 ring-purple-500/40' : ''}>
              <CardContent className="p-0">
                <button onClick={() => setExpandedObor(isExp ? null : obor.id)}
                  className="w-full p-3 flex items-center gap-3 text-left hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-[hsl(var(--mn-surface-2))]/50 transition-colors">
                  <ChevronRight className={`w-4 h-4 text-[hsl(var(--mn-muted))] transition-transform ${isExp ? 'rotate-90' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{obor.name}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{obor.total}</Badge>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                      <div className={`h-1 rounded-full ${pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-blue-500' : 'bg-slate-300'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="hidden md:flex gap-3 text-[11px] text-[hsl(var(--mn-muted))] shrink-0">
                    <span className="text-green-600">{obor.published} pub</span>
                    <span className="text-blue-600">{obor.withFt} ft</span>
                    <span className="text-purple-600">{obor.withHy} hy</span>
                  </div>
                </button>
                {isExp && (
                  <div className="border-t px-3 pb-3 max-h-60 overflow-y-auto">
                    <table className="w-full text-xs mt-1">
                      <thead className="text-[hsl(var(--mn-muted))] border-b">
                        <tr><th className="text-left py-1.5">Topic</th><th className="text-center py-1.5 w-14">Status</th>
                        <th className="text-center py-1.5 w-8">FT</th><th className="text-center py-1.5 w-8">HY</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {expTopics.map(t => (
                          <tr key={t.id}>
                            <td className="py-1.5 max-w-xs truncate">{t.title}</td>
                            <td className="py-1.5 text-center">
                              <Badge variant="outline" className={`text-[10px] ${t.status === 'published' ? 'bg-green-50 text-green-600 dark:bg-green-900/20' : ''}`}>
                                {t.status}
                              </Badge>
                            </td>
                            <td className="py-1.5 text-center">{t.full_text_content ? '✅' : '—'}</td>
                            <td className="py-1.5 text-center">{t.bullet_points_summary ? '✅' : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   MAIN EXPORT: AdminConsole
   ================================================================ */
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'ai', label: 'AI Generování', icon: Sparkles },
  { id: 'content', label: 'Přehled obsahu', icon: BookOpen },
];

export default function AdminConsole() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Debug: show user role info (temporary)
  console.log('[AdminConsole] user:', user?.email, 'role:', user?.role, 'canAccess:', canAccessAdmin(user));

  if (!user) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-4" />
        <p className="text-[hsl(var(--mn-muted))]">Načítám...</p>
      </div>
    );
  }

  // Temporary: allow access if user.role is admin OR if user_profiles has admin
  const hasAccess = canAccessAdmin(user) || user?.role === 'admin';

  if (!hasAccess) {
    return (
      <div className="p-12 text-center">
        <Shield className="w-12 h-12 mx-auto text-[hsl(var(--mn-muted))] mb-4" />
        <h2 className="text-xl font-semibold mb-2">Přístup odepřen</h2>
        <p className="text-[hsl(var(--mn-muted))]">Nemáte oprávnění pro přístup k administraci</p>
        <p className="text-xs text-[hsl(var(--mn-muted))] mt-2">Debug: role={user?.role || 'undefined'} | email={user?.email}</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[hsl(var(--mn-text))]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--mn-text))]">Administrace</h1>
            <p className="text-sm text-[hsl(var(--mn-muted))]">MedVerse Admin Console</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-[hsl(var(--mn-surface-2))] rounded-lg p-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[hsl(var(--mn-surface))] dark:bg-slate-700 text-[hsl(var(--mn-text))] shadow-sm'
                  : 'text-[hsl(var(--mn-muted))] hover:text-slate-700 dark:hover:text-[hsl(var(--mn-text))]'
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'dashboard' && <>
        <DashboardTab />
        <div className="mt-6"><ContentCoverage /></div>
      </>}
      {activeTab === 'ai' && <AIGenerationTab />}
      {activeTab === 'content' && <ContentOverviewTab />}
    </div>
  );
}
