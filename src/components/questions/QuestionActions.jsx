import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function QuestionActions({ 
  onAction,
  isLoading = false,
  currentStatus
}) {
  const actions = [
    {
      id: 'mastered',
      label: 'Umím',
      description: 'Znám odpověď, další opakování za 30 dní',
      icon: CheckCircle2,
      color: 'bg-[hsl(var(--mn-success))] hover:bg-[hsl(var(--mn-success)/0.85)] text-[hsl(var(--mn-text))]',
      borderColor: 'border-[hsl(var(--mn-success)/0.3)] hover:border-[hsl(var(--mn-success)/0.4)]'
    },
    {
      id: 'learning',
      label: 'Do opakování',
      description: 'Potřebuji zopakovat, další opakování za 2 dny',
      icon: RefreshCw,
      color: 'bg-[hsl(var(--mn-warn))] hover:bg-[hsl(var(--mn-warn)/0.85)] text-[hsl(var(--mn-text))]',
      borderColor: 'border-[hsl(var(--mn-warn)/0.2)] hover:border-[hsl(var(--mn-warn)/0.4)]'
    },
    {
      id: 'failed',
      label: 'Neumím',
      description: 'Neznal/a jsem, další opakování zítra',
      icon: XCircle,
      color: 'bg-[hsl(var(--mn-danger))] hover:bg-[hsl(var(--mn-danger))] text-[hsl(var(--mn-text))]',
      borderColor: 'border-[hsl(var(--mn-danger)/0.3)] hover:border-[hsl(var(--mn-danger)/0.4)]'
    }
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm font-medium text-[hsl(var(--mn-muted))] mb-4 text-center">
          Jak jste si vedli?
        </p>
        <div className="grid grid-cols-3 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            const isActive = currentStatus === action.id || 
              (action.id === 'mastered' && currentStatus === 'mastered') ||
              (action.id === 'learning' && currentStatus === 'learning');

            return (
              <Button
                key={action.id}
                onClick={() => onAction(action.id)}
                disabled={isLoading}
                variant="outline"
                className={cn(
                  "h-auto py-4 flex-col gap-2 transition-all",
                  action.borderColor,
                  isActive && action.color
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Icon className={cn(
                    "w-6 h-6",
                    !isActive && action.id === 'mastered' && 'text-[hsl(var(--mn-success))]',
                    !isActive && action.id === 'learning' && 'text-[hsl(var(--mn-warn))]',
                    !isActive && action.id === 'failed' && 'text-[hsl(var(--mn-danger))]'
                  )} />
                )}
                <span className="text-sm font-medium">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}