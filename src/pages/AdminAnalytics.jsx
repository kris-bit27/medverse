import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft, BarChart3, Users, BookOpen, Brain, DollarSign,
  Activity, TrendingUp, FileText, Zap, Search, MessageSquare,
  Clock, Target, Loader2, Package
} from 'lucide-react';
import { canAccessAdmin } from '@/components/utils/permissions';

function StatCard({ icon: Icon, label, value, sub, color = 'from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-accent-2))]' }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-[hsl(var(--mn-text))]">{value ?? '—'}</p>
            <p className="text-xs text-[hsl(var(--mn-muted))] truncate">{label}</p>
            {sub && <p className="text-[10px] text-[hsl(var(--mn-muted))]">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EventTable({ events }) {
  if (!events?.length) return <p className="text-sm text-[hsl(var(--mn-muted))] py-4 text-center">Žádné události</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[hsl(var(--mn-border))]">
            <th className="text-left py-2 pr-3 text-[hsl(var(--mn-muted))] font-medium">Typ</th>
            <th className="text-left py-2 pr-3 text-[hsl(var(--mn-muted))] font-medium">Data</th>
            <th className="text-left py-2 text-[hsl(var(--mn-muted))] font-medium">Čas</th>
          </tr>
        </thead>
        <tbody>
          {events.map(e => (
            <tr key={e.id} className="border-b border-[hsl(var(--mn-border)/0.3)]">
              <td className="py-1.5 pr-3">
                <Badge variant="outline" className="text-[10px]">{e.event_type}</Badge>
              </td>
              <td className="py-1.5 pr-3 text-[hsl(var(--mn-muted))] max-w-[300px] truncate">
                {JSON.stringify(e.event_data).substring(0, 80)}
              </td>
              <td className="py-1.5 text-[hsl(var(--mn-muted))] whitespace-nowrap">
                {new Date(e.created_at).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAnalytics() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');

  const { data: contentStats } = useQuery({
    queryKey: ['admin-content-stats'],
    queryFn: async () => {
      const [topics, flashcards, questions, obory] = await Promise.all([
        supabase.from('topics').select('id, full_text_content, bullet_points_summary', { count: 'exact' }),
        supabase.from('flashcards').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('obory').select('id', { count: 'exact', head: true }),
      ]);
      const topicsData = topics.data || [];
      return {
        totalTopics: topics.count || 0,
        withFulltext: topicsData.filter(t => t.full_text_content).length,
        withSummary: topicsData.filter(t => t.bullet_points_summary).length,
        flashcards: flashcards.count || 0,
        questions: questions.count || 0,
        obory: obory.count || 0,
      };
    },
  });

  const { data: userStats } = useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: async () => {
      const [profiles, sessions, tests, sets, fc] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('study_sessions').select('id', { count: 'exact', head: true }),
        supabase.from('test_sessions').select('id', { count: 'exact', head: true }),
        supabase.from('study_sets').select('id', { count: 'exact', head: true }),
        supabase.from('user_flashcard_progress').select('id', { count: 'exact', head: true }),
      ]);
      return {
        totalUsers: profiles.count || 0,
        studySessions: sessions.count || 0,
        testSessions: tests.count || 0,
        studySets: sets.count || 0,
        fcReviews: fc.count || 0,
      };
    },
  });

  const { data: costStats } = useQuery({
    queryKey: ['admin-cost-stats'],
    queryFn: async () => {
      const { data } = await supabase.from('api_call_log').select('source, mode, model, cost_usd, input_tokens, output_tokens');
      if (!data) return { totalCost: 0, totalCalls: 0, byMode: [], byModel: [] };

      const totalCost = data.reduce((s, r) => s + (r.cost_usd || 0), 0);
      const totalTokens = data.reduce((s, r) => s + (r.input_tokens || 0) + (r.output_tokens || 0), 0);

      const modeMap = {};
      data.forEach(r => {
        const key = r.mode || 'unknown';
        if (!modeMap[key]) modeMap[key] = { mode: key, calls: 0, cost: 0 };
        modeMap[key].calls++;
        modeMap[key].cost += r.cost_usd || 0;
      });

      const modelMap = {};
      data.forEach(r => {
        const key = r.model || 'unknown';
        if (!modelMap[key]) modelMap[key] = { model: key, calls: 0, cost: 0 };
        modelMap[key].calls++;
        modelMap[key].cost += r.cost_usd || 0;
      });

      return {
        totalCost,
        totalCalls: data.length,
        totalTokens,
        byMode: Object.values(modeMap).sort((a, b) => b.cost - a.cost),
        byModel: Object.values(modelMap).sort((a, b) => b.cost - a.cost),
      };
    },
  });

  const { data: events } = useQuery({
    queryKey: ['admin-analytics-events'],
    queryFn: async () => {
      const { data } = await supabase.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(100);
      return data || [];
    },
  });

  const eventBreakdown = events?.reduce((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1;
    return acc;
  }, {}) || {};

  if (!canAccessAdmin(user)) {
    return <div className="p-6 text-center"><p>Přístup odepřen</p></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <Link to={createPageUrl('Admin')}>
          <Button variant="ghost" size="sm" className="mb-3"><ChevronLeft className="w-4 h-4 mr-1" /> Admin</Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--mn-text))]">Analytics Dashboard</h1>
            <p className="text-sm text-[hsl(var(--mn-muted))]">Přehled platformy, obsahu a AI nákladů</p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5"><Activity className="w-3.5 h-3.5" /> Přehled</TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Obsah</TabsTrigger>
          <TabsTrigger value="costs" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> AI Náklady</TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5"><Zap className="w-3.5 h-3.5" /> Události</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Users} label="Uživatelé" value={userStats?.totalUsers} color="from-blue-500 to-indigo-600" />
            <StatCard icon={BookOpen} label="Témata" value={contentStats?.totalTopics} sub={`${contentStats?.withFulltext || 0} s textem`} color="from-purple-500 to-violet-600" />
            <StatCard icon={Brain} label="Flashcards" value={contentStats?.flashcards?.toLocaleString()} color="from-amber-500 to-orange-600" />
            <StatCard icon={Target} label="MCQ otázky" value={contentStats?.questions?.toLocaleString()} color="from-teal-500 to-cyan-600" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Clock} label="Studijní sessions" value={userStats?.studySessions} color="from-emerald-500 to-green-600" />
            <StatCard icon={FileText} label="Test sessions" value={userStats?.testSessions} color="from-rose-500 to-pink-600" />
            <StatCard icon={Package} label="Studijní sady" value={userStats?.studySets} color="from-sky-500 to-blue-600" />
            <StatCard icon={DollarSign} label="AI celkem" value={`$${(costStats?.totalCost || 0).toFixed(2)}`} sub={`${costStats?.totalCalls || 0} volání`} color="from-emerald-500 to-teal-600" />
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-[hsl(var(--mn-accent))]" /> Poslední události</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.entries(eventBreakdown).sort(([,a],[,b]) => b-a).map(([type, count]) => (
                  <Badge key={type} variant="outline" className="text-xs gap-1">{type} <span className="font-bold text-[hsl(var(--mn-accent))]">{count}</span></Badge>
                ))}
              </div>
              <EventTable events={events?.slice(0, 10)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTENT */}
        <TabsContent value="content" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard icon={BookOpen} label="Celkem témat" value={contentStats?.totalTopics} color="from-purple-500 to-violet-600" />
            <StatCard icon={FileText} label="S full textem" value={contentStats?.withFulltext} sub={`${contentStats?.totalTopics ? Math.round((contentStats.withFulltext / contentStats.totalTopics) * 100) : 0}%`} color="from-emerald-500 to-green-600" />
            <StatCard icon={FileText} label="Se shrnutím" value={contentStats?.withSummary} sub={`${contentStats?.totalTopics ? Math.round((contentStats.withSummary / contentStats.totalTopics) * 100) : 0}%`} color="from-teal-500 to-cyan-600" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Brain} label="Flashcards" value={contentStats?.flashcards?.toLocaleString()} sub={`Ø ${contentStats?.totalTopics ? Math.round(contentStats.flashcards / contentStats.totalTopics) : 0} / téma`} color="from-amber-500 to-orange-600" />
            <StatCard icon={Target} label="MCQ" value={contentStats?.questions?.toLocaleString()} sub={`Ø ${contentStats?.totalTopics ? Math.round(contentStats.questions / contentStats.totalTopics) : 0} / téma`} color="from-rose-500 to-pink-600" />
            <StatCard icon={TrendingUp} label="Oborů" value={contentStats?.obory} color="from-blue-500 to-indigo-600" />
            <StatCard icon={Zap} label="FC Reviews" value={userStats?.fcReviews} color="from-sky-500 to-blue-600" />
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Pokrytí obsahu</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Full text', done: contentStats?.withFulltext, total: contentStats?.totalTopics },
                { label: 'High-yield shrnutí', done: contentStats?.withSummary, total: contentStats?.totalTopics },
              ].map(({ label, done, total }) => {
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[hsl(var(--mn-text))]">{label}</span>
                      <span className="text-[hsl(var(--mn-muted))]">{done}/{total} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-[hsl(var(--mn-surface-2))] overflow-hidden">
                      <div className="h-full rounded-full bg-[hsl(var(--mn-accent))] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI COSTS */}
        <TabsContent value="costs" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard icon={DollarSign} label="Celkové náklady" value={`$${(costStats?.totalCost || 0).toFixed(2)}`} color="from-emerald-500 to-teal-600" />
            <StatCard icon={Zap} label="API volání" value={costStats?.totalCalls?.toLocaleString()} color="from-amber-500 to-orange-600" />
            <StatCard icon={Activity} label="Tokeny celkem" value={`${((costStats?.totalTokens || 0) / 1_000_000).toFixed(1)}M`} color="from-purple-500 to-violet-600" />
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Náklady dle módu</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {costStats?.byMode?.map(m => (
                  <div key={m.mode} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{m.mode}</Badge>
                      <span className="text-[hsl(var(--mn-muted))]">{m.calls}×</span>
                    </div>
                    <span className="font-mono font-semibold text-[hsl(var(--mn-text))]">${m.cost.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Náklady dle modelu</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {costStats?.byModel?.map(m => {
                  const pct = costStats.totalCost ? Math.round((m.cost / costStats.totalCost) * 100) : 0;
                  return (
                    <div key={m.model}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[hsl(var(--mn-text))] font-medium">{m.model}</span>
                          <span className="text-[hsl(var(--mn-muted))]">{m.calls}×</span>
                        </div>
                        <span className="font-mono font-semibold">${m.cost.toFixed(2)} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[hsl(var(--mn-surface-2))] overflow-hidden">
                        <div className="h-full rounded-full bg-[hsl(var(--mn-accent))]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Multi-model strategie</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                {[
                  { model: 'Gemini Flash 2.0', role: 'Analytika, reporty, extrakce', tier: '💚 Nejlevnější' },
                  { model: 'Claude Sonnet', role: 'Content, copilot, MedSearch', tier: '🟡 Střední' },
                  { model: 'Claude Opus', role: 'Full content generation (admin)', tier: '🔴 Premium' },
                  { model: 'GPT-4o', role: 'Cross-model content review', tier: '🟡 Střední' },
                ].map(s => (
                  <div key={s.model} className="flex items-center justify-between py-1 border-b border-[hsl(var(--mn-border)/0.3)] last:border-0">
                    <span className="font-medium text-[hsl(var(--mn-text))]">{s.model}</span>
                    <span className="text-[hsl(var(--mn-muted))]">{s.role}</span>
                    <span>{s.tier}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVENTS */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(eventBreakdown).sort(([,a],[,b]) => b-a).map(([type, count]) => (
              <Badge key={type} variant="outline" className="text-xs gap-1">{type} <span className="font-bold text-[hsl(var(--mn-accent))]">{count}</span></Badge>
            ))}
            {Object.keys(eventBreakdown).length === 0 && (
              <p className="text-sm text-[hsl(var(--mn-muted))]">Tracking je aktivní — data se začnou sbírat s prvními uživateli.</p>
            )}
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Poslední události (max 100)</CardTitle></CardHeader>
            <CardContent><EventTable events={events} /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
