import React from 'react';
import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] dark:bg-[hsl(var(--mn-surface-2))] dark:text-[hsl(var(--mn-muted))]',
  primary: 'bg-[hsl(var(--mn-accent-2)/0.12)] text-[hsl(var(--mn-accent-2))]',
  success: 'bg-[hsl(var(--mn-success)/0.12)] text-[hsl(var(--mn-success))]',
  warning: 'bg-[hsl(var(--mn-warn)/0.12)] text-[hsl(var(--mn-warn))]',
  danger: 'bg-[hsl(var(--mn-danger)/0.12)] text-[hsl(var(--mn-danger))]',
  premium: 'bg-[hsl(var(--mn-warn)/0.12)] text-[hsl(var(--mn-warn))]',
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