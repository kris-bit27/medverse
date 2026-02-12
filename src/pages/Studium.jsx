import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronRight, 
  GraduationCap, 
  FileText,
  Target,
  Play,
  Filter
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { motion } from 'framer-motion';

const okruhIcons = {
  'chirurgie-ruky': '✋',
  'rekonstrukce-prsu': '💗',
  'mikrochirurgie': '🔬'
};

export default function Studium() {
  const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.items)) return value.items;
    return [];
  };

  const [selectedDiscipline, setSelectedDiscipline] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; }
  });

  const { data: disciplinesRaw } = useQuery({
    queryKey: ['clinicalDisciplines'],
    queryFn: () => supabase.from('obory').select('*').order('order_index').then(r => r.data || [])
  });
  const disciplines = useMemo(() => asArray(disciplinesRaw), [disciplinesRaw]);

  const { data: allOkruhyRaw, isLoading } = useQuery({
    queryKey: ['okruhy'],
    queryFn: () => supabase.from('okruhy').select('*').order('order_index').then(r => r.data || [])
  });
  const allOkruhy = useMemo(() => asArray(allOkruhyRaw), [allOkruhyRaw]);

  // Filter okruhy by selected discipline
  const okruhy = useMemo(() => {
    if (selectedDiscipline === 'all') return allOkruhy;
    return allOkruhy.filter(o => o.clinical_discipline_id === selectedDiscipline);
  }, [allOkruhy, selectedDiscipline]);

  const { data: topicsRaw } = useQuery({
    queryKey: ['topics'],
    queryFn: () => supabase.from('topics').select('*').then(r => r.data || [])
  });
  const topics = useMemo(() => asArray(topicsRaw), [topicsRaw]);

  const { data: questionsRaw } = useQuery({
    queryKey: ['questions'],
    queryFn: () => supabase.from('questions').select('*').then(r => r.data || [])
  });
  const questions = useMemo(() => asArray(questionsRaw), [questionsRaw]);

  const { data: progressRaw } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: () => supabase.from('user_flashcard_progress').select('*').eq('user_id', user.id).then(r => r.data || []),
    enabled: !!user?.id
  });
  const progress = useMemo(() => asArray(progressRaw), [progressRaw]);

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
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Studium
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

        {/* Discipline filter */}
        {disciplines.length > 0 && (
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Všechny obory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny obory</SelectItem>
                {disciplines.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: GraduationCap, value: okruhy.length, label: 'Okruhů', color: 'teal', delay: 0 },
          { icon: FileText, value: topics.length, label: 'Témat', color: 'blue', delay: 0.1 },
          { icon: Target, value: questions.length, label: 'Otázek', color: 'amber', delay: 0.2 }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stat.delay }}
          >
            <Card className="p-4 sm:p-5 hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/30 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`w-6 h-6 sm:w-7 sm:h-7 text-${stat.color}-600`} />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
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
              <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 hover:border-teal-300 dark:hover:border-teal-700 group cursor-pointer overflow-hidden">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                    {/* Icon */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 flex items-center justify-center text-3xl sm:text-4xl flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      {okruh.icon || okruhIcons[okruh.id] || '📚'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors mb-1">
                            {okruh.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              {okruh.topicsCount} témat
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="flex items-center gap-1">
                              <Target className="w-3.5 h-3.5" />
                              {okruh.questionsCount} otázek
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-2 transition-all flex-shrink-0 mt-1" />
                      </div>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            Pokrok
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {okruh.mastered}/{okruh.questionsCount} <span className="text-teal-600 dark:text-teal-400">({okruh.percentage}%)</span>
                          </span>
                        </div>
                        <Progress value={okruh.percentage} className="h-2.5 group-hover:h-3 transition-all" />
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
