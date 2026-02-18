import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function TestSessionV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id');

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

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

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['testQuestions', session?.topic_ids],
    queryFn: async () => {
      if (!session) return [];

      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .in('topic_id', session.topic_ids);
      
      if (error) throw error;

      const shuffled = data.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, session.question_count);
    },
    enabled: !!session?.topic_ids
  });

  useEffect(() => {
    if (!session || session.status !== 'in_progress') return;

    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  const submitTest = useMutation({
    mutationFn: async () => {
      const correctAnswers = questions.filter((q, idx) => {
        return answers[idx] === q.correct_answer;
      }).length;

      const score = (correctAnswers / questions.length) * 100;

      const { error: sessionError } = await supabase
        .from('test_sessions')
        .update({
          status: 'completed',
          score: score,
          correct_answers: correctAnswers,
          total_questions: questions.length,
          time_spent_seconds: timeElapsed,
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      const answerRecords = questions.map((q, idx) => ({
        session_id: sessionId,
        question_id: q.id,
        user_answer: answers[idx] || null,
        is_correct: answers[idx] === q.correct_answer,
        time_spent_seconds: Math.floor(timeElapsed / questions.length)
      }));

      const { error: answersError } = await supabase
        .from('test_answers')
        .insert(answerRecords);

      if (answersError) throw answersError;

      return { score, correctAnswers };
    },
    onSuccess: ({ score }) => {
      toast.success(`Test dokončen! Skóre: ${score.toFixed(1)}%`);
      navigate(`${createPageUrl('TestResultsV2')}?id=${sessionId}`);
    },
    onError: (error) => {
      console.error('Error submitting test:', error);
      toast.error('Chyba při odesílání testu');
    }
  });

  if (sessionLoading || questionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session || !questions.length) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-2">Test nenalezen</h2>
            <Button onClick={() => navigate(createPageUrl('TestGeneratorV2'))}>
              Vytvořit nový test
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Otázka {currentQuestionIndex + 1} z {questions.length}
            </span>
            <span className="text-[hsl(var(--mn-muted))]">
              Zodpovězeno: {answeredCount}/{questions.length}
            </span>
          </div>
          <Progress value={progress} />
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="outline" className="gap-2">
            <Clock className="w-4 h-4" />
            Čas: {formatTime(timeElapsed)}
          </Badge>

          <Button 
            onClick={() => setShowConfirmSubmit(true)}
            variant="default"
          >
            Odevzdat test
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {currentQuestion.question_text}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[currentQuestionIndex] || ''}
                onValueChange={(value) => setAnswers(prev => ({
                  ...prev,
                  [currentQuestionIndex]: value
                }))}
              >
                <div className="space-y-3">
                  {currentQuestion.options?.map((option, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        answers[currentQuestionIndex] === option
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                          : 'border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                      onClick={() => setAnswers(prev => ({
                        ...prev,
                        [currentQuestionIndex]: option
                      }))}
                    >
                      <RadioGroupItem value={option} id={`option-${idx}`} />
                      <Label 
                        htmlFor={`option-${idx}`}
                        className="flex-1 cursor-pointer"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Předchozí
            </Button>

            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Další
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Přehled otázek</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`
                      w-10 h-10 rounded flex items-center justify-center text-sm font-medium
                      transition-colors
                      ${idx === currentQuestionIndex
                        ? 'bg-purple-600 text-white'
                        : answers[idx]
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }
                      hover:opacity-80
                    `}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Odevzdat test?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Zodpovězených otázek: <strong>{answeredCount}/{questions.length}</strong>
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmSubmit(false)}
                  className="flex-1"
                >
                  Pokračovat
                </Button>
                <Button
                  onClick={() => submitTest.mutate()}
                  disabled={submitTest.isPending}
                  className="flex-1"
                >
                  {submitTest.isPending ? 'Odesílám...' : 'Odevzdat'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
