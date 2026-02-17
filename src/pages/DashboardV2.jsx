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
  Zap, BookOpen, Target, Flame,
  Award, Brain, ArrowRight
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
  const weakTopics = masteryData.filter(m => Number(m.mastery_score) < 60);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}

      {/* ── GREETING ── */}
      <div>
        <h1 className="mn-serif-font text-2xl lg:text-3xl font-bold mb-1" style={{ letterSpacing: '-0.02em' }}>
          Vítej zpět, {firstName}
        </h1>
        <p className="mn-ui-font text-sm" style={{ color: 'hsl(var(--mn-muted))' }}>
          Zde je tvůj dnešní přehled
        </p>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Zap, label: 'AI Kredity', value: (tokens?.current_tokens || 0).toLocaleString(), sub: `z ${(tokens?.monthly_limit || 1000).toLocaleString()}`, color: 'hsl(var(--mn-accent))' },
          { icon: BookOpen, label: 'K opakování', value: dueCardsCount, sub: dueCardsCount === 0 ? 'Vše hotovo' : 'kartiček čeká', color: dueCardsCount > 0 ? 'hsl(var(--mn-warn))' : 'hsl(var(--mn-success))' },
          { icon: Flame, label: 'Série', value: `${streak} ${streak === 1 ? 'den' : streak >= 2 && streak <= 4 ? 'dny' : 'dní'}`, sub: streakData.today_active ? 'Dnes aktivní' : streak > 0 ? 'Dnes ještě ne' : 'Začni studovat', color: streak >= 3 ? '#f59e0b' : 'hsl(var(--mn-muted))' },
          { icon: Award, label: 'Úspěchy', value: recentAchievements.length, sub: 'odemčeno', color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'hsl(var(--mn-surface))',
            border: '1px solid hsl(var(--mn-border))',
            borderRadius: 'var(--mn-radius-lg)',
            padding: '20px',
            boxShadow: 'var(--mn-shadow-1)',
          }}>
            <div className="flex items-center gap-2 mb-3">
              <s.icon style={{ width: 16, height: 16, color: s.color }} />
              <span className="mn-caption" style={{ color: 'hsl(var(--mn-muted))' }}>{s.label}</span>
            </div>
            <p className="mn-mono-font text-2xl font-bold" style={{ letterSpacing: '-0.01em' }}>{s.value}</p>
            <p className="mn-ui-font text-xs mt-1" style={{ color: 'hsl(var(--mn-muted))' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── STUDY TODAY + ATTESTATION ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <StudyTodayWidget />
        <AttestationProgress />
      </div>

      {/* ── WEAK SPOTS ── */}
      <WeakSpotsWidget />

      {/* ── ANALYTICS ── */}
      <div>
        <div className="mn-caption mb-4" style={{ color: 'hsl(var(--mn-accent))' }}>Studijní analytika</div>
        <div className="grid lg:grid-cols-3 gap-5">
          <WeeklyActivityChart />
          <TestScoreTrend />
          <MasteryOverview />
        </div>
      </div>

      {/* ── AI DIGEST ── */}
      <GeminiWeeklyDigest />

      {/* ── QUICK ACTIONS ── */}
      <div>
        <div className="mn-caption mb-4" style={{ color: 'hsl(var(--mn-accent))' }}>Rychlé akce</div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { to: 'Studium', icon: Brain, label: 'Studuj téma', desc: 'Procházej AI-generovaný obsah', iconColor: 'hsl(var(--mn-accent))' },
            { to: 'FlashcardReviewV2', icon: Zap, label: 'Opakovat kartičky', desc: `${dueCardsCount} kartiček čeká`, iconColor: '#f59e0b' },
            { to: 'TestGeneratorV2', icon: Target, label: 'Zkušební test', desc: 'Vyzkoušej své znalosti', iconColor: '#3b82f6' },
          ].map((a, i) => (
            <Link key={i} to={createPageUrl(a.to)}>
              <div style={{
                padding: 20,
                background: 'hsl(var(--mn-surface))',
                border: '1px solid hsl(var(--mn-border))',
                borderRadius: 'var(--mn-radius-lg)',
                boxShadow: 'var(--mn-shadow-1)',
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(var(--mn-accent) / 0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--mn-border))'; }}
              >
                <a.icon style={{ width: 20, height: 20, color: a.iconColor, marginBottom: 12 }} />
                <h3 className="mn-ui-font text-sm font-semibold mb-1">{a.label}</h3>
                <p className="mn-ui-font text-xs" style={{ color: 'hsl(var(--mn-muted))' }}>{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── AREAS TO PRACTICE ── */}
      {weakTopics.length > 0 && (
        <div>
          <div className="mn-caption mb-4" style={{ color: 'hsl(var(--mn-accent))' }}>Oblasti k procvičení</div>
          <div style={{
            background: 'hsl(var(--mn-surface))',
            border: '1px solid hsl(var(--mn-border))',
            borderRadius: 'var(--mn-radius-lg)',
            boxShadow: 'var(--mn-shadow-1)',
            overflow: 'hidden',
          }}>
            {weakTopics
              .sort((a, b) => Number(a.mastery_score) - Number(b.mastery_score))
              .slice(0, 6)
              .map((m, i) => {
                const score = Number(m.mastery_score) || 0;
                return (
                  <Link key={m.id} to={`${createPageUrl('TopicDetailV2')}?id=${m.topic_id}`}
                    className="flex items-center justify-between px-5 py-3.5 transition-colors"
                    style={{ borderBottom: i < Math.min(weakTopics.length, 6) - 1 ? '1px solid hsl(var(--mn-border) / 0.5)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--mn-surface-2))'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="mn-ui-font text-sm font-medium truncate">{m.topics?.title}</p>
                      <p className="mn-ui-font text-xs" style={{ color: 'hsl(var(--mn-muted))' }}>{m.topics?.obory?.name}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div style={{ width: 72, height: 4, background: 'hsl(var(--mn-border))', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          width: `${score}%`,
                          background: score >= 50 ? '#a855f7' : score >= 20 ? '#f59e0b' : '#ef4444'
                        }} />
                      </div>
                      <span className="mn-mono-font text-xs font-medium" style={{ width: 32, textAlign: 'right', color: 'hsl(var(--mn-muted))' }}>{Math.round(score)}%</span>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      )}

      {/* ── RECENT TESTS ── */}
      {recentTests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="mn-caption" style={{ color: 'hsl(var(--mn-accent))' }}>Moje testy</div>
            <Link to={createPageUrl('TestGeneratorV2')}>
              <Button size="sm" variant="outline" className="text-xs">
                Nový test <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div style={{
            background: 'hsl(var(--mn-surface))',
            border: '1px solid hsl(var(--mn-border))',
            borderRadius: 'var(--mn-radius-lg)',
            boxShadow: 'var(--mn-shadow-1)',
            overflow: 'hidden',
          }}>
            {recentTests.map((test, i) => {
              const done = test.status === 'completed';
              const inProg = test.status === 'in_progress';
              return (
                <div key={test.id} className="flex items-center justify-between px-5 py-3.5"
                  style={{ borderBottom: i < recentTests.length - 1 ? '1px solid hsl(var(--mn-border) / 0.5)' : 'none' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant={done ? 'default' : inProg ? 'secondary' : 'outline'} className="text-[10px]">
                        {done ? 'Dokončeno' : inProg ? 'Probíhá' : 'Opuštěno'}
                      </Badge>
                      <span className="mn-ui-font text-xs" style={{ color: 'hsl(var(--mn-muted))' }}>{test.question_count} otázek</span>
                    </div>
                    {done && test.score !== null && (
                      <span className="mn-mono-font text-sm font-bold" style={{
                        color: test.score >= 80 ? 'hsl(var(--mn-success))' : test.score >= 60 ? '#f59e0b' : 'hsl(var(--mn-danger))'
                      }}>
                        {test.score.toFixed(1)}% ({test.correct_answers}/{test.total_questions})
                      </span>
                    )}
                    <p className="mn-ui-font text-[10px] mt-0.5" style={{ color: 'hsl(var(--mn-muted))' }}>
                      {new Date(test.created_at).toLocaleString('cs-CZ')}
                    </p>
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

      {/* ── ACHIEVEMENTS ── */}
      {recentAchievements.length > 0 && (
        <div>
          <div className="mn-caption mb-4" style={{ color: 'hsl(var(--mn-accent))' }}>Nedávné úspěchy</div>
          <div className="flex flex-wrap gap-3">
            {recentAchievements.map(a => (
              <div key={a.id} className="flex items-center gap-2 mn-ui-font" style={{
                padding: '8px 16px',
                borderRadius: 'var(--mn-radius-full)',
                border: '1px solid hsl(var(--mn-border))',
                background: 'hsl(var(--mn-surface))',
                fontSize: 13,
              }}>
                <Award style={{ width: 14, height: 14, color: '#f59e0b' }} />
                <span className="font-medium">{a.achievement_name}</span>
                <span className="mn-mono-font text-[10px]" style={{ color: 'hsl(var(--mn-muted))' }}>+{a.tokens_earned}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
