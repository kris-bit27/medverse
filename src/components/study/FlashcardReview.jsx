import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Check, 
  X, 
  RotateCcw,
  Sparkles,
  TrendingUp,
  Calendar,
  Award
} from 'lucide-react';
import { toast } from 'sonner';

const QUALITY_LABELS = [
  { value: 0, label: 'Vůbec nevím', color: 'bg-red-500', emoji: '😵' },
  { value: 1, label: 'Špatně', color: 'bg-orange-500', emoji: '😰' },
  { value: 2, label: 'Těžko', color: 'bg-yellow-500', emoji: '😓' },
  { value: 3, label: 'S váháním', color: 'bg-blue-500', emoji: '🤔' },
  { value: 4, label: 'Dobře', color: 'bg-green-500', emoji: '😊' },
  { value: 5, label: 'Perfektně', color: 'bg-emerald-600', emoji: '🎯' },
];

export default function FlashcardReview({ topicId, user, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    streak: 0
  });
  const queryClient = useQueryClient();

  // Fetch due flashcards
  const { data: flashcards = [], isLoading } = useQuery({
    queryKey: ['flashcards-due', topicId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get all flashcards for topic
      const { data: cards, error: cardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('topic_id', topicId);
      
      if (cardsError) throw cardsError;
      
      // Get user progress
      const { data: progress, error: progressError } = await supabase
        .from('user_flashcard_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('flashcard_id', cards.map(c => c.id));
      
      if (progressError) throw progressError;
      
      // Merge and filter due cards
      const today = new Date().toISOString().split('T')[0];
      const progressMap = new Map(progress?.map(p => [p.flashcard_id, p]) || []);
      
      return cards
        .map(card => ({
          ...card,
          progress: progressMap.get(card.id)
        }))
        .filter(card => {
          // New cards or cards due today
          return !card.progress || card.progress.next_review <= today;
        })
        .sort((a, b) => {
          // Prioritize new cards
          if (!a.progress && b.progress) return -1;
          if (a.progress && !b.progress) return 1;
          return 0;
        });
    },
    enabled: !!user?.id && !!topicId
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ flashcardId, quality }) => {
      const { data, error } = await supabase.rpc('update_flashcard_progress', {
        p_user_id: user.id,
        p_flashcard_id: flashcardId,
        p_quality: quality
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['flashcards-due', topicId, user?.id]);
      queryClient.invalidateQueries(['flashcard-stats', user?.id]);
      
      // Update session stats
      setSessionStats(prev => ({
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (variables.quality >= 3 ? 1 : 0),
        streak: variables.quality >= 3 ? prev.streak + 1 : 0
      }));
      
      // Move to next card
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setShowAnswer(false);
      } else {
        // Session complete
        toast.success(`Skvělá práce! Prošli jste ${flashcards.length} kartiček`, {
          description: `${sessionStats.correct + (variables.quality >= 3 ? 1 : 0)} správně`
        });
        onClose?.();
      }
    }
  });

  const handleRate = (quality) => {
    const currentCard = flashcards[currentIndex];
    if (!currentCard) return;
    
    updateProgressMutation.mutate({
      flashcardId: currentCard.id,
      quality
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Brain className="w-12 h-12 text-teal-500 mx-auto mb-4 animate-pulse" />
        <p className="text-muted-foreground">Načítání kartiček...</p>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
        <CardContent className="p-8 text-center">
          <Award className="w-16 h-16 text-teal-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Všechno hotovo! 🎉</h3>
          <p className="text-muted-foreground mb-4">
            Nemáte žádné kartičky k procvičení
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={onClose} variant="outline">
              Zavřít
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Kartička {currentIndex + 1} z {flashcards.length}
          </span>
          <span className="font-medium">
            {sessionStats.correct}/{sessionStats.reviewed} správně
            {sessionStats.streak > 0 && (
              <span className="ml-2 text-green-600">
                🔥 {sessionStats.streak}
              </span>
            )}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Card */}
      <Card className="min-h-[300px] cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => !showAnswer && setShowAnswer(true)}
      >
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center min-h-[250px]">
            {!showAnswer ? (
              <>
                <Brain className="w-12 h-12 text-teal-500 mb-4" />
                <h3 className="text-2xl font-semibold text-center mb-6">
                  {currentCard.question}
                </h3>
                <Button 
                  onClick={() => setShowAnswer(true)}
                  size="lg"
                  className="mt-4"
                >
                  Ukázat odpověď
                </Button>
              </>
            ) : (
              <div className="w-full space-y-6">
                <div>
                  <Badge variant="secondary" className="mb-2">Otázka</Badge>
                  <p className="text-lg font-medium mb-4">
                    {currentCard.question}
                  </p>
                </div>
                
                <div>
                  <Badge variant="default" className="mb-2 bg-green-600">Odpověď</Badge>
                  <p className="text-lg">
                    {currentCard.answer}
                  </p>
                </div>

                {currentCard.explanation && (
                  <div className="pt-4 border-t">
                    <Badge variant="outline" className="mb-2">Vysvětlení</Badge>
                    <p className="text-sm text-muted-foreground">
                      {currentCard.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rating Buttons */}
      {showAnswer && (
        <div className="space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            Jak dobře jste znali odpověď?
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {QUALITY_LABELS.map((quality) => (
              <Button
                key={quality.value}
                onClick={() => handleRate(quality.value)}
                variant="outline"
                className={`h-auto py-3 ${
                  quality.value >= 3 ? 'hover:bg-green-50 hover:border-green-500' : 'hover:bg-red-50 hover:border-red-500'
                }`}
                disabled={updateProgressMutation.isPending}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{quality.emoji}</span>
                  <span className="text-xs font-medium">{quality.label}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowAnswer(false);
            setCurrentIndex(0);
          }}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Restart
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
        >
          Ukončit
        </Button>
      </div>
    </div>
  );
}
