import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import DifficultyIndicator from '@/components/ui/DifficultyIndicator';
import { ChevronRight, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function RecentActivity({ 
  recentProgress = [],
  questions = []
}) {
  // Join progress with questions
  const recentItems = recentProgress
    .filter(p => p.last_reviewed_at)
    .sort((a, b) => new Date(b.last_reviewed_at) - new Date(a.last_reviewed_at))
    .slice(0, 5)
    .map(p => {
      const question = questions.find(q => q.id === p.question_id);
      return { ...p, question };
    })
    .filter(item => item.question);

  if (recentItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nedávná aktivita</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Zatím žádná aktivita</p>
            <Button asChild className="mt-4" variant="outline">
              <Link to={createPageUrl('Studium')}>
                Začít se učit
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">Nedávná aktivita</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to={createPageUrl('ReviewQueue')}>
            Zobrazit vše
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentItems.map((item) => (
            <Link
              key={item.id}
              to={createPageUrl('QuestionDetail') + `?id=${item.question_id}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex-1 min-w-0 pr-4">
                <p className="font-medium text-slate-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {item.question?.title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <DifficultyIndicator level={item.question?.difficulty || 1} showLabel={false} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {format(new Date(item.last_reviewed_at), 'd. MMM', { locale: cs })}
                  </span>
                </div>
              </div>
              <StatusBadge status={item.status} size="sm" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}