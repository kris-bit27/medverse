import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play,
  Calendar,
  Clock,
  ChevronRight
} from 'lucide-react';
import { format, isToday, isTomorrow, addDays, isWithinInterval } from 'date-fns';
import { cs } from 'date-fns/locale';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import DifficultyIndicator from '@/components/ui/DifficultyIndicator';

export default function ReviewQueue() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; }
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => supabase.from('questions').select('*').then(r => r.data || [])
  });

  const { data: progress = [], isLoading } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: () => supabase.from('user_flashcard_progress').select('*').eq('user_id', user.id).then(r => r.data || []),
    enabled: !!user?.id
  });

  // Categorize by due date
  const categorized = useMemo(() => {
    const now = new Date();
    const today = [];
    const tomorrow = [];
    const thisWeek = [];
    const later = [];
    const mastered = [];

    progress.forEach(p => {
      const question = questions.find(q => q.id === p.question_id);
      if (!question) return;
      
      const item = { ...p, question };

      if (p.status === 'mastered') {
        mastered.push(item);
        return;
      }

      if (!p.next_review_at || isToday(new Date(p.next_review_at)) || new Date(p.next_review_at) < now) {
        today.push(item);
      } else if (isTomorrow(new Date(p.next_review_at))) {
        tomorrow.push(item);
      } else if (isWithinInterval(new Date(p.next_review_at), { start: now, end: addDays(now, 7) })) {
        thisWeek.push(item);
      } else {
        later.push(item);
      }
    });

    return { today, tomorrow, thisWeek, later, mastered };
  }, [progress, questions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const QueueItem = ({ item }) => (
    <Link
      to={createPageUrl('QuestionDetail') + `?id=${item.question_id}`}
      className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
          {item.question?.title}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <DifficultyIndicator level={item.question?.difficulty || 1} showLabel={false} />
          {item.next_review_at && (
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(item.next_review_at), 'd. MMM', { locale: cs })}
            </span>
          )}
        </div>
      </div>
      <StatusBadge status={item.status} size="sm" />
      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
    </Link>
  );

  const QueueSection = ({ title, items, icon: Icon }) => (
    <div className="space-y-2">
      {items.length > 0 ? (
        items.map((item) => <QueueItem key={item.id} item={item} />)
      ) : (
        <p className="text-center py-6 text-slate-500 dark:text-slate-400">
          Žádné otázky
        </p>
      )}
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Fronta opakování
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {categorized.today.length} otázek čeká na opakování dnes
          </p>
        </div>
        {categorized.today.length > 0 && (
          <Button asChild className="bg-teal-600 hover:bg-teal-700">
            <Link to={createPageUrl('ReviewToday')}>
              <Play className="w-4 h-4 mr-2" />
              Začít opakování
            </Link>
          </Button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{categorized.today.length}</div>
          <p className="text-sm text-slate-500">Dnes</p>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{categorized.tomorrow.length}</div>
          <p className="text-sm text-slate-500">Zítra</p>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{categorized.thisWeek.length}</div>
          <p className="text-sm text-slate-500">Tento týden</p>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-emerald-600">{categorized.mastered.length}</div>
          <p className="text-sm text-slate-500">Zvládnuto</p>
        </Card>
      </div>

      {/* Queue tabs */}
      <Tabs defaultValue="today">
        <TabsList className="mb-6">
          <TabsTrigger value="today" className="flex items-center gap-2">
            Dnes
            {categorized.today.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">{categorized.today.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tomorrow">Zítra</TabsTrigger>
          <TabsTrigger value="week">Tento týden</TabsTrigger>
          <TabsTrigger value="later">Později</TabsTrigger>
          <TabsTrigger value="mastered">Zvládnuté</TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="p-2">
            <TabsContent value="today" className="m-0">
              <QueueSection items={categorized.today} />
            </TabsContent>
            <TabsContent value="tomorrow" className="m-0">
              <QueueSection items={categorized.tomorrow} />
            </TabsContent>
            <TabsContent value="week" className="m-0">
              <QueueSection items={categorized.thisWeek} />
            </TabsContent>
            <TabsContent value="later" className="m-0">
              <QueueSection items={categorized.later} />
            </TabsContent>
            <TabsContent value="mastered" className="m-0">
              <QueueSection items={categorized.mastered} />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}