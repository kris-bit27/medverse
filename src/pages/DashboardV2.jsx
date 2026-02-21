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
import { Zap, Target, Flame, Award, Brain, ArrowRight, RefreshCw, GraduationCap } from 'lucide-react';
import { useAcademyProfile } from '@/hooks/useAcademy';
import { ACADEMY_LEVELS } from '@/lib/academy-constants';

const up = (i = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }
});

const SectionLabel = ({ children, className = '' }) => (
  <div className={`flex items-center gap-3 mb-6 ${className}`}>
    <span className="mn-eyebrow-accent">{children}</span>
    <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, hsl(var(--mn-accent)/0.4), transparent)' }} />
  </div>
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

      {/* Atmospheric background — živější glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--mn-text) / 0.04) 0.5px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full" style={{
          background: 'radial-gradient(circle, hsl(var(--mn-accent) / 0.14) 0%, transparent 65%)',
          filter: 'blur(80px)'
        }} />
        <div className="absolute top-[35%] -left-40 w-[500px] h-[500px] rounded-full" style={{
          background: 'radial-gradient(circle, hsl(var(--mn-accent-2) / 0.08) 0%, transparent 65%)',
          filter: 'blur(60px)'
        }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]" style={{
          background: 'radial-gradient(ellipse, hsl(var(--mn-warn) / 0.04) 0%, transparent 70%)',
          filter: 'blur(80px)'
        }} />
      </div>

      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-10">

        {/* HERO */}
        <motion.section {...up(0)}>
          <div className="relative rounded-2xl overflow-hidden" style={{
            background: 'linear-gradient(135deg, hsl(var(--mn-surface)) 0%, hsl(var(--mn-surface-2)) 100%)',
            border: '1px solid hsl(var(--mn-border))',
            boxShadow: '0 0 0 1px hsl(var(--mn-accent) / 0.08), 0 8px 32px hsl(var(--mn-accent) / 0.10)'
          }}>
            <div className="absolute top-0 right-0 w-96 h-72 pointer-events-none" style={{
              background: 'radial-gradient(circle, hsl(var(--mn-accent) / 0.18) 0%, transparent 70%)',
              filter: 'blur(50px)'
            }} />
            <div className="absolute bottom-0 left-0 w-56 h-56 pointer-events-none" style={{
              background: 'radial-gradient(circle, hsl(var(--mn-accent-2) / 0.10) 0%, transparent 70%)',
              filter: 'blur(40px)'
            }} />
            <div className="relative px-8 sm:px-12 py-10 sm:py-14">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full" style={{
                  background: 'hsl(var(--mn-success))',
                  boxShadow: '0 0 8px hsl(var(--mn-success) / 0.9)'
                }} />
                <span className="mn-eyebrow">Dashboard</span>
              </div>
              <h1 className="mn-serif-font font-bold tracking-tight leading-[1.05]"
                  style={{ fontSize: 'clamp(38px, 5.5vw, 54px)' }}>
                Vítej zpět,{' '}
                <span className="mn-accent-text">{firstName}</span>
              </h1>
              <p className="mn-ui-font mt-3" style={{ fontSize: '16px', color: 'hsl(var(--mn-muted))', maxWidth: '400px' }}>
                Pokračuj tam, kde jsi skončil
              </p>
              <div className="flex items-center gap-3 mt-7">
                <Link to={createPageUrl('Studium')}>
                  <button className="mn-btn-cta px-5 py-2.5 text-sm rounded-xl inline-flex items-center gap-2">
                    Studovat <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                {dueCardsCount > 0 && (
                  <Link to={createPageUrl('ReviewToday')}>
                    <button className="mn-btn-outline px-5 py-2.5 text-sm rounded-xl inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      {dueCardsCount} kartiček čeká
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* STAT CARDS */}
        <motion.section {...up(1)}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Zap, label: 'AI Tokeny', value: (tokens?.current_tokens || 0).toLocaleString('cs'), sub: `z ${(tokens?.monthly_limit || 50).toLocaleString('cs')}`, color: 'hsl(var(--mn-accent))', glow: 'hsl(var(--mn-accent) / 0.18)', bg: 'hsl(var(--mn-accent) / 0.12)' },
              { icon: RefreshCw, label: 'K opakování', value: String(dueCardsCount), sub: dueCardsCount === 0 ? '✓ Vše hotovo' : 'kartiček čeká', color: dueCardsCount > 0 ? 'hsl(var(--mn-warn))' : 'hsl(var(--mn-success))', glow: dueCardsCount > 0 ? 'hsl(var(--mn-warn) / 0.18)' : 'hsl(var(--mn-success) / 0.14)', bg: dueCardsCount > 0 ? 'hsl(var(--mn-warn) / 0.12)' : 'hsl(var(--mn-success) / 0.10)' },
              { icon: Flame, label: 'Série', value: String(streak), sub: streakData.today_active ? '🔥 Dnes aktivní' : streak > 0 ? 'dní v řadě' : 'Začni dnes', color: streak >= 3 ? 'hsl(var(--mn-warn))' : 'hsl(var(--mn-muted))', glow: streak >= 3 ? 'hsl(var(--mn-warn) / 0.18)' : 'transparent', bg: streak >= 3 ? 'hsl(var(--mn-warn) / 0.12)' : 'hsl(var(--mn-surface-2))' },
              { icon: Award, label: 'Úspěchy', value: String(recentAchievements.length), sub: 'odemčeno', color: 'hsl(38 92% 58%)', glow: 'hsl(38 92% 55% / 0.18)', bg: 'hsl(38 92% 55% / 0.12)' },
            ].map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="group relative overflow-hidden rounded-2xl p-6"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--mn-surface)) 0%, hsl(var(--mn-surface-2)) 100%)',
                  border: '1px solid hsl(var(--mn-border))',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                  cursor: 'default'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 12px 40px ${s.glow}`;
                  e.currentTarget.style.borderColor = s.color.replace(')', '/0.35)');
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.borderColor = '';
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                     style={{ background: `radial-gradient(ellipse at 50% -30%, ${s.glow}, transparent 70%)` }} />
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                       style={{ background: s.bg, boxShadow: `0 0 20px ${s.glow}` }}>
                    <s.icon style={{ width: 19, height: 19, color: s.color }} />
                  </div>
                  <p className="mn-eyebrow mb-2" style={{ color: 'hsl(var(--mn-muted))' }}>{s.label}</p>
                  <p className="mn-mono-font font-bold leading-none" style={{ fontSize: 'clamp(30px, 3vw, 38px)', color: s.color }}>
                    {s.value}
                  </p>
                  <p className="mn-ui-font mt-1.5" style={{ fontSize: '12px', color: 'hsl(var(--mn-muted))' }}>{s.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* QUICK ACTIONS */}
        <motion.section {...up(2)}>
          <SectionLabel>Rychlé akce</SectionLabel>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { to: 'Studium', icon: Brain, label: 'Studuj téma', desc: 'Procházej AI obsah', grad: 'linear-gradient(135deg, hsl(var(--mn-accent)), hsl(173 80% 28%))', glow: 'hsl(var(--mn-accent) / 0.4)', border: 'hsl(var(--mn-accent) / 0.3)' },
              { to: 'ReviewToday', icon: RefreshCw, label: 'Opakovat kartičky', desc: dueCardsCount > 0 ? `${dueCardsCount} čeká` : 'Vše splněno', grad: 'linear-gradient(135deg, #f59e0b, #f97316)', glow: 'rgba(245,158,11,0.4)', border: 'rgba(245,158,11,0.3)' },
              { to: 'TestGeneratorV2', icon: Target, label: 'Zkušební test', desc: 'Otestuj znalosti', grad: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', glow: 'rgba(139,92,246,0.4)', border: 'rgba(139,92,246,0.3)' },
              { to: 'AcademyDashboard', icon: GraduationCap, label: 'AI Academy', desc: academyProfile?.academy_level ? `Level ${academyProfile.academy_level}` : 'Zdarma kurzy', grad: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', glow: 'rgba(14,165,233,0.4)', border: 'rgba(14,165,233,0.3)' },
            ].map((a, i) => (
              <Link key={i} to={createPageUrl(a.to)} className="group block relative rounded-2xl p-6 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--mn-surface)), hsl(var(--mn-surface-2)))',
                  border: '1px solid hsl(var(--mn-border))',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = `0 16px 48px ${a.glow}`;
                  e.currentTarget.style.borderColor = a.border;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.borderColor = '';
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                     style={{ background: `radial-gradient(ellipse at 30% 0%, ${a.glow.replace('0.4','0.10')}, transparent 70%)` }} />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300"
                     style={{ background: a.grad, boxShadow: `0 4px 24px ${a.glow}` }}>
                  <a.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="mn-ui-font font-semibold mb-1" style={{ fontSize: '15px', color: 'hsl(var(--mn-text))' }}>{a.label}</h3>
                <p className="mn-ui-font" style={{ fontSize: '13px', color: 'hsl(var(--mn-muted))' }}>{a.desc}</p>
                <ArrowRight className="absolute top-5 right-5 w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-200"
                            style={{ color: 'hsl(var(--mn-accent))' }} />
              </Link>
            ))}
          </div>
        </motion.section>

        {/* STUDY TODAY + ATTESTATION */}
        <motion.section {...up(3)}>
          <div className="grid lg:grid-cols-2 gap-4">
            <StudyTodayWidget />
            <AttestationProgress />
          </div>
        </motion.section>

        {/* WEAK SPOTS */}
        <motion.section {...up(4)}>
          <WeakSpotsWidget />
        </motion.section>

        {/* ANALYTICS */}
        <motion.section {...up(5)}>
          <SectionLabel>Studijní analytika</SectionLabel>
          <div className="grid lg:grid-cols-3 gap-4">
            <WeeklyActivityChart />
            <TestScoreTrend />
            <MasteryOverview />
          </div>
        </motion.section>

        {/* AI DIGEST */}
        <motion.section {...up(6)}>
          <GeminiWeeklyDigest />
        </motion.section>

        {/* RECENT TESTS */}
        {recentTests.length > 0 && (
          <motion.section {...up(7)}>
            <div className="flex items-center justify-between mb-5">
              <SectionLabel className="flex-1 !mb-0">Moje testy</SectionLabel>
              <Link to={createPageUrl('TestGeneratorV2')}>
                <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-xl h-8">
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
                    style={{ borderBottom: i < recentTests.length - 1 ? '1px solid hsl(var(--mn-border) / 0.4)' : 'none' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant={done ? 'default' : inProg ? 'secondary' : 'outline'} className="text-[10px]">
                          {done ? 'Dokončeno' : inProg ? 'Probíhá' : 'Opuštěno'}
                        </Badge>
                        <span className="mn-ui-font text-[11px] text-[hsl(var(--mn-muted))]">{test.question_count} otázek</span>
                      </div>
                      {done && test.score !== null && (
                        <span className="mn-mono-font text-[15px] font-bold" style={{
                          color: test.score >= 80 ? 'hsl(var(--mn-success))' : test.score >= 60 ? 'hsl(var(--mn-warn))' : 'hsl(var(--mn-danger))'
                        }}>{test.score.toFixed(1)}%</span>
                      )}
                    </div>
                    <div className="shrink-0 ml-3">
                      {inProg && <Link to={`${createPageUrl('TestSessionV2')}?id=${test.id}`}><Button size="sm" style={{ background: 'hsl(var(--mn-accent))', color: 'white' }}>Pokračovat</Button></Link>}
                      {done && <Link to={`${createPageUrl('TestResults')}?id=${test.id}`}><Button size="sm" variant="outline">Výsledky</Button></Link>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ACHIEVEMENTS */}
        {recentAchievements.length > 0 && (
          <motion.section {...up(8)}>
            <SectionLabel>Nedávné úspěchy</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {recentAchievements.map(a => (
                <div key={a.id} className="mn-tag flex items-center gap-2 px-4 py-2 rounded-full">
                  <Award style={{ width: 14, height: 14, color: 'hsl(38 92% 58%)' }} />
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
