import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronRight, 
  GraduationCap, 
  FileText,
  Target,
  Play
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { motion } from 'framer-motion';

const okruhIcons = {
  'chirurgie-ruky': '✋',
  'rekonstrukce-prsu': '💗',
  'mikrochirurgie': '🔬'
};

export default function Atestace() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: okruhy = [], isLoading } = useQuery({
    queryKey: ['okruhy'],
    queryFn: () => base44.entities.Okruh.list('order')
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list()
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list()
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: () => base44.entities.UserProgress.filter({ user_id: user.id }),
    enabled: !!user?.id
  });

  // Calculate stats per okruh
  const okruhStats = okruhy.map(okruh => {
    const okruhTopics = topics.filter(t => t.okruh_id === okruh.id);
    const okruhQuestions = questions.filter(q => q.okruh_id === okruh.id);
    const okruhProgress = progress.filter(p => 
      okruhQuestions.some(q => q.id === p.question_id)
    );
    const mastered = okruhProgress.filter(p => p.status === 'mastered').length;
    const percentage = okruhQuestions.length > 0 
      ? Math.round((mastered / okruhQuestions.length) * 100) 
      : 0;

    return {
      ...okruh,
      topicsCount: okruhTopics.length,
      questionsCount: okruhQuestions.length,
      mastered,
      percentage
    };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Načítání okruhů..." />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Příprava na atestaci
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Vyberte okruh a začněte se učit
          </p>
        </div>
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link to={createPageUrl('TestGenerator')}>
            <Play className="w-4 h-4 mr-2" />
            Nový test
          </Link>
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{okruhy.length}</p>
              <p className="text-xs text-slate-500">Okruhů</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{topics.length}</p>
              <p className="text-xs text-slate-500">Témat</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{questions.length}</p>
              <p className="text-xs text-slate-500">Otázek</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Okruhy list */}
      <div className="space-y-4">
        {okruhStats.map((okruh, index) => (
          <motion.div
            key={okruh.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={createPageUrl('OkruhDetail') + `?id=${okruh.id}`}>
              <Card className="hover:shadow-lg transition-all duration-300 hover:border-teal-200 dark:hover:border-teal-800 group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 flex items-center justify-center text-3xl flex-shrink-0">
                      {okruh.icon || okruhIcons[okruh.id] || '📚'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                            {okruh.title}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {okruh.topicsCount} témat · {okruh.questionsCount} otázek
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                      </div>

                      {/* Progress */}
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-600 dark:text-slate-400">
                            Pokrok
                          </span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {okruh.mastered}/{okruh.questionsCount} ({okruh.percentage}%)
                          </span>
                        </div>
                        <Progress value={okruh.percentage} className="h-2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}

        {okruhStats.length === 0 && (
          <Card className="p-12 text-center">
            <GraduationCap className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Zatím žádné okruhy
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Obsah se připravuje
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}