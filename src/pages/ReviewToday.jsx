import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Trophy,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import DifficultyIndicator from '@/components/ui/DifficultyIndicator';
import AnswerSection from '@/components/questions/AnswerSection';
import { getDueQuestions, calculateNextReview, RATINGS } from '@/components/utils/srs';

export default function ReviewToday() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list()
  });

  const { data: progress = [], isLoading } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: () => base44.entities.UserProgress.filter({ user_id: user.id }),
    enabled: !!user?.id
  });

  // Calculate due questions
  const dueQueue = useMemo(() => {
    const dailyGoal = user?.settings?.daily_goal || 15;
    const dueProgress = getDueQuestions(progress, dailyGoal);
    
    return dueProgress.map(p => {
      const question = questions.find(q => q.id === p.question_id);
      return { ...p, question };
    }).filter(item => item.question);
  }, [progress, questions, user]);

  const currentItem = dueQueue[currentIndex];
  const isComplete = currentIndex >= dueQueue.length;

  const progressMutation = useMutation({
    mutationFn: async ({ progressItem, rating }) => {
      const updates = calculateNextReview(progressItem, rating);
      
      if (progressItem.id) {
        return base44.entities.UserProgress.update(progressItem.id, updates);
      } else {
        return base44.entities.UserProgress.create({
          user_id: user.id,
          question_id: progressItem.question_id,
          ...updates
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userProgress', user?.id]);
      setCompletedCount(prev => prev + 1);
      setShowAnswer(false);
      setCurrentIndex(prev => prev + 1);
    }
  });

  const handleRating = (rating) => {
    const ratingMap = {
      easy: RATINGS.EASY,
      medium: RATINGS.MEDIUM,
      hard: RATINGS.HARD
    };
    progressMutation.mutate({ 
      progressItem: currentItem, 
      rating: ratingMap[rating] 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Načítání fronty..." />
      </div>
    );
  }

  // Completion screen
  if (isComplete || dueQueue.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            {dueQueue.length === 0 ? 'Žádné otázky k opakování' : 'Skvělá práce! 🎉'}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            {dueQueue.length === 0 
              ? 'Nemáte žádné naplánované otázky k opakování'
              : `Dokončili jste ${completedCount} otázek`
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-teal-600 hover:bg-teal-700">
              <Link to={createPageUrl('Dashboard')}>
                Zpět na dashboard
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={createPageUrl('Atestace')}>
                Pokračovat v učení
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const progressPercentage = Math.round((currentIndex / dueQueue.length) * 100);

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" asChild>
          <Link to={createPageUrl('Dashboard')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Link>
        </Button>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {currentIndex + 1} / {dueQueue.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <Progress value={progressPercentage} className="h-2" />
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center">
          {completedCount} dokončeno dnes
        </p>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem.question_id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl mb-2">
                    {currentItem.question?.title}
                  </CardTitle>
                  <DifficultyIndicator level={currentItem.question?.difficulty || 1} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {currentItem.question?.question_text}
              </p>
            </CardContent>
          </Card>

          {/* Show answer button */}
          {!showAnswer ? (
            <Button
              onClick={() => setShowAnswer(true)}
              className="w-full h-14 text-lg bg-teal-600 hover:bg-teal-700"
            >
              <Eye className="w-5 h-5 mr-2" />
              Zobrazit odpověď
            </Button>
          ) : (
            <>
              {/* Answer */}
              <AnswerSection
                answerRich={currentItem.question?.answer_rich}
                answerStructured={currentItem.question?.answer_structured}
                refs={currentItem.question?.refs}
                images={currentItem.question?.images}
              />

              {/* Rating buttons */}
              <Card className="mt-6">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 text-center">
                    Jak dobře jste znali odpověď?
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      onClick={() => handleRating('hard')}
                      disabled={progressMutation.isPending}
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 border-red-200 hover:border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                    >
                      <XCircle className="w-6 h-6 text-red-500" />
                      <span className="text-sm font-medium">Neumím</span>
                      <span className="text-xs text-slate-500">Zítra</span>
                    </Button>
                    <Button
                      onClick={() => handleRating('medium')}
                      disabled={progressMutation.isPending}
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 border-amber-200 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20"
                    >
                      <RefreshCw className="w-6 h-6 text-amber-500" />
                      <span className="text-sm font-medium">Částečně</span>
                      <span className="text-xs text-slate-500">Za 2 dny</span>
                    </Button>
                    <Button
                      onClick={() => handleRating('easy')}
                      disabled={progressMutation.isPending}
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                    >
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      <span className="text-sm font-medium">Umím</span>
                      <span className="text-xs text-slate-500">Za 3+ dny</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}