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
  Award, Brain, ArrowRight, Sparkles, RefreshCw, GraduationCap
} from 'lucide-react';
import { useAcademyProfile } from '@/hooks/useAcademy';
import { ACADEMY_LEVELS } from '@/lib/academy-constants';

/* ── animation ── */
const up = (i = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }
});

/* ── Section caption ── */
const Caption = ({ children, className = '' }) => (
  <h2 className={`mn-caption text-[hsl(var(--mn-accent))] mb-5 ${className}`}>{children}</h2>
);

export default function DashboardV2() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { data: academyProfile } = useAcademyProfile(user?.id);

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
    <div className="relative min-h-screen overflow-hidden">
      {/* ── Atmospheric background ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--mn-text)) 0.5px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full"
             style={{ background: 'radial-gradient(circle, hsl(var(--mn-accent) / 0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute top-[40%] -left-32 w-[350px] h-[350px] rounded-full"
             style={{ background: 'radial-gradient(circle, hsl(188 76% 42% / 0.05) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-8">

        {/* ═══ HERO ═══ */}
        <motion.section {...up(0)}>
          <div className="relative rounded-2xl overflow-hidden border border-[hsl(var(--mn-border))]">
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(135deg, hsl(var(--mn-accent) / 0.10) 0%, transparent 45%, hsl(188 76% 42% / 0.07) 100%)'
            }} />
            <div className="absolute top-0 right-0 w-44 h-44 rounded-full"
                 style={{ background: 'hsl(var(--mn-accent) / 0.12)', filter: 'blur(60px)' }} />
            <div className="relative px-8 sm:px-12 py-10 sm:py-14">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-[hsl(var(--mn-success))]" />
                <span className="mn-caption text-[hsl(var(--mn-muted))] !mb-0">Dashboard</span>
              </div>
              <h1 className="mn-serif-font text-[clamp(28px,5vw,42px)] font-bold tracking-tight leading-[1.1]">
                Vítej zpět,{' '}
                <span className="mn-accent-text">
                  {firstName}
                </span>
              </h1>
              <p className="mn-ui-font text-[15px] text-[hsl(var(--mn-muted))] mt-2 max-w-md">
                Pokračuj tam, kde jsi skončil
              </p>
            </div>
          </div>
        </motion.section>

        {/* ═══ STAT CARDS ═══ */}
        <motion.section {...up(1)}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Zap, label: 'AI Tokeny', value: (tokens?.current_tokens || 0).toLocaleString(), sub: `z ${(tokens?.monthly_limit || 50).toLocaleString()}`, color: '#14b8a6', glow: 'hsl(var(--mn-accent) / 0.10)' },
              { icon: RefreshCw, label: 'K opakování', value: String(dueCardsCount), sub: dueCardsCount === 0 ? 'Vše hotovo' : 'kartiček čeká', color: dueCardsCount > 0 ? '#f59e0b' : '#22c55e', glow: dueCardsCount > 0 ? 'hsl(var(--mn-warn) / 0.08)' : 'hsl(var(--mn-success) / 0.08)' },
              { icon: Flame, label: 'Série', value: `${streak}`, sub: streakData.today_active ? 'Dnes aktivní' : streak > 0 ? 'dní v řadě' : 'Začni dnes', color: streak >= 3 ? '#f59e0b' : 'hsl(var(--mn-muted))', glow: streak >= 3 ? 'hsl(var(--mn-warn) / 0.08)' : 'transparent' },
              { icon: Award, label: 'Úspěchy', value: String(recentAchievements.length), sub: 'odemčeno', color: '#f59e0b', glow: 'hsl(var(--mn-warn) / 0.06)' },
            ].map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="group mn-card-secondary relative p-6 overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                     style={{ background: `radial-gradient(circle at 50% 0%, ${s.glow}, transparent 70%)` }} />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${s.color}14` }}>
                      <s.icon style={{ width: 14, height: 14, color: s.color }} />
                    </div>
                    <span className="mn-caption text-[hsl(var(--mn-muted))] !text-[10px] !mb-0">{s.label}</span>
                  </div>
                  <p className="mn-mono-font text-[28px] font-bold tracking-tight leading-none">{s.value}</p>
                  <p className="mn-ui-font text-[12px] text-[hsl(var(--mn-muted))] mt-1.5">{s.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ═══ QUICK ACTIONS ═══ */}
        <motion.section {...up(2)}>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { to: 'Studium', icon: Brain, label: 'Studuj téma', desc: 'Procházej AI obsah', gradient: 'linear-gradient(135deg, #14b8a6, #10b981)', shadow: 'hsl(var(--mn-accent) / 0.25)' },
              { to: 'ReviewToday', icon: RefreshCw, label: 'Opakovat kartičky', desc: `${dueCardsCount} čeká`, gradient: 'linear-gradient(135deg, #f59e0b, #f97316)', shadow: 'hsl(var(--mn-warn) / 0.25)' },
              { to: 'TestGeneratorV2', icon: Target, label: 'Zkušební test', desc: 'Otestuj znalosti', gradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)', shadow: 'rgba(139,92,246,0.25)' },
              { to: 'AcademyDashboard', icon: GraduationCap, label: 'AI Academy', desc: academyProfile?.academy_level ? `Level ${academyProfile.academy_level}` : 'Zdarma kurzy', gradient: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', shadow: 'rgba(14,165,233,0.25)' },
            ].map((a, i) => (
              <Link key={i} to={createPageUrl(a.to)}
                className="group mn-card-secondary relative p-6 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300"
                     style={{ background: a.gradient, boxShadow: `0 4px 16px ${a.shadow}` }}>
                  <a.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="mn-ui-font text-[15px] font-semibold">{a.label}</h3>
                <p className="mn-ui-font text-[13px] text-[hsl(var(--mn-muted))] mt-1">{a.desc}</p>
                <ArrowRight className="absolute top-5 right-5 w-4 h-4 text-[hsl(var(--mn-muted))] opacity-0 group-hover:opacity-100 group-hover:text-[hsl(var(--mn-accent))] transition-all" />
              </Link>
            ))}
          </div>
        </motion.section>

        {/* ═══ STUDY TODAY + ATTESTATION ═══ */}
        <motion.section {...up(3)}>
          <div className="grid lg:grid-cols-2 gap-4">
            <StudyTodayWidget />
            <AttestationProgress />
          </div>
        </motion.section>

        {/* ═══ WEAK SPOTS ═══ */}
        <motion.section {...up(4)}>
          <WeakSpotsWidget />
        </motion.section>

        {/* ═══ ANALYTICS ═══ */}
        <motion.section {...up(5)}>
          <Caption>Studijní analytika</Caption>
          <div className="grid lg:grid-cols-3 gap-4">
            <WeeklyActivityChart />
            <TestScoreTrend />
            <MasteryOverview />
          </div>
        </motion.section>

        {/* ═══ AI DIGEST ═══ */}
        <motion.section {...up(6)}>
          <GeminiWeeklyDigest />
        </motion.section>

        {/* ═══ RECENT TESTS ═══ */}
        {recentTests.length > 0 && (
          <motion.section {...up(7)}>
            <div className="flex items-center justify-between mb-5">
              <Caption className="!mb-0">Moje testy</Caption>
              <Link to={createPageUrl('TestGeneratorV2')}>
                <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-lg h-8 border-[hsl(var(--mn-border))] hover:border-[hsl(var(--mn-accent)/0.4)]">
                  Nový test <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="mn-card overflow-hidden">
              {recentTests.map((test, i) => {
                const done = test.status === 'completed';
                const inProg = test.status === 'in_progress';
                return (
                  <div key={test.id}
                    className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[hsl(var(--mn-elevated)/0.5)]"
                    style={{ borderBottom: i < recentTests.length - 1 ? '1px solid hsl(var(--mn-border) / 0.3)' : 'none' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant={done ? 'default' : inProg ? 'secondary' : 'outline'} className="text-[10px]">
                          {done ? 'Dokončeno' : inProg ? 'Probíhá' : 'Opuštěno'}
                        </Badge>
                        <span className="mn-ui-font text-[11px] text-[hsl(var(--mn-muted))]">{test.question_count} otázek</span>
                      </div>
                      {done && test.score !== null && (
                        <span className="mn-mono-font text-[14px] font-bold" style={{
                          color: test.score >= 80 ? 'hsl(var(--mn-success))' : test.score >= 60 ? 'hsl(var(--mn-warn))' : 'hsl(var(--mn-danger))'
                        }}>{test.score.toFixed(1)}%</span>
                      )}
                    </div>
                    <div className="shrink-0 ml-3">
                      {inProg && <Link to={`${createPageUrl('TestSessionV2')}?id=${test.id}`}><Button size="sm" className="bg-[hsl(var(--mn-accent))] text-white hover:bg-[hsl(var(--mn-accent)/0.85)]">Pokračovat</Button></Link>}
                      {done && <Link to={`${createPageUrl('TestResults')}?id=${test.id}`}><Button size="sm" variant="outline">Výsledky</Button></Link>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ═══ ACHIEVEMENTS ═══ */}
        {recentAchievements.length > 0 && (
          <motion.section {...up(8)}>
            <Caption>Nedávné úspěchy</Caption>
            <div className="flex flex-wrap gap-2">
              {recentAchievements.map(a => (
                <div key={a.id} className="mn-tag flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:border-[hsl(var(--mn-accent)/0.3)]">
                  <Award style={{ width: 14, height: 14, color: '#f59e0b' }} />
                  <span className="mn-ui-font text-[13px] font-medium">{a.achievement_name}</span>
                  <span className="mn-mono-font text-[10px] text-[hsl(var(--mn-muted))]">+{a.tokens_earned}</span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        <div className="h-12" />
      </div>
    </div>
  );
}
