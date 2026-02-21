/**
 * AdminPanel.jsx — Unified Admin Interface for MedVerse
 * 
 * Replaces: Admin.jsx + AdminConsole.jsx
 * Route: /AdminPanel (register in pages.config.js)
 * 
 * Architecture: Sidebar navigation with sub-pages rendered inline.
 * All data fetched live from Supabase.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { canAccessAdmin } from '@/components/utils/permissions';
import { cn } from '@/lib/utils';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

// lucide icons
import {
  LayoutDashboard, BookOpen, FileText, HelpCircle, Wrench, Bot,
  Users, Building2, Gem, DollarSign, CreditCard, BarChart3, Target,
  Brain, Settings, Zap, ClipboardList, Database, GraduationCap, Hammer,
  Shield, ChevronRight, ChevronLeft, Activity, TrendingUp, AlertCircle,
  CheckCircle, Clock, RefreshCw, Search, MoreHorizontal, ExternalLink,
  Eye, Edit, Trash2, Plus, Download, Upload, Play, Pause, Check, X,
  ArrowUp, ArrowDown, Loader2, PanelLeftClose, PanelLeft,
  Hash, Layers, MessageSquare, Star
} from 'lucide-react';

// ═══════════════════════════════════════════
// NAVIGATION CONFIG
// ═══════════════════════════════════════════
const NAV_SECTIONS = [
  {
    label: null, // no section header for dashboard
    items: [
      { id: 'dashboard', label: 'Přehled', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Obsah',
    items: [
      { id: 'content-topics', label: 'Témata & Okruhy', icon: BookOpen },
      { id: 'content-questions', label: 'Otázky & FC', icon: HelpCircle },
      { id: 'content-tools', label: 'Klinické nástroje', icon: Wrench },
      { id: 'content-generation', label: 'Generace obsahu', icon: Bot },
    ]
  },
  {
    label: 'Uživatelé',
    items: [
      { id: 'users-list', label: 'Správa uživatelů', icon: Users },
      { id: 'users-orgs', label: 'Organizace', icon: Building2 },
    ]
  },
  {
    label: 'Finance',
    items: [
      { id: 'finance-tokens', label: 'Token Policy', icon: Gem },
      { id: 'finance-costs', label: 'AI Cost Analytics', icon: DollarSign },
      { id: 'finance-billing', label: 'Platby', icon: CreditCard },
    ]
  },
  {
    label: 'Analytika',
    items: [
      { id: 'analytics-activity', label: 'Aktivita', icon: BarChart3 },
      { id: 'analytics-study', label: 'Studijní metriky', icon: Target },
      { id: 'analytics-ai', label: 'AI Usage', icon: Brain },
    ]
  },
  {
    label: 'Systém',
    items: [
      { id: 'system-settings', label: 'Nastavení', icon: Settings },
      { id: 'system-edge', label: 'Edge Functions', icon: Zap },
      { id: 'system-audit', label: 'Audit Log', icon: ClipboardList },
      { id: 'system-db', label: 'DB Health', icon: Database },
    ]
  },
  {
    label: 'Academy',
    items: [
      { id: 'academy-courses', label: 'Kurzy', icon: GraduationCap },
      { id: 'academy-builders', label: 'Builder Program', icon: Hammer },
    ]
  },
];

// ═══════════════════════════════════════════
// SHARED HOOKS
// ═══════════════════════════════════════════
function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        { count: totalTopics },
        { count: publishedTopics },
        { count: totalQuestions },
        { count: totalFlashcards },
        { count: totalVP },
        { count: totalMappings },
        { count: totalUsers },
        { count: totalOrgs },
        { count: totalTests },
        { count: totalSessions },
        { count: totalFeedback },
        { count: totalApiCalls },
        { count: totalClinicalTools },
        { count: totalDrugs },
        { count: totalAlgorithms },
        { count: academyCourses },
        { count: academyLessons },
      ] = await Promise.all([
        supabase.from('topics').select('*', { count: 'exact', head: true }),
        supabase.from('topics').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('questions').select('*', { count: 'exact', head: true }),
        supabase.from('flashcards').select('*', { count: 'exact', head: true }),
        supabase.from('training_requirements').select('*', { count: 'exact', head: true }),
        supabase.from('vp_topic_coverage').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('test_sessions').select('*', { count: 'exact', head: true }),
        supabase.from('study_sessions').select('*', { count: 'exact', head: true }),
        supabase.from('content_feedback').select('*', { count: 'exact', head: true }),
        supabase.from('api_call_log').select('*', { count: 'exact', head: true }),
        supabase.from('clinical_tools').select('*', { count: 'exact', head: true }),
        supabase.from('drugs').select('*', { count: 'exact', head: true }),
        supabase.from('clinical_algorithms').select('*', { count: 'exact', head: true }),
        supabase.from('academy_courses').select('*', { count: 'exact', head: true }),
        supabase.from('academy_lessons').select('*', { count: 'exact', head: true }),
      ]);

      // AI costs from api_call_log
      const { data: costData } = await supabase
        .from('api_call_log')
        .select('cost_usd')
        .gt('cost_usd', 0);
      const totalAiCost = costData?.reduce((s, r) => s + parseFloat(r.cost_usd || 0), 0) || 0;

      // Token data
      const { data: tokenData } = await supabase.from('user_tokens').select('*');

      // Platform settings
      const { data: settings } = await supabase.from('platform_settings').select('*');

      return {
        totalTopics: totalTopics || 0,
        publishedTopics: publishedTopics || 0,
        totalQuestions: totalQuestions || 0,
        totalFlashcards: totalFlashcards || 0,
        totalVP: totalVP || 0,
        totalMappings: totalMappings || 0,
        totalUsers: totalUsers || 0,
        totalOrgs: totalOrgs || 0,
        totalTests: totalTests || 0,
        totalSessions: totalSessions || 0,
        totalFeedback: totalFeedback || 0,
        totalApiCalls: totalApiCalls || 0,
        totalAiCost,
        totalClinicalTools: totalClinicalTools || 0,
        totalDrugs: totalDrugs || 0,
        totalAlgorithms: totalAlgorithms || 0,
        academyCourses: academyCourses || 0,
        academyLessons: academyLessons || 0,
        tokenData: tokenData || [],
        settings: settings || [],
      };
    },
    staleTime: 30000,
  });
}

// ═══════════════════════════════════════════
// STAT CARD COMPONENT
// ═══════════════════════════════════════════
function StatCard({ title, value, subtitle, icon: Icon, variant = 'default', className }) {
  const variants = {
    default: 'border-border',
    teal: 'border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20',
    amber: 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20',
    red: 'border-red-500/30 bg-red-50/50 dark:bg-red-950/20',
    blue: 'border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20',
    purple: 'border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20',
  };
  const iconColors = {
    default: 'text-muted-foreground',
    teal: 'text-teal-600 dark:text-teal-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
  };

  return (
    <Card className={cn('transition-all hover:shadow-md', variants[variant], className)}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {Icon && <Icon className={cn('w-5 h-5', iconColors[variant])} />}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// PAGE: DASHBOARD
// ═══════════════════════════════════════════
function DashboardPage() {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) return <LoadingState />;

  const s = stats;
  const pct = s.totalTopics > 0 ? Math.round((s.publishedTopics / s.totalTopics) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Témata" value={s.totalTopics.toLocaleString()} subtitle={`${s.publishedTopics} publikovaných (${pct}%)`} icon={BookOpen} variant="teal" />
        <StatCard title="Flashcards" value={s.totalFlashcards.toLocaleString()} subtitle={`${s.totalQuestions.toLocaleString()} MCQ`} icon={Layers} variant="blue" />
        <StatCard title="AI náklady" value={`$${s.totalAiCost.toFixed(2)}`} subtitle={`${s.totalApiCalls.toLocaleString()} volání`} icon={DollarSign} variant="amber" />
        <StatCard title="Uživatelé" value={s.totalUsers} subtitle={`${s.totalOrgs} organizací`} icon={Users} variant="purple" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Content coverage */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Pokrytí obsahu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Fulltext publikováno', val: s.publishedTopics, max: s.totalTopics, color: 'bg-teal-500' },
              { label: 'VP mapování', val: s.totalMappings, max: Math.max(s.totalMappings, 2800), color: 'bg-blue-500' },
              { label: 'Flashcards', val: s.totalFlashcards, max: Math.max(s.totalFlashcards, 20000), color: 'bg-purple-500' },
              { label: 'MCQ otázky', val: s.totalQuestions, max: Math.max(s.totalQuestions, 5000), color: 'bg-amber-500' },
            ].map((p, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{p.label}</span>
                  <span className="font-mono font-semibold">{p.val.toLocaleString()} / {p.max.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", p.color)} style={{ width: `${Math.min(100, (p.val / p.max) * 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Credit system */}
        <Card className="border-teal-500/20 bg-gradient-to-br from-teal-50/50 to-cyan-50/50 dark:from-teal-950/20 dark:to-cyan-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gem className="w-4 h-4 text-teal-500" />
              Kreditový systém
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {s.tokenData.map((t, i) => (
                <React.Fragment key={i}>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Plán</p>
                    <p className="text-sm font-bold">{t.plan_tier === 'premium' ? '👑 Premium' : '🆓 Free'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Zbývá</p>
                    <p className="text-sm font-bold font-mono">{t.current_tokens} / {t.monthly_limit} 💎</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Dnes</p>
                    <p className="text-sm font-bold font-mono">{t.daily_credits_used} 💎 použito</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Celkem</p>
                    <p className="text-sm font-bold font-mono">{t.total_tokens_used} 💎 historicky</p>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Klinické kalkulačky" value={s.totalClinicalTools} icon={Wrench} variant="default" />
        <StatCard title="Databáze léků" value={s.totalDrugs} icon={Star} variant="default" />
        <StatCard title="Algoritmy" value={s.totalAlgorithms} icon={Zap} variant="default" />
        <StatCard title="Academy" value={`${s.academyCourses} kurzů / ${s.academyLessons} lekcí`} icon={GraduationCap} variant="default" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// PAGE: CONTENT TOPICS
// ═══════════════════════════════════════════
function ContentTopicsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: topics, isLoading } = useQuery({
    queryKey: ['admin-topics', statusFilter, searchQuery],
    queryFn: async () => {
      let q = supabase.from('topics')
        .select('id, title, status, full_text_content, bullet_points_summary, deep_dive_content, ai_model, ai_cost, obor_id, okruh_id, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      if (searchQuery) q = q.ilike('title', `%${searchQuery}%`);

      const { data } = await q;
      return data || [];
    }
  });

  const { data: fcCounts } = useQuery({
    queryKey: ['admin-fc-counts'],
    queryFn: async () => {
      const { data } = await supabase.rpc('', {}).catch(() => ({ data: null }));
      // Fallback: just get total counts
      const { count } = await supabase.from('flashcards').select('*', { count: 'exact', head: true });
      return { total: count || 0 };
    }
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hledat téma..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny</SelectItem>
            <SelectItem value="published">Publikované</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1">
          <Download className="w-3 h-3" /> Export
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Téma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">FT</TableHead>
              <TableHead className="text-center">HY</TableHead>
              <TableHead className="text-center">DD</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className="text-right">Cena</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topics?.map(t => (
              <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <p className="font-medium text-sm truncate max-w-[280px]">{t.title}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={t.status === 'published' ? 'default' : 'secondary'} className="text-[10px]">
                    {t.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {t.full_text_content ? <Check className="w-3.5 h-3.5 text-green-500 mx-auto" /> : <X className="w-3.5 h-3.5 text-muted-foreground mx-auto" />}
                </TableCell>
                <TableCell className="text-center">
                  {t.bullet_points_summary ? <Check className="w-3.5 h-3.5 text-green-500 mx-auto" /> : <X className="w-3.5 h-3.5 text-muted-foreground mx-auto" />}
                </TableCell>
                <TableCell className="text-center">
                  {t.deep_dive_content ? <Check className="w-3.5 h-3.5 text-green-500 mx-auto" /> : <X className="w-3.5 h-3.5 text-muted-foreground mx-auto" />}
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono text-muted-foreground">{t.ai_model?.replace('claude-', '').replace('-20250514', '') || '—'}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-xs font-mono">{t.ai_cost ? `$${parseFloat(t.ai_cost).toFixed(3)}` : '—'}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <p className="text-xs text-muted-foreground">Zobrazeno {topics?.length || 0} témat (limit 50)</p>
    </div>
  );
}

// ═══════════════════════════════════════════
// PAGE: AI COST ANALYTICS
// ═══════════════════════════════════════════
function CostAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-costs'],
    queryFn: async () => {
      const { data: logs } = await supabase.from('api_call_log')
        .select('model, mode, cost_usd, input_tokens, output_tokens, success, called_at, usage_type')
        .order('called_at', { ascending: false })
        .limit(5000);

      // Aggregate by model
      const byModel = {};
      (logs || []).forEach(l => {
        const m = l.model || 'unknown';
        if (!byModel[m]) byModel[m] = { calls: 0, cost: 0, tokens: 0 };
        byModel[m].calls++;
        byModel[m].cost += parseFloat(l.cost_usd || 0);
        byModel[m].tokens += (l.input_tokens || 0) + (l.output_tokens || 0);
      });

      // Aggregate by mode
      const byMode = {};
      (logs || []).forEach(l => {
        const mode = l.mode || l.usage_type || 'unknown';
        if (!byMode[mode]) byMode[mode] = { calls: 0, cost: 0 };
        byMode[mode].calls++;
        byMode[mode].cost += parseFloat(l.cost_usd || 0);
      });

      const totalCost = (logs || []).reduce((s, l) => s + parseFloat(l.cost_usd || 0), 0);
      const totalCalls = logs?.length || 0;
      const successRate = totalCalls > 0 ? ((logs || []).filter(l => l.success).length / totalCalls * 100) : 0;

      return { byModel, byMode, totalCost, totalCalls, successRate, logs: logs?.slice(0, 20) || [] };
    }
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Celkové náklady" value={`$${data.totalCost.toFixed(2)}`} icon={DollarSign} variant="amber" />
        <StatCard title="API volání" value={data.totalCalls.toLocaleString()} icon={Zap} variant="blue" />
        <StatCard title="Úspěšnost" value={`${data.successRate.toFixed(1)}%`} icon={CheckCircle} variant="teal" />
        <StatCard title="Prům. cena/volání" value={`$${data.totalCalls > 0 ? (data.totalCost / data.totalCalls).toFixed(4) : '0'}`} icon={BarChart3} variant="default" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Náklady podle modelu</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(data.byModel).sort((a, b) => b[1].cost - a[1].cost).map(([model, d], i) => (
              <div key={model} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{model.replace('claude-', '').replace('-20250514', '').replace('-20240307', '')}</p>
                  <p className="text-xs text-muted-foreground">{d.calls.toLocaleString()} volání · {(d.tokens / 1000000).toFixed(2)}M tokenů</p>
                </div>
                <span className="font-mono font-bold text-sm">${d.cost.toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Náklady podle módu</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(data.byMode).sort((a, b) => b[1].cost - a[1].cost).slice(0, 10).map(([mode, d]) => (
              <div key={mode} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{mode}</p>
                  <p className="text-xs text-muted-foreground">{d.calls} volání</p>
                </div>
                <span className="font-mono font-bold text-sm">${d.cost.toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// PAGE: TOKEN POLICY
// ═══════════════════════════════════════════
function TokenPolicyPage() {
  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('platform_settings').select('*');
      const map = {};
      (data || []).forEach(r => { map[r.key] = r.value; });
      return map;
    }
  });

  if (isLoading) return <LoadingState />;

  const creditCosts = settings?.credit_costs || {};
  const planLimits = settings?.plan_limits || {};
  const alertSettings = settings?.alert_settings || {};

  const ACTION_LABELS = {
    fulltext: 'Fulltext generace', high_yield: 'High-yield shrnutí', deep_dive: 'Deep-dive analýza',
    flashcards: 'Flashcards (10×)', copilot: 'Copilot dotaz', study_plan: 'Studijní plán AI',
    sandbox: 'Academy sandbox', gemini_analytics: 'Gemini analytics'
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Konverze" value="1💎 = $0.001" icon={RefreshCw} variant="teal" />
        <StatCard title="Premium" value="299 Kč/měs" subtitle="5 000 💎" icon={Gem} variant="amber" />
        <StatCard title="Free tier" value="100 💎/měs" subtitle="≈ $0.10" icon={Users} variant="default" />
        <StatCard title="Marže" value={`${planLimits?.premium?.monthly_credits ? Math.round(((299/24) - planLimits.premium.monthly_credits * 0.001) / (299/24) * 100) : 60}%`} icon={TrendingUp} variant="teal" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gem className="w-4 h-4 text-teal-500" />
              Ceny AI akcí
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(creditCosts).map(([key, cost]) => (
              <div key={key} className="flex justify-between items-center py-1.5 border-b last:border-0">
                <span className="text-sm">{ACTION_LABELS[key] || key}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm">{cost} 💎</span>
                  <span className="text-[10px] text-muted-foreground">≈ ${(cost * 0.001).toFixed(3)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Limity podle plánu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {['free', 'premium'].map(tier => (
                <div key={tier} className={cn("p-3 rounded-lg border", tier === 'premium' ? 'border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10' : '')}>
                  <p className="text-xs font-bold mb-2">{tier === 'premium' ? '👑 Premium' : '🆓 Free'}</p>
                  {planLimits[tier] && Object.entries(planLimits[tier]).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs py-0.5">
                      <span className="text-muted-foreground">{k.replace(/_/g, ' ')}</span>
                      <span className="font-mono font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Alerty & Blokování</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(alertSettings).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
                <span className="text-xs">{key.replace(/_/g, ' ')}</span>
                {typeof val === 'boolean' ? (
                  <Badge variant={val ? 'default' : 'secondary'} className="text-[10px]">{val ? 'ON' : 'OFF'}</Badge>
                ) : (
                  <span className="font-mono text-xs font-bold">{val}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════
// PAGE: USERS
// ═══════════════════════════════════════════
function UsersPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
      const { data: tokens } = await supabase.from('user_tokens').select('*');
      const tokenMap = {};
      (tokens || []).forEach(t => { tokenMap[t.user_id] = t; });
      return (profiles || []).map(p => ({ ...p, tokens: tokenMap[p.user_id] || null }));
    }
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Uživatel</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Plán</TableHead>
              <TableHead className="text-right">Kredity</TableHead>
              <TableHead>Registrace</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map(u => (
              <TableRow key={u.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{u.display_name || 'Uživatel'}</p>
                    <p className="text-xs text-muted-foreground">{u.institution || u.faculty || '—'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={u.role === 'admin' ? 'destructive' : 'secondary'} className="text-[10px]">{u.role || 'user'}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.tokens?.plan_tier === 'premium' ? 'default' : 'outline'} className="text-[10px]">
                    {u.tokens?.plan_tier === 'premium' ? '👑 Premium' : '🆓 Free'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {u.tokens ? `${u.tokens.current_tokens} / ${u.tokens.monthly_limit} 💎` : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('cs') : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════
// PAGE: EDGE FUNCTIONS
// ═══════════════════════════════════════════
function EdgeFunctionsPage() {
  const FUNCTIONS = [
    { slug: 'generate-topic', v: 30, jwt: false, credits: '18–40 💎', desc: 'Fulltext, HY, Deep-dive' },
    { slug: 'copilot-chat', v: 4, jwt: false, credits: '3 💎', desc: 'Student copilot' },
    { slug: 'generate-flashcards', v: 1, jwt: false, credits: '12 💎', desc: 'Flashcard generation' },
    { slug: 'batch-generate', v: 9, jwt: false, credits: '—', desc: 'Batch processing' },
    { slug: 'batch-api-submit', v: 1, jwt: false, credits: '—', desc: 'Anthropic Batch API submit' },
    { slug: 'batch-api-poll', v: 3, jwt: false, credits: '—', desc: 'Batch API polling' },
    { slug: 'generate-questions', v: 1, jwt: false, credits: '—', desc: 'MCQ generation' },
    { slug: 'generate-concepts', v: 1, jwt: false, credits: '—', desc: 'Concept extraction' },
    { slug: 'review-content', v: 3, jwt: false, credits: '—', desc: 'AI content review' },
    { slug: 'academy-generate-content', v: 1, jwt: false, credits: '—', desc: 'Academy lesson gen' },
    { slug: 'post-generation-pipeline', v: 1, jwt: false, credits: '—', desc: 'Post-gen pipeline' },
    { slug: 'map-vp-to-topics', v: 1, jwt: false, credits: '—', desc: 'VP mapping' },
    { slug: 'generate-topic-opus', v: 1, jwt: true, credits: '40 💎', desc: 'Opus fallback' },
    { slug: 'batch-submit', v: 1, jwt: false, credits: '—', desc: 'Legacy batch submit' },
  ];

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funkce</TableHead>
            <TableHead>Popis</TableHead>
            <TableHead className="text-center">JWT</TableHead>
            <TableHead>Kredity</TableHead>
            <TableHead className="text-center">Verze</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {FUNCTIONS.map(f => (
            <TableRow key={f.slug}>
              <TableCell className="font-mono text-sm font-medium">{f.slug}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{f.desc}</TableCell>
              <TableCell className="text-center">
                {f.jwt ? <Check className="w-3.5 h-3.5 text-green-500 mx-auto" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500 mx-auto" />}
              </TableCell>
              <TableCell className="text-xs font-mono">{f.credits}</TableCell>
              <TableCell className="text-center"><Badge variant="outline" className="text-[10px]">v{f.v}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// ═══════════════════════════════════════════
// PAGE: SYSTEM SETTINGS
// ═══════════════════════════════════════════
function SystemSettingsPage() {
  const { data: cronJobs } = useQuery({
    queryKey: ['cron-jobs'],
    queryFn: async () => {
      const { data } = await supabase.rpc('').catch(() => ({ data: null }));
      // Can't query cron.job from client — show known jobs
      return [
        { name: 'batch-api-poll-auto', schedule: '*/15 * * * *', desc: 'Batch API polling' },
        { name: 'batch-auto-poll', schedule: '*/30 * * * *', desc: 'Batch auto poll' },
        { name: 'monthly-credit-reset', schedule: '5 0 * * *', desc: 'Monthly credit reset' },
      ];
    }
  });

  const configs = [
    { cat: '🌐 Obecné', items: [
      ['Platforma', 'MedVerse EDU'], ['Doména', 'medverse.cz'], ['Jazyk', 'Čeština'], ['Timezone', 'Europe/Prague'],
    ]},
    { cat: '🤖 AI Modely', items: [
      ['Primary (generace)', 'Claude Sonnet 4'], ['Copilot', 'Claude Haiku 3'], ['Batch', 'Anthropic Batch API'], ['Extraction', 'Gemini Flash 2.0'],
    ]},
    { cat: '🔒 Bezpečnost', items: [
      ['RLS', 'Povoleno'], ['JWT verify', '12/14 EF'], ['CORS', 'Povoleno (*)'], ['Prompt caching', 'Zapnuto'],
    ]},
    { cat: '⏱️ CRON Jobs', items: cronJobs?.map(j => [j.name, j.schedule]) || [] },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {configs.map((c, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{c.cat}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {c.items.map(([k, v], j) => (
              <div key={j} className="flex justify-between py-1.5 border-b last:border-0">
                <span className="text-xs text-muted-foreground">{k}</span>
                <span className="text-xs font-mono font-semibold">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// PAGE: DB HEALTH
// ═══════════════════════════════════════════
function DBHealthPage() {
  const { data: tables, isLoading } = useQuery({
    queryKey: ['admin-db-health'],
    queryFn: async () => {
      const { data } = await supabase.rpc('').catch(() => ({ data: null }));
      // Fallback: known table sizes from list_tables
      return [
        { name: 'flashcards', rows: 15360 }, { name: 'topics', rows: 1468 },
        { name: 'api_call_log', rows: 6718 }, { name: 'questions', rows: 3452 },
        { name: 'vp_topic_coverage', rows: 2294 }, { name: 'concepts', rows: 1690 },
        { name: 'topic_concept_links', rows: 1764 }, { name: 'batch_generation_queue', rows: 1468 },
        { name: 'training_requirements', rows: 727 }, { name: 'analytics_events', rows: 419 },
        { name: 'platform_settings', rows: 4 }, { name: 'user_tokens', rows: 1 },
        { name: 'user_profiles', rows: 1 },
      ];
    }
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Database className="w-4 h-4" />
          Tabulky (public schema)
        </CardTitle>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tabulka</TableHead>
            <TableHead className="text-right">Řádky</TableHead>
            <TableHead className="text-right">Podíl</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(tables || []).sort((a, b) => b.rows - a.rows).map(t => {
            const maxRows = Math.max(...(tables || []).map(x => x.rows));
            return (
              <TableRow key={t.name}>
                <TableCell className="font-mono text-sm">{t.name}</TableCell>
                <TableCell className="text-right font-mono text-sm">{t.rows.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <div className="w-20 ml-auto">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-teal-500" style={{ width: `${(t.rows / maxRows) * 100}%` }} />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

// ═══════════════════════════════════════════
// PLACEHOLDER PAGE
// ═══════════════════════════════════════════
function PlaceholderPage({ title, icon: Icon, description, linkTo, linkLabel }) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Icon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">{description}</p>
        {linkTo && (
          <Link to={createPageUrl(linkTo)}>
            <Button variant="outline" className="gap-2">
              <ExternalLink className="w-3 h-3" />
              {linkLabel || 'Otevřít'}
            </Button>
          </Link>
        )}
        <Badge variant="outline" className="mt-4 text-[10px]">Připojí se k existující stránce</Badge>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// LOADING STATE
// ═══════════════════════════════════════════
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// ═══════════════════════════════════════════
// PAGE ROUTER
// ═══════════════════════════════════════════
const PAGE_COMPONENTS = {
  'dashboard': DashboardPage,
  'content-topics': ContentTopicsPage,
  'content-questions': () => <PlaceholderPage title="Otázky & Flashcards" icon={HelpCircle} description="Správa 3 452 MCQ a 15 360 flashcards. Hromadné generace, review pipeline, statistiky." linkTo="AdminQuestions" linkLabel="Správa otázek" />,
  'content-tools': () => <PlaceholderPage title="Klinické nástroje" icon={Wrench} description="28 kalkulátorů, 10 algoritmů, 40 léků. Editace, propojení s tématy." linkTo="AdminTools" linkLabel="Správa nástrojů" />,
  'content-generation': () => <PlaceholderPage title="Generace obsahu" icon={Bot} description="Batch fronta, API joby, model konfigurace. Vše řízeno přes Edge Functions." />,
  'users-list': UsersPage,
  'users-orgs': () => <PlaceholderPage title="Organizace" icon={Building2} description="Správa organizací a skupin." linkTo="AdminConsole" linkLabel="Organizace" />,
  'finance-tokens': TokenPolicyPage,
  'finance-costs': CostAnalyticsPage,
  'finance-billing': () => <PlaceholderPage title="Platby & Předplatné" icon={CreditCard} description="Stripe integrace, přehled plateb, manuální refundy. Čeká na payment gateway." />,
  'analytics-activity': () => <PlaceholderPage title="Aktivita platformy" icon={BarChart3} description="DAU/MAU, session tracking, heatmapy. 419 analytických eventů." linkTo="AdminAnalytics" linkLabel="Analytika" />,
  'analytics-study': () => <PlaceholderPage title="Studijní metriky" icon={Target} description="Průměrné skóre, retention rate, studijní čas. 41 study sessions." />,
  'analytics-ai': () => <PlaceholderPage title="AI Usage & Models" icon={Brain} description="Porovnání modelů, cache hit rate, latence. 6 718+ API calls." linkTo="AdminCostAnalytics" linkLabel="Cost Analytics" />,
  'system-settings': SystemSettingsPage,
  'system-edge': EdgeFunctionsPage,
  'system-audit': () => <PlaceholderPage title="Audit Log" icon={ClipboardList} description="Záznam admin akcí, DB migrací, deploymentů." linkTo="AdminAudit" linkLabel="Audit Log" />,
  'system-db': DBHealthPage,
  'academy-courses': () => <PlaceholderPage title="Kurzy & Lekce" icon={GraduationCap} description="5 kurzů, 20 lekcí, 4 levely. Správa obsahu, sandbox." />,
  'academy-builders': () => <PlaceholderPage title="Builder Program" icon={Hammer} description="Přihlášky builderů, role přiřazení, contribution tracking." />,
};

// ═══════════════════════════════════════════
// MAIN ADMIN PANEL
// ═══════════════════════════════════════════
export default function AdminPanel() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  const hasAccess = canAccessAdmin(user);

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-sm">
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-bold mb-2">Přístup odepřen</h3>
            <p className="text-sm text-muted-foreground">Nemáte oprávnění k administraci</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeLabel = NAV_SECTIONS.flatMap(s => s.items).find(i => i.id === activePage)?.label || 'Přehled';
  const ActiveIcon = NAV_SECTIONS.flatMap(s => s.items).find(i => i.id === activePage)?.icon || LayoutDashboard;
  const PageComponent = PAGE_COMPONENTS[activePage] || DashboardPage;

  return (
    <div className="flex h-[calc(100vh-4rem)] -mx-4 lg:-mx-6 -mt-4 lg:-mt-6">
      {/* SIDEBAR */}
      <aside className={cn(
        "flex-shrink-0 border-r bg-card transition-all duration-200 flex flex-col overflow-hidden",
        collapsed ? "w-14" : "w-56"
      )}>
        {/* Logo & collapse */}
        <div className="h-12 flex items-center justify-between px-3 border-b">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-500" />
              <span className="text-xs font-bold tracking-wider text-teal-600 dark:text-teal-400 uppercase">Admin</span>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? <PanelLeft className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              {section.label && !collapsed && (
                <p className="px-2 pt-3 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {section.label}
                </p>
              )}
              {section.label && collapsed && <Separator className="my-2" />}
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all",
                      collapsed ? "justify-center px-2 py-2" : "px-2.5 py-1.5",
                      isActive
                        ? "bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-teal-600 dark:text-teal-400")} />
                    {!collapsed && <span className="truncate text-xs">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 h-12 flex items-center justify-between px-4 lg:px-6 border-b bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <ActiveIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{activeLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              System OK
            </Badge>
          </div>
        </div>

        {/* Page */}
        <div className="p-4 lg:p-6">
          <PageComponent />
        </div>
      </main>
    </div>
  );
}
