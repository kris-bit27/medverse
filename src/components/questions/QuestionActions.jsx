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
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      borderColor: 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-300'
    },
    {
      id: 'learning',
      label: 'Do opakování',
      description: 'Potřebuji zopakovat, další opakování za 2 dny',
      icon: RefreshCw,
      color: 'bg-amber-500 hover:bg-amber-600 text-white',
      borderColor: 'border-amber-200 dark:border-amber-800 hover:border-amber-300'
    },
    {
      id: 'failed',
      label: 'Neumím',
      description: 'Neznal/a jsem, další opakování zítra',
      icon: XCircle,
      color: 'bg-red-500 hover:bg-red-600 text-white',
      borderColor: 'border-red-200 dark:border-red-800 hover:border-red-300'
    }
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 text-center">
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
                    !isActive && action.id === 'mastered' && 'text-emerald-600',
                    !isActive && action.id === 'learning' && 'text-amber-500',
                    !isActive && action.id === 'failed' && 'text-red-500'
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