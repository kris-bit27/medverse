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

  const { data: disciplines = [] } = useQuery({
    queryKey: ['clinicalDisciplines'],
    queryFn: () => base44.entities.ClinicalDiscipline.list()
  });

  const { data: allOkruhy = [] } = useQuery({
    queryKey: ['okruhy'],
    queryFn: () => base44.entities.Okruh.list('order')
  });

  // Filter okruhy based on user's selected disciplines
  const okruhy = useMemo(() => {
    if (!user?.clinical_disciplines?.length) return allOkruhy;
    return allOkruhy.filter(o => 
      user.clinical_disciplines.includes(o.clinical_discipline_id)
    );
  }, [allOkruhy, user]);

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
        
        {/* Selected disciplines or selection prompt */}
        {user?.clinical_disciplines?.length > 0 ? (
          <Card className="mt-4 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-teal-900 dark:text-teal-100 mb-1">
                    Vaše vybrané obory
                  </p>
                  <p className="text-xs text-teal-700 dark:text-teal-300">
                    Obsah je personalizován podle {user.clinical_disciplines.length} {user.clinical_disciplines.length === 1 ? 'oboru' : user.clinical_disciplines.length < 5 ? 'oborů' : 'oborů'}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  asChild
                  className="text-xs hover:bg-teal-100 dark:hover:bg-teal-800"
                >
                  <Link to={createPageUrl('Profile')}>
                    Upravit
                  </Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {disciplines
                  .filter(d => user.clinical_disciplines.includes(d.id))
                  .map(discipline => (
                    <span 
                      key={discipline.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 text-teal-700 dark:text-teal-300 text-sm font-medium shadow-sm"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      {discipline.name}
                    </span>
                  ))
                }
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                    Vyberte si klinické obory
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                    Pro personalizovaný obsah doporučujeme vybrat si obory, které vás zajímají nebo se na ně připravujete.
                  </p>
                  <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700">
                    <Link to={createPageUrl('Profile')}>
                      Vybrat obory
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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