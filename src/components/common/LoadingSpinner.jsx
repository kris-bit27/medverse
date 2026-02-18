import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 'md', className, text }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Loader2 className={cn(
        "animate-spin text-[hsl(var(--mn-accent))]",
        size === 'sm' && 'w-5 h-5',
        size === 'md' && 'w-8 h-8',
        size === 'lg' && 'w-12 h-12'
      )} />
      {text && (
        <p className="text-sm text-[hsl(var(--mn-muted))]">{text}</p>
      )}
    </div>
  );
}