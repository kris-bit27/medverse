import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowRight, CheckCircle2 } from 'lucide-react';
import ProgressRing from '@/components/ui/ProgressRing';

export default function ReviewQueueWidget({ 
  dueToday = 0,
  completedToday = 0,
  dailyGoal = 15
}) {
  const progress = dailyGoal > 0 ? Math.min(100, Math.round((completedToday / dailyGoal) * 100)) : 0;
  const isComplete = completedToday >= dailyGoal;

  return (
    <div className={`rounded-2xl relative overflow-hidden ${isComplete ? 'bg-gradient-to-br from-[hsl(var(--mn-success)/0.06)] to-[hsl(var(--mn-accent)/0.06)]' : ''}`} style={{ background: isComplete ? undefined : 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
      <div className="p-6">
        <div className="flex items-center gap-6">
          <ProgressRing progress={progress} size={100} strokeWidth={8}>
            {isComplete ? (
              <CheckCircle2 className="w-8 h-8 text-[hsl(var(--mn-success))]" />
            ) : (
              <div className="text-center">
                <span className="text-2xl font-bold text-[hsl(var(--mn-text))]">
                  {completedToday}
                </span>
                <span className="text-sm text-[hsl(var(--mn-muted))]">
                  /{dailyGoal}
                </span>
              </div>
            )}
          </ProgressRing>

          <div className="flex-1">
            <h3 className="font-semibold text-[hsl(var(--mn-text))] mb-1">
              {isComplete ? 'Denní cíl splněn! 🎉' : 'Dnešní opakování'}
            </h3>
            <p className="text-sm text-[hsl(var(--mn-muted))] mb-4">
              {isComplete 
                ? `Dokončili jste ${completedToday} otázek` 
                : `${dueToday} otázek čeká na opakování`
              }
            </p>
            
            {dueToday > 0 && (
              <Button asChild className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)]">
                <Link to={createPageUrl('ReviewToday')}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {isComplete ? 'Pokračovat' : 'Začít opakování'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}