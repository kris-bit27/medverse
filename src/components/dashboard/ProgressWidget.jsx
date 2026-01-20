import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall progress ring */}
        <div className="flex items-center justify-center">
          <ProgressRing progress={overallProgress} size={140} strokeWidth={10}>
            <div className="text-center">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {overallProgress}%
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
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
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-2">
                    {okruh.title}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">
                    {progress.mastered}/{progress.total}
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}