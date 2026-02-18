import React from 'react';
import { cn } from '@/lib/utils';

export default function DifficultyIndicator({ level = 1, showLabel = true }) {
  const labels = ['', 'Základní', 'Lehká', 'Střední', 'Těžká', 'Expert'];
  const colors = [
    '',
    'bg-[hsl(var(--mn-success))]',
    'bg-[hsl(var(--mn-accent))]', 
    'bg-[hsl(var(--mn-warn))]',
    'bg-[hsl(var(--mn-warn))]',
    'bg-[hsl(var(--mn-danger))]'
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-4 rounded-full transition-colors",
              i <= level ? colors[level] : 'bg-[hsl(var(--mn-border))] dark:bg-[hsl(var(--mn-elevated))]'
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs text-[hsl(var(--mn-muted))]">
          {labels[level]}
        </span>
      )}
    </div>
  );
}