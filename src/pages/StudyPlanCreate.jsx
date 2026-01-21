import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Loader2, Sparkles } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import AICopilotChat from '@/components/ai/AICopilotChat';

export default function StudyPlanCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyHours, setDailyHours] = useState('2');
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [showAI, setShowAI] = useState(true);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: disciplines = [], isLoading: loadingDisciplines } = useQuery({
    queryKey: ['clinicalDisciplines'],
    queryFn: () => base44.entities.ClinicalDiscipline.list()
  });

  const { data: packages = [], isLoading: loadingPackages } = useQuery({
    queryKey: ['myStudyPackages', user?.id],
    queryFn: () => base44.entities.StudyPackage.filter({ created_by: user.email }),
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const plan = await base44.entities.StudyPlan.create(data);
      return plan;
    },
    onSuccess: (plan) => {
      queryClient.invalidateQueries(['studyPlans']);
      navigate(createPageUrl('StudyPlanDetail') + `?id=${plan.id}`);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const planData = {
      user_id: user.id,
      title,
      description,
      goal,
      target_date: targetDate,
      start_date: startDate,
      daily_study_hours: parseFloat(dailyHours),
      clinical_discipline_ids: selectedDisciplines,
      study_package_ids: selectedPackages,
      is_active: true,
      is_ai_generated: false,
      progress_percentage: 0
    };

    createMutation.mutate(planData);
  };

  if (loadingDisciplines || loadingPackages) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Vytvořit studijní plán
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Nastavte dlouhodobý cíl a AI Copilot vám pomůže s rozpisem
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Základní informace</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Název plánu *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="např. Příprava na atestaci 2026"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">Hlavní cíl *</Label>
                  <Input
                    id="goal"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="např. Úspěšně složit atestaci z kardiologie"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Popis</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Podrobnosti o plánu a motivace..."
                    rows={3}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Začátek plánu *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetDate">Cílové datum *</Label>
                    <Input
                      id="targetDate"
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dailyHours">Hodin denně</Label>
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
                <CardTitle>Klinické obory</CardTitle>
                <CardDescription>
                  Vyberte obory, na které se chcete zaměřit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {disciplines.map(d => (
                    <div 
                      key={d.id}
                      className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
                        {d.name}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {packages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Studijní balíčky</CardTitle>
                  <CardDescription>
                    Zahrnout balíčky do plánu
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {packages.map(p => (
                      <div 
                        key={p.id}
                        className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Checkbox
                          id={`pkg-${p.id}`}
                          checked={selectedPackages.includes(p.id)}
                          onCheckedChange={(checked) => {
                            setSelectedPackages(checked
                              ? [...selectedPackages, p.id]
                              : selectedPackages.filter(id => id !== p.id)
                            );
                          }}
                        />
                        <label htmlFor={`pkg-${p.id}`} className="text-sm cursor-pointer flex-1">
                          {p.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={createMutation.isPending || !title || !goal || !targetDate}
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Vytvořit plán
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Zrušit
              </Button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI Copilot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Požádejte AI o pomoc s vytvořením studijního plánu a rozpisem úkolů!
              </p>
              <Button 
                onClick={() => setShowAI(!showAI)} 
                variant="outline" 
                className="w-full mb-4"
              >
                {showAI ? 'Skrýt AI' : 'Otevřít AI chat'}
              </Button>
              {showAI && <AICopilotChat agentName="copilot" />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}