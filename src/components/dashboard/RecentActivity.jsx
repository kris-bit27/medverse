import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
      <div className="rounded-2xl" style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
        <div className="p-5 pb-0">
          <h3 className="mn-ui-font font-semibold text-lg">Nedávná aktivita</h3>
        </div>
        <div className="p-5">
          <div className="text-center py-8 text-[hsl(var(--mn-muted))]">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Zatím žádná aktivita</p>
            <Button asChild className="mt-4" variant="outline">
              <Link to={createPageUrl('Studium')}>
                Začít se učit
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl" style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
      <div className="flex items-center justify-between p-5 pb-4">
        <h3 className="mn-ui-font font-semibold text-lg">Nedávná aktivita</h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to={createPageUrl('ReviewQueue')}>
            Zobrazit vše
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>
      <div className="px-5 pb-5">
        <div className="space-y-3">
          {recentItems.map((item) => (
            <Link
              key={item.id}
              to={createPageUrl('QuestionDetail') + `?id=${item.question_id}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-[hsl(var(--mn-surface-2))]/50 transition-colors group"
            >
              <div className="flex-1 min-w-0 pr-4">
                <p className="font-medium text-[hsl(var(--mn-text))] truncate group-hover:text-[hsl(var(--mn-accent))] dark:group-hover:text-[hsl(var(--mn-accent))] transition-colors">
                  {item.question?.title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <DifficultyIndicator level={item.question?.difficulty || 1} showLabel={false} />
                  <span className="text-xs text-[hsl(var(--mn-muted))]">
                    {format(new Date(item.last_reviewed_at), 'd. MMM', { locale: cs })}
                  </span>
                </div>
              </div>
              <StatusBadge status={item.status} size="sm" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}