import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Target, TrendingDown, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function WeakSpotsWidget() {
  const { user } = useAuth();

  const { data: weakSpots, isLoading } = useQuery({
    queryKey: ['weakSpots', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_weak_spots', {
        p_user_id: user.id,
        p_limit: 5,
      });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <Card className="p-5 bg-slate-900/50 border-slate-800">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Načítám...
        </div>
      </Card>
    );
  }

  if (!weakSpots?.length) {
    return (
      <Card className="p-5 bg-slate-900/50 border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Slabá místa</h3>
        </div>
        <p className="text-xs text-slate-500">
          Zatím nemáte dostatek dat. Procvičte alespoň 3 kartičky/otázky z více témat.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5 bg-slate-900/50 border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Slabá místa</h3>
        </div>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Doporučujeme zopakovat</span>
      </div>

      <div className="space-y-2.5">
        {weakSpots.map((spot, i) => {
          const accuracy = Number(spot.accuracy) || 0;
          const total = (spot.flashcards_reviewed || 0) + (spot.questions_answered || 0);
          return (
            <Link
              key={spot.topic_id}
              to={`${createPageUrl('TopicDetailV5')}?id=${spot.topic_id}`}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors group"
            >
              {/* Rank */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                i === 0 ? 'bg-red-500/20 text-red-400' :
                i === 1 ? 'bg-amber-500/20 text-amber-400' :
                'bg-slate-700 text-slate-400'
              }`}>
                {i + 1}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate group-hover:text-white transition-colors">
                  {spot.topic_title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-500">{spot.obor_name}</span>
                  <span className="text-[10px] text-slate-600">·</span>
                  <span className="text-[10px] text-slate-500">{total} odpovědí</span>
                </div>
              </div>

              {/* Accuracy bar */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      accuracy < 40 ? 'bg-red-500' : accuracy < 60 ? 'bg-amber-500' : 'bg-teal-500'
                    }`}
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
                <span className={`text-xs font-mono font-bold ${
                  accuracy < 40 ? 'text-red-400' : accuracy < 60 ? 'text-amber-400' : 'text-teal-400'
                }`}>
                  {accuracy}%
                </span>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-teal-400 transition-colors shrink-0" />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
