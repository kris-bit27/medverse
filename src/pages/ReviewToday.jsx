import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle,
  XCircle,
  RotateCcw,
  Zap,
  Trophy,
  ArrowLeft,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function ReviewToday() {
  const { user } = useAuth();
  const { track } = useAnalytics();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0
  });
  
  // Filters — pre-populate from URL params
  const [selectedObor, setSelectedObor] = useState('all');
  const [selectedOkruh, setSelectedOkruh] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [dueOnly, setDueOnly] = useState(false);
  const [urlApplied, setUrlApplied] = useState(false);

  // Apply URL params on mount
  useEffect(() => {
    if (urlApplied) return;
    const topicParam = searchParams.get('topic');
    if (topicParam) {
      setSelectedTopic(topicParam);
      setUrlApplied(true);
    }
  }, [searchParams, urlApplied]);

  // Fetch user's SRS progress for due filtering
  const { data: srsProgress = {} } = useQuery({
    queryKey: ['srsProgress', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_flashcard_progress')
        .select('flashcard_id, next_review')
        .eq('user_id', user.id);
      const map = {};
      (data || []).forEach(p => { map[p.flashcard_id] = p.next_review; });
      return map;
    },
    enabled: !!user?.id
  });

  // Fetch flashcards with topic info
  const { data: flashcardsRaw = [], isLoading } = useQuery({
    queryKey: ['allFlashcards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flashcards')
        .select(`
          *,
          topics:topic_id(
            id,
            title,
            obor_id,
            okruh_id,
            obory:obor_id(id, name),
            okruhy:okruh_id(id, name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Extract unique obory, okruhy, topics
  const obory = useMemo(() => {
    const unique = new Map();
    flashcardsRaw.forEach(card => {
      if (card.topics?.obory) {
        unique.set(card.topics.obory.id, card.topics.obory);
      }
    });
    return Array.from(unique.values());
  }, [flashcardsRaw]);

  const okruhy = useMemo(() => {
    const unique = new Map();
    flashcardsRaw.forEach(card => {
      if (card.topics?.okruhy) {
        const matchesObor = selectedObor === 'all' || card.topics.obor_id === selectedObor;
        if (matchesObor) {
          unique.set(card.topics.okruhy.id, card.topics.okruhy);
        }
      }
    });
    return Array.from(unique.values());
  }, [flashcardsRaw, selectedObor]);

  const topics = useMemo(() => {
    const unique = new Map();
    flashcardsRaw.forEach(card => {
      if (card.topics) {
        const matchesObor = selectedObor === 'all' || card.topics.obor_id === selectedObor;
        const matchesOkruh = selectedOkruh === 'all' || card.topics.okruh_id === selectedOkruh;
        if (matchesObor && matchesOkruh) {
          unique.set(card.topics.id, card.topics);
        }
      }
    });
    return Array.from(unique.values());
  }, [flashcardsRaw, selectedObor, selectedOkruh]);

  // Filtered flashcards
  const flashcards = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return flashcardsRaw.filter(card => {
      if (!card.topics) return false;
      
      const matchesObor = selectedObor === 'all' || card.topics.obor_id === selectedObor;
      const matchesOkruh = selectedOkruh === 'all' || card.topics.okruh_id === selectedOkruh;
      const matchesTopic = selectedTopic === 'all' || card.topics.id === selectedTopic;
      
      // Due-only filter: show cards that are due for review or never reviewed
      const matchesDue = !dueOnly || !srsProgress[card.id] || srsProgress[card.id] <= today;
      
      return matchesObor && matchesOkruh && matchesTopic && matchesDue;
    });
  }, [flashcardsRaw, selectedObor, selectedOkruh, selectedTopic, dueOnly, srsProgress]);

  const handleAnswer = async (quality) => {
    const isCorrect = quality >= 3;
    const currentCard = flashcards[currentIndex];
    
    setSessionStats(prev => ({
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (isCorrect ? 1 : 0)
    }));

    // Save SRS progress to DB
    if (user?.id && currentCard?.id) {
      try {
        // Fetch current progress
        const { data: existing } = await supabase
          .from('user_flashcard_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('flashcard_id', currentCard.id)
          .maybeSingle();

        const reps = existing?.repetitions || 0;
        const ease = existing?.easiness || 2.5;
        const interval = existing?.interval || 0;

        // SM-2 algorithm
        let newEase = ease;
        let newInterval = interval;
        let newReps = reps;

        if (quality >= 3) {
          newReps = reps + 1;
          if (newReps === 1) newInterval = 1;
          else if (newReps === 2) newInterval = 6;
          else newInterval = Math.round(interval * ease);
          newEase = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        } else {
          newReps = 0;
          newInterval = 1;
          newEase = Math.max(1.3, ease - 0.2);
        }
        if (newEase < 1.3) newEase = 1.3;

        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + newInterval);

        await supabase
          .from('user_flashcard_progress')
          .upsert({
            user_id: user.id,
            flashcard_id: currentCard.id,
            repetitions: newReps,
            easiness: newEase,
            interval: newInterval,
            next_review: nextReview.toISOString().split('T')[0],
            last_reviewed: new Date().toISOString(),
            last_quality: quality,
            total_reviews: (existing?.total_reviews || 0) + 1,
            correct_reviews: isCorrect 
              ? (existing?.correct_reviews || 0) + 1 
              : (existing?.correct_reviews || 0),
            streak: isCorrect ? (existing?.streak || 0) + 1 : 0,
            best_streak: isCorrect 
              ? Math.max(existing?.best_streak || 0, (existing?.streak || 0) + 1)
              : (existing?.best_streak || 0),
          }, { onConflict: 'user_id,flashcard_id' });
      } catch (err) {
        console.error('[SRS] Failed to save progress:', err);
      }
    }

    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      toast.success(`Session hotova! ${sessionStats.correct + (isCorrect ? 1 : 0)}/${sessionStats.reviewed + 1} správně`);
      track('review_session_completed', { correct: sessionStats.correct + (isCorrect ? 1 : 0), reviewed: sessionStats.reviewed + 1 });
      setCurrentIndex(0);
      setSessionStats({ reviewed: 0, correct: 0 });
    }
  };

  // Reset index when filters change
  React.useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedObor, selectedOkruh, selectedTopic]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[hsl(var(--mn-accent))] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!flashcards.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {/* Filters */}
        <Card className="bg-[hsl(var(--mn-surface))] border-[hsl(var(--mn-border))]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4" />
              <h3 className="font-semibold">Filtry</h3>
              <div className="ml-auto">
                <button
                  onClick={() => setDueOnly(!dueOnly)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                    dueOnly 
                      ? 'bg-[hsl(var(--mn-accent)/0.1)] text-[hsl(var(--mn-accent))] border-[hsl(var(--mn-accent)/0.3)]'
                      : 'text-[hsl(var(--mn-muted))] border-[hsl(var(--mn-border))] hover:bg-[hsl(var(--mn-surface-2))] dark:hover:bg-[hsl(var(--mn-surface-2))]'
                  }`}
                >
                  {dueOnly ? '📅 Jen k opakování' : 'Všechny kartičky'}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-[hsl(var(--mn-muted))] mb-2 block">Obor</label>
                <Select value={selectedObor} onValueChange={setSelectedObor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny obory</SelectItem>
                    {obory.map(obor => (
                      <SelectItem key={obor.id} value={obor.id}>
                        {obor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-[hsl(var(--mn-muted))] mb-2 block">Okruh</label>
                <Select value={selectedOkruh} onValueChange={setSelectedOkruh}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny okruhy</SelectItem>
                    {okruhy.map(okruh => (
                      <SelectItem key={okruh.id} value={okruh.id}>
                        {okruh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-[hsl(var(--mn-muted))] mb-2 block">Téma</label>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechna témata</SelectItem>
                    {topics.map(topic => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-12 text-center">
            <Zap className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--mn-accent))]" />
            <h2 className="mn-serif-font text-2xl font-bold mb-2">Žádné kartičky!</h2>
            <p className="text-[hsl(var(--mn-muted))] mb-6">
              {selectedObor !== 'all' || selectedOkruh !== 'all' || selectedTopic !== 'all'
                ? 'Zkuste změnit filtry nebo vytvořte nové kartičky'
                : 'Vytvořte si kartičky v sekci Studium'}
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
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
        
        <div className="text-sm text-[hsl(var(--mn-muted))]">
          {currentIndex + 1} / {flashcards.length}
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-[hsl(var(--mn-surface))] border-[hsl(var(--mn-border))]">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4" />
            <h3 className="font-semibold text-sm">Filtry</h3>
            <div className="ml-auto">
              <button
                onClick={() => setDueOnly(!dueOnly)}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                  dueOnly 
                    ? 'bg-[hsl(var(--mn-accent)/0.1)] text-[hsl(var(--mn-accent))] border-[hsl(var(--mn-accent)/0.3)]'
                    : 'text-[hsl(var(--mn-muted))] border-[hsl(var(--mn-border))] hover:bg-[hsl(var(--mn-surface-2))] dark:hover:bg-[hsl(var(--mn-surface-2))]'
                }`}
              >
                {dueOnly ? '📅 Jen k opakování' : 'Všechny kartičky'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={selectedObor} onValueChange={setSelectedObor}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny obory</SelectItem>
                {obory.map(obor => (
                  <SelectItem key={obor.id} value={obor.id}>
                    {obor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedOkruh} onValueChange={setSelectedOkruh}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny okruhy</SelectItem>
                {okruhy.map(okruh => (
                  <SelectItem key={okruh.id} value={okruh.id}>
                    {okruh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechna témata</SelectItem>
                {topics.map(topic => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[hsl(var(--mn-muted))]">Postup</span>
          <span className="font-medium">
            {sessionStats.reviewed} zkontrolováno • {sessionStats.correct} správně
          </span>
        </div>
        <Progress value={progressPercent} />
      </div>

      {/* Topic Info */}
      {card.topics && (
        <div className="text-sm text-[hsl(var(--mn-muted))]">
          {card.topics.obory?.name} → {card.topics.okruhy?.name} → {card.topics.title}
        </div>
      )}

      {/* Flashcard */}
      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="cursor-pointer"
      >
        <Card className="min-h-[400px] hover:shadow-lg transition-shadow bg-[hsl(var(--mn-surface))] border-[hsl(var(--mn-border))]">
          <CardContent className="p-12 flex items-center justify-center">
            <div className="text-center w-full">
              {!isFlipped ? (
                <>
                  <h3 className="mn-serif-font text-2xl font-bold mb-4">{card.question}</h3>
                  <p className="text-sm text-[hsl(var(--mn-muted))] mt-4">
                    Klikněte pro zobrazení odpovědi
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-[hsl(var(--mn-muted))] mb-2">Odpověď:</p>
                  <h3 className="mn-ui-font text-xl font-bold mb-4">{card.answer}</h3>
                  {card.explanation && (
                    <p className="text-sm text-[hsl(var(--mn-muted))] mt-4">
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
            <XCircle className="w-6 h-6 mb-2 text-[hsl(var(--mn-danger))]" />
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
            <CheckCircle className="w-6 h-6 mb-2 text-[hsl(var(--mn-success))]" />
            <span>Dobře</span>
          </Button>

          <Button
            onClick={() => handleAnswer(5)}
            variant="outline"
            className="flex-col h-auto py-4"
          >
            <Zap className="w-6 h-6 mb-2 text-[hsl(var(--mn-accent-2))]" />
            <span>Snadné</span>
          </Button>
        </div>
      )}

      {/* Stats */}
      <Card className="bg-[hsl(var(--mn-surface))] border-[hsl(var(--mn-border))]">
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
            <div className="text-[hsl(var(--mn-muted))]">
              {flashcards.length - currentIndex - 1} zbývá
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
