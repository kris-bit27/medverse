import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight,
  Play,
  FileText,
  Target,
  CheckCircle2
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import DifficultyIndicator from '@/components/ui/DifficultyIndicator';
import StatusBadge from '@/components/ui/StatusBadge';
import { motion } from 'framer-motion';

export default function OkruhDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const okruhId = urlParams.get('id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; }
  });

  const { data: okruh, isLoading } = useQuery({
    queryKey: ['okruh', okruhId],
    queryFn: async () => {
      const okruhy = await supabase.from('okruhy').select('*').eq('id', okruhId ).then(r => r.data || []);
      return okruhy[0];
    },
    enabled: !!okruhId
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', okruhId],
    queryFn: () => supabase.from('topics').select('*').eq('okruh_id', okruhId).order('title').then(r => r.data || []),
    enabled: !!okruhId
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions', okruhId],
    queryFn: () => supabase.from('questions').select('*').eq('okruh_id', okruhId).then(r => r.data || []),
    enabled: !!okruhId
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: () => supabase.from('user_flashcard_progress').select('*').eq('user_id', user.id).then(r => r.data || []),
    enabled: !!user?.id
  });

  // Stats per topic
  const topicStats = topics.map(topic => {
    const topicQuestions = questions.filter(q => q.topic_id === topic.id);
    const topicProgress = progress.filter(p => 
      topicQuestions.some(q => q.id === p.question_id)
    );
    const mastered = topicProgress.filter(p => p.status === 'mastered').length;
    const percentage = topicQuestions.length > 0 
      ? Math.round((mastered / topicQuestions.length) * 100) 
      : 0;

    return {
      ...topic,
      questionsCount: topicQuestions.length,
      mastered,
      percentage
    };
  });

  // Overall stats
  const overallMastered = progress.filter(p => 
    questions.some(q => q.id === p.question_id) && p.status === 'mastered'
  ).length;
  const overallPercentage = questions.length > 0 
    ? Math.round((overallMastered / questions.length) * 100) 
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!okruh) {
    return (
      <div className="p-6 text-center">
        <p className="text-[hsl(var(--mn-muted))]">Okruh nenalezen</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[hsl(var(--mn-muted))] mb-6">
        <Link to={createPageUrl('Studium')} className="hover:text-teal-600 transition-colors flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          Studium
        </Link>
        <span>/</span>
        <span className="text-[hsl(var(--mn-text))] font-medium">{okruh.title}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[hsl(var(--mn-text))] mb-2">
            {okruh.title}
          </h1>
          {okruh.description && (
            <p className="text-[hsl(var(--mn-muted))] max-w-2xl">
              {okruh.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-4">
            <Badge variant="secondary" className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {topics.length} témat
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              {questions.length} otázek
            </Badge>
          </div>
        </div>

        <Button asChild className="bg-teal-600 hover:bg-teal-700 flex-shrink-0">
          <Link to={createPageUrl('TestGenerator') + `?okruh=${okruhId}`}>
            <Play className="w-4 h-4 mr-2" />
            Spustit test
          </Link>
        </Button>
      </div>

      {/* Overall progress */}
      <Card className="mb-8 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[hsl(var(--mn-text))]">Celkový pokrok</h3>
          <span className="text-2xl font-bold text-teal-600">{overallPercentage}%</span>
        </div>
        <Progress value={overallPercentage} className="h-3" />
        <p className="text-sm text-[hsl(var(--mn-muted))] mt-2">
          {overallMastered} z {questions.length} otázek zvládnuto
        </p>
      </Card>

      {/* Topics list */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[hsl(var(--mn-text))]">
          Témata
        </h2>

        {topicStats.map((topic, index) => (
          <motion.div
            key={topic.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02, x: 5 }}
          >
            <Link to={createPageUrl('TopicDetail') + `?id=${topic.id}`}>
              <Card className="hover:shadow-xl hover:border-teal-300 dark:hover:border-teal-700 transition-all duration-300 cursor-pointer group">
                <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-4">
                  {/* Progress indicator */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform border-2 border-teal-200 dark:border-teal-800">
                    <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{topic.percentage}%</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[hsl(var(--mn-text))] mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {topic.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs sm:text-sm text-[hsl(var(--mn-muted))] mb-2">
                      <span className="flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        {topic.questionsCount} otázek
                      </span>
                      <span className="text-[hsl(var(--mn-muted))] dark:text-slate-600">•</span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        {topic.mastered} zvládnuto
                      </span>
                    </div>
                    <Progress value={topic.percentage} className="h-2 group-hover:h-2.5 transition-all" />
                  </div>

                  {/* Tags */}
                  {topic.tags && topic.tags.length > 0 && (
                    <div className="hidden sm:flex gap-1.5 flex-shrink-0">
                      {topic.tags.slice(0, 2).map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs group-hover:border-teal-300 dark:group-hover:border-teal-700 transition-colors">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            </Link>
          </motion.div>
        ))}

        {topicStats.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-[hsl(var(--mn-muted))]">Zatím žádná témata</p>
          </Card>
        )}
      </div>

      {/* Questions list preview */}
      {questions.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[hsl(var(--mn-text))]">
              Otázky ({questions.length})
            </h2>
          </div>

          <div className="space-y-2">
            {questions.slice(0, 10).map((question) => {
              const questionProgress = progress.find(p => p.question_id === question.id);
              return (
                <Link
                  key={question.id}
                  to={createPageUrl('QuestionDetail') + `?id=${question.id}`}
                  className="flex items-center gap-4 p-4 bg-[hsl(var(--mn-surface))] rounded-lg border border-[hsl(var(--mn-border))] hover:border-teal-300 dark:hover:border-teal-700 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[hsl(var(--mn-text))] group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate">
                      {question.title}
                    </p>
                    <DifficultyIndicator level={question.difficulty || 1} />
                  </div>
                  <StatusBadge status={questionProgress?.status || 'new'} size="sm" />
                  <ChevronRight className="w-4 h-4 text-[hsl(var(--mn-muted))] group-hover:text-teal-600 transition-colors" />
                </Link>
              );
            })}
            
            {questions.length > 10 && (
              <p className="text-center text-sm text-[hsl(var(--mn-muted))] py-4">
                ...a dalších {questions.length - 10} otázek
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
