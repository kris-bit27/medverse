import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Brain, 
  Sparkles, 
  TrendingUp,
  Calendar,
  Award,
  Zap,
  Target
} from 'lucide-react';
import FlashcardReview from './FlashcardReview';

export default function FlashcardLauncher({ topicId, user }) {
  const [showReview, setShowReview] = useState(false);

  // Get user stats
  const { data: stats } = useQuery({
    queryKey: ['flashcard-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase.rpc('get_user_flashcard_stats', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      return data?.[0] || {
        total_cards: 0,
        cards_mastered: 0,
        cards_learning: 0,
        cards_due_today: 0,
        average_easiness: 2.5,
        best_streak: 0
      };
    },
    enabled: !!user?.id
  });

  // Get flashcards count for this topic
  const { data: topicStats } = useQuery({
    queryKey: ['flashcards-count', topicId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('topic_id', topicId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!topicId
  });

  // Get due cards for this topic
  const { data: dueCount } = useQuery({
    queryKey: ['flashcards-due-count', topicId, user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      // Get all flashcards for topic
      const { data: cards, error: cardsError } = await supabase
        .from('flashcards')
        .select('id')
        .eq('topic_id', topicId);
      
      if (cardsError) throw cardsError;
      if (!cards || cards.length === 0) return 0;
      
      // Get user progress
      const { data: progress, error: progressError } = await supabase
        .from('user_flashcard_progress')
        .select('flashcard_id, next_review')
        .eq('user_id', user.id)
        .in('flashcard_id', cards.map(c => c.id));
      
      if (progressError) throw progressError;
      
      // Count due cards
      const today = new Date().toISOString().split('T')[0];
      const progressMap = new Map(progress?.map(p => [p.flashcard_id, p]) || []);
      
      return cards.filter(card => {
        const prog = progressMap.get(card.id);
        return !prog || prog.next_review <= today;
      }).length;
    },
    enabled: !!user?.id && !!topicId
  });

  if (!user) return null;

  const hasDueCards = (dueCount || 0) > 0;
  const hasCards = (topicStats || 0) > 0;

  return (
    <>
      <Card className="bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 border-teal-200 dark:border-teal-800">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-teal-600" />
                <h3 className="font-semibold text-[hsl(var(--mn-text))]">
                  Procvičování s kartičkami
                </h3>
                {hasDueCards && (
                  <Badge className="bg-teal-600">
                    {dueCount} k procvičení
                  </Badge>
                )}
              </div>

              {hasCards ? (
                <div className="space-y-3">
                  <p className="text-sm text-[hsl(var(--mn-muted))]">
                    {hasDueCards 
                      ? `Máte ${dueCount} kartiček připravených k procvičení` 
                      : 'Skvělá práce! Žádné kartičky k procvičení'}
                  </p>

                  {/* Stats */}
                  {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Target className="w-3 h-3" />
                          <span>Celkem</span>
                        </div>
                        <div className="text-2xl font-bold">{topicStats || 0}</div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Award className="w-3 h-3" />
                          <span>Zvládnuté</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {stats.cards_mastered || 0}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="w-3 h-3" />
                          <span>Učím se</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {stats.cards_learning || 0}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Zap className="w-3 h-3" />
                          <span>Série</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-600">
                          {stats.best_streak || 0}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[hsl(var(--mn-muted))]">
                  Pro toto téma zatím nejsou připravené kartičky. Generujte je pomocí AI.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {hasDueCards && (
                <Button 
                  onClick={() => setShowReview(true)}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Začít procvičovat
                </Button>
              )}
              
              {!hasCards && (
                <Button 
                  variant="outline"
                  disabled
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generovat kartičky
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-teal-600" />
              Procvičování kartiček
            </DialogTitle>
          </DialogHeader>
          <FlashcardReview
            topicId={topicId}
            user={user}
            onClose={() => setShowReview(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
