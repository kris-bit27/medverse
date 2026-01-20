import React, { useState, useEffect, useMemo } from 'react';
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
  XCircle,
  RefreshCw,
  Trophy,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import DifficultyIndicator from '@/components/ui/DifficultyIndicator';
import AnswerSection from '@/components/questions/AnswerSection';
import { calculateNextReview, RATINGS } from '@/components/utils/srs';

export default function TestSession() {
  const [questionIds, setQuestionIds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState({});
  const [isComplete, setIsComplete] = useState(false);
  const queryClient = useQueryClient();

  // Load test questions from session storage
  useEffect(() => {
    const stored = sessionStorage.getItem('testQuestions');
    if (stored) {
      setQuestionIds(JSON.parse(stored));
    } else {
      window.location.href = createPageUrl('TestGenerator');
    }
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['testQuestions', questionIds],
    queryFn: async () => {
      if (questionIds.length === 0) return [];
      const all = await base44.entities.Question.list();
      return questionIds.map(id => all.find(q => q.id === id)).filter(Boolean);
    },
    enabled: questionIds.length > 0
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: () => base44.entities.UserProgress.filter({ user_id: user.id }),
    enabled: !!user?.id
  });

  const currentQuestion = questions[currentIndex];

  const progressMutation = useMutation({
    mutationFn: async ({ questionId, rating }) => {
      const existing = progress.find(p => p.question_id === questionId);
      const updates = calculateNextReview(existing || {}, rating);
      
      if (existing) {
        return base44.entities.UserProgress.update(existing.id, updates);
      } else {
        return base44.entities.UserProgress.create({
          user_id: user.id,
          question_id: questionId,
          ...updates
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userProgress', user?.id]);
    }
  });

  const handleAnswer = (rating) => {
    // Record result
    setResults(prev => ({
      ...prev,
      [currentQuestion.id]: rating
    }));

    // Update progress
    const ratingMap = {
      correct: RATINGS.EASY,
      partial: RATINGS.MEDIUM,
      wrong: RATINGS.HARD
    };
    progressMutation.mutate({ 
      questionId: currentQuestion.id, 
      rating: ratingMap[rating] 
    });

    // Move to next or complete
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      setIsComplete(true);
    }
  };

  // Results summary
  const summary = useMemo(() => {
    const correct = Object.values(results).filter(r => r === 'correct').length;
    const partial = Object.values(results).filter(r => r === 'partial').length;
    const wrong = Object.values(results).filter(r => r === 'wrong').length;
    const total = Object.keys(results).length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, partial, wrong, total, score };
  }, [results]);

  if (isLoading || questionIds.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Načítání testu..." />
      </div>
    );
  }

  // Completion screen
  if (isComplete) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Test dokončen!
          </h1>
          <p className="text-5xl font-bold text-teal-600 mb-6">
            {summary.score}%
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/20">
              <div className="text-2xl font-bold text-emerald-600">{summary.correct}</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Správně</p>
            </Card>
            <Card className="p-4 bg-amber-50 dark:bg-amber-900/20">
              <div className="text-2xl font-bold text-amber-600">{summary.partial}</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Částečně</p>
            </Card>
            <Card className="p-4 bg-red-50 dark:bg-red-900/20">
              <div className="text-2xl font-bold text-red-600">{summary.wrong}</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Špatně</p>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline">
              <Link to={createPageUrl('TestGenerator')}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Nový test
              </Link>
            </Button>
            <Button asChild className="bg-teal-600 hover:bg-teal-700">
              <Link to={createPageUrl('Dashboard')}>
                Zpět na dashboard
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const progressPercentage = Math.round((currentIndex / questions.length) * 100);

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" asChild>
          <Link to={createPageUrl('TestGenerator')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Ukončit test
          </Link>
        </Button>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {currentIndex + 1} / {questions.length}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-xl">
                  {currentQuestion.title}
                </CardTitle>
                <DifficultyIndicator level={currentQuestion.difficulty || 1} showLabel={false} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {currentQuestion.question_text}
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
              <AnswerSection
                answerRich={currentQuestion.answer_rich}
                answerStructured={currentQuestion.answer_structured}
                refs={currentQuestion.refs}
                images={currentQuestion.images}
              />

              {/* Rating buttons */}
              <Card className="mt-6">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 text-center">
                    Jak jste odpověděli?
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      onClick={() => handleAnswer('wrong')}
                      disabled={progressMutation.isPending}
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 border-red-200 hover:border-red-300 hover:bg-red-50"
                    >
                      <XCircle className="w-6 h-6 text-red-500" />
                      <span className="text-sm font-medium">Špatně</span>
                    </Button>
                    <Button
                      onClick={() => handleAnswer('partial')}
                      disabled={progressMutation.isPending}
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 border-amber-200 hover:border-amber-300 hover:bg-amber-50"
                    >
                      <RefreshCw className="w-6 h-6 text-amber-500" />
                      <span className="text-sm font-medium">Částečně</span>
                    </Button>
                    <Button
                      onClick={() => handleAnswer('correct')}
                      disabled={progressMutation.isPending}
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      <span className="text-sm font-medium">Správně</span>
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