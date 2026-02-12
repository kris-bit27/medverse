import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle,
  XCircle,
  RotateCcw,
  Zap,
  Trophy,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReviewToday() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0
  });

  // Fetch ALL flashcards
  const { data: flashcards = [], isLoading } = useQuery({
    queryKey: ['allFlashcards'],
    queryFn: async () => {
      console.log('🔍 === REVIEWTODAY QUERY DEBUG ===');
      console.log('1️⃣ Fetching flashcards...');
      
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('2️⃣ Data:', data);
      console.log('3️⃣ Error:', error);
      console.log('4️⃣ Count:', data?.length || 0);
      console.log('🏁 === END DEBUG ===');

      if (error) {
        console.error('❌ Query failed:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  const handleAnswer = (quality) => {
    const isCorrect = quality >= 3;
    
    setSessionStats(prev => ({
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (isCorrect ? 1 : 0)
    }));

    // Move to next card
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      // Session complete
      toast.success(`Session complete! ${sessionStats.correct + (isCorrect ? 1 : 0)}/${sessionStats.reviewed + 1} correct`);
      navigate('/Dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!flashcards.length) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Zap className="w-16 h-16 mx-auto mb-4 text-purple-600" />
            <h2 className="text-2xl font-bold mb-2">Žádné kartičky!</h2>
            <p className="text-muted-foreground mb-6">
              Vytvořte si kartičky v sekci Studium
            </p>
            <Button onClick={() => navigate('/Dashboard')}>
              Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const card = flashcards[currentIndex];
  const progressPercent = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="container max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/Dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zpět
        </Button>
        
        <div className="text-sm text-muted-foreground">
          {currentIndex + 1} / {flashcards.length}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Postup</span>
          <span className="font-medium">
            {sessionStats.reviewed} zkontrolováno • {sessionStats.correct} správně
          </span>
        </div>
        <Progress value={progressPercent} />
      </div>

      {/* Flashcard */}
      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="cursor-pointer"
      >
        <Card className="min-h-[400px] hover:shadow-lg transition-shadow bg-slate-900/50 border-slate-800">
          <CardContent className="p-12 flex items-center justify-center">
            <div className="text-center w-full">
              {!isFlipped ? (
                <>
                  <h3 className="text-2xl font-bold mb-4">{card.question}</h3>
                  <p className="text-sm text-muted-foreground mt-4">
                    Klikněte pro zobrazení odpovědi
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-2">Odpověď:</p>
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

      {/* Answer Buttons */}
      {isFlipped && (
        <div className="grid grid-cols-4 gap-3">
          <Button
            onClick={() => handleAnswer(1)}
            variant="outline"
            className="flex-col h-auto py-4"
          >
            <XCircle className="w-6 h-6 mb-2 text-red-500" />
            <span>Špatně</span>
          </Button>

          <Button
            onClick={() => handleAnswer(2)}
            variant="outline"
            className="flex-col h-auto py-4"
          >
            <RotateCcw className="w-6 h-6 mb-2 text-yellow-500" />
            <span>Těžké</span>
          </Button>

          <Button
            onClick={() => handleAnswer(3)}
            variant="outline"
            className="flex-col h-auto py-4"
          >
            <CheckCircle className="w-6 h-6 mb-2 text-green-500" />
            <span>Dobře</span>
          </Button>

          <Button
            onClick={() => handleAnswer(5)}
            variant="outline"
            className="flex-col h-auto py-4"
          >
            <Zap className="w-6 h-6 mb-2 text-blue-500" />
            <span>Snadné</span>
          </Button>
        </div>
      )}

      {/* Stats */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span>
                Úspěšnost: {sessionStats.reviewed > 0 
                  ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) 
                  : 0}%
              </span>
            </div>
            <div className="text-muted-foreground">
              {flashcards.length - currentIndex - 1} zbývá
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
