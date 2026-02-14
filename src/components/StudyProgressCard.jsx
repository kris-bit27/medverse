import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, CheckCircle2, Clock, Flame, Target, TrendingUp
} from 'lucide-react';

/* ─── Circular progress ring ─── */
function ProgressRing({ value, max, size = 48, strokeWidth = 4, color = '#a855f7' }) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circ * (1 - pct);

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-800" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700"
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        className="fill-white text-xs font-bold rotate-90 origin-center"
        transform={`rotate(90 ${size/2} ${size/2})`}
      >
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

/* ─── Obor progress bar ─── */
function OborProgress({ name, studied, total, color }) {
  const pct = total > 0 ? (studied / total * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{name}</span>
        <span className="text-xs text-slate-500">{studied}/{total}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function StudyProgressCard() {
  const { user } = useAuth();

  // Fetch user progress
  const { data: progress = [] } = useQuery({
    queryKey: ['user-progress', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_topic_progress')
        .select('*, topics!inner(id, title, obor_id, obory!inner(name))')
        .eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch all published topics for completion stats
  const { data: allTopics = [] } = useQuery({
    queryKey: ['published-topics-count'],
    queryFn: async () => {
      const { data } = await supabase
        .from('topics')
        .select('id, obor_id, obory!inner(name)')
        .eq('status', 'published');
      return data || [];
    }
  });

  // Compute stats
  const studiedIds = new Set(progress.filter(p => p.status === 'studied' || p.completed_at).map(p => p.topic_id));
  const totalTopics = allTopics.length;
  const studiedCount = studiedIds.size;
  
  // By obor
  const oborStats = {};
  allTopics.forEach(t => {
    const name = t.obory?.name || 'Ostatní';
    if (!oborStats[name]) oborStats[name] = { total: 0, studied: 0 };
    oborStats[name].total++;
    if (studiedIds.has(t.id)) oborStats[name].studied++;
  });

  const COLORS = {
    'Chirurgie': '#ef4444', 'Neurologie': '#a855f7', 'Pediatrie': '#22c55e',
    'Vnitřní lékařství': '#3b82f6', 'Anesteziologie a intenzivní medicína': '#f97316',
  };

  // Streak (simplified - count consecutive days)
  const streak = progress.length > 0 ? Math.min(progress.length, 7) : 0;

  return (
    <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
      <CardContent className="p-5 space-y-5">
        {/* Top: Overall progress */}
        <div className="flex items-center gap-5">
          <ProgressRing value={studiedCount} max={totalTopics} size={64} strokeWidth={5} color="#a855f7" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-1">Celkový pokrok</h3>
            <p className="text-xs text-slate-500">{studiedCount} z {totalTopics} témat prostudováno</p>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-bold text-orange-300">{streak}</span>
            <span className="text-[10px] text-orange-400/70">dní</span>
          </div>
        </div>

        {/* Per-obor progress */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pokrok dle oborů</p>
          {Object.entries(oborStats)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([name, s]) => (
              <OborProgress key={name} name={name} studied={s.studied} total={s.total} color={COLORS[name] || '#64748b'} />
            ))
          }
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{studiedCount}</p>
            <p className="text-[10px] text-slate-500">Prostudováno</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{totalTopics - studiedCount}</p>
            <p className="text-[10px] text-slate-500">Zbývá</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-teal-400">{totalTopics > 0 ? Math.round(studiedCount / totalTopics * 100) : 0}%</p>
            <p className="text-[10px] text-slate-500">Kompletnost</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
