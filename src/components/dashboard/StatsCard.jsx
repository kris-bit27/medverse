import React from 'react';
import { cn } from '@/lib/utils';

export default function StatsCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  trend,
  trendUp,
  className 
}) {
  return (
    <div className={cn("rounded-2xl p-6 relative overflow-hidden", className)} style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[hsl(var(--mn-muted))]">
            {title}
          </p>
          <p className="text-3xl font-bold text-[hsl(var(--mn-text))]">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-[hsl(var(--mn-muted))]">
              {subtitle}
            </p>
          )}
          {trend && (
            <p className={cn(
              "text-sm font-medium",
              trendUp ? "text-[hsl(var(--mn-success))]" : "text-[hsl(var(--mn-danger))]"
            )}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--mn-accent))]/10 to-[hsl(var(--mn-accent-2))]/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-[hsl(var(--mn-accent))] dark:text-[hsl(var(--mn-accent))]" />
          </div>
        )}
      </div>
    </div>
  );
}