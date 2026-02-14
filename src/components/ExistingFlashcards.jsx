import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

export default function ExistingFlashcards({ topicId }) {
  const { data: flashcards = [], isLoading } = useQuery({
    queryKey: ['topicFlashcards', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!topicId
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Načítání...</div>;
  }

  if (!flashcards.length) {
    return null;
  }

  const difficultyColors = {
    1: 'bg-green-500/10 text-green-500 border-green-500/20',
    2: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    3: 'bg-red-500/10 text-red-500 border-red-500/20'
  };

  const difficultyLabels = {
    1: 'Snadné',
    2: 'Střední',
    3: 'Těžké'
  };

  return (
    <div className="pt-4 border-t border-slate-800">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-teal-400" />
        <h4 className="font-semibold text-sm">
          Vaše kartičky ({flashcards.length})
        </h4>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {flashcards.map((card) => (
          <Card key={card.id} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm mb-1 truncate">
                    {card.question}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {card.answer}
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className={`flex-shrink-0 text-xs ${difficultyColors[card.difficulty]}`}
                >
                  {difficultyLabels[card.difficulty]}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        💡 Procvičujte kartičky v sekci Opakování
      </p>
    </div>
  );
}
