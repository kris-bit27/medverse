import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, BookOpen } from 'lucide-react';

const LEVELS = [
  { label: 'Nové', min: 0, max: 20, color: 'bg-slate-400', text: 'text-slate-400' },
  { label: 'Začátečník', min: 20, max: 50, color: 'bg-amber-500', text: 'text-amber-500' },
  { label: 'Pokročilý', min: 50, max: 80, color: 'bg-blue-500', text: 'text-blue-500' },
  { label: 'Zvládnuto', min: 80, max: 101, color: 'bg-emerald-500', text: 'text-emerald-500' },
];

export default function MasteryOverview() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['masteryOverview', user?.id],
    queryFn: async () => {
      const { data: mastery } = await supabase
        .from('user_topic_mastery')
        .select('mastery_score')
        .eq('user_id', user.id);

      const { count: totalTopics } = await supabase
        .from('topics')
        .select('id', { count: 'exact', head: true });

      const scores = (mastery || []).map(m => Number(m.mastery_score) || 0);
      const distribution = LEVELS.map(level => ({
        ...level,
        count: scores.filter(s => s >= level.min && s < level.max).length,
      }));

      const avgScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

      return {
        distribution,
        studied: scores.length,
        total: totalTopics || 0,
        avgScore,
      };
    },
    enabled: !!user?.id,
  });

  if (!data) return null;

  const studiedPct = data.total > 0 ? Math.round((data.studied / data.total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-[hsl(var(--mn-accent))]" />
            Zvládnutí témat
          </CardTitle>
          <span className="text-xs text-[hsl(var(--mn-muted))]">
            {data.studied}/{data.total} ({studiedPct}%)
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {data.studied === 0 ? (
          <p className="text-xs text-[hsl(var(--mn-muted))] text-center py-3">
            Otevřete první téma a začněte budovat svůj přehled 🧠
          </p>
        ) : (
          <>
            {/* Distribution bar */}
            <div className="flex h-3 rounded-full overflow-hidden mb-3">
              {data.distribution.map((level) => {
                const width = data.studied > 0 ? (level.count / data.studied) * 100 : 0;
                if (width === 0) return null;
                return (
                  <div
                    key={level.label}
                    className={`${level.color} transition-all duration-500`}
                    style={{ width: `${width}%` }}
                    title={`${level.label}: ${level.count}`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {data.distribution.map((level) => (
                <div key={level.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${level.color}`} />
                    <span className="text-[11px] text-[hsl(var(--mn-muted))]">{level.label}</span>
                  </div>
                  <span className={`text-[11px] font-medium ${level.text}`}>{level.count}</span>
                </div>
              ))}
            </div>

            {/* Average score */}
            <div className="mt-3 pt-3 border-t border-[hsl(var(--mn-border)/0.3)] flex items-center justify-between">
              <span className="text-[11px] text-[hsl(var(--mn-muted))]">Průměrné zvládnutí</span>
              <span className={`text-sm font-bold ${
                data.avgScore >= 80 ? 'text-emerald-500' :
                data.avgScore >= 50 ? 'text-blue-500' :
                data.avgScore >= 20 ? 'text-amber-500' : 'text-slate-400'
              }`}>
                {data.avgScore.toFixed(0)}%
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
