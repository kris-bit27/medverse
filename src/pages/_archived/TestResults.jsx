import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Home
} from 'lucide-react';

export default function TestResults() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id');

  // Fetch test session
  const { data: session, isLoading } = useQuery({
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

  // Fetch test answers with questions
  const { data: answers = [] } = useQuery({
    queryKey: ['testAnswers', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_answers')
        .select(`
          *,
          questions (
            id,
            question_text,
            correct_answer,
            explanation,
            topic_id,
            topics (
              id,
              title,
              okruhy (
                id,
                name
              )
            )
          )
        `)
        .eq('session_id', sessionId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId
  });

  // Calculate analytics
  const analytics = React.useMemo(() => {
    if (!answers.length) return null;

    const total = answers.length;
    const correct = answers.filter(a => a.is_correct).length;
    const incorrect = total - correct;
    const score = (correct / total) * 100;

    // Weak topics (topics with < 50% success rate)
    const topicStats = {};
    answers.forEach(answer => {
      const topicId = answer.questions?.topic_id;
      if (!topicId) return;

      if (!topicStats[topicId]) {
        topicStats[topicId] = {
          topicTitle: answer.questions?.topics?.title,
          okruhName: answer.questions?.topics?.okruhy?.name,
          total: 0,
          correct: 0
        };
      }

      topicStats[topicId].total++;
      if (answer.is_correct) topicStats[topicId].correct++;
    });

    const weakTopics = Object.entries(topicStats)
      .map(([id, stats]) => ({
        id,
        ...stats,
        successRate: (stats.correct / stats.total) * 100
      }))
      .filter(t => t.successRate < 50)
      .sort((a, b) => a.successRate - b.successRate);

    const strongTopics = Object.entries(topicStats)
      .map(([id, stats]) => ({
        id,
        ...stats,
        successRate: (stats.correct / stats.total) * 100
      }))
      .filter(t => t.successRate >= 80)
      .sort((a, b) => b.successRate - a.successRate);

    return {
      total,
      correct,
      incorrect,
      score,
      weakTopics,
      strongTopics
    };
  }, [answers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session || !analytics) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-[hsl(var(--mn-muted))]">Výsledky nenalezeny</p>
            <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="mt-4">
              Zpět na Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score) => {
    if (score >= 90) return { label: 'Výborně!', variant: 'default', icon: Trophy };
    if (score >= 80) return { label: 'Velmi dobře', variant: 'default', icon: TrendingUp };
    if (score >= 70) return { label: 'Dobře', variant: 'secondary', icon: CheckCircle };
    if (score >= 60) return { label: 'Dostatečně', variant: 'secondary', icon: Target };
    return { label: 'Potřebujete procvičit', variant: 'destructive', icon: AlertTriangle };
  };

  const scoreBadge = getScoreBadge(analytics.score);
  const ScoreIcon = scoreBadge.icon;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Výsledky testu</h1>
        <p className="text-[hsl(var(--mn-muted))]">
          Test dokončen {new Date(session.completed_at).toLocaleString('cs-CZ')}
        </p>
      </div>

      {/* Score Card */}
      <Card className="border-2">
        <CardContent className="p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="text-center">
              <div className={`text-6xl font-bold mb-2 ${getScoreColor(analytics.score)}`}>
                {analytics.score.toFixed(1)}%
              </div>
              <Badge variant={scoreBadge.variant} className="text-lg px-4 py-2">
                <ScoreIcon className="w-5 h-5 mr-2" />
                {scoreBadge.label}
              </Badge>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{analytics.correct}</div>
              <div className="text-sm text-[hsl(var(--mn-muted))]">Správně</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{analytics.incorrect}</div>
              <div className="text-sm text-[hsl(var(--mn-muted))]">Chybně</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{analytics.total}</div>
              <div className="text-sm text-[hsl(var(--mn-muted))]">Celkem</div>
            </div>
          </div>

          <Progress value={analytics.score} className="h-4" />

          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--mn-muted))]">
              <Clock className="w-4 h-4" />
              <span>
                Čas: {Math.floor(session.time_spent_seconds / 60)}:
                {(session.time_spent_seconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Weak Topics */}
        {analytics.weakTopics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <TrendingDown className="w-5 h-5" />
                Slabé stránky
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.weakTopics.map((topic) => (
                  <div key={topic.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{topic.topicTitle}</p>
                        <p className="text-xs text-[hsl(var(--mn-muted))]">{topic.okruhName}</p>
                      </div>
                      <Badge variant="destructive">
                        {topic.successRate.toFixed(0)}%
                      </Badge>
                    </div>
                    <Progress value={topic.successRate} className="h-2" />
                    <p className="text-xs text-[hsl(var(--mn-muted))]">
                      {topic.correct}/{topic.total} správně
                    </p>
                  </div>
                ))}
              </div>

              <Button className="w-full mt-4" variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Procvičit slabé stránky
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Strong Topics */}
        {analytics.strongTopics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <TrendingUp className="w-5 h-5" />
                Silné stránky
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.strongTopics.slice(0, 5).map((topic) => (
                  <div key={topic.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{topic.topicTitle}</p>
                        <p className="text-xs text-[hsl(var(--mn-muted))]">{topic.okruhName}</p>
                      </div>
                      <Badge variant="default" className="bg-green-600">
                        {topic.successRate.toFixed(0)}%
                      </Badge>
                    </div>
                    <Progress value={topic.successRate} className="h-2" />
                    <p className="text-xs text-[hsl(var(--mn-muted))]">
                      {topic.correct}/{topic.total} správně
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Answers */}
      <Card>
        <CardHeader>
          <CardTitle>Detailní přehled odpovědí</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {answers.map((answer, index) => (
              <div
                key={answer.id}
                className={`p-4 rounded-lg border-2 ${
                  answer.is_correct 
                    ? 'border-green-200 bg-green-50 dark:bg-green-950/20' 
                    : 'border-red-200 bg-red-50 dark:bg-red-950/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  {answer.is_correct ? (
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium">
                        {index + 1}. {answer.questions?.question_text}
                      </p>
                      <Badge variant="outline" className="ml-2">
                        {answer.questions?.topics?.okruhy?.name}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-[hsl(var(--mn-muted))]">Vaše odpověď: </span>
                        <span className={answer.is_correct ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {answer.user_answer || 'Neodpovězeno'}
                        </span>
                      </div>
                      {!answer.is_correct && (
                        <div>
                          <span className="text-[hsl(var(--mn-muted))]">Správná odpověď: </span>
                          <span className="text-green-600 font-medium">
                            {answer.questions?.correct_answer}
                          </span>
                        </div>
                      )}
                    </div>

                    {answer.questions?.explanation && (
                      <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-900 rounded text-sm">
                        <p className="font-medium mb-1">Vysvětlení:</p>
                        <p className="text-[hsl(var(--mn-muted))]">{answer.questions.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={() => navigate(createPageUrl('Dashboard'))}>
          <Home className="w-4 h-4 mr-2" />
          Zpět na Dashboard
        </Button>
        <Button onClick={() => navigate(createPageUrl('TestGeneratorV2'))}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Nový test
        </Button>
      </div>
    </div>
  );
}
