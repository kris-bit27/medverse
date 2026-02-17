import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function TestScoreTrend() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['testScoreTrend', user?.id],
    queryFn: async () => {
      const { data: tests } = await supabase
        .from('test_sessions')
        .select('score, correct_answers, total_questions, created_at, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('score', 'is', null)
        .order('created_at', { ascending: true })
        .limit(20);

      if (!tests?.length) return null;

      const avgScore = tests.reduce((s, t) => s + t.score, 0) / tests.length;
      const lastScore = tests[tests.length - 1].score;
      const prevScore = tests.length >= 2 ? tests[tests.length - 2].score : null;
      const trend = prevScore !== null ? lastScore - prevScore : 0;

      return { tests, avgScore, lastScore, trend, count: tests.length };
    },
    enabled: !!user?.id,
  });

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[hsl(var(--mn-accent))]" />
            Výsledky testů
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-[hsl(var(--mn-muted))] text-center py-4">
            Dokončete první test a uvidíte svůj trend 📈
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxScore = 100;
  const TrendIcon = data.trend > 2 ? ArrowUp : data.trend < -2 ? ArrowDown : Minus;
  const trendColor = data.trend > 2 ? 'text-emerald-500' : data.trend < -2 ? 'text-red-500' : 'text-[hsl(var(--mn-muted))]';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[hsl(var(--mn-accent))]" />
            Výsledky testů
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] gap-1">
              <Target className="w-3 h-3" /> {data.count} testů
            </Badge>
            <div className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              {Math.abs(data.trend).toFixed(0)}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Score summary */}
        <div className="flex items-center gap-4 mb-3">
          <div>
            <p className="text-2xl font-bold text-[hsl(var(--mn-text))]">{data.lastScore.toFixed(0)}%</p>
            <p className="text-[10px] text-[hsl(var(--mn-muted))]">Poslední test</p>
          </div>
          <div className="h-8 w-px bg-[hsl(var(--mn-border))]" />
          <div>
            <p className="text-lg font-semibold text-[hsl(var(--mn-muted))]">{data.avgScore.toFixed(0)}%</p>
            <p className="text-[10px] text-[hsl(var(--mn-muted))]">Průměr</p>
          </div>
        </div>

        {/* Dot chart */}
        <div className="relative h-16">
          {/* Grid lines */}
          {[25, 50, 75].map(line => (
            <div key={line} className="absolute w-full border-t border-dashed border-[hsl(var(--mn-border)/0.3)]"
              style={{ bottom: `${(line / maxScore) * 100}%` }} />
          ))}
          
          {/* Score dots with connecting line */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {data.tests.length > 1 && (
              <polyline
                fill="none"
                stroke="hsl(var(--mn-accent))"
                strokeWidth="1.5"
                strokeOpacity="0.3"
                points={data.tests.map((t, i) => {
                  const x = (i / (data.tests.length - 1)) * 100;
                  const y = 100 - (t.score / maxScore) * 100;
                  return `${x}%,${y}%`;
                }).join(' ')}
              />
            )}
          </svg>

          <div className="absolute inset-0 flex items-end justify-between px-1">
            {data.tests.map((t, i) => {
              const bottom = (t.score / maxScore) * 100;
              const color = t.score >= 80 ? 'bg-emerald-500' : t.score >= 60 ? 'bg-amber-500' : 'bg-red-500';
              const isLast = i === data.tests.length - 1;
              return (
                <div key={i} className="relative flex-1 flex justify-center" style={{ height: '100%' }}>
                  <div
                    className={`absolute ${color} rounded-full transition-all ${isLast ? 'w-3 h-3 ring-2 ring-[hsl(var(--mn-accent)/0.3)]' : 'w-2 h-2'}`}
                    style={{ bottom: `calc(${bottom}% - ${isLast ? 6 : 4}px)` }}
                    title={`${t.score.toFixed(0)}% — ${new Date(t.created_at).toLocaleDateString('cs-CZ')}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Labels */}
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-[hsl(var(--mn-muted))]">
            {new Date(data.tests[0].created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })}
          </span>
          <span className="text-[9px] text-[hsl(var(--mn-muted))]">
            {new Date(data.tests[data.tests.length - 1].created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
