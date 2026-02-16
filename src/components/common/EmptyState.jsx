import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
  className
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4 text-center",
      className
    )}>
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--mn-surface-2))] flex items-center justify-center mb-6">
          <Icon className="w-8 h-8 text-[hsl(var(--mn-muted))]" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[hsl(var(--mn-text))] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-[hsl(var(--mn-muted))] max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && onAction && (
        <Button onClick={onAction} className="bg-teal-600 hover:bg-teal-700">
          {action}
        </Button>
      )}
    </div>
  );
}