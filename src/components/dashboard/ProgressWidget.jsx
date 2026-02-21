import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import ProgressRing from '@/components/ui/ProgressRing';

export default function ProgressWidget({ 
  title,
  okruhy = [],
  progressByOkruh = {},
  totalQuestions = 0,
  masteredQuestions = 0
}) {
  const overallProgress = totalQuestions > 0 
    ? Math.round((masteredQuestions / totalQuestions) * 100) 
    : 0;

  return (
    <div className="mn-card">
      <div className="p-5 pb-4">
        <h3 className="mn-ui-font font-semibold text-lg">{title}</h3>
      </div>
      <div className="px-5 pb-5 space-y-6">
        {/* Overall progress ring */}
        <div className="flex items-center justify-center">
          <ProgressRing progress={overallProgress} size={140} strokeWidth={10}>
            <div className="text-center">
              <span className="text-3xl font-bold text-[hsl(var(--mn-text))]">
                {overallProgress}%
              </span>
              <p className="text-xs text-[hsl(var(--mn-muted))]">
                celkově
              </p>
            </div>
          </ProgressRing>
        </div>

        {/* Progress by okruh */}
        <div className="space-y-4">
          {okruhy.slice(0, 5).map((okruh) => {
            const progress = progressByOkruh[okruh.id] || { total: 0, mastered: 0 };
            const percentage = progress.total > 0 
              ? Math.round((progress.mastered / progress.total) * 100) 
              : 0;
            
            return (
              <div key={okruh.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-[hsl(var(--mn-muted))] truncate pr-2">
                    {okruh.title}
                  </span>
                  <span className="text-[hsl(var(--mn-muted))] flex-shrink-0">
                    {progress.mastered}/{progress.total}
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}