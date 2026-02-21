import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Brain } from 'lucide-react';

const LEVELS = [
  { label: 'Nové', min: 0, max: 20, color: 'hsl(var(--mn-muted))', bg: 'bg-[hsl(var(--mn-muted)/0.4)]' },
  { label: 'Začátečník', min: 20, max: 50, color: 'hsl(var(--mn-warn))', bg: '' },
  { label: 'Pokročilý', min: 50, max: 80, color: 'hsl(var(--mn-accent))', bg: '' },
  { label: 'Zvládnuto', min: 80, max: 101, color: 'hsl(var(--mn-success))', bg: '' },
];

export default function MasteryOverview() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['masteryOverview', user?.id],
    queryFn: async () => {
      const { data: mastery } = await supabase.from('user_topic_mastery').select('mastery_score').eq('user_id', user.id);
      const { count: totalTopics } = await supabase.from('topics').select('id', { count: 'exact', head: true });
      const scores = (mastery || []).map(m => Number(m.mastery_score) || 0);
      const distribution = LEVELS.map(level => ({ ...level, count: scores.filter(s => s >= level.min && s < level.max).length }));
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return { distribution, studied: scores.length, total: totalTopics || 0, avgScore };
    },
    enabled: !!user?.id,
  });

  if (!data) return null;
  const studiedPct = data.total > 0 ? Math.round((data.studied / data.total) * 100) : 0;

  return (
    <div className="mn-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--mn-accent))]" />
          <span className="mn-ui-font text-[13px] font-semibold">Zvládnutí témat</span>
        </div>
        <span className="mn-mono-font text-[10px] text-[hsl(var(--mn-muted))]">
          {data.studied}/{data.total} ({studiedPct}%)
        </span>
      </div>

      {data.studied === 0 ? (
        <p className="mn-ui-font text-xs text-[hsl(var(--mn-muted))] text-center py-3">
          Otevřete první téma a začněte budovat svůj přehled
        </p>
      ) : (
        <>
          <div className="flex h-2.5 rounded-full overflow-hidden mb-4 bg-[hsl(var(--mn-border))]">
            {data.distribution.map(level => {
              const width = data.studied > 0 ? (level.count / data.studied) * 100 : 0;
              if (width === 0) return null;
              return <div key={level.label} style={{ width: `${width}%`, background: level.color }} className="transition-all duration-500" />;
            })}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {data.distribution.map(level => (
              <div key={level.label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: level.color }} />
                  <span className="mn-ui-font text-[11px] text-[hsl(var(--mn-muted))]">{level.label}</span>
                </div>
                <span className="mn-mono-font text-[11px] font-medium" style={{ color: level.color }}>{level.count}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-[hsl(var(--mn-border)/0.3)] flex items-center justify-between">
            <span className="mn-ui-font text-[11px] text-[hsl(var(--mn-muted))]">Průměrné zvládnutí</span>
            <span className="mn-mono-font text-sm font-bold" style={{
              color: data.avgScore >= 80 ? 'hsl(var(--mn-success))' : data.avgScore >= 50 ? 'hsl(var(--mn-accent))' : data.avgScore >= 20 ? 'hsl(var(--mn-warn))' : 'hsl(var(--mn-muted))'
            }}>{data.avgScore.toFixed(0)}%</span>
          </div>
        </>
      )}
    </div>
  );
}
