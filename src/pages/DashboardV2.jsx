import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import OnboardingWizard from '@/components/OnboardingWizard';
import StudyTodayWidget from '@/components/StudyTodayWidget';
import AttestationProgress from '@/components/AttestationProgress';
import WeakSpotsWidget from '@/components/dashboard/WeakSpotsWidget';
import WeeklyActivityChart from '@/components/dashboard/WeeklyActivityChart';
import TestScoreTrend from '@/components/dashboard/TestScoreTrend';
import MasteryOverview from '@/components/dashboard/MasteryOverview';
import GeminiWeeklyDigest from '@/components/dashboard/GeminiWeeklyDigest';
import {
  Zap, BookOpen, Target, Flame,
  Award, Brain, ArrowRight, Sparkles, RefreshCw
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } }
};

export default function DashboardV2() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_profiles')
        .select('profile_completed, display_name').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    onSuccess: (d) => { if (!d || !d.profile_completed) setShowOnboarding(true); }
  });

  React.useEffect(() => {
    if (!profileLoading && profile === null) setShowOnboarding(true);
  }, [profile, profileLoading]);

  const { data: tokens } = useQuery({
    queryKey: ['userTokens', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_tokens').select('*').eq('user_id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: dueCardsCount = 0 } = useQuery({
    queryKey: ['dueCardsCount', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase.from('user_flashcard_progress')
        .select('*', { count: 'exact', head: true }).eq('user_id', user.id).lte('next_review', today);
      return count || 0;
    },
    enabled: !!user?.id
  });

  const { data: streakData = { current_streak: 0, today_active: false } } = useQuery({
    queryKey: ['studyStreak', user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_study_streak', { p_user_id: user.id });
      return data || { current_streak: 0, today_active: false };
    },
    enabled: !!user?.id
  });

  const { data: recentAchievements = [] } = useQuery({
    queryKey: ['recentAchievements', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('gamification_achievements')
        .select('*').eq('user_id', user.id).order('unlocked_at', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!user?.id
  });

  const { data: recentTests = [] } = useQuery({
    queryKey: ['recentTests', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('test_sessions')
        .select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!user?.id
  });

  const streak = streakData.current_streak;
  const firstName = (user?.full_name || user?.user_metadata?.full_name || '').split(' ')[0] || user?.email?.split('@')[0] || 'Student';

  return (
    <div className="relative min-h-screen">
      {/* ── Background effects (like landing page) ── */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--mn-text)) 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }} />
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-[hsl(var(--mn-accent)/0.06)] rounded-full blur-[120px] pointer-events-none" />

      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ══════ HERO GREETING ══════ */}
        <motion.div {...fadeUp}>
          <h1 className="text-3xl lg:text-4xl font-bold leading-[1.1] tracking-tight mb-2"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
            Vítej zpět,{' '}
            <span className="bg-gradient-to-r from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-accent-2))] bg-clip-text text-transparent">
              {firstName}
            </span>
          </h1>
          <p className="text-[hsl(var(--mn-muted))] text-base" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Zde je tvůj dnešní přehled
          </p>
        </motion.div>

        {/* ══════ STAT BAR (landing page gap-px grid pattern) ══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-border))]"
        >
          {[
            { icon: Zap, label: 'AI Kredity', value: (tokens?.current_tokens || 0).toLocaleString(), sub: `z ${(tokens?.monthly_limit || 1000).toLocaleString()}`, color: 'hsl(var(--mn-accent))' },
            { icon: BookOpen, label: 'K opakování', value: String(dueCardsCount), sub: dueCardsCount === 0 ? 'Vše hotovo' : 'kartiček čeká', color: dueCardsCount > 0 ? '#f59e0b' : '#22c55e' },
            { icon: Flame, label: 'Série', value: `${streak} ${streak === 1 ? 'den' : streak >= 2 && streak <= 4 ? 'dny' : 'dní'}`, sub: streakData.today_active ? 'Dnes aktivní' : 'Začni studovat', color: streak >= 3 ? '#f59e0b' : 'hsl(var(--mn-muted))' },
            { icon: Award, label: 'Úspěchy', value: String(recentAchievements.length), sub: 'odemčeno', color: '#f59e0b' },
          ].map((s, i) => (
            <div key={i} className="bg-[hsl(var(--mn-surface))] px-5 py-5">
              <div className="flex items-center gap-2 mb-2">
                <s.icon style={{ width: 14, height: 14, color: s.color }} />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--mn-muted))]"
                      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  {s.label}
                </span>
              </div>
              <p className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {s.value}
              </p>
              <p className="text-xs text-[hsl(var(--mn-muted))] mt-0.5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                {s.sub}
              </p>
            </div>
          ))}
        </motion.div>

        {/* ══════ STUDY TODAY + ATTESTATION ══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid lg:grid-cols-2 gap-5"
        >
          <StudyTodayWidget />
          <AttestationProgress />
        </motion.div>

        {/* ══════ WEAK SPOTS ══════ */}
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <WeakSpotsWidget />
        </motion.div>

        {/* ══════ ANALYTICS ══════ */}
        <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--mn-accent))] mb-4"
             style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Studijní analytika
          </p>
          <div className="grid lg:grid-cols-3 gap-5">
            <WeeklyActivityChart />
            <TestScoreTrend />
            <MasteryOverview />
          </div>
        </motion.div>

        {/* ══════ AI DIGEST ══════ */}
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <GeminiWeeklyDigest />
        </motion.div>

        {/* ══════ QUICK ACTIONS (landing page feature card pattern) ══════ */}
        <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--mn-accent))] mb-4"
             style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Rychlé akce
          </p>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { to: 'Studium', icon: Brain, label: 'Studuj téma', desc: 'Procházej AI-generovaný obsah', accent: 'from-teal-500 to-emerald-500' },
              { to: 'ReviewToday', icon: RefreshCw, label: 'Opakovat kartičky', desc: `${dueCardsCount} kartiček čeká`, accent: 'from-amber-500 to-orange-500' },
              { to: 'TestGeneratorV2', icon: Target, label: 'Zkušební test', desc: 'Vyzkoušej své znalosti', accent: 'from-violet-500 to-purple-500' },
            ].map((a, i) => (
              <Link key={i} to={createPageUrl(a.to)}
                className="group relative p-6 rounded-2xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface)/0.5)] hover:bg-[hsl(var(--mn-surface))] hover:border-[hsl(var(--mn-accent)/0.3)] transition-all duration-300"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.accent} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <a.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold mb-1" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{a.label}</h3>
                <p className="text-sm text-[hsl(var(--mn-muted))] leading-relaxed">{a.desc}</p>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ══════ RECENT TESTS ══════ */}
        {recentTests.length > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--mn-accent))]"
                 style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Moje testy
              </p>
              <Link to={createPageUrl('TestGeneratorV2')}>
                <Button variant="outline" size="sm" className="text-xs gap-1 rounded-lg">
                  Nový test <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface)/0.5)] overflow-hidden">
              {recentTests.map((test, i) => {
                const done = test.status === 'completed';
                const inProg = test.status === 'in_progress';
                return (
                  <div key={test.id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-[hsl(var(--mn-surface))] transition-colors"
                    style={{ borderBottom: i < recentTests.length - 1 ? '1px solid hsl(var(--mn-border) / 0.4)' : 'none' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant={done ? 'default' : inProg ? 'secondary' : 'outline'} className="text-[10px]">
                          {done ? 'Dokončeno' : inProg ? 'Probíhá' : 'Opuštěno'}
                        </Badge>
                        <span className="text-xs text-[hsl(var(--mn-muted))]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                          {test.question_count} otázek
                        </span>
                      </div>
                      {done && test.score !== null && (
                        <span className="text-sm font-bold" style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          color: test.score >= 80 ? '#22c55e' : test.score >= 60 ? '#f59e0b' : 'hsl(var(--mn-danger))'
                        }}>
                          {test.score.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className="shrink-0 ml-3">
                      {inProg && <Link to={`${createPageUrl('TestSessionV2')}?id=${test.id}`}><Button size="sm" className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)] text-white">Pokračovat</Button></Link>}
                      {done && <Link to={`${createPageUrl('TestResults')}?id=${test.id}`}><Button size="sm" variant="outline">Výsledky</Button></Link>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ══════ ACHIEVEMENTS ══════ */}
        {recentAchievements.length > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.45 }}>
            <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--mn-accent))] mb-4"
               style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Nedávné úspěchy
            </p>
            <div className="flex flex-wrap gap-3">
              {recentAchievements.map(a => (
                <div key={a.id} className="flex items-center gap-2 px-4 py-2 rounded-full border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface)/0.5)] hover:border-[hsl(var(--mn-accent)/0.3)] transition-all"
                  style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13 }}>
                  <Award style={{ width: 14, height: 14, color: '#f59e0b' }} />
                  <span className="font-medium">{a.achievement_name}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'hsl(var(--mn-muted))' }}>+{a.tokens_earned}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
