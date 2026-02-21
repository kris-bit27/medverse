import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import {
  Brain, BookOpen, Zap, ChevronRight, Sparkles, Target, RotateCcw
} from 'lucide-react';

export default function StudyTodayWidget() {
  const { user } = useAuth();

  const { data: dueCards = 0 } = useQuery({
    queryKey: ['due-cards-today', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase.from('user_flashcard_progress')
        .select('*', { count: 'exact', head: true }).eq('user_id', user.id).lte('next_review', today);
      return count || 0;
    },
    enabled: !!user?.id
  });

  const { data: reviewTopics = [] } = useQuery({
    queryKey: ['review-topics-today', user?.id],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data } = await supabase.from('user_topic_mastery')
        .select('*, topics:topic_id(id, title, slug, obory:obor_id(name))')
        .eq('user_id', user.id)
        .or(`mastery_score.lt.40,and(mastery_score.lt.80,last_studied_at.lt.${sevenDaysAgo.toISOString()})`)
        .order('mastery_score', { ascending: true }).limit(5);
      return data || [];
    },
    enabled: !!user?.id
  });

  const { data: newTopics = [] } = useQuery({
    queryKey: ['new-topics-today', user?.id],
    queryFn: async () => {
      const { data: mastery } = await supabase.from('user_topic_mastery').select('topic_id').eq('user_id', user.id);
      const studiedIds = (mastery || []).map(m => m.topic_id);
      const { data } = await supabase.from('topics')
        .select('id, title, slug, obory:obor_id(name)')
        .eq('status', 'published').not('full_text_content', 'is', null)
        .order('created_at', { ascending: false }).limit(20);
      return (data || []).filter(t => !studiedIds.includes(t.id)).slice(0, 3);
    },
    enabled: !!user?.id
  });

  const totalActions = dueCards + reviewTopics.length + newTopics.length;
  if (totalActions === 0) return null;

  return (
    <div className="mn-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--mn-accent))]" />
          <span className="mn-ui-font text-[13px] font-semibold">Co studovat dnes</span>
        </div>
        <span className="mn-tag mn-mono-font">
          {totalActions} akcí
        </span>
      </div>

      <div className="space-y-4">
        {dueCards > 0 && (
          <Link to={createPageUrl('ReviewToday')}>
            <div className="flex items-center gap-4 p-3.5 rounded-xl border border-[hsl(var(--mn-border))] hover:border-[hsl(var(--mn-accent)/0.3)] transition-all group">
              <RotateCcw className="w-5 h-5 text-[hsl(var(--mn-warn))] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="mn-ui-font text-sm font-semibold">Opakování kartiček</p>
                <p className="mn-ui-font text-xs text-[hsl(var(--mn-muted))]">{dueCards} kartiček čeká na review</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[hsl(var(--mn-muted))] group-hover:text-[hsl(var(--mn-accent))] transition-colors shrink-0" />
            </div>
          </Link>
        )}

        {reviewTopics.length > 0 && (
          <div>
            <p className="mn-caption text-[hsl(var(--mn-muted))] mb-2 flex items-center gap-1">
              <Target className="w-3 h-3" /> Slabé oblasti
            </p>
            <div className="space-y-1">
              {reviewTopics.map(m => {
                const score = Number(m.mastery_score) || 0;
                return (
                  <Link key={m.id} to={`${createPageUrl('TopicDetailV2')}?id=${m.topic_id}`}>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[hsl(var(--mn-surface-2))] transition-colors group">
                      <span className="mn-mono-font text-xs font-bold w-7 text-center" style={{
                        color: score < 20 ? 'hsl(var(--mn-danger))' : score < 40 ? 'hsl(var(--mn-warn))' : 'hsl(var(--mn-accent))'
                      }}>{Math.round(score)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="mn-ui-font text-sm font-medium truncate">{m.topics?.title}</p>
                        <p className="mn-ui-font text-[11px] text-[hsl(var(--mn-muted))]">{m.topics?.obory?.name}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--mn-muted))] group-hover:text-[hsl(var(--mn-accent))] transition-colors shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {newTopics.length > 0 && (
          <div>
            <p className="mn-caption text-[hsl(var(--mn-muted))] mb-2 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Nová témata
            </p>
            <div className="space-y-1">
              {newTopics.map(t => (
                <Link key={t.id} to={`${createPageUrl('TopicDetailV2')}?id=${t.id}`}>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[hsl(var(--mn-surface-2))] transition-colors group">
                    <Zap className="w-4 h-4 text-[hsl(var(--mn-accent))] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="mn-ui-font text-sm font-medium truncate">{t.title}</p>
                      <p className="mn-ui-font text-[11px] text-[hsl(var(--mn-muted))]">{t.obory?.name}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--mn-muted))] group-hover:text-[hsl(var(--mn-accent))] transition-colors shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
