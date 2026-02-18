import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Target,
  Clock,
  Brain,
  Zap,
  TrendingUp,
  Settings,
  Play,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function TestGeneratorV2() {
  const { user } = useAuth();
  const { track } = useAnalytics();
  const navigate = useNavigate();

  // Test configuration
  const [selectedObor, setSelectedObor] = useState('');
  const [selectedOkruhy, setSelectedOkruhy] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [difficulty, setDifficulty] = useState('mixed');
  const [timeLimit, setTimeLimit] = useState(30); // minutes
  const [mode, setMode] = useState('practice'); // practice or timed

  // Fetch obory with question counts
  const { data: obory = [] } = useQuery({
    queryKey: ['obory-with-questions'],
    queryFn: async () => {
      const { data: allObory, error } = await supabase
        .from('obory')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      
      // Get question counts per obor
      const { data: qCounts } = await supabase
        .from('questions')
        .select('topics!inner(obor_id)');
      
      const countMap = {};
      (qCounts || []).forEach(q => {
        const oborId = q.topics?.obor_id;
        if (oborId) countMap[oborId] = (countMap[oborId] || 0) + 1;
      });
      
      return (allObory || []).map(o => ({
        ...o,
        question_count: countMap[o.id] || 0
      })).sort((a, b) => b.question_count - a.question_count);
    }
  });

  // Fetch okruhy for selected obor
  const { data: okruhy = [] } = useQuery({
    queryKey: ['okruhy', selectedObor],
    queryFn: async () => {
      if (!selectedObor) return [];
      
      const { data, error } = await supabase
        .from('okruhy')
        .select('*')
        .eq('obor_id', selectedObor)
        .eq('is_active', true)
        .order('order_index');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedObor
  });

  // Fetch topics for selected okruhy
  const { data: topics = [] } = useQuery({
    queryKey: ['topics', selectedOkruhy],
    queryFn: async () => {
      if (selectedOkruhy.length === 0) return [];
      
      const { data, error } = await supabase
        .from('topics')
        .select('id, title, okruh_id')
        .in('okruh_id', selectedOkruhy)
        .eq('status', 'published');
      
      if (error) throw error;
      return data || [];
    },
    enabled: selectedOkruhy.length > 0
  });

  // Available questions count
  const { data: availableQuestionsCount = 0 } = useQuery({
    queryKey: ['questionsCount', selectedTopics],
    queryFn: async () => {
      if (selectedTopics.length === 0) return 0;
      
      const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .in('topic_id', selectedTopics);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: selectedTopics.length > 0
  });

  const handleOborChange = (oborId) => {
    setSelectedObor(oborId);
    setSelectedOkruhy([]);
    setSelectedTopics([]);
  };

  const handleOkruhToggle = (okruhId) => {
    setSelectedOkruhy(prev => 
      prev.includes(okruhId) 
        ? prev.filter(id => id !== okruhId)
        : [...prev, okruhId]
    );
    // Reset topics when okruhy change
    setSelectedTopics([]);
  };

  const handleTopicToggle = (topicId) => {
    setSelectedTopics(prev => 
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleSelectAllOkruhy = () => {
    if (selectedOkruhy.length === okruhy.length) {
      setSelectedOkruhy([]);
      setSelectedTopics([]);
    } else {
      setSelectedOkruhy(okruhy.map(o => o.id));
    }
  };

  const handleSelectAllTopics = () => {
    if (selectedTopics.length === topics.length) {
      setSelectedTopics([]);
    } else {
      setSelectedTopics(topics.map(t => t.id));
    }
  };

  const handleGenerateTest = async () => {
    if (selectedTopics.length === 0) {
      toast.error('Vyberte alespoň jedno téma!');
      return;
    }

    if (availableQuestionsCount < questionCount) {
      toast.error(`K dispozici je pouze ${availableQuestionsCount} otázek. Snižte počet otázek v testu.`);
      return;
    }

    // Create test session
    try {
      const { data: session, error } = await supabase
        .from('test_sessions')
        .insert({
          user_id: user.id,
          topic_ids: selectedTopics,
          question_count: questionCount,
          difficulty: difficulty,
          time_limit_minutes: mode === 'timed' ? timeLimit : null,
          mode: mode,
          status: 'in_progress'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Test vygenerován!');
      track('test_generated', { question_count: questionCount, topic_count: selectedTopics.length });
      navigate(`${createPageUrl('TestSessionV2')}?id=${session.id}`);
    } catch (error) {
      console.error('Error creating test:', error);
      toast.error('Chyba při vytváření testu');
    }
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Generátor Testů</h1>
        <p className="text-muted-foreground">
          Vytvořte si vlastní test podle vašich potřeb
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column - Configuration */}
        <div className="md:col-span-2 space-y-6">
          {/* Step 1: Select Obor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[hsl(var(--mn-accent)/0.12)] text-[hsl(var(--mn-accent))] flex items-center justify-center font-bold">
                  1
                </span>
                Vyberte obor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedObor} onValueChange={handleOborChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte obor..." />
                </SelectTrigger>
                <SelectContent>
                  {obory.filter(o => o.question_count > 0).map((obor) => (
                    <SelectItem key={obor.id} value={obor.id}>
                      {obor.name} ({obor.question_count} otázek)
                    </SelectItem>
                  ))}
                  {obory.filter(o => o.question_count === 0).length > 0 && (
                    <SelectItem value="__disabled__" disabled>
                      ── Bez otázek ──
                    </SelectItem>
                  )}
                  {obory.filter(o => o.question_count === 0).map((obor) => (
                    <SelectItem key={obor.id} value={obor.id} disabled>
                      {obor.name} (připravujeme)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Step 2: Select Okruhy */}
          {selectedObor && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-[hsl(var(--mn-accent)/0.12)] text-[hsl(var(--mn-accent))] flex items-center justify-center font-bold">
                      2
                    </span>
                    Vyberte okruhy
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSelectAllOkruhy}
                  >
                    {selectedOkruhy.length === okruhy.length ? 'Zrušit vše' : 'Vybrat vše'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {okruhy.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Žádné okruhy k dispozici
                  </p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {okruhy.map((okruh) => (
                      <div
                        key={okruh.id}
                        className="flex items-center space-x-2 p-3 rounded-xl border hover:bg-[hsl(var(--mn-surface))] hover:bg-[hsl(var(--mn-surface-2))] cursor-pointer"
                        onClick={() => handleOkruhToggle(okruh.id)}
                      >
                        <Checkbox
                          checked={selectedOkruhy.includes(okruh.id)}
                          onCheckedChange={() => handleOkruhToggle(okruh.id)}
                        />
                        <Label className="flex-1 cursor-pointer">
                          {okruh.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Select Topics */}
          {selectedOkruhy.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-[hsl(var(--mn-accent)/0.12)] text-[hsl(var(--mn-accent))] flex items-center justify-center font-bold">
                      3
                    </span>
                    Vyberte témata
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSelectAllTopics}
                  >
                    {selectedTopics.length === topics.length ? 'Zrušit vše' : 'Vybrat vše'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {topics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Žádná témata k dispozici pro vybrané okruhy
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {topics.map((topic) => (
                      <div
                        key={topic.id}
                        className="flex items-center space-x-2 p-3 rounded-xl border hover:bg-[hsl(var(--mn-surface))] hover:bg-[hsl(var(--mn-surface-2))] cursor-pointer"
                        onClick={() => handleTopicToggle(topic.id)}
                      >
                        <Checkbox
                          checked={selectedTopics.includes(topic.id)}
                          onCheckedChange={() => handleTopicToggle(topic.id)}
                        />
                        <Label className="flex-1 cursor-pointer">
                          {topic.title}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Test Settings */}
          {selectedTopics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-[hsl(var(--mn-accent)/0.12)] text-[hsl(var(--mn-accent))] flex items-center justify-center font-bold">
                    4
                  </span>
                  Nastavení testu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Question Count */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Počet otázek</Label>
                    <Badge variant="outline">{questionCount} otázek</Badge>
                  </div>
                  <Slider
                    value={[questionCount]}
                    onValueChange={(value) => setQuestionCount(value[0])}
                    min={5}
                    max={Math.min(100, availableQuestionsCount)}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    K dispozici: {availableQuestionsCount} otázek
                  </p>
                </div>

                {/* Difficulty */}
                <div className="space-y-3">
                  <Label>Obtížnost</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Snadné</SelectItem>
                      <SelectItem value="medium">Střední</SelectItem>
                      <SelectItem value="hard">Těžké</SelectItem>
                      <SelectItem value="mixed">Smíšené</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mode */}
                <div className="space-y-3">
                  <Label>Režim</Label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="practice">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4" />
                          Procvičování (bez časového limitu)
                        </div>
                      </SelectItem>
                      <SelectItem value="timed">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Časovaný test
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Time Limit (if timed) */}
                {mode === 'timed' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Časový limit</Label>
                      <Badge variant="outline">{timeLimit} minut</Badge>
                    </div>
                    <Slider
                      value={[timeLimit]}
                      onValueChange={(value) => setTimeLimit(value[0])}
                      min={10}
                      max={120}
                      step={5}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Souhrn
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Okruhy:</span>
                  <Badge>{selectedOkruhy.length}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Témata:</span>
                  <Badge>{selectedTopics.length}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Otázky:</span>
                  <Badge>{questionCount}</Badge>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {difficulty === 'mixed' ? 'Smíšená obtížnost' : 
                     difficulty === 'easy' ? 'Snadné' :
                     difficulty === 'medium' ? 'Střední' : 'Těžké'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  {mode === 'timed' ? (
                    <>
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{timeLimit} minut</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Bez časového limitu</span>
                    </>
                  )}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateTest}
                disabled={selectedTopics.length === 0 || availableQuestionsCount < questionCount}
                className="w-full"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                Spustit test
              </Button>

              {selectedTopics.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Vyberte témata pro vytvoření testu
                </p>
              )}

              {availableQuestionsCount < questionCount && selectedTopics.length > 0 && (
                <p className="text-xs text-[hsl(var(--mn-danger))] text-center">
                  Nedostatek otázek ({availableQuestionsCount}/{questionCount})
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
