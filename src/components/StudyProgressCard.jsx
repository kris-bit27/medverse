import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen, Brain, Clock, Flame, Target, TrendingUp, ChevronRight
} from 'lucide-react';

function ProgressRing({ value, max, size = 48, strokeWidth = 4, color = '#a855f7' }) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circ * (1 - pct);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-200 dark:text-slate-800" />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        className="fill-slate-900 dark:fill-white text-xs font-bold rotate-90 origin-center"
        transform={`rotate(90 ${size/2} ${size/2})`}>{Math.round(pct * 100)}%</text>
    </svg>
  );
}

function OborProgress({ name, studied, total, avgMastery, color }) {
  const pct = total > 0 ? (studied / total * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600 dark:text-slate-400">{name}</span>
        <div className="flex items-center gap-2">
          {avgMastery > 0 && <span className="text-[10px] text-slate-500">⌀ {Math.round(avgMastery)}%</span>}
          <span className="text-xs text-slate-500">{studied}/{total}</span>
        </div>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function StudyProgressCard() {
  const { user } = useAuth();

  const { data: masteryData = [] } = useQuery({
    queryKey: ['user-mastery', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_topic_mastery')
        .select('*, topics:topic_id(id, title, obor_id, obory:obor_id(name))')
        .eq('user_id', user.id)
        .order('mastery_score', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const { data: allTopics = [] } = useQuery({
    queryKey: ['published-topics-count'],
    queryFn: async () => {
      const { data } = await supabase
        .from('topics')
        .select('id, obor_id, obory:obor_id(name)')
        .eq('status', 'published')
        .not('full_text_content', 'is', null);
      return data || [];
    }
  });

  const { data: studyStats } = useQuery({
    queryKey: ['study-stats-card', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('study_sessions')
        .select('duration_seconds, started_at').eq('user_id', user.id)
        .order('started_at', { ascending: false });
      const sessions = data || [];
      const totalSeconds = sessions.reduce((s, x) => s + (x.duration_seconds || 0), 0);
      let streak = 0;
      const today = new Date(); today.setHours(0,0,0,0);
      const days = new Set(sessions.map(s => { const d = new Date(s.started_at); d.setHours(0,0,0,0); return d.getTime(); }));
      for (let i = 0; i < 365; i++) {
        const check = new Date(today); check.setDate(check.getDate() - i);
        if (days.has(check.getTime())) streak++; else if (i > 0) break;
      }
      return { totalMinutes: Math.round(totalSeconds / 60), sessionCount: sessions.length, streak };
    },
    enabled: !!user?.id
  });

  const studiedIds = new Set(masteryData.map(m => m.topic_id));
  const totalTopics = allTopics.length;
  const studiedCount = studiedIds.size;
  const avgMastery = masteryData.length > 0 ? masteryData.reduce((s, m) => s + Number(m.mastery_score || 0), 0) / masteryData.length : 0;

  const oborStats = {};
  allTopics.forEach(t => {
    const name = t.obory?.name || 'Ostatní';
    if (!oborStats[name]) oborStats[name] = { total: 0, studied: 0, masterySum: 0, masteryCount: 0 };
    oborStats[name].total++;
    if (studiedIds.has(t.id)) {
      oborStats[name].studied++;
      const m = masteryData.find(md => md.topic_id === t.id);
      if (m) { oborStats[name].masterySum += Number(m.mastery_score || 0); oborStats[name].masteryCount++; }
    }
  });

  const COLORS = { 'Chirurgie': '#ef4444', 'Neurologie': '#a855f7', 'Pediatrie': '#22c55e', 'Vnitřní lékařství': '#3b82f6', 'Anesteziologie a intenzivní medicína': '#f97316', 'Gynekologie a porodnictví': '#ec4899' };
  const totalFlashcardsReviewed = masteryData.reduce((s, m) => s + (m.flashcards_reviewed || 0), 0);
  const needsReview = masteryData.filter(m => Number(m.mastery_score) < 60).sort((a, b) => Number(a.mastery_score) - Number(b.mastery_score)).slice(0, 5);

  return (
    <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center gap-5">
          <ProgressRing value={studiedCount} max={totalTopics} size={64} strokeWidth={5} color="#a855f7" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Celkový pokrok</h3>
            <p className="text-xs text-slate-500">{studiedCount} z {totalTopics} témat otevřeno</p>
            {avgMastery > 0 && <p className="text-xs text-purple-500 mt-0.5">Průměrné zvládnutí: {Math.round(avgMastery)}%</p>}
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-bold text-orange-500 dark:text-orange-300">{studyStats?.streak || 0}</span>
            <span className="text-[10px] text-orange-600/70 dark:text-orange-400/70">dní</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Clock, val: studyStats?.totalMinutes || 0, label: 'minut' },
            { icon: BookOpen, val: studyStats?.sessionCount || 0, label: 'sessions' },
            { icon: Brain, val: totalFlashcardsReviewed, label: 'kartiček' },
            { icon: Target, val: `${Math.round(avgMastery)}%`, label: 'mastery', teal: true },
          ].map((s, i) => (
            <div key={i} className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <s.icon className="w-3.5 h-3.5 mx-auto text-slate-400 mb-0.5" />
              <p className={`text-sm font-bold ${s.teal ? 'text-teal-600 dark:text-teal-400' : 'text-slate-900 dark:text-white'}`}>{s.val}</p>
              <p className="text-[10px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {Object.keys(oborStats).length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pokrok dle oborů</p>
            {Object.entries(oborStats).sort(([,a],[,b]) => b.total - a.total).slice(0, 5).map(([name, s]) => (
              <OborProgress key={name} name={name} studied={s.studied} total={s.total}
                avgMastery={s.masteryCount > 0 ? s.masterySum / s.masteryCount : 0} color={COLORS[name] || '#64748b'} />
            ))}
          </div>
        )}

        {needsReview.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-amber-500 mb-2 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> K procvičení</p>
            {needsReview.map(m => {
              const score = Number(m.mastery_score) || 0;
              const color = score >= 50 ? 'text-amber-400' : score >= 20 ? 'text-orange-400' : 'text-red-400';
              return (
                <div key={m.id} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-slate-700 dark:text-slate-300 truncate mr-3 flex-1">{m.topics?.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500" style={{ width: `${score}%` }} />
                    </div>
                    <span className={`text-xs font-mono font-bold ${color} w-7 text-right`}>{Math.round(score)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {masteryData.length === 0 && (
          <div className="text-center py-4">
            <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">Začněte studovat pro zobrazení pokroku</p>
            <Link to="/Studium"><Button size="sm" className="mt-3">Přejít na studium <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
