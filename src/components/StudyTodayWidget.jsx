import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Brain, BookOpen, Zap, ChevronRight, Sparkles, Clock, Target, RotateCcw
} from 'lucide-react';

/**
 * StudyTodayWidget — "What to study today" based on spaced repetition
 * 
 * Priority order:
 * 1. Due flashcard reviews (SM-2 next_review <= today)
 * 2. Weak topics (mastery < 40%)  
 * 3. Stale topics (not studied in 7+ days, mastery < 80%)
 * 4. New topics (never opened)
 */
export default function StudyTodayWidget() {
  const { user } = useAuth();

  // Due flashcards
  const { data: dueCards = 0 } = useQuery({
    queryKey: ['due-cards-today', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('user_flashcard_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .lte('next_review', today);
      return count || 0;
    },
    enabled: !!user?.id
  });

  // Weak + stale topics from mastery
  const { data: reviewTopics = [] } = useQuery({
    queryKey: ['review-topics-today', user?.id],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('user_topic_mastery')
        .select('*, topics:topic_id(id, title, slug, obory:obor_id(name))')
        .eq('user_id', user.id)
        .or(`mastery_score.lt.40,and(mastery_score.lt.80,last_studied_at.lt.${sevenDaysAgo.toISOString()})`)
        .order('mastery_score', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // New topics (published, with content, never opened by user)
  const { data: newTopics = [] } = useQuery({
    queryKey: ['new-topics-today', user?.id],
    queryFn: async () => {
      // Get user's studied topic IDs
      const { data: mastery } = await supabase
        .from('user_topic_mastery')
        .select('topic_id')
        .eq('user_id', user.id);
      
      const studiedIds = (mastery || []).map(m => m.topic_id);

      // Get unstudied topics with content
      let query = supabase
        .from('topics')
        .select('id, title, slug, obory:obor_id(name)')
        .eq('status', 'published')
        .not('full_text_content', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data } = await query;
      
      // Filter out studied ones client-side (simpler than complex NOT IN)
      const unstudied = (data || []).filter(t => !studiedIds.includes(t.id));
      return unstudied.slice(0, 3);
    },
    enabled: !!user?.id
  });

  const totalActions = dueCards + reviewTopics.length + newTopics.length;

  if (totalActions === 0) {
    return null; // Nothing to show
  }

  return (
    <Card className="border-teal-200 dark:border-teal-500/20 bg-gradient-to-br from-teal-50/50 to-white dark:from-teal-950/10 dark:to-slate-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-teal-500" />
            Co studovat dnes
          </span>
          <Badge variant="outline" className="text-teal-600 border-teal-300 dark:border-teal-500/30">
            {totalActions} akcí
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Due flashcard reviews */}
        {dueCards > 0 && (
          <Link to={createPageUrl('ReviewToday')}>
            <div className="flex items-center gap-4 p-3 rounded-xl bg-orange-50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/20 hover:bg-orange-100 dark:hover:bg-orange-500/10 transition-colors">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-500/20">
                <RotateCcw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Opakování kartiček</p>
                <p className="text-xs text-orange-600/70 dark:text-orange-400/60">{dueCards} kartiček čeká na review</p>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-400" />
            </div>
          </Link>
        )}

        {/* Weak topics */}
        {reviewTopics.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Target className="w-3 h-3" /> Slabé oblasti
            </p>
            <div className="space-y-2">
              {reviewTopics.map(m => {
                const score = Number(m.mastery_score) || 0;
                const isStale = new Date(m.last_studied_at) < new Date(Date.now() - 7 * 86400000);
                return (
                  <Link key={m.id} to={`${createPageUrl('TopicDetailV2')}?id=${m.topic_id}`}>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <span className={`text-xs font-bold ${
                          score < 20 ? 'text-red-500' : score < 40 ? 'text-orange-500' : 'text-amber-500'
                        }`}>{Math.round(score)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.topics?.title}</p>
                        <p className="text-[11px] text-slate-500">
                          {isStale ? 'Nestudováno 7+ dní' : `Mastery: ${Math.round(score)}%`}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* New topics to explore */}
        {newTopics.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Nová témata
            </p>
            <div className="space-y-2">
              {newTopics.map(t => (
                <Link key={t.id} to={`${createPageUrl('TopicDetailV2')}?id=${t.id}`}>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-teal-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-[11px] text-slate-500">{t.obory?.name}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
