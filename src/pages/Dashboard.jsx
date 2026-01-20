import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  Target, 
  TrendingUp, 
  Calendar,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import StatsCard from '@/components/dashboard/StatsCard';
import ProgressWidget from '@/components/dashboard/ProgressWidget';
import RecentActivity from '@/components/dashboard/RecentActivity';
import ReviewQueueWidget from '@/components/dashboard/ReviewQueueWidget';
import BookmarksWidget from '@/components/dashboard/BookmarksWidget';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { getDueQuestions, calculateProgressStats } from '@/components/utils/srs';

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: okruhy = [] } = useQuery({
    queryKey: ['okruhy'],
    queryFn: () => base44.entities.Okruh.list('order')
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list()
  });

  const { data: progress = [], isLoading: progressLoading } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: () => base44.entities.UserProgress.filter({ user_id: user.id }),
    enabled: !!user?.id
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: () => base44.entities.Bookmark.filter({ user_id: user.id }, '-created_date', 10),
    enabled: !!user?.id
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list()
  });

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list()
  });

  // Calculate stats
  const stats = useMemo(() => {
    const progressStats = calculateProgressStats(progress);
    const dailyGoal = user?.settings?.daily_goal || 15;
    const dueQuestions = getDueQuestions(progress, dailyGoal);
    
    // Count completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = progress.filter(p => {
      if (!p.last_reviewed_at) return false;
      const reviewDate = new Date(p.last_reviewed_at);
      reviewDate.setHours(0, 0, 0, 0);
      return reviewDate.getTime() === today.getTime();
    }).length;

    // Progress by okruh
    const progressByOkruh = {};
    okruhy.forEach(o => {
      const okruhQuestions = questions.filter(q => q.okruh_id === o.id);
      const okruhProgress = progress.filter(p => 
        okruhQuestions.some(q => q.id === p.question_id)
      );
      progressByOkruh[o.id] = {
        total: okruhQuestions.length,
        mastered: okruhProgress.filter(p => p.status === 'mastered').length
      };
    });

    return {
      ...progressStats,
      dailyGoal,
      dueToday: dueQuestions.length,
      completedToday,
      progressByOkruh
    };
  }, [progress, questions, okruhy, user]);

  // Days until exam
  const daysUntilExam = useMemo(() => {
    if (!user?.settings?.exam_date) return null;
    return differenceInDays(new Date(user.settings.exam_date), new Date());
  }, [user]);

  if (progressLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Načítání..." />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Vítejte zpět, {user?.full_name?.split(' ')[0] || 'Doktore'}! 👋
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {daysUntilExam !== null && daysUntilExam > 0 ? (
            <>Do atestace zbývá <strong className="text-teal-600">{daysUntilExam} dní</strong></>
          ) : (
            'Zde je přehled vašeho pokroku'
          )}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Celkem otázek"
          value={questions.length}
          icon={GraduationCap}
        />
        <StatsCard
          title="Zvládnuto"
          value={stats.mastered}
          subtitle={`${stats.percentage}%`}
          icon={Target}
        />
        <StatsCard
          title="Dnešní cíl"
          value={`${stats.completedToday}/${stats.dailyGoal}`}
          icon={TrendingUp}
        />
        {daysUntilExam !== null && (
          <StatsCard
            title="Do atestace"
            value={`${daysUntilExam} dní`}
            icon={Calendar}
          />
        )}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Review queue widget */}
          <ReviewQueueWidget
            dueToday={stats.dueToday}
            completedToday={stats.completedToday}
            dailyGoal={stats.dailyGoal}
          />

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Rychlé akce
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                <Button asChild variant="outline" className="h-auto py-4 justify-start">
                  <Link to={createPageUrl('TestGenerator')}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Nový test</p>
                        <p className="text-xs text-slate-500">Vygenerovat testové otázky</p>
                      </div>
                    </div>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto py-4 justify-start">
                  <Link to={createPageUrl('Atestace')}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Target className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Procházet okruhy</p>
                        <p className="text-xs text-slate-500">Vybrat téma k učení</p>
                      </div>
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <RecentActivity
            recentProgress={progress}
            questions={questions}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Progress widget */}
          <ProgressWidget
            title="Pokrok podle okruhů"
            okruhy={okruhy}
            progressByOkruh={stats.progressByOkruh}
            totalQuestions={questions.length}
            masteredQuestions={stats.mastered}
          />

          {/* Bookmarks */}
          <BookmarksWidget
            bookmarks={bookmarks}
            questions={questions}
            articles={articles}
            tools={tools}
          />
        </div>
      </div>
    </div>
  );
}