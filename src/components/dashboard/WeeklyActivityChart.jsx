import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { BarChart3, Clock } from 'lucide-react';

const DAYS_CS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

export default function WeeklyActivityChart() {
  const { user } = useAuth();

  const { data: weekData } = useQuery({
    queryKey: ['weeklyActivity', user?.id],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 6); since.setHours(0, 0, 0, 0);
      const { data: sessions } = await supabase.from('study_sessions')
        .select('duration_seconds, created_at').eq('user_id', user.id).gte('created_at', since.toISOString());
      const { data: events } = await supabase.from('analytics_events')
        .select('event_type, created_at').eq('user_id', user.id).gte('created_at', since.toISOString());
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayMinutes = Math.round((sessions || []).filter(s => s.created_at?.startsWith(dateStr)).reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60);
        const dayEvents = (events || []).filter(e => e.created_at?.startsWith(dateStr)).length;
        days.push({ date: dateStr, day: DAYS_CS[d.getDay()], minutes: dayMinutes, events: dayEvents, isToday: i === 0 });
      }
      return { days, totalMinutes: days.reduce((s, d) => s + d.minutes, 0), activeDays: days.filter(d => d.minutes > 0 || d.events > 0).length };
    },
    enabled: !!user?.id,
  });

  const days = weekData?.days || [];
  const maxMinutes = Math.max(...days.map(d => d.minutes), 1);

  return (
    <div className="p-6 rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))]" style={{ boxShadow: "var(--mn-shadow-1)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--mn-accent))]" />
          <span className="mn-ui-font text-[13px] font-semibold">Týdenní aktivita</span>
        </div>
        <div className="flex items-center gap-3 mn-mono-font text-[10px] text-[hsl(var(--mn-muted))]">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {weekData?.totalMinutes || 0} min</span>
          <span>{weekData?.activeDays || 0}/7 dní</span>
        </div>
      </div>

      <div className="flex items-end gap-1.5 h-24">
        {days.map(d => {
          const height = maxMinutes > 0 ? Math.max((d.minutes / maxMinutes) * 100, d.minutes > 0 ? 8 : 0) : 0;
          const hasActivity = d.minutes > 0 || d.events > 0;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
                <div
                  className="w-full max-w-[32px] rounded-t transition-all duration-500"
                  style={{
                    height: `${height}%`, minHeight: hasActivity ? 4 : 2,
                    background: d.isToday ? 'hsl(var(--mn-accent))' : hasActivity ? 'hsl(var(--mn-accent) / 0.3)' : 'hsl(var(--mn-border))',
                    borderRadius: '4px 4px 0 0',
                  }}
                  title={`${d.minutes} min`}
                />
              </div>
              <span className={`mn-ui-font text-[10px] ${d.isToday ? 'font-bold text-[hsl(var(--mn-accent))]' : 'text-[hsl(var(--mn-muted))]'}`}>
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
