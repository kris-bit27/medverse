import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronLeft,
  Play,
  Shuffle,
  Settings2
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function TestGenerator() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedOkruh = urlParams.get('okruh');

  const [selectedOkruh, setSelectedOkruh] = useState(preselectedOkruh || 'all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [questionCount, setQuestionCount] = useState([10]);
  const [difficultyRange, setDifficultyRange] = useState([1, 5]);
  const [includeNew, setIncludeNew] = useState(true);
  const [includeLearning, setIncludeLearning] = useState(true);
  const [includeMastered, setIncludeMastered] = useState(false);

  const { user } = useAuth();

  const { data: okruhy = [], isLoading } = useQuery({
    queryKey: ['okruhy'],
    queryFn: async () => {
      const { data } = await supabase.from('okruhy').select('*').order('order_index');
      return data || [];
    }
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data } = await supabase.from('topics').select('*');
      return data || [];
    }
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: async () => {
      const { data } = await supabase.from('questions').select('*');
      return data || [];
    }
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['userFlashcardProgress', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_flashcard_progress').select('*').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id
  });

  // Filter topics by selected okruh
  const filteredTopics = useMemo(() => {
    if (selectedOkruh === 'all') return topics;
    return topics.filter(t => t.okruh_id === selectedOkruh);
  }, [topics, selectedOkruh]);

  // Calculate available questions based on filters
  const availableQuestions = useMemo(() => {
    let filtered = questions;

    // Filter by okruh
    if (selectedOkruh !== 'all') {
      filtered = filtered.filter(q => q.okruh_id === selectedOkruh);
    }

    // Filter by topic
    if (selectedTopic !== 'all') {
      filtered = filtered.filter(q => q.topic_id === selectedTopic);
    }

    // Filter by difficulty
    filtered = filtered.filter(q => {
      const diff = q.difficulty || 1;
      return diff >= difficultyRange[0] && diff <= difficultyRange[1];
    });

    // Filter by progress status
    filtered = filtered.filter(q => {
      const p = progress.find(pr => pr.question_id === q.id);
      const status = p?.status || 'new';
      
      if (status === 'new' && !includeNew) return false;
      if (status === 'learning' && !includeLearning) return false;
      if (status === 'mastered' && !includeMastered) return false;
      
      return true;
    });

    return filtered;
  }, [questions, selectedOkruh, selectedTopic, difficultyRange, progress, includeNew, includeLearning, includeMastered]);

  const handleStartTest = () => {
    // Shuffle and pick questions
    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, questionCount[0]);
    
    // Store in session and navigate
    sessionStorage.setItem('testQuestions', JSON.stringify(selected.map(q => q.id)));
    window.location.href = createPageUrl('TestSession');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" asChild>
          <Link to={createPageUrl('Atestace')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Zpět
          </Link>
        </Button>
      </div>

      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
          <Settings2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Generátor testu
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Nastavte parametry a vygenerujte testové otázky
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Okruh selection */}
          <div className="space-y-2">
            <Label>Okruh</Label>
            <Select value={selectedOkruh} onValueChange={(v) => { setSelectedOkruh(v); setSelectedTopic('all'); }}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte okruh" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny okruhy</SelectItem>
                {okruhy.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Topic selection */}
          <div className="space-y-2">
            <Label>Téma</Label>
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte téma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechna témata</SelectItem>
                {filteredTopics.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Question count */}
          <div className="space-y-4">
            <div className="flex justify-between">
              <Label>Počet otázek</Label>
              <span className="font-semibold text-teal-600">{questionCount[0]}</span>
            </div>
            <Slider
              value={questionCount}
              onValueChange={setQuestionCount}
              min={5}
              max={Math.min(50, availableQuestions.length || 50)}
              step={5}
            />
          </div>

          {/* Difficulty */}
          <div className="space-y-4">
            <div className="flex justify-between">
              <Label>Obtížnost</Label>
              <span className="text-sm text-slate-500">
                {difficultyRange[0]} - {difficultyRange[1]}
              </span>
            </div>
            <Slider
              value={difficultyRange}
              onValueChange={setDifficultyRange}
              min={1}
              max={5}
              step={1}
            />
          </div>

          {/* Status filters */}
          <div className="space-y-3">
            <Label>Zahrnout otázky</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="new" 
                  checked={includeNew} 
                  onCheckedChange={setIncludeNew} 
                />
                <label htmlFor="new" className="text-sm">Nové (nezkoušené)</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="learning" 
                  checked={includeLearning} 
                  onCheckedChange={setIncludeLearning} 
                />
                <label htmlFor="learning" className="text-sm">V učení</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="mastered" 
                  checked={includeMastered} 
                  onCheckedChange={setIncludeMastered} 
                />
                <label htmlFor="mastered" className="text-sm">Zvládnuté</label>
              </div>
            </div>
          </div>

          {/* Available count */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              K dispozici <span className="font-semibold text-slate-900 dark:text-white">{availableQuestions.length}</span> otázek
            </p>
          </div>

          {/* Start button */}
          <Button
            onClick={handleStartTest}
            disabled={availableQuestions.length === 0}
            className="w-full h-12 bg-teal-600 hover:bg-teal-700"
          >
            <Shuffle className="w-4 h-4 mr-2" />
            Vygenerovat test
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}