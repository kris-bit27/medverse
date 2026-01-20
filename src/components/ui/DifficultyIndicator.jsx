import React from 'react';
import { cn } from '@/lib/utils';

export default function DifficultyIndicator({ level = 1, showLabel = true }) {
  const labels = ['', 'Základní', 'Lehká', 'Střední', 'Těžká', 'Expert'];
  const colors = [
    '',
    'bg-emerald-500',
    'bg-teal-500', 
    'bg-amber-500',
    'bg-orange-500',
    'bg-red-500'
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-4 rounded-full transition-colors",
              i <= level ? colors[level] : 'bg-slate-200 dark:bg-slate-700'
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {labels[level]}
        </span>
      )}
    </div>
  );
}