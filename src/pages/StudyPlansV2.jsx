import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar,
  Target,
  TrendingUp,
  Plus,
  CheckCircle,
  Clock,
  BookOpen,
  Sparkles,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

export default function StudyPlansV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_exam: '',
    target_date: '',
    daily_goal_minutes: 60
  });

  // Fetch user's study plans
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['studyPlans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Get recommended topics based on weak areas
  const { data: weakTopics = [] } = useQuery({
    queryKey: ['weakTopics', user?.id],
    queryFn: async () => {
      // Get test sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('test_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (sessionsError) throw sessionsError;
      if (!sessions.length) return [];

      const sessionIds = sessions.map(s => s.id);

      // Get answers with low success rate
      const { data: answers, error: answersError } = await supabase
        .from('test_answers')
        .select(`
          is_correct,
          questions (
            topic_id,
            topics (
              id,
              title,
              okruhy (name)
            )
          )
        `)
        .in('session_id', sessionIds);

      if (answersError) throw answersError;

      // Calculate success rate per topic
      const topicStats = {};
      answers.forEach(answer => {
        const topicId = answer.questions?.topic_id;
        if (!topicId) return;

        if (!topicStats[topicId]) {
          topicStats[topicId] = {
            topic: answer.questions.topics,
            total: 0,
            correct: 0
          };
        }

        topicStats[topicId].total++;
        if (answer.is_correct) topicStats[topicId].correct++;
      });

      // Return topics with < 70% success rate
      return Object.values(topicStats)
        .filter(stat => (stat.correct / stat.total) < 0.7)
        .map(stat => ({
          ...stat.topic,
          successRate: (stat.correct / stat.total) * 100
        }))
        .sort((a, b) => a.successRate - b.successRate)
        .slice(0, 5);
    },
    enabled: !!user?.id
  });

  // Create plan mutation
  const createPlan = useMutation({
    mutationFn: async (planData) => {
      const { data, error } = await supabase
        .from('study_plans')
        .insert({
          user_id: user.id,
          ...planData,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Plán vytvořen!');
      queryClient.invalidateQueries(['studyPlans']);
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        target_exam: '',
        target_date: '',
        daily_goal_minutes: 60
      });
    },
    onError: () => {
      toast.error('Chyba při vytváření plánu');
    }
  });

  const handleCreatePlan = () => {
    if (!formData.title) {
      toast.error('Zadejte název plánu');
      return;
    }

    createPlan.mutate(formData);
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { label: 'Aktivní', variant: 'default' },
      completed: { label: 'Dokončeno', variant: 'default' },
      paused: { label: 'Pozastaveno', variant: 'secondary' }
    };
    return badges[status] || badges.active;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Studijní Plány</h1>
          <p className="text-muted-foreground">
            Personalizované plány na míru vašim cílům
          </p>
        </div>

        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nový plán
        </Button>
      </div>

      {/* AI Recommendations */}
      {weakTopics.length > 0 && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Doporučení
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              Na základě vašich testů doporučujeme procvičit tato témata:
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {weakTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{topic.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {topic.okruhy?.name}
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {topic.successRate.toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4" variant="outline">
              <Target className="w-4 h-4 mr-2" />
              Vytvořit plán pro slabé stránky
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Plan Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Vytvořit nový plán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Název plánu *</Label>
                <Input
                  placeholder="např. Příprava na LÍČENÍ"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Cílová zkouška</Label>
                <Input
                  placeholder="např. LÍČENÍ 2026"
                  value={formData.target_exam}
                  onChange={(e) => setFormData({ ...formData, target_exam: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Popis</Label>
              <Textarea
                placeholder="Popište cíle a zaměření plánu..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cílové datum</Label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Denní cíl (minuty)</Label>
                <Input
                  type="number"
                  value={formData.daily_goal_minutes}
                  onChange={(e) => setFormData({ ...formData, daily_goal_minutes: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="flex-1"
              >
                Zrušit
              </Button>
              <Button
                onClick={handleCreatePlan}
                className="flex-1"
                disabled={createPlan.isPending}
              >
                Vytvořit plán
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Plans */}
      {plans.length === 0 && !showCreateForm ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">Zatím žádné plány</h3>
            <p className="text-muted-foreground mb-6">
              Vytvořte si personalizovaný studijní plán
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Vytvořit první plán
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const statusBadge = getStatusBadge(plan.status);
            const daysUntilExam = plan.target_date 
              ? Math.ceil((new Date(plan.target_date) - new Date()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-2">{plan.title}</CardTitle>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground">
                          {plan.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={statusBadge.variant}>
                      {statusBadge.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Target Exam */}
                  {plan.target_exam && (
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <span>{plan.target_exam}</span>
                    </div>
                  )}

                  {/* Days Until */}
                  {daysUntilExam !== null && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {daysUntilExam > 0 
                          ? `${daysUntilExam} dní do zkoušky`
                          : daysUntilExam === 0
                            ? 'Zkouška dnes!'
                            : 'Zkouška proběhla'
                        }
                      </span>
                    </div>
                  )}

                  {/* Daily Goal */}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{plan.daily_goal_minutes} minut denně</span>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pokrok</span>
                      <span>0%</span>
                    </div>
                    <Progress value={0} className="h-2" />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Pokračovat
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
