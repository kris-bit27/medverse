import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { TrendingDown, ArrowRight, Loader2, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function WeakSpotsWidget() {
  const { user } = useAuth();

  const { data: weakSpots, isLoading } = useQuery({
    queryKey: ['weakSpots', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_weak_spots', { p_user_id: user.id, p_limit: 5 });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="mn-card p-6">
        <div className="flex items-center gap-2 text-[hsl(var(--mn-muted))] text-sm mn-ui-font">
          <Loader2 className="w-4 h-4 animate-spin" /> Načítám…
        </div>
      </div>
    );
  }

  if (!weakSpots?.length) {
    return (
      <div className="mn-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--mn-warn))]" />
          <span className="mn-ui-font text-[13px] font-semibold">Slabá místa</span>
        </div>
        <p className="mn-ui-font text-xs text-[hsl(var(--mn-muted))]">
          Zatím nemáte dostatek dat. Procvičte alespoň 3 kartičky/otázky z více témat.
        </p>
      </div>
    );
  }

  return (
    <div className="mn-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--mn-accent))]" />
          <span className="mn-ui-font text-[13px] font-semibold">Slabá místa</span>
        </div>
        <span className="mn-caption text-[hsl(var(--mn-muted))]">Doporučujeme zopakovat</span>
      </div>

      <div className="space-y-1">
        {weakSpots.map((spot, i) => {
          const accuracy = Number(spot.accuracy) || 0;
          const total = (spot.flashcards_reviewed || 0) + (spot.questions_answered || 0);
          return (
            <Link key={spot.topic_id} to={`${createPageUrl('TopicDetailV5')}?id=${spot.topic_id}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-[hsl(var(--mn-surface-2))] transition-colors group"
            >
              <span className={`mn-mono-font text-xs font-bold w-6 text-center ${
                i === 0 ? 'text-[hsl(var(--mn-danger))]' : i === 1 ? 'text-[hsl(var(--mn-warn))]' : 'text-[hsl(var(--mn-muted))]'
              }`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="mn-ui-font text-sm font-medium truncate group-hover:text-[hsl(var(--mn-text))]">{spot.topic_title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="mn-ui-font text-[10px] text-[hsl(var(--mn-muted))]">{spot.obor_name}</span>
                  <span className="text-[10px] text-[hsl(var(--mn-muted))]">·</span>
                  <span className="mn-ui-font text-[10px] text-[hsl(var(--mn-muted))]">{total} odpovědí</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-1.5 rounded-full bg-[hsl(var(--mn-border))] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${accuracy}%`,
                    background: accuracy < 40 ? 'hsl(var(--mn-danger))' : accuracy < 60 ? 'hsl(var(--mn-warn))' : 'hsl(var(--mn-accent))'
                  }} />
                </div>
                <span className={`mn-mono-font text-xs font-bold ${
                  accuracy < 40 ? 'text-[hsl(var(--mn-danger))]' : accuracy < 60 ? 'text-[hsl(var(--mn-warn))]' : 'text-[hsl(var(--mn-accent))]'
                }`}>{accuracy}%</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[hsl(var(--mn-muted))] group-hover:text-[hsl(var(--mn-accent))] transition-colors shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
