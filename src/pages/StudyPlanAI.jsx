import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { callApi } from '@/lib/api';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, ChevronLeft, Target, BookOpen, Calendar } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { addDays, addWeeks, format } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function StudyPlanAI() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [dailyHours, setDailyHours] = useState('2');
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; }
  });

  const { data: disciplines = [], isLoading: loadingDisciplines } = useQuery({
    queryKey: ['clinicalDisciplines'],
    queryFn: () => supabase.from('obory').select('*').order('order_index').then(r => r.data || [])
  });

  const { data: okruhy = [] } = useQuery({
    queryKey: ['okruhy'],
    queryFn: () => supabase.from('okruhy').select('*').then(r => r.data || []),
    enabled: selectedDisciplines.length > 0
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => supabase.from('topics').select('*').then(r => r.data || []),
    enabled: selectedDisciplines.length > 0
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: () => supabase.from('user_flashcard_progress').select('*').eq('user_id', user.id).then(r => r.data || []),
    enabled: !!user
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => supabase.from('questions').select('*').then(r => r.data || []),
    enabled: selectedDisciplines.length > 0
  });

  const createPlanMutation = useMutation({
    mutationFn: async ({ plan, tasks }) => {
      const createdPlan = await supabase.from('study_plans').insert(plan).select().single().then(r => r.data);
      if (tasks && tasks.length > 0) {
        await supabase.from('study_plan_items').insert((
          tasks.map(t => ({ ...t, study_plan_id: createdPlan.id, user_id: user.id }).select().then(r => r.data)))
        );
      }
      return createdPlan;
    },
    onSuccess: (plan) => {
      navigate(createPageUrl('StudyPlanDetail') + `?id=${plan.id}`);
    }
  });

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    try {
      // Prepare user progress context
      const selectedOkruhy = okruhy.filter(o => selectedDisciplines.includes(o.clinical_discipline_id));
      const selectedTopics = topics.filter(t => 
        selectedOkruhy.some(o => o.id === t.okruh_id)
      );
      const selectedQuestions = questions.filter(q => 
        selectedOkruhy.some(o => o.id === q.okruh_id)
      );

      const masteredCount = progress.filter(p => 
        p.status === 'mastered' && 
        selectedQuestions.some(q => q.id === p.question_id)
      ).length;

      const weakTopics = selectedTopics
        .map(topic => {
          const topicQuestions = selectedQuestions.filter(q => q.topic_id === topic.id);
          const topicProgress = progress.filter(p => 
            topicQuestions.some(q => q.id === p.question_id)
          );
          const mastered = topicProgress.filter(p => p.status === 'mastered').length;
          const percentage = topicQuestions.length > 0 ? mastered / topicQuestions.length : 0;
          return { topic, percentage, questionCount: topicQuestions.length };
        })
        .filter(t => t.questionCount > 0)
        .sort((a, b) => a.percentage - b.percentage)
        .slice(0, 5);

      const startDate = new Date();
      const endDate = new Date(targetDate);
      const daysAvailable = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));

      const weakTopicsSummary = weakTopics
        .slice(0, 10)
        .map(t => `${t.topic.title} (${Math.round(t.percentage * 100)}%)`)
        .join(', ');

      const prompt = `Vytvoř personalizovaný studijní plán pro přípravu na lékařskou atestaci.

**Uživatelův profil:**
- Cíl: ${goal}
- Termín: ${format(endDate, 'd. MMMM yyyy', { locale: cs })} (za ${daysAvailable} dní)
- Denní čas na studium: ${dailyHours} hodin
- Vybrané klinické obory: ${disciplines.filter(d => selectedDisciplines.includes(d.id)).map(d => d.name).join(', ')}

**Aktuální pokrok:**
- Celkem otázek v oblasti: ${selectedQuestions.length}
- Zvládnutých: ${masteredCount} (${Math.round(masteredCount/selectedQuestions.length*100)}%)
- Témata k posílení: ${weakTopicsSummary}

**Dostupná témata pro studium:**
${selectedTopics.slice(0, 20).map(t => `- ${t.title}`).join('\n')}

**Úkol:**
Na základě pokroku uživatele vytvoř strukturovaný studijní plán s konkrétními úkoly na každý týden. Plán by měl:
1. Prioritizovat slabá témata
2. Zahrnout pravidelné opakování
3. Stupňovat obtížnost
4. Být realistický vzhledem k dostupnému času

Vrať JSON s týdenním rozpisu úkolů.`;

      const response = await callApi('invokeLLM', {
        user_id: user?.id,
        prompt,
        model: 'gemini-1.5-pro',
        maxTokens: 2048,
        response_json_schema: {
          type: "object",
          properties: {
            plan_title: { type: "string" },
            plan_description: { type: "string" },
            weekly_tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  week: { type: "number" },
                  title: { type: "string" },
                  description: { type: "string" },
                  topics: {
                    type: "array",
                    items: { type: "string" }
                  },
                  estimated_hours: { type: "number" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      if (!response || !Array.isArray(response.weekly_tasks)) {
        throw new Error('AI nevrátila validní studijní plán');
      }

      // Convert to plan and tasks
      const planData = {
        user_id: user.id,
        title: response.plan_title,
        description: response.plan_description,
        goal,
        target_date: targetDate,
        start_date: startDate.toISOString().split('T')[0],
        daily_study_hours: parseFloat(dailyHours),
        clinical_discipline_ids: selectedDisciplines,
        is_active: true,
        is_ai_generated: true,
        progress_percentage: 0
      };

      const tasks = [];
      response.weekly_tasks.forEach(week => {
        const weekStart = addWeeks(startDate, week.week - 1);
        
        // Create study task for each topic in the week
        week.topics.forEach((topicTitle, idx) => {
          const matchedTopic = selectedTopics.find(t => 
            t.title.toLowerCase().includes(topicTitle.toLowerCase()) ||
            topicTitle.toLowerCase().includes(t.title.toLowerCase())
          );

          const taskDate = addDays(weekStart, idx);
          
          tasks.push({
            title: `${week.title}: ${topicTitle}`,
            description: week.description,
            task_type: 'custom',
            scheduled_date: format(taskDate, 'yyyy-MM-dd'),
            estimated_minutes: Math.round((week.estimated_hours / week.topics.length) * 60),
            is_completed: false,
            priority: week.week <= 2 ? 'high' : 'medium',
            related_question_ids: matchedTopic 
              ? selectedQuestions.filter(q => q.topic_id === matchedTopic.id).map(q => q.id).slice(0, 3)
              : []
          });
        });
      });

      setGeneratedPlan({ plan: planData, tasks, recommendations: response.recommendations });
      setStep(2);
    } catch (error) {
      console.error('AI generation error:', error);
      alert('Chyba při generování plánu. Zkuste to znovu.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreatePlan = async () => {
    if (generatedPlan) {
      createPlanMutation.mutate(generatedPlan);
    }
  };

  if (loadingDisciplines) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <Button variant="ghost" onClick={() => step === 1 ? navigate(-1) : setStep(1)} className="mb-4">
        <ChevronLeft className="w-4 h-4 mr-2" />
        Zpět
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[hsl(var(--mn-text))] mb-2 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-[hsl(var(--mn-accent))]" />
          AI Personalizovaný studijní plán
        </h1>
        <p className="text-[hsl(var(--mn-muted))]">
          AI analyzuje váš pokrok a vytvoří optimalizovaný plán přípravy
        </p>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Váš cíl
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal">Co chcete dosáhnout? *</Label>
                <Input
                  id="goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="např. Úspěšně složit atestaci z plastické chirurgie"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetDate">Cílové datum *</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailyHours">Kolik hodin denně můžete studovat?</Label>
                  <Input
                    id="dailyHours"
                    type="number"
                    value={dailyHours}
                    onChange={(e) => setDailyHours(e.target.value)}
                    min="0.5"
                    max="12"
                    step="0.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Klinické obory
              </CardTitle>
              <CardDescription>
                Vyberte obory, na které se chcete připravovat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {disciplines.map(d => (
                  <div 
                    key={d.id}
                    className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-[hsl(var(--mn-surface))] transition-colors"
                  >
                    <Checkbox
                      id={`disc-${d.id}`}
                      checked={selectedDisciplines.includes(d.id)}
                      onCheckedChange={(checked) => {
                        setSelectedDisciplines(checked
                          ? [...selectedDisciplines, d.id]
                          : selectedDisciplines.filter(id => id !== d.id)
                        );
                      }}
                    />
                    <label htmlFor={`disc-${d.id}`} className="text-sm cursor-pointer flex-1">
                      {d.icon} {d.name}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Alert className="bg-[hsl(var(--mn-accent)/0.08)] border-[hsl(var(--mn-accent)/0.2)] dark:border-[hsl(var(--mn-accent)/0.3)]">
            <Sparkles className="h-4 w-4 text-[hsl(var(--mn-accent))] dark:text-[hsl(var(--mn-accent))]" />
            <AlertDescription className="text-sm text-[hsl(var(--mn-accent))] dark:text-[hsl(var(--mn-accent))]">
              AI analyzuje váš aktuální pokrok a vytvoří personalizovaný plán se zaměřením na oblasti, které potřebují posílit.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleGeneratePlan}
            disabled={isGenerating || !goal || !targetDate || selectedDisciplines.length === 0}
            className="w-full bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)]"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                AI generuje váš plán...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Vygenerovat personalizovaný plán
              </>
            )}
          </Button>
        </div>
      )}

      {step === 2 && generatedPlan && (
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-[hsl(var(--mn-accent)/0.06)] to-[hsl(var(--mn-accent-2)/0.06)] border-[hsl(var(--mn-accent)/0.2)] dark:border-[hsl(var(--mn-accent)/0.3)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[hsl(var(--mn-accent))]" />
                {generatedPlan.plan.title}
              </CardTitle>
              <CardDescription>{generatedPlan.plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-[hsl(var(--mn-accent))]" />
                  <span className="font-medium">Cíl:</span>
                  <span className="text-[hsl(var(--mn-muted))]">{generatedPlan.plan.goal}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-[hsl(var(--mn-accent))]" />
                  <span className="font-medium">Do:</span>
                  <span className="text-[hsl(var(--mn-muted))]">
                    {format(new Date(generatedPlan.plan.target_date), 'd. MMMM yyyy', { locale: cs })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-[hsl(var(--mn-accent))]" />
                  <span className="font-medium">Úkolů:</span>
                  <span className="text-[hsl(var(--mn-muted))]">{generatedPlan.tasks.length}</span>
                </div>
              </div>

              {generatedPlan.recommendations && generatedPlan.recommendations.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-sm text-[hsl(var(--mn-text))] mb-2">
                    Doporučení AI:
                  </h4>
                  <ul className="space-y-1">
                    {generatedPlan.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-[hsl(var(--mn-muted))] flex items-start gap-2">
                        <span className="text-[hsl(var(--mn-accent))] mt-0.5">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Naplánované úkoly ({generatedPlan.tasks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {generatedPlan.tasks.slice(0, 20).map((task, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-[hsl(var(--mn-surface-2))]/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-[hsl(var(--mn-text))] mb-1">
                          {task.title}
                        </p>
                        <p className="text-xs text-[hsl(var(--mn-muted))]">
                          {task.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-xs">
                          {format(new Date(task.scheduled_date), 'd. MMM', { locale: cs })}
                        </Badge>
                        <span className="text-xs text-[hsl(var(--mn-muted))]">
                          ~{task.estimated_minutes} min
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {generatedPlan.tasks.length > 20 && (
                  <p className="text-center text-sm text-[hsl(var(--mn-muted))] py-2">
                    ...a dalších {generatedPlan.tasks.length - 20} úkolů
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              onClick={handleCreatePlan}
              disabled={createPlanMutation.isPending}
              className="flex-1 bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)]"
              size="lg"
            >
              {createPlanMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 mr-2" />
              )}
              Vytvořit tento plán
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setStep(1)}
              size="lg"
            >
              Upravit parametry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
