import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Zap,
  CheckCircle,
  XCircle,
  RotateCcw,
  ArrowLeft,
  Flame,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

// SM-2 Algorithm
function calculateNextReview(quality, repetitions, easiness, interval) {
  let newEasiness = easiness;
  let newRepetitions = repetitions;
  let newInterval = interval;

  if (quality < 3) {
    newRepetitions = 0;
    newInterval = 0;
  } else {
    newEasiness = Math.max(1.3, easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEasiness);
    }
    
    newRepetitions += 1;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    repetitions: newRepetitions,
    easiness: newEasiness,
    interval: newInterval,
    nextReview: nextReview.toISOString().split('T')[0]
  };
}

export default function FlashcardReviewV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    startTime: new Date()
  });

  // Fetch due flashcards
  const { data: dueCards = [], isLoading } = useQuery({
    queryKey: ['dueFlashcards', user?.id],
    queryFn: async () => {
      console.log('🔍 === FLASHCARD REVIEW QUERY DEBUG ===');
      console.log('1️⃣ User ID:', user?.id);
      
      const today = new Date().toISOString().split('T')[0];
      console.log('2️⃣ Today:', today);
      
      // Get all flashcards (not just with progress tracking)
      console.log('3️⃣ Querying flashcards table...');
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      console.log('4️⃣ Query response - data:', data);
      console.log('5️⃣ Query response - error:', error);
      console.log('6️⃣ Number of cards:', data?.length || 0);

      if (error) {
        console.error('❌ Query failed:', error);
        throw error;
      }
      
      // Return with mock progress for cards without tracking
      const cardsWithProgress = data?.map(card => ({
        ...card,
        progress: {
          repetitions: 0,
          easiness: 2.5,
          interval: 0,
          next_review: today
        }
      })) || [];
      
      console.log('7️⃣ Cards with progress:', cardsWithProgress);
      console.log('8️⃣ Final count:', cardsWithProgress.length);
      console.log('🏁 === END QUERY DEBUG ===');
      
      return cardsWithProgress;
    },
    enabled: !!user?.id
  });

  const recordReview = useMutation({
    mutationFn: async ({ flashcardId, quality }) => {
      const card = dueCards[currentIndex];
      const currentProgress = card.progress;

      const nextReview = calculateNextReview(
        quality,
        currentProgress?.repetitions || 0,
        currentProgress?.easiness || 2.5,
        currentProgress?.interval || 0
      );

      const { data, error } = await supabase
        .from('user_flashcard_progress')
        .upsert({
          user_id: user.id,
          flashcard_id: flashcardId,
          ...nextReview,
          last_reviewed: new Date().toISOString(),
          last_quality: quality,
          total_reviews: (currentProgress?.total_reviews || 0) + 1,
          correct_reviews: quality >= 3 
            ? (currentProgress?.correct_reviews || 0) + 1 
            : (currentProgress?.correct_reviews || 0)
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      setSessionStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        correct: variables.quality >= 3 ? prev.correct + 1 : prev.correct
      }));

      if (currentIndex < dueCards.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
      } else {
        toast.success(`Session complete! ${sessionStats.reviewed + 1} cards`);
        navigate('/Dashboard');
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!dueCards.length) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Zap className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">All done!</h2>
            <p className="mb-6">No cards due today</p>
            <Button onClick={() => navigate('/Dashboard')}>Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const card = dueCards[currentIndex];

  return (
    <div className="container max-w-3xl mx-auto p-6 space-y-6">
      <Progress value={((currentIndex + 1) / dueCards.length) * 100} />

      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="cursor-pointer"
      >
        <Card className="min-h-[400px] hover:shadow-lg transition-shadow">
          <CardContent className="p-12 flex items-center justify-center">
            <div className="text-center">
              {!isFlipped ? (
                <>
                  <h3 className="text-2xl font-bold">{card.question}</h3>
                  <p className="text-sm text-muted-foreground mt-4">
                    Click to reveal
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold mb-4">{card.answer}</h3>
                  {card.explanation && (
                    <p className="text-sm text-muted-foreground mt-4">
                      {card.explanation}
                    </p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {isFlipped && (
        <div className="grid grid-cols-4 gap-3">
          <Button
            onClick={() => recordReview.mutate({ flashcardId: card.id, quality: 1 })}
            variant="outline"
            className="flex-col h-auto py-4"
          >
            <XCircle className="w-6 h-6 mb-2 text-red-500" />
            <span>Again</span>
          </Button>

          <Button
            onClick={() => recordReview.mutate({ flashcardId: card.id, quality: 3 })}
            variant="outline"
            className="flex-col h-auto py-4"
          >
            <RotateCcw className="w-6 h-6 mb-2 text-yellow-500" />
            <span>Hard</span>
          </Button>

          <Button
            onClick={() => recordReview.mutate({ flashcardId: card.id, quality: 4 })}
            variant="outline"
            className="flex-col h-auto py-4"
          >
            <TrendingUp className="w-6 h-6 mb-2 text-blue-500" />
            <span>Good</span>
          </Button>

          <Button
            onClick={() => recordReview.mutate({ flashcardId: card.id, quality: 5 })}
            variant="outline"
            className="flex-col h-auto py-4"
          >
            <CheckCircle className="w-6 h-6 mb-2 text-green-500" />
            <span>Easy</span>
          </Button>
        </div>
      )}
    </div>
  );
}
