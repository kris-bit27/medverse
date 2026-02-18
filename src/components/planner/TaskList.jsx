import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Calendar, 
  HelpCircle, 
  BookOpen, 
  Wrench, 
  Package,
  AlertCircle 
} from 'lucide-react';
import { format, isPast, isToday, isTomorrow, startOfDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const taskTypeIcons = {
  question_review: HelpCircle,
  article_reading: BookOpen,
  tool_practice: Wrench,
  package_study: Package,
  custom: Clock
};

const taskTypeLabels = {
  question_review: 'Opakování otázek',
  article_reading: 'Čtení článku',
  tool_practice: 'Procvičení nástroje',
  package_study: 'Studium balíčku',
  custom: 'Vlastní úkol'
};

const priorityColors = {
  low: 'bg-[hsl(var(--mn-accent-2)/0.12)] text-[hsl(var(--mn-accent-2))]',
  medium: 'bg-[hsl(var(--mn-warn)/0.12)] text-[hsl(var(--mn-warn))]',
  high: 'bg-[hsl(var(--mn-danger)/0.12)] text-[hsl(var(--mn-danger))]'
};

export default function TaskList({ tasks, onComplete, showCompleted = false, showOverdue = false }) {
  const getDateLabel = (date) => {
    const taskDate = new Date(date);
    if (isToday(taskDate)) return 'Dnes';
    if (isTomorrow(taskDate)) return 'Zítra';
    return format(taskDate, 'd. MMMM', { locale: cs });
  };

  const isOverdue = (date) => {
    return isPast(startOfDay(new Date(date))) && !isToday(new Date(date));
  };

  return (
    <div className="space-y-3">
      {tasks.map(task => {
        const Icon = taskTypeIcons[task.task_type] || Clock;
        const overdue = showOverdue || isOverdue(task.scheduled_date);

        return (
          <Card 
            key={task.id}
            className={cn(
              "transition-all",
              task.is_completed && "opacity-60",
              overdue && !task.is_completed && "border-[hsl(var(--mn-danger)/0.3)]"
            )}
          >
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={task.is_completed}
                  onCheckedChange={(checked) => onComplete(task.id, checked)}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className={cn(
                      "font-medium text-[hsl(var(--mn-text))]",
                      task.is_completed && "line-through text-[hsl(var(--mn-muted))]"
                    )}>
                      {task.title}
                    </h4>
                    <Icon className="w-4 h-4 text-[hsl(var(--mn-muted))] flex-shrink-0" />
                  </div>

                  {task.description && (
                    <p className="text-sm text-[hsl(var(--mn-muted))] mb-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {getDateLabel(task.scheduled_date)}
                    </Badge>

                    {task.scheduled_time && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.scheduled_time}
                      </Badge>
                    )}

                    {task.estimated_minutes && (
                      <Badge variant="outline">
                        ~{task.estimated_minutes} min
                      </Badge>
                    )}

                    <Badge variant="secondary" className="text-xs">
                      {taskTypeLabels[task.task_type]}
                    </Badge>

                    {task.priority && task.priority !== 'medium' && (
                      <Badge className={cn("text-xs", priorityColors[task.priority])}>
                        {task.priority === 'high' ? 'Vysoká' : 'Nízká'} priorita
                      </Badge>
                    )}

                    {overdue && !task.is_completed && (
                      <Badge className="bg-[hsl(var(--mn-danger)/0.12)] text-[hsl(var(--mn-danger))] flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Po termínu
                      </Badge>
                    )}
                  </div>

                  {task.notes && (
                    <p className="text-xs text-[hsl(var(--mn-muted))] mt-2 italic">
                      {task.notes}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}