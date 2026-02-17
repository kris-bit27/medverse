import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import OnboardingWizard from '@/components/OnboardingWizard';
import StudyTodayWidget from '@/components/StudyTodayWidget';
import AttestationProgress from '@/components/AttestationProgress';
import WeakSpotsWidget from '@/components/dashboard/WeakSpotsWidget';
import WeeklyActivityChart from '@/components/dashboard/WeeklyActivityChart';
import TestScoreTrend from '@/components/dashboard/TestScoreTrend';
import MasteryOverview from '@/components/dashboard/MasteryOverview';
import GeminiWeeklyDigest from '@/components/dashboard/GeminiWeeklyDigest';
import { 
  Zap,
  BookOpen,
  Target,
  Flame,
  TrendingUp,
  Calendar,
  Award,
  Clock,
  Brain,
  ChevronRight
} from 'lucide-react';

export default function DashboardV2() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user has completed profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('profile_completed, display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    onSuccess: (data) => {
      if (!data || !data.profile_completed) {
        setShowOnboarding(true);
      }
    }
  });

  // Show onboarding for new users
  React.useEffect(() => {
    if (!profileLoading && profile === null) {
      setShowOnboarding(true);
    }
  }, [profile, profileLoading]);

  // Fetch user tokens
  const { data: tokens } = useQuery({
    queryKey: ['userTokens', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch due flashcards count
  const { data: dueCardsCount = 0 } = useQuery({
    queryKey: ['dueCardsCount', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { count, error } = await supabase
        .from('user_flashcard_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .lte('next_review', today);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id
  });

  // Fetch recent achievements
  const { data: recentAchievements = [] } = useQuery({
    queryKey: ['recentAchievements', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch study streak
  const { data: streakData = { current_streak: 0, today_active: false, total_study_days: 0 } } = useQuery({
    queryKey: ['studyStreak', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_study_streak', { p_user_id: user.id });
      if (error) throw error;
      return data || { current_streak: 0, today_active: false, total_study_days: 0 };
    },
    enabled: !!user?.id
  });
  const studyStreak = streakData.current_streak;
  const todayActive = streakData.today_active;

  // Fetch recent test sessions
  const { data: recentTests = [] } = useQuery({
    queryKey: ['recentTests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch topic mastery data (Sprint 1)
  const { data: masteryData = [] } = useQuery({
    queryKey: ['topicMastery', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_topic_mastery')
        .select('*, topics:topic_id(title, slug, obory:obor_id(name))')
        .eq('user_id', user.id)
        .order('last_studied_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch total study time (Sprint 1)
  const { data: studyStats } = useQuery({
    queryKey: ['studyStats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('duration_seconds')
        .eq('user_id', user.id);
      
      if (error) throw error;
      const totalSeconds = (data || []).reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      return {
        totalMinutes: Math.round(totalSeconds / 60),
        sessionCount: data?.length || 0,
      };
    },
    enabled: !!user?.id
  });

  const tokenPercentage = tokens 
    ? ((tokens.current_tokens / tokens.monthly_limit) * 100)
    : 0;

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Onboarding for new users */}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Vítej zpět, {user?.email?.split('@')[0] || 'Student'}! 👋
        </h1>
        <p className="text-muted-foreground">
          Zde je tvůj dnešní přehled
        </p>
      </div>

      {/* Sprint 4: What to study today */}
      <div className="grid lg:grid-cols-2 gap-6">
        <StudyTodayWidget />
        <AttestationProgress />
      </div>

      {/* Weak spots */}
      <WeakSpotsWidget />

      {/* P1: Study Analytics Widgets */}
      <div className="grid lg:grid-cols-3 gap-6">
        <WeeklyActivityChart />
        <TestScoreTrend />
        <MasteryOverview />
      </div>

      {/* P2: AI Weekly Digest */}
      <GeminiWeeklyDigest />

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        {/* Token Balance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-teal-600" />
              AI Kredity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {tokens?.current_tokens?.toLocaleString() || 0} 💎
              </p>
              <Progress value={tokenPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {tokens?.monthly_limit?.toLocaleString() || 1000} limit
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Due Cards */}
        <Card className={dueCardsCount > 0 ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-orange-600" />
              K opakování
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dueCardsCount}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {dueCardsCount === 0 ? 'Vše hotovo!' : 'kartiček čeká'}
            </p>
            {dueCardsCount > 0 && (
              <Button size="sm" className="mt-3 w-full" asChild>
                <Link to={createPageUrl("FlashcardReviewV2")}>
                  Začít opakování
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Study Streak */}
        <Card className={studyStreak >= 3 ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flame className={`w-4 h-4 ${studyStreak >= 3 ? 'text-orange-500' : 'text-muted-foreground'}`} />
              Série
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{studyStreak} {studyStreak === 1 ? 'den' : studyStreak >= 2 && studyStreak <= 4 ? 'dny' : 'dní'} 🔥</p>
            <p className="text-xs text-muted-foreground mt-2">
              {todayActive ? '✅ Dnes aktivní' : studyStreak > 0 ? '⏰ Dnes ještě ne — udrž sérii!' : 'Začni studovat!'}
            </p>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-600" />
              Úspěchy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{recentAchievements.length}</p>
            <p className="text-xs text-muted-foreground mt-2">
              odemčeno
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Rychlé akce</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Link to={createPageUrl("Studium")}>
              <Card className="hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-slate-900 transition-colors cursor-pointer border-2">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-teal-100 dark:bg-teal-900/20">
                    <Brain className="w-6 h-6 text-teal-600 dark:text-teal-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Studuj téma</h3>
                    <p className="text-sm text-muted-foreground">
                      Procházej AI-generovaný obsah
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl("FlashcardReviewV2")}>
              <Card className="hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-slate-900 transition-colors cursor-pointer border-2">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-orange-100 dark:bg-amber-900/20">
                    <Zap className="w-6 h-6 text-orange-600 dark:text-orange-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Review Flashcards</h3>
                    <p className="text-sm text-muted-foreground">
                      {dueCardsCount} cards čeká
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl("TestGeneratorV2")}>
              <Card className="hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-slate-900 transition-colors cursor-pointer border-2">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <Target className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Practice Test</h3>
                    <p className="text-sm text-muted-foreground">
                      Vyzkoušej své znalosti
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>


      {/* ── Sprint 3: Weakness Dashboard ── */}
      {masteryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              Oblasti k procvičení
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {masteryData
                .filter(m => Number(m.mastery_score) < 60)
                .sort((a, b) => Number(a.mastery_score) - Number(b.mastery_score))
                .slice(0, 6)
                .map(m => {
                  const score = Number(m.mastery_score) || 0;
                  return (
                    <Link key={m.id} to={`${createPageUrl('TopicDetailV2')}?id=${m.topic_id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-[hsl(var(--mn-surface-2))] transition-colors">
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-sm font-medium truncate">{m.topics?.title}</p>
                          <p className="text-xs text-muted-foreground">{m.topics?.obory?.name}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${score}%`,
                              background: score >= 50 ? '#a855f7' : score >= 20 ? '#f59e0b' : '#ef4444'
                            }} />
                          </div>
                          <span className="text-xs font-bold w-8 text-right text-muted-foreground">{Math.round(score)}%</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              {masteryData.filter(m => Number(m.mastery_score) < 60).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Všechna prostudovaná témata mají dobré zvládnutí! 🎉
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Nedávné úspěchy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-amber-900/20 flex items-center justify-center">
                      <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-300" />
                    </div>
                    <div>
                      <p className="font-medium">{achievement.achievement_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(achievement.unlocked_at).toLocaleDateString('cs-CZ')}
                      </p>
                    </div>
                  </div>
                  
                  <Badge variant="outline">
                    +{achievement.tokens_earned} 💎
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Tests Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Moje Testy
            </CardTitle>
            <Link to={createPageUrl('TestGeneratorV2')}>
              <Button size="sm">
                <Target className="w-4 h-4 mr-2" />
                Nový test
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentTests.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Zatím jste nevytvořili žádný test
              </p>
              <Link to={createPageUrl('TestGeneratorV2')}>
                <Button>
                  <Target className="w-4 h-4 mr-2" />
                  Vytvořit první test
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTests.map((test) => {
                const isCompleted = test.status === 'completed';
                const inProgress = test.status === 'in_progress';

                return (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={isCompleted ? 'default' : inProgress ? 'secondary' : 'outline'}>
                          {isCompleted ? 'Dokončeno' : inProgress ? 'Probíhá' : 'Opuštěno'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {test.question_count} otázek
                        </span>
                        {test.time_limit_minutes && (
                          <span className="text-sm text-muted-foreground">
                            • {test.time_limit_minutes} min
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {new Date(test.created_at).toLocaleString('cs-CZ')}
                      </p>

                      {isCompleted && test.score !== null && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${
                              test.score >= 80 ? 'text-green-600' :
                              test.score >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {test.score.toFixed(1)}%
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({test.correct_answers}/{test.total_questions} správně)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {inProgress && (
                        <Link to={`${createPageUrl('TestSessionV2')}?id=${test.id}`}>
                          <Button size="sm" variant="default">
                            Pokračovat
                          </Button>
                        </Link>
                      )}
                      
                      {isCompleted && (
                        <Link to={`${createPageUrl('TestResults')}?id=${test.id}`}>
                          <Button size="sm" variant="outline">
                            Zobrazit výsledky
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}

              {recentTests.length >= 5 && (
                <div className="text-center pt-2">
                  <Button variant="ghost" size="sm">
                    Zobrazit všechny testy
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
