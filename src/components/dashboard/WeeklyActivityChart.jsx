import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Clock } from 'lucide-react';

const DAYS_CS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

export default function WeeklyActivityChart() {
  const { user } = useAuth();

  const { data: weekData } = useQuery({
    queryKey: ['weeklyActivity', user?.id],
    queryFn: async () => {
      // Get last 7 days of study sessions
      const since = new Date();
      since.setDate(since.getDate() - 6);
      since.setHours(0, 0, 0, 0);

      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('duration_seconds, created_at')
        .eq('user_id', user.id)
        .gte('created_at', since.toISOString());

      // Get analytics events for the week
      const { data: events } = await supabase
        .from('analytics_events')
        .select('event_type, created_at')
        .eq('user_id', user.id)
        .gte('created_at', since.toISOString());

      // Build 7-day array
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = DAYS_CS[d.getDay()];
        const isToday = i === 0;

        const dayMinutes = Math.round(
          (sessions || [])
            .filter(s => s.created_at?.startsWith(dateStr))
            .reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60
        );

        const dayEvents = (events || []).filter(e => e.created_at?.startsWith(dateStr)).length;

        days.push({ date: dateStr, day: dayName, minutes: dayMinutes, events: dayEvents, isToday });
      }

      const totalMinutes = days.reduce((s, d) => s + d.minutes, 0);
      const activeDays = days.filter(d => d.minutes > 0 || d.events > 0).length;

      return { days, totalMinutes, activeDays };
    },
    enabled: !!user?.id,
  });

  const days = weekData?.days || [];
  const maxMinutes = Math.max(...days.map(d => d.minutes), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[hsl(var(--mn-accent))]" />
            Týdenní aktivita
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-[hsl(var(--mn-muted))]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {weekData?.totalMinutes || 0} min
            </span>
            <span>{weekData?.activeDays || 0}/7 dní</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1.5 h-24">
          {days.map((d, i) => {
            const height = maxMinutes > 0 ? Math.max((d.minutes / maxMinutes) * 100, d.minutes > 0 ? 8 : 0) : 0;
            const hasActivity = d.minutes > 0 || d.events > 0;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                  <div
                    className={`w-full max-w-[32px] rounded-t-md transition-all duration-500 ${
                      d.isToday
                        ? 'bg-[hsl(var(--mn-accent))]'
                        : hasActivity
                        ? 'bg-[hsl(var(--mn-accent)/0.4)]'
                        : 'bg-[hsl(var(--mn-surface-2))]'
                    }`}
                    style={{ height: `${height}%`, minHeight: hasActivity ? '4px' : '2px' }}
                    title={`${d.minutes} min`}
                  />
                </div>
                <span className={`text-[10px] ${d.isToday ? 'font-bold text-[hsl(var(--mn-accent))]' : 'text-[hsl(var(--mn-muted))]'}`}>
                  {d.day}
                </span>
              </div>
            );
          })}
        </div>
        {weekData?.totalMinutes === 0 && (
          <p className="text-xs text-[hsl(var(--mn-muted))] text-center mt-2">
            Začni studovat a uvidíš svůj progres! 📊
          </p>
        )}
      </CardContent>
    </Card>
  );
}
