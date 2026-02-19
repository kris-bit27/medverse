import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  Trophy, RotateCcw, Clock, AlertTriangle, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toast } from 'sonner';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function TestSession() {
  const { user } = useAuth();
  const { track } = useAnalytics();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('id');
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [answers, setAnswers] = useState({}); // { questionId: { selected, isCorrect } }
  const [startTime, setStartTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  // Load session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['test-session', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId
  });

  // Load questions for this session's topics
  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['test-questions', sessionId, session?.topic_ids],
    queryFn: async () => {
      if (!session?.topic_ids?.length) return [];
      
      let query = supabase
        .from('questions')
        .select('*, topics:topic_id(title)')
        .in('topic_id', session.topic_ids);
      
      // Filter by difficulty if specified (AI generates difficulty 1-3)
      if (session.difficulty && session.difficulty !== 'mixed') {
        const diffMap = { easy: [1], medium: [2], hard: [3] };
        const levels = diffMap[session.difficulty] || [1, 2, 3];
        query = query.in('difficulty', levels);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Shuffle and limit to question_count
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      return shuffled.slice(0, session.question_count || 20);
    },
    enabled: !!session?.topic_ids?.length
  });

  const currentQuestion = questions[currentIndex];
  const isComplete = Object.keys(answers).length === questions.length && questions.length > 0;
  const progressPct = questions.length > 0 ? Math.round((Object.keys(answers).length / questions.length) * 100) : 0;

  // Parse MCQ options
  const options = useMemo(() => {
    if (!currentQuestion?.options) return [];
    const opts = currentQuestion.options;
    if (typeof opts === 'object' && !Array.isArray(opts)) {
      return Object.entries(opts).map(([key, value]) => ({ key, value }));
    }
    return [];
  }, [currentQuestion]);

  // Save answer to test_answers
  const saveAnswerMutation = useMutation({
    mutationFn: async ({ questionId, selected, isCorrect, timeSpent }) => {
      const { error } = await supabase.from('test_answers').insert({
        session_id: sessionId,
        question_id: questionId,
        user_answer: selected,
        is_correct: isCorrect,
        time_spent_seconds: timeSpent,
      });
      if (error) console.error('Save answer error:', error);
    }
  });

  // Complete session
  const completeSessionMutation = useMutation({
    mutationFn: async () => {
      const correct = Object.values(answers).filter(a => a.isCorrect).length;
      const total = Object.keys(answers).length;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      const { error } = await supabase
        .from('test_sessions')
        .update({
          status: 'completed',
          score,
          correct_answers: correct,
          total_questions: total,
          time_spent_seconds: elapsed,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
      if (error) console.error('Complete session error:', error);
      track('test_completed', { score, correct, total, duration: elapsed });
      queryClient.invalidateQueries(['test-session', sessionId]);
    }
  });

  const handleSelectAnswer = useCallback((key) => {
    if (isRevealed) return;
    setSelectedAnswer(key);
  }, [isRevealed]);

  const handleConfirm = useCallback(() => {
    if (!selectedAnswer || !currentQuestion) return;
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    
    setIsRevealed(true);
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: { selected: selectedAnswer, isCorrect }
    }));

    saveAnswerMutation.mutate({
      questionId: currentQuestion.id,
      selected: selectedAnswer,
      isCorrect,
      timeSpent,
    });
  }, [selectedAnswer, currentQuestion, questionStartTime]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsRevealed(false);
      setQuestionStartTime(Date.now());
    }
  }, [currentIndex, questions.length]);

  // Auto-complete when all answered
  useEffect(() => {
    if (isComplete && !session?.completed_at) {
      completeSessionMutation.mutate();
    }
  }, [isComplete]);

  // Loading state
  if (sessionLoading || questionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Načítání testu..." />
      </div>
    );
  }

  if (!session || !sessionId) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 mx-auto text-[hsl(var(--mn-warn))] mb-4" />
        <h2 className="text-xl font-bold mb-2">Test nenalezen</h2>
        <Button asChild><Link to={createPageUrl('TestGeneratorV2')}>Vytvořit nový test</Link></Button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-20">
        <BookOpen className="w-12 h-12 mx-auto text-[hsl(var(--mn-muted))] mb-4" />
        <h2 className="text-xl font-bold mb-2">Žádné otázky</h2>
        <p className="text-[hsl(var(--mn-muted))] mb-4">Pro vybraná témata nejsou dostupné otázky.</p>
        <Button asChild><Link to={createPageUrl('TestGeneratorV2')}>Zpět na generátor</Link></Button>
      </div>
    );
  }

  // ── Results screen ──
  if (isComplete) {
    const correct = Object.values(answers).filter(a => a.isCorrect).length;
    const wrong = Object.values(answers).filter(a => !a.isCorrect).length;
    const total = Object.keys(answers).length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
            score >= 80 ? 'bg-gradient-to-br from-[hsl(var(--mn-success))] to-[hsl(var(--mn-accent))]' :
            score >= 60 ? 'bg-gradient-to-br from-[hsl(var(--mn-warn))] to-[hsl(var(--mn-danger))]' :
            'bg-gradient-to-br from-[hsl(var(--mn-danger))] to-[hsl(var(--mn-danger))]'
          }`}>
            <Trophy className="w-12 h-12 text-[hsl(var(--mn-text))]" />
          </div>
          <h1 className="mn-mono-font text-3xl font-bold mb-2">Test dokončen!</h1>
          <p className="mn-mono-font text-5xl font-bold text-[hsl(var(--mn-accent))] mb-2">{score}%</p>
          <p className="text-sm text-[hsl(var(--mn-muted))] mb-6">
            {correct}/{total} správně • {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')} min
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <Card className="p-4 bg-[hsl(var(--mn-success)/0.08)]">
              <div className="text-2xl font-bold text-[hsl(var(--mn-success))]">{correct}</div>
              <p className="text-sm text-[hsl(var(--mn-muted))]">Správně</p>
            </Card>
            <Card className="p-4 bg-[hsl(var(--mn-danger)/0.08)]">
              <div className="text-2xl font-bold text-[hsl(var(--mn-danger))]">{wrong}</div>
              <p className="text-sm text-[hsl(var(--mn-muted))]">Špatně</p>
            </Card>
          </div>

          {/* Review wrong answers */}
          {wrong > 0 && (
            <div className="text-left mb-8">
              <h3 className="font-semibold mb-3 text-sm text-[hsl(var(--mn-muted))] uppercase">Chybné odpovědi</h3>
              <div className="space-y-3">
                {questions.filter(q => answers[q.id] && !answers[q.id].isCorrect).map(q => (
                  <Card key={q.id} className="p-4 border-[hsl(var(--mn-danger)/0.3)]">
                    <p className="text-sm font-medium mb-2">{q.question_text}</p>
                    <div className="flex gap-4 text-xs">
                      <span className="text-[hsl(var(--mn-danger))]">Vaše: {answers[q.id]?.selected}</span>
                      <span className="text-[hsl(var(--mn-success))]">Správně: {q.correct_answer}</span>
                    </div>
                    {q.explanation && (
                      <p className="text-xs text-[hsl(var(--mn-muted))] mt-2 border-t pt-2">{q.explanation}</p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <Link to={createPageUrl('TestGeneratorV2')}><RotateCcw className="w-4 h-4 mr-2" />Nový test</Link>
            </Button>
            <Button asChild className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)]">
              <Link to={createPageUrl('Dashboard')}>Zpět na dashboard</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Question screen ──
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={createPageUrl('TestGeneratorV2')}>
            <ChevronLeft className="w-4 h-4 mr-1" />Ukončit
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[hsl(var(--mn-muted))]">{currentIndex + 1} / {questions.length}</span>
          <Badge variant={session.mode === 'timed' ? 'destructive' : 'outline'} className="text-xs">
            {session.mode === 'timed' ? `⏱ ${session.time_limit_minutes} min` : 'Praxe'}
          </Badge>
        </div>
      </div>

      <Progress value={progressPct} className="h-1.5 mb-6" />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.15 }}
        >
          {/* Question card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3 mb-1">
                <Badge variant="outline" className="text-xs shrink-0">
                  {currentQuestion.topics?.title?.substring(0, 40)}
                </Badge>
                <Badge variant="outline" className="text-xs shrink-0">
                  Obtížnost {currentQuestion.difficulty || '?'}/3
                </Badge>
              </div>
              <p className="text-lg font-medium leading-relaxed mt-4">
                {currentQuestion.question_text}
              </p>
            </CardContent>
          </Card>

          {/* MCQ Options */}
          <div className="space-y-3 mb-6">
            {options.map(({ key, value }) => {
              const isSelected = selectedAnswer === key;
              const isCorrectOption = key === currentQuestion.correct_answer;
              
              let style = 'border-[hsl(var(--mn-border))] hover:border-[hsl(var(--mn-accent)/0.4)]';
              if (isRevealed) {
                if (isCorrectOption) style = 'border-[hsl(var(--mn-success))] bg-[hsl(var(--mn-success)/0.08)]';
                else if (isSelected && !isCorrectOption) style = 'border-[hsl(var(--mn-danger))] bg-[hsl(var(--mn-danger)/0.08)]';
                else style = 'border-[hsl(var(--mn-border))] opacity-60';
              } else if (isSelected) {
                style = 'border-[hsl(var(--mn-accent))] bg-[hsl(var(--mn-accent)/0.08)] ring-2 ring-[hsl(var(--mn-accent)/0.3)]';
              }

              return (
                <button
                  key={key}
                  onClick={() => handleSelectAnswer(key)}
                  disabled={isRevealed}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${style}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                      isRevealed && isCorrectOption ? 'bg-[hsl(var(--mn-success))] text-white border-[hsl(var(--mn-success))]' :
                      isRevealed && isSelected && !isCorrectOption ? 'bg-[hsl(var(--mn-danger))] text-white border-[hsl(var(--mn-danger))]' :
                      isSelected ? 'bg-[hsl(var(--mn-accent))] text-white border-[hsl(var(--mn-accent))]' :
                      'border-[hsl(var(--mn-border))] border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))]'
                    }`}>
                      {key}
                    </span>
                    <span className="text-sm leading-relaxed pt-1">{value}</span>
                    {isRevealed && isCorrectOption && (
                      <CheckCircle2 className="w-5 h-5 text-[hsl(var(--mn-success))] ml-auto shrink-0 mt-1" />
                    )}
                    {isRevealed && isSelected && !isCorrectOption && (
                      <XCircle className="w-5 h-5 text-[hsl(var(--mn-danger))] ml-auto shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation (after reveal) */}
          {isRevealed && currentQuestion.explanation && (
            <Card className="mb-6 border-[hsl(var(--mn-accent-2)/0.3)] bg-[hsl(var(--mn-accent-2)/0.06)]">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-[hsl(var(--mn-accent-2))] mb-1">Vysvětlení</p>
                <p className="text-sm text-[hsl(var(--mn-muted))] leading-relaxed">
                  {currentQuestion.explanation}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {!isRevealed ? (
              <Button
                onClick={handleConfirm}
                disabled={!selectedAnswer}
                className="flex-1 h-12 bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)]"
              >
                Potvrdit odpověď
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="flex-1 h-12 bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)]"
              >
                {currentIndex < questions.length - 1 ? (
                  <>Další otázka <ChevronRight className="w-4 h-4 ml-1" /></>
                ) : (
                  <>Zobrazit výsledky <Trophy className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
