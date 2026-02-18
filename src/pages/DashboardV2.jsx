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

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay }
});

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

  const sFont = "'Source Serif 4', Georgia, serif";
  const uFont = "'IBM Plex Sans', -apple-system, sans-serif";
  const mFont = "'IBM Plex Mono', monospace";

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--mn-text)) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[160px]"
             style={{ background: 'hsl(var(--mn-accent) / 0.07)' }} />
        <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full blur-[140px]"
             style={{ background: 'hsl(188 76% 42% / 0.04)' }} />
      </div>

      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ═══ HERO ═══ */}
        <motion.div {...fadeUp(0)} className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(135deg, hsl(var(--mn-accent) / 0.12) 0%, transparent 50%, hsl(188 76% 42% / 0.08) 100%)'
          }} />
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px]"
               style={{ background: 'hsl(var(--mn-accent) / 0.15)' }} />
          <div className="relative px-6 sm:px-8 py-8 sm:py-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span style={{ fontFamily: uFont, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: 'hsl(var(--mn-muted))' }} className="uppercase">
                Dashboard
              </span>
            </div>
            <h1 style={{ fontFamily: sFont, fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              Vítej zpět,{' '}
              <span style={{ background: 'linear-gradient(135deg, #2dd4bf, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {firstName}
              </span>
            </h1>
            <p style={{ fontFamily: uFont, fontSize: 15, color: 'hsl(var(--mn-muted))', marginTop: 6 }}>
              Zde je tvůj dnešní přehled
            </p>
          </div>
        </motion.div>

        {/* ═══ STAT CARDS ═══ */}
        <motion.div {...fadeUp(0.08)} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: Zap, label: 'AI Kredity', value: (tokens?.current_tokens || 0).toLocaleString(), sub: `z ${(tokens?.monthly_limit || 1000).toLocaleString()}`, color: '#14b8a6', glow: 'rgba(20,184,166,0.12)' },
            { icon: RefreshCw, label: 'K opakování', value: String(dueCardsCount), sub: dueCardsCount === 0 ? 'Vše hotovo' : 'kartiček čeká', color: dueCardsCount > 0 ? '#f59e0b' : '#22c55e', glow: dueCardsCount > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)' },
            { icon: Flame, label: 'Série', value: `${streak}`, sub: streakData.today_active ? 'Dnes aktivní' : streak > 0 ? 'dní v řadě' : 'Začni dnes', color: streak >= 3 ? '#f59e0b' : '#6b7280', glow: streak >= 3 ? 'rgba(245,158,11,0.1)' : 'transparent' },
            { icon: Award, label: 'Úspěchy', value: String(recentAchievements.length), sub: 'odemčeno', color: '#f59e0b', glow: 'rgba(245,158,11,0.08)' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
              className="relative group rounded-2xl overflow-hidden"
              style={{
                background: 'hsl(var(--mn-surface))',
                border: '1px solid hsl(var(--mn-border))',
                padding: '20px',
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                   style={{ background: `radial-gradient(circle at 50% 0%, ${s.glow}, transparent 70%)` }} />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${s.color}15` }}>
                    <s.icon style={{ width: 14, height: 14, color: s.color }} />
                  </div>
                  <span style={{ fontFamily: uFont, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'hsl(var(--mn-muted))' }} className="uppercase">
                    {s.label}
                  </span>
                </div>
                <p style={{ fontFamily: mFont, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {s.value}
                </p>
                <p style={{ fontFamily: uFont, fontSize: 12, color: 'hsl(var(--mn-muted))', marginTop: 4 }}>{s.sub}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ═══ QUICK ACTIONS ═══ */}
        <motion.div {...fadeUp(0.16)}>
          <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { to: 'Studium', icon: Brain, label: 'Studuj téma', desc: 'Procházej AI obsah', gradient: 'linear-gradient(135deg, #14b8a6, #10b981)' },
              { to: 'ReviewToday', icon: RefreshCw, label: 'Opakovat kartičky', desc: `${dueCardsCount} čeká`, gradient: 'linear-gradient(135deg, #f59e0b, #f97316)' },
              { to: 'TestGeneratorV2', icon: Target, label: 'Zkušební test', desc: 'Otestuj znalosti', gradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)' },
            ].map((a, i) => (
              <Link key={i} to={createPageUrl(a.to)}
                className="group relative p-5 sm:p-6 rounded-2xl transition-all duration-300"
                style={{
                  background: 'hsl(var(--mn-surface) / 0.6)',
                  border: '1px solid hsl(var(--mn-border))',
                  backdropFilter: 'blur(8px)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(var(--mn-accent) / 0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--mn-border))'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300"
                     style={{ background: a.gradient }}>
                  <a.icon className="w-5 h-5 text-white" />
                </div>
                <h3 style={{ fontFamily: uFont, fontSize: 15, fontWeight: 600 }}>{a.label}</h3>
                <p style={{ fontFamily: uFont, fontSize: 13, color: 'hsl(var(--mn-muted))', marginTop: 2 }}>{a.desc}</p>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ═══ STUDY TODAY + ATTESTATION ═══ */}
        <motion.div {...fadeUp(0.22)} className="grid lg:grid-cols-2 gap-4">
          <StudyTodayWidget />
          <AttestationProgress />
        </motion.div>

        {/* ═══ WEAK SPOTS ═══ */}
        <motion.div {...fadeUp(0.28)}>
          <WeakSpotsWidget />
        </motion.div>

        {/* ═══ ANALYTICS ═══ */}
        <motion.div {...fadeUp(0.34)}>
          <div className="mb-4">
            <span style={{ fontFamily: uFont, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'hsl(var(--mn-accent))' }} className="uppercase">
              Studijní analytika
            </span>
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <WeeklyActivityChart />
            <TestScoreTrend />
            <MasteryOverview />
          </div>
        </motion.div>

        {/* ═══ AI DIGEST ═══ */}
        <motion.div {...fadeUp(0.38)}>
          <GeminiWeeklyDigest />
        </motion.div>

        {/* ═══ RECENT TESTS ═══ */}
        {recentTests.length > 0 && (
          <motion.div {...fadeUp(0.42)}>
            <div className="flex items-center justify-between mb-4">
              <span style={{ fontFamily: uFont, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'hsl(var(--mn-accent))' }} className="uppercase">
                Moje testy
              </span>
              <Link to={createPageUrl('TestGeneratorV2')}>
                <Button variant="outline" size="sm" className="text-xs gap-1 rounded-lg h-8">
                  Nový test <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
              {recentTests.map((test, i) => {
                const done = test.status === 'completed';
                const inProg = test.status === 'in_progress';
                return (
                  <div key={test.id}
                    className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[hsl(var(--mn-surface-2)/0.5)]"
                    style={{ borderBottom: i < recentTests.length - 1 ? '1px solid hsl(var(--mn-border) / 0.4)' : 'none' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant={done ? 'default' : inProg ? 'secondary' : 'outline'} className="text-[10px]">
                          {done ? 'Dokončeno' : inProg ? 'Probíhá' : 'Opuštěno'}
                        </Badge>
                        <span style={{ fontFamily: uFont, fontSize: 11, color: 'hsl(var(--mn-muted))' }}>{test.question_count} otázek</span>
                      </div>
                      {done && test.score !== null && (
                        <span style={{ fontFamily: mFont, fontSize: 14, fontWeight: 700, color: test.score >= 80 ? '#22c55e' : test.score >= 60 ? '#f59e0b' : '#ef4444' }}>
                          {test.score.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className="shrink-0 ml-3">
                      {inProg && <Link to={`${createPageUrl('TestSessionV2')}?id=${test.id}`}><Button size="sm" style={{ background: '#14b8a6' }} className="text-white hover:opacity-90">Pokračovat</Button></Link>}
                      {done && <Link to={`${createPageUrl('TestResults')}?id=${test.id}`}><Button size="sm" variant="outline">Výsledky</Button></Link>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ═══ ACHIEVEMENTS ═══ */}
        {recentAchievements.length > 0 && (
          <motion.div {...fadeUp(0.46)}>
            <div className="mb-4">
              <span style={{ fontFamily: uFont, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'hsl(var(--mn-accent))' }} className="uppercase">
                Nedávné úspěchy
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentAchievements.map(a => (
                <div key={a.id} className="flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:border-[hsl(var(--mn-accent)/0.3)]"
                     style={{ border: '1px solid hsl(var(--mn-border))', background: 'hsl(var(--mn-surface))', fontFamily: uFont, fontSize: 13 }}>
                  <Award style={{ width: 14, height: 14, color: '#f59e0b' }} />
                  <span className="font-medium">{a.achievement_name}</span>
                  <span style={{ fontFamily: mFont, fontSize: 10, color: 'hsl(var(--mn-muted))' }}>+{a.tokens_earned}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
