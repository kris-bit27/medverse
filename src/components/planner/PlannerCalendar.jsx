import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { isToday, isSameDay, format } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function PlannerCalendar({ tasks, selectedDate, onSelectDate }) {
  const getTasksForDate = (date) => {
    return tasks.filter(task => 
      isSameDay(new Date(task.scheduled_date), date)
    );
  };

  const modifiers = {
    hasTasks: (date) => getTasksForDate(date).length > 0,
    hasCompletedTasks: (date) => {
      const dateTasks = getTasksForDate(date);
      return dateTasks.length > 0 && dateTasks.every(t => t.is_completed);
    }
  };

  const modifiersStyles = {
    hasTasks: { 
      fontWeight: 'bold',
      backgroundColor: 'rgba(20, 184, 166, 0.1)',
      color: 'rgb(20, 184, 166)'
    },
    hasCompletedTasks: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      color: 'rgb(16, 185, 129)'
    }
  };

  const selectedDateTasks = getTasksForDate(selectedDate);

  return (
    <div className="planner-calendar space-y-4">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onSelectDate}
        locale={cs}
        modifiers={modifiers}
        modifiersStyles={modifiersStyles}
        className="w-full rounded-lg border"
      />

      {selectedDateTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {isToday(selectedDate) ? 'Dnes' : format(selectedDate, 'd. MMMM', { locale: cs })}
          </p>
          <div className="space-y-2">
            {selectedDateTasks.map(task => (
              <div 
                key={task.id}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-2">
                    {task.title}
                  </p>
                  {task.is_completed && (
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      ✓
                    </Badge>
                  )}
                </div>
                {task.scheduled_time && (
                  <p className="text-xs text-slate-500 mt-1">
                    {task.scheduled_time}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
