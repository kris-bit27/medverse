import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy,
  Target,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Home
} from 'lucide-react';

export default function TestResultsV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id');

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

  const { data: answers = [] } = useQuery({
    queryKey: ['testAnswers', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_answers')
        .select(`
          *,
          questions(*)
        `)
        .eq('session_id', sessionId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[hsl(var(--mn-accent))] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="mn-card p-5">
          <div className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--mn-danger))]" />
            <h2 className="text-2xl font-bold mb-2">Výsledky nenalezeny</h2>
            <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
              Zpět na Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const score = session.score || 0;
  const correctAnswers = session.correct_answers || 0;
  const totalQuestions = session.total_questions || 0;
  const timeSpent = session.time_spent_seconds || 0;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGradeColor = (score) => {
    if (score >= 90) return 'text-[hsl(var(--mn-success))]';
    if (score >= 75) return 'text-[hsl(var(--mn-accent-2))]';
    if (score >= 60) return 'text-[hsl(var(--mn-warn))]';
    return 'text-[hsl(var(--mn-danger))]';
  };

  const getGradeText = (score) => {
    if (score >= 90) return 'Výborně!';
    if (score >= 75) return 'Velmi dobře!';
    if (score >= 60) return 'Dobře';
    return 'Potřebuje zlepšení';
  };

  // Calculate topic performance
  const topicPerformance = {};
  answers.forEach(answer => {
    const topicId = answer.questions?.topic_id;
    if (!topicId) return;

    if (!topicPerformance[topicId]) {
      topicPerformance[topicId] = {
        correct: 0,
        total: 0,
        topicName: answer.questions?.topic_name || 'Unknown'
      };
    }

    topicPerformance[topicId].total++;
    if (answer.is_correct) {
      topicPerformance[topicId].correct++;
    }
  });

  const weakTopics = Object.entries(topicPerformance)
    .map(([id, data]) => ({
      id,
      ...data,
      percentage: (data.correct / data.total) * 100
    }))
    .filter(t => t.percentage < 70)
    .sort((a, b) => a.percentage - b.percentage);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <p className="mn-caption text-xs tracking-widest uppercase text-[hsl(var(--mn-muted))]">VÝSLEDKY TESTU</p>
        <Trophy className={`w-16 h-16 mx-auto ${getGradeColor(score)}`} />
        <h1 className="mn-serif-font text-[28px] sm:text-[32px] font-bold">{getGradeText(score)}</h1>
        <p className="text-[hsl(var(--mn-muted))]">Test dokončen</p>
      </div>

      {/* Score Card */}
      <div className="mn-card p-5">
        <div className="p-8 text-center">
          <div className={`mn-mono-font text-6xl font-bold mb-2 ${getGradeColor(score)}`}>
            {score.toFixed(1)}%
          </div>
          <p className="text-[hsl(var(--mn-muted))] mb-6">
            <span className="mn-mono-font">{correctAnswers}</span> z <span className="mn-mono-font">{totalQuestions}</span> správně
          </p>
          <Progress value={score} className="h-3 mb-4" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="mn-card p-5 hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--mn-muted))]">Správně</p>
                <p className="mn-mono-font text-3xl font-bold text-[hsl(var(--mn-success))]">{correctAnswers}</p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-[hsl(var(--mn-success))]" />
            </div>
        </div>

        <div className="mn-card p-5 hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--mn-muted))]">Špatně</p>
                <p className="mn-mono-font text-3xl font-bold text-[hsl(var(--mn-danger))]">{totalQuestions - correctAnswers}</p>
              </div>
              <XCircle className="w-12 h-12 text-[hsl(var(--mn-danger))]" />
            </div>
        </div>

        <div className="mn-card p-5 hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--mn-muted))]">Čas</p>
                <p className="mn-mono-font text-3xl font-bold">{formatTime(timeSpent)}</p>
              </div>
              <Clock className="w-12 h-12 text-[hsl(var(--mn-muted))]" />
            </div>
        </div>
      </div>

      {/* Weak Topics */}
      {weakTopics.length > 0 && (
        <div className="mn-card p-5">
          <div className="flex items-center gap-2 font-semibold text-lg mb-4">
            <TrendingUp className="w-5 h-5" />
            Témata k zlepšení
          </div>
          <div className="space-y-4">
            {weakTopics.map((topic) => (
              <div key={topic.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{topic.topicName}</span>
                  <Badge variant="outline">
                    <span className="mn-mono-font">{topic.correct}/{topic.total}</span> (<span className="mn-mono-font">{topic.percentage.toFixed(0)}</span>%)
                  </Badge>
                </div>
                <Progress value={topic.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question Review */}
      <div className="mn-card p-5">
        <div className="font-semibold text-lg mb-4">Přehled odpovědí</div>
          <div className="space-y-4">
            {answers.map((answer, idx) => (
              <div
                key={answer.id}
                className={`p-4 rounded-lg border-2 ${
                  answer.is_correct
                    ? 'border-[hsl(var(--mn-success)/0.3)] bg-[hsl(var(--mn-success)/0.06)]'
                    : 'border-[hsl(var(--mn-danger)/0.3)] bg-[hsl(var(--mn-danger)/0.06)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {answer.is_correct ? (
                      <CheckCircle2 className="w-6 h-6 text-[hsl(var(--mn-success))]" />
                    ) : (
                      <XCircle className="w-6 h-6 text-[hsl(var(--mn-danger))]" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-medium mb-2">
                      <span className="mn-mono-font">{idx + 1}</span>. {answer.questions?.question_text}
                    </p>

                    {!answer.is_correct && (
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-[hsl(var(--mn-muted))]">Vaše odpověď:</span>{' '}
                          <span className="text-[hsl(var(--mn-danger))]">{answer.user_answer || 'Nezodpovězeno'}</span>
                        </p>
                        <p>
                          <span className="text-[hsl(var(--mn-muted))]">Správná odpověď:</span>{' '}
                          <span className="text-[hsl(var(--mn-success))]">{answer.questions?.correct_answer}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" onClick={() => navigate(createPageUrl('Dashboard'))}>
          <Home className="w-4 h-4 mr-2" />
          Dashboard
        </Button>

        <Button onClick={() => navigate(createPageUrl('TestGeneratorV2'))}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Nový test
        </Button>
      </div>
    </div>
  );
}
