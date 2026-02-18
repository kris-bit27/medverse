import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, RefreshCw } from 'lucide-react';

const statusConfig = {
  new: {
    label: 'Nová',
    icon: Circle,
    className: 'bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] dark:bg-[hsl(var(--mn-surface-2))] dark:text-[hsl(var(--mn-muted))]'
  },
  learning: {
    label: 'Učím se',
    icon: RefreshCw,
    className: 'bg-[hsl(var(--mn-warn)/0.12)] text-[hsl(var(--mn-warn))]'
  },
  mastered: {
    label: 'Umím',
    icon: CheckCircle2,
    className: 'bg-[hsl(var(--mn-success)/0.12)] text-[hsl(var(--mn-success))]'
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