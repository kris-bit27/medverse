import React from 'react';
import { Card } from '@/components/ui/card';
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
    <Card className={cn("p-6 relative overflow-hidden", className)}>
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
              trendUp ? "text-emerald-600" : "text-red-600"
            )}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
        )}
      </div>
    </Card>
  );
}