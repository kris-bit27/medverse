import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, RefreshCw } from 'lucide-react';

const statusConfig = {
  new: {
    label: 'Nová',
    icon: Circle,
    className: 'bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] dark:bg-slate-800 dark:text-[hsl(var(--mn-muted))]'
  },
  learning: {
    label: 'Učím se',
    icon: RefreshCw,
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  },
  mastered: {
    label: 'Umím',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  }
};

export default function StatusBadge({ status = 'new', size = 'sm' }) {
  const config = statusConfig[status] || statusConfig.new;
  const Icon = config.icon;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-medium",
      size === 'sm' && 'px-2.5 py-1 text-xs',
      size === 'md' && 'px-3 py-1.5 text-sm',
      config.className
    )}>
      <Icon className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
      {config.label}
    </span>
  );
}