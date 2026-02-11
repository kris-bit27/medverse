import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles,
  Zap,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function FlashcardGenerator({ topicId, topicContent }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [generatedCards, setGeneratedCards] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate flashcards using simple AI-like logic
  const generateFlashcards = () => {
    setIsGenerating(true);

    // Simulate AI generation with timeout
    setTimeout(() => {
      const cards = extractFlashcardsFromContent(topicContent);
      setGeneratedCards(cards);
      setIsGenerating(false);
      
      if (cards.length === 0) {
        toast.error('Nepodařilo se vygenerovat kartičky z tohoto obsahu');
      } else {
        toast.success(`Vygenerováno ${cards.length} kartiček!`);
      }
    }, 2000);
  };

  // Simple extraction logic
  const extractFlashcardsFromContent = (content) => {
    if (!content) return [];

    const cards = [];
    const lines = content.split('\n').filter(line => line.trim());

    // Extract from headers and definitions
    lines.forEach((line, idx) => {
      // Pattern 1: "Term: Definition"
      if (line.includes(':') && !line.startsWith('#')) {
        const [front, back] = line.split(':').map(s => s.trim());
        if (front && back && back.length > 10) {
          cards.push({ front, back, difficulty: 'medium' });
        }
      }

      // Pattern 2: Headers followed by content
      if (line.startsWith('##') || line.startsWith('###')) {
        const front = line.replace(/^#+\s*/, '').trim();
        const nextLine = lines[idx + 1];
        if (nextLine && !nextLine.startsWith('#') && nextLine.length > 20) {
          cards.push({ 
            front: `Co je ${front}?`, 
            back: nextLine.trim(),
            difficulty: 'medium'
          });
        }
      }

      // Pattern 3: Bullet points with definitions
      if (line.startsWith('-') || line.startsWith('*')) {
        const cleaned = line.replace(/^[-*]\s*/, '').trim();
        if (cleaned.includes(':')) {
          const [front, back] = cleaned.split(':').map(s => s.trim());
          if (front && back && back.length > 10) {
            cards.push({ front, back, difficulty: 'easy' });
          }
        }
      }
    });

    // Limit to 10 cards
    return cards.slice(0, 10);
  };

  // Save flashcards mutation
  const saveFlashcards = useMutation({
    mutationFn: async (selectedCards) => {
      const promises = selectedCards.map(card => 
        supabase
          .from('flashcards')
          .insert({
            user_id: user.id,
            topic_id: topicId,
            front: card.front,
            back: card.back,
            difficulty: card.difficulty,
            next_review_date: new Date().toISOString()
          })
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success('Kartičky uloženy!');
      queryClient.invalidateQueries(['flashcards']);
      setGeneratedCards([]);
    },
    onError: () => {
      toast.error('Chyba při ukládání kartiček');
    }
  });

  const handleSaveAll = () => {
    const approved = generatedCards.filter(card => card.approved !== false);
    if (approved.length === 0) {
      toast.error('Vyberte alespoň jednu kartičku');
      return;
    }
    saveFlashcards.mutate(approved);
  };

  const toggleCardApproval = (index) => {
    setGeneratedCards(cards => 
      cards.map((card, i) => 
        i === index ? { ...card, approved: card.approved === false ? true : false } : card
      )
    );
  };

  return (
    <div className="space-y-4">
      {generatedCards.length === 0 ? (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
          <CardContent className="p-6 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-600" />
            <h3 className="font-semibold mb-2">AI Generátor Kartiček</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Automaticky vytvoř kartičky z obsahu tématu
            </p>
            <Button 
              onClick={generateFlashcards}
              disabled={isGenerating || !topicContent}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generuji...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Vygenerovat kartičky
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              Vygenerované kartičky ({generatedCards.length})
            </h3>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setGeneratedCards([])}
              >
                Zrušit
              </Button>
              <Button 
                onClick={handleSaveAll}
                disabled={saveFlashcards.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Uložit vybrané
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {generatedCards.map((card, index) => {
              const isApproved = card.approved !== false;

              return (
                <Card 
                  key={index}
                  className={`transition-all ${
                    isApproved 
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                      : 'border-red-500 bg-red-50 dark:bg-red-950/20 opacity-60'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="outline" className="text-xs">
                        {card.difficulty}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleCardApproval(index)}
                      >
                        {isApproved ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Přední strana:</p>
                        <p className="font-medium">{card.front}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Zadní strana:</p>
                        <p className="text-sm">{card.back}</p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-3"
                      onClick={() => toggleCardApproval(index)}
                    >
                      {isApproved ? 'Odmítnout' : 'Schválit'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
