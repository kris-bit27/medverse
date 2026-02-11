import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Clock,
  CheckCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function TestSessionV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id');

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Fetch test session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['testSession', sessionId],
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

  // Fetch questions for this test
  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['testQuestions', sessionId, session?.topic_ids],
    queryFn: async () => {
      if (!session?.topic_ids) return [];

      // Get random questions from selected topics
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .in('topic_id', session.topic_ids)
        .limit(session.question_count);
      
      if (error) throw error;

      // Shuffle questions
      const shuffled = data.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, session.question_count);
    },
    enabled: !!session?.topic_ids
  });

  // Timer effect
  useEffect(() => {
    if (!session || session.status !== 'in_progress') return;

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (!session?.time_limit_minutes) return;
    
    const timeLimit = session.time_limit_minutes * 60;
    if (timeElapsed >= timeLimit) {
      handleSubmitTest();
    }
  }, [timeElapsed, session]);

  // Submit test mutation
  const submitTest = useMutation({
    mutationFn: async () => {
      // Calculate score
      const totalQuestions = questions.length;
      let correctAnswers = 0;

      const answerRecords = questions.map((q, index) => {
        const userAnswer = answers[q.id];
        const isCorrect = userAnswer === q.correct_answer;
        if (isCorrect) correctAnswers++;

        return {
          session_id: sessionId,
          question_id: q.id,
          user_answer: userAnswer || null,
          is_correct: isCorrect,
          time_spent_seconds: 0 // Could track per-question timing
        };
      });

      // Insert all answers
      const { error: answersError } = await supabase
        .from('test_answers')
        .insert(answerRecords);

      if (answersError) throw answersError;

      // Update session
      const score = (correctAnswers / totalQuestions) * 100;
      const { error: sessionError } = await supabase
        .from('test_sessions')
        .update({
          status: 'completed',
          score: score,
          correct_answers: correctAnswers,
          total_questions: totalQuestions,
          time_spent_seconds: timeElapsed,
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      return { sessionId, score, correctAnswers, totalQuestions };
    },
    onSuccess: (data) => {
      toast.success('Test dokončen!');
      navigate(`${createPageUrl('TestResults')}?id=${data.sessionId}`);
    },
    onError: (error) => {
      console.error('Error submitting test:', error);
      toast.error('Chyba při odesílání testu');
    }
  });

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleFlagToggle = (questionId) => {
    setFlagged(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleSubmitTest = () => {
    const unanswered = questions.length - Object.keys(answers).length;
    
    if (unanswered > 0) {
      setShowConfirmSubmit(true);
    } else {
      submitTest.mutate();
    }
  };

  if (sessionLoading || questionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session || !questions.length) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-2">Test nenalezen</h2>
            <p className="text-muted-foreground mb-6">
              Tento test neexistuje nebo nemáte oprávnění k přístupu.
            </p>
            <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
              Zpět na Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const timeRemaining = session.time_limit_minutes 
    ? (session.time_limit_minutes * 60) - timeElapsed
    : null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container max-w-6xl mx-auto p-6">
      {/* Header Bar */}
      <div className="sticky top-0 z-50 bg-background border-b pb-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Test - {session.mode === 'timed' ? 'Časovaný' : 'Procvičování'}</h1>
            <p className="text-sm text-muted-foreground">
              Otázka {currentQuestionIndex + 1} z {questions.length}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="font-mono text-lg">
                {session.time_limit_minutes ? (
                  <span className={timeRemaining < 300 ? 'text-red-600' : ''}>
                    {formatTime(timeRemaining)}
                  </span>
                ) : (
                  formatTime(timeElapsed)
                )}
              </span>
            </div>

            {/* Progress */}
            <Badge variant="outline">
              {answeredCount}/{questions.length} odpovězeno
            </Badge>
          </div>
        </div>

        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Main Question Area */}
        <div className="md:col-span-3 space-y-6">
          {/* Question */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-xl">
                  {currentQuestion.question_text}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFlagToggle(currentQuestion.id)}
                >
                  <Flag 
                    className={`w-5 h-5 ${flagged.has(currentQuestion.id) ? 'fill-yellow-500 text-yellow-500' : ''}`}
                  />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[currentQuestion.id]}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                <div className="space-y-3">
                  {['A', 'B', 'C', 'D'].map((option) => {
                    const optionText = currentQuestion[`option_${option.toLowerCase()}`];
                    if (!optionText) return null;

                    return (
                      <div
                        key={option}
                        className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                      >
                        <RadioGroupItem value={option} id={`option-${option}`} />
                        <Label 
                          htmlFor={`option-${option}`}
                          className="flex-1 cursor-pointer"
                        >
                          <span className="font-semibold mr-2">{option}.</span>
                          {optionText}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Předchozí
            </Button>

            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={handleSubmitTest}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Dokončit test
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
              >
                Další
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar - Question Navigator */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-sm">Přehled otázek</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, index) => {
                  const isAnswered = !!answers[q.id];
                  const isFlagged = flagged.has(q.id);
                  const isCurrent = index === currentQuestionIndex;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`
                        w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium
                        transition-colors relative
                        ${isCurrent ? 'ring-2 ring-purple-600' : ''}
                        ${isAnswered 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                          : 'bg-slate-100 dark:bg-slate-800'
                        }
                        hover:bg-slate-200 dark:hover:bg-slate-700
                      `}
                    >
                      {index + 1}
                      {isFlagged && (
                        <Flag className="w-3 h-3 absolute -top-1 -right-1 fill-yellow-500 text-yellow-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900"></div>
                  <span>Odpovězeno ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-800"></div>
                  <span>Bez odpovědi ({questions.length - answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  <span>Označené ({flagged.size})</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm Submit Dialog */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Opravdu chcete dokončit test?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Máte {questions.length - answeredCount} nezodpovězených otázek. 
                Tyto otázky budou označeny jako chybné.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmSubmit(false)}
                  className="flex-1"
                >
                  Pokračovat v testu
                </Button>
                <Button
                  onClick={() => {
                    setShowConfirmSubmit(false);
                    submitTest.mutate();
                  }}
                  className="flex-1"
                >
                  Dokončit test
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
