import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  const { data: studyStreak = 0 } = useQuery({
    queryKey: ['studyStreak', user?.id],
    queryFn: async () => {
      // Calculate streak from flashcard_review_sessions
      const { data, error } = await supabase
        .from('flashcard_review_sessions')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      
      if (!data || data.length === 0) return 0;
      
      // Calculate consecutive days
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < data.length; i++) {
        const sessionDate = new Date(data[i].created_at);
        sessionDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today - sessionDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === streak) {
          streak++;
        } else {
          break;
        }
      }
      
      return streak;
    },
    enabled: !!user?.id
  });

  const tokenPercentage = tokens 
    ? ((tokens.current_tokens / tokens.monthly_limit) * 100)
    : 0;

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Vítej zpět, {user?.email?.split('@')[0] || 'Student'}! 👋
        </h1>
        <p className="text-muted-foreground">
          Zde je tvůj dnešní přehled
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        {/* Token Balance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600" />
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
              {dueCardsCount === 0 ? 'All done!' : 'cards waiting'}
            </p>
            {dueCardsCount > 0 && (
              <Button size="sm" className="mt-3 w-full" asChild>
                <Link to={createPageUrl("FlashcardReviewV2")}>
                  Start Review
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Study Streak */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Study Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{studyStreak} dní</p>
            <p className="text-xs text-muted-foreground mt-2">
              Keep it going!
            </p>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-600" />
              Achievementy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{recentAchievements.length}</p>
            <p className="text-xs text-muted-foreground mt-2">
              unlocked
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
              <Card className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer border-2">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
                    <Brain className="w-6 h-6 text-purple-600 dark:text-purple-300" />
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
              <Card className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer border-2">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900">
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
              <Card className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer border-2">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
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
                    <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
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
    </div>
  );
}
