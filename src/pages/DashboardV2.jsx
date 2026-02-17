import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import OnboardingWizard from '@/components/OnboardingWizard';
import StudyTodayWidget from '@/components/StudyTodayWidget';
import AttestationProgress from '@/components/AttestationProgress';
import WeakSpotsWidget from '@/components/dashboard/WeakSpotsWidget';
import WeeklyActivityChart from '@/components/dashboard/WeeklyActivityChart';
import TestScoreTrend from '@/components/dashboard/TestScoreTrend';
import MasteryOverview from '@/components/dashboard/MasteryOverview';
import GeminiWeeklyDigest from '@/components/dashboard/GeminiWeeklyDigest';
import {
  Zap, BookOpen, Target, Flame, TrendingUp,
  Award, Brain, ChevronRight, ArrowRight, Sparkles
} from 'lucide-react';

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
    onSuccess: (data) => { if (!data || !data.profile_completed) setShowOnboarding(true); }
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

  const { data: masteryData = [] } = useQuery({
    queryKey: ['topicMastery', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_topic_mastery')
        .select('*, topics:topic_id(title, slug, obory:obor_id(name))')
        .eq('user_id', user.id).order('last_studied_at', { ascending: false }).limit(10);
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
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}

      {/* ══════ GREETING ══════ */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-1">
          Vítej zpět, {firstName}
        </h1>
        <p className="text-[hsl(var(--mn-muted))] text-sm">
          Zde je tvůj dnešní přehled
        </p>
      </div>

      {/* ══════ QUICK STATS BAR ══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-border))]">
        {[
          {
            icon: Zap, label: 'AI Kredity',
            value: `${(tokens?.current_tokens || 0).toLocaleString()}`,
            sub: `${(tokens?.monthly_limit || 1000).toLocaleString()} limit`,
            accent: 'text-teal-500',
          },
          {
            icon: BookOpen, label: 'K opakování',
            value: `${dueCardsCount}`,
            sub: dueCardsCount === 0 ? 'Vše hotovo ✓' : 'kartiček čeká',
            accent: dueCardsCount > 0 ? 'text-amber-500' : 'text-emerald-500',
          },
          {
            icon: Flame, label: 'Série',
            value: `${streak} ${streak === 1 ? 'den' : streak >= 2 && streak <= 4 ? 'dny' : 'dní'}`,
            sub: streakData.today_active ? 'Dnes aktivní ✓' : streak > 0 ? 'Dnes ještě ne' : 'Začni studovat',
            accent: streak >= 3 ? 'text-orange-500' : 'text-[hsl(var(--mn-muted))]',
          },
          {
            icon: Award, label: 'Úspěchy',
            value: `${recentAchievements.length}`,
            sub: 'odemčeno',
            accent: 'text-yellow-500',
          },
        ].map((s, i) => (
          <div key={i} className="bg-[hsl(var(--mn-surface))] p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.accent}`} />
              <span className="text-xs text-[hsl(var(--mn-muted))] uppercase tracking-wider font-medium">{s.label}</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight">{s.value}</p>
            <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ══════ STUDY TODAY + ATTESTATION ══════ */}
      <div className="grid lg:grid-cols-2 gap-6">
        <StudyTodayWidget />
        <AttestationProgress />
      </div>

      {/* ══════ WEAK SPOTS ══════ */}
      <WeakSpotsWidget />

      {/* ══════ ANALYTICS ══════ */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--mn-accent))] mb-4">Studijní analytika</p>
        <div className="grid lg:grid-cols-3 gap-6">
          <WeeklyActivityChart />
          <TestScoreTrend />
          <MasteryOverview />
        </div>
      </div>

      {/* ══════ AI WEEKLY DIGEST ══════ */}
      <GeminiWeeklyDigest />

      {/* ══════ QUICK ACTIONS ══════ */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--mn-accent))] mb-4">Rychlé akce</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { to: 'Studium', icon: Brain, label: 'Studuj téma', desc: 'Procházej AI-generovaný obsah', accent: 'from-teal-500 to-emerald-500' },
            { to: 'FlashcardReviewV2', icon: Zap, label: 'Opakovat kartičky', desc: `${dueCardsCount} kartiček čeká`, accent: 'from-amber-500 to-orange-500' },
            { to: 'TestGeneratorV2', icon: Target, label: 'Zkušební test', desc: 'Vyzkoušej své znalosti', accent: 'from-violet-500 to-purple-500' },
          ].map((a, i) => (
            <Link key={i} to={createPageUrl(a.to)}>
              <div className="group p-5 rounded-2xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface)/0.5)] hover:border-[hsl(var(--mn-accent)/0.3)] hover:bg-[hsl(var(--mn-surface))] transition-all">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.accent} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <a.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{a.label}</h3>
                <p className="text-xs text-[hsl(var(--mn-muted))]">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ══════ AREAS TO PRACTICE ══════ */}
      {masteryData.filter(m => Number(m.mastery_score) < 60).length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--mn-accent))] mb-4">Oblasti k procvičení</p>
          <div className="rounded-2xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface)/0.5)] divide-y divide-[hsl(var(--mn-border))]">
            {masteryData
              .filter(m => Number(m.mastery_score) < 60)
              .sort((a, b) => Number(a.mastery_score) - Number(b.mastery_score))
              .slice(0, 6)
              .map(m => {
                const score = Number(m.mastery_score) || 0;
                return (
                  <Link key={m.id} to={`${createPageUrl('TopicDetailV2')}?id=${m.topic_id}`}
                    className="flex items-center justify-between p-4 hover:bg-[hsl(var(--mn-surface-2)/0.5)] transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium truncate">{m.topics?.title}</p>
                      <p className="text-xs text-[hsl(var(--mn-muted))]">{m.topics?.obory?.name}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-20 h-1.5 bg-[hsl(var(--mn-border))] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${score}%`,
                          background: score >= 50 ? '#a855f7' : score >= 20 ? '#f59e0b' : '#ef4444'
                        }} />
                      </div>
                      <span className="text-xs font-bold w-8 text-right text-[hsl(var(--mn-muted))]">{Math.round(score)}%</span>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      )}

      {/* ══════ RECENT TESTS ══════ */}
      {recentTests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--mn-accent))]">Moje testy</p>
            <Link to={createPageUrl('TestGeneratorV2')}>
              <Button size="sm" variant="outline" className="text-xs">
                Nový test <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="rounded-2xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface)/0.5)] divide-y divide-[hsl(var(--mn-border))]">
            {recentTests.map(test => {
              const done = test.status === 'completed';
              const inProg = test.status === 'in_progress';
              return (
                <div key={test.id} className="flex items-center justify-between p-4 first:rounded-t-2xl last:rounded-b-2xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant={done ? 'default' : inProg ? 'secondary' : 'outline'} className="text-[10px]">
                        {done ? 'Dokončeno' : inProg ? 'Probíhá' : 'Opuštěno'}
                      </Badge>
                      <span className="text-xs text-[hsl(var(--mn-muted))]">{test.question_count} otázek</span>
                    </div>
                    {done && test.score !== null && (
                      <span className={`text-sm font-bold ${test.score >= 80 ? 'text-emerald-500' : test.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                        {test.score.toFixed(1)}% ({test.correct_answers}/{test.total_questions})
                      </span>
                    )}
                    <p className="text-[10px] text-[hsl(var(--mn-muted))] mt-0.5">{new Date(test.created_at).toLocaleString('cs-CZ')}</p>
                  </div>
                  <div className="shrink-0 ml-3">
                    {inProg && <Link to={`${createPageUrl('TestSessionV2')}?id=${test.id}`}><Button size="sm">Pokračovat</Button></Link>}
                    {done && <Link to={`${createPageUrl('TestResults')}?id=${test.id}`}><Button size="sm" variant="outline">Výsledky</Button></Link>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════ ACHIEVEMENTS ══════ */}
      {recentAchievements.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--mn-accent))] mb-4">Nedávné úspěchy</p>
          <div className="flex flex-wrap gap-3">
            {recentAchievements.map(a => (
              <div key={a.id} className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface)/0.5)]">
                <Award className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">{a.achievement_name}</span>
                <Badge variant="outline" className="text-[10px]">+{a.tokens_earned} 💎</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
