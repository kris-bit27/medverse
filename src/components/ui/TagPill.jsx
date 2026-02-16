import React from 'react';
import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] dark:bg-slate-800 dark:text-[hsl(var(--mn-muted))]',
  primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  premium: 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 dark:from-amber-900/30 dark:to-orange-900/30 dark:text-amber-400',
};

export default function TagPill({ 
  children, 
  variant = 'default',
  size = 'sm',
  className 
}) {
  return (
    <span className={cn(
      "inline-flex items-center font-medium rounded-full",
      size === 'xs' && 'px-2 py-0.5 text-xs',
      size === 'sm' && 'px-2.5 py-1 text-xs',
      size === 'md' && 'px-3 py-1.5 text-sm',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}