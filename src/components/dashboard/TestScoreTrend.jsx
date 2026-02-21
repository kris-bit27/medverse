import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { TrendingUp, Target, ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function TestScoreTrend() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['testScoreTrend', user?.id],
    queryFn: async () => {
      const { data: tests } = await supabase.from('test_sessions')
        .select('score, correct_answers, total_questions, created_at, status')
        .eq('user_id', user.id).eq('status', 'completed').not('score', 'is', null)
        .order('created_at', { ascending: true }).limit(20);
      if (!tests?.length) return null;
      const avgScore = tests.reduce((s, t) => s + t.score, 0) / tests.length;
      const lastScore = tests[tests.length - 1].score;
      const prevScore = tests.length >= 2 ? tests[tests.length - 2].score : null;
      return { tests, avgScore, lastScore, trend: prevScore !== null ? lastScore - prevScore : 0, count: tests.length };
    },
    enabled: !!user?.id,
  });

  const TrendIcon = data?.trend > 2 ? ArrowUp : data?.trend < -2 ? ArrowDown : Minus;
  const trendColor = data?.trend > 2 ? 'text-[hsl(var(--mn-success))]' : data?.trend < -2 ? 'text-[hsl(var(--mn-danger))]' : 'text-[hsl(var(--mn-muted))]';

  return (
    <div className="mn-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--mn-accent))]" />
          <span className="mn-ui-font text-[13px] font-semibold">Výsledky testů</span>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <span className="mn-mono-font text-[10px] text-[hsl(var(--mn-muted))] flex items-center gap-1">
              <Target className="w-3 h-3" /> {data.count}
            </span>
            <span className={`mn-mono-font text-xs font-medium flex items-center gap-0.5 ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />{Math.abs(data.trend).toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {!data ? (
        <p className="mn-ui-font text-xs text-[hsl(var(--mn-muted))] text-center py-4">
          Dokončete první test a uvidíte svůj trend
        </p>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-4">
            <div>
              <p className="mn-mono-font text-2xl font-bold">{data.lastScore.toFixed(0)}%</p>
              <p className="mn-ui-font text-[10px] text-[hsl(var(--mn-muted))]">Poslední test</p>
            </div>
            <div className="h-8 w-px bg-[hsl(var(--mn-border))]" />
            <div>
              <p className="mn-mono-font text-lg font-semibold text-[hsl(var(--mn-muted))]">{data.avgScore.toFixed(0)}%</p>
              <p className="mn-ui-font text-[10px] text-[hsl(var(--mn-muted))]">Průměr</p>
            </div>
          </div>

          {/* Dot chart */}
          <div className="relative h-16">
            {[25, 50, 75].map(line => (
              <div key={line} className="absolute w-full border-t border-dashed" style={{ bottom: `${line}%`, borderColor: 'hsl(var(--mn-border) / 0.3)' }} />
            ))}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              {data.tests.length > 1 && (
                <polyline fill="none" stroke="hsl(var(--mn-accent))" strokeWidth="1.5" strokeOpacity="0.3"
                  points={data.tests.map((t, i) => `${(i / (data.tests.length - 1)) * 100}%,${100 - t.score}%`).join(' ')} />
              )}
            </svg>
            <div className="absolute inset-0 flex items-end justify-between px-1">
              {data.tests.map((t, i) => {
                const isLast = i === data.tests.length - 1;
                const color = t.score >= 80 ? 'hsl(var(--mn-success))' : t.score >= 60 ? 'hsl(var(--mn-warn))' : 'hsl(var(--mn-danger))';
                return (
                  <div key={i} className="relative flex-1 flex justify-center" style={{ height: '100%' }}>
                    <div className="absolute rounded-full transition-all" style={{
                      width: isLast ? 12 : 8, height: isLast ? 12 : 8,
                      bottom: `calc(${t.score}% - ${isLast ? 6 : 4}px)`,
                      background: color,
                      boxShadow: isLast ? '0 0 0 3px hsl(var(--mn-accent) / 0.2)' : 'none',
                    }} title={`${t.score.toFixed(0)}%`} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="mn-ui-font text-[9px] text-[hsl(var(--mn-muted))]">{new Date(data.tests[0].created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })}</span>
            <span className="mn-ui-font text-[9px] text-[hsl(var(--mn-muted))]">{new Date(data.tests[data.tests.length - 1].created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })}</span>
          </div>
        </>
      )}
    </div>
  );
}
