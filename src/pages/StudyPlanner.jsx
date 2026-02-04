import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  Clock,
  TrendingUp,
  Target,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import PlannerCalendar from '@/components/planner/PlannerCalendar';
import TaskList from '@/components/planner/TaskList';
import { format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function StudyPlanner() {
  const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.items)) return value.items;
    return [];
  };

  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: myPlansRaw, isLoading: loadingMyPlans } = useQuery({
    queryKey: ['myStudyPlans', user?.id],
    queryFn: () => base44.entities.StudyPlan.filter({ user_id: user.id }),
    enabled: !!user
  });
  const myPlans = asArray(myPlansRaw);

  const { data: sharedPlansRaw, isLoading: loadingSharedPlans } = useQuery({
    queryKey: ['sharedStudyPlans', user?.id],
    queryFn: async () => {
      const all = await base44.entities.StudyPlan.list();
      const allPlans = asArray(all);
      return allPlans.filter(p => 
        p.collaborators?.some(c => c.user_id === user.id) && 
        p.user_id !== user.id
      );
    },
    enabled: !!user
  });
  const sharedPlans = asArray(sharedPlansRaw);

  const plans = [...myPlans, ...sharedPlans];

  const activePlan = plans.find(p => p.is_active);

  const { data: allTasksRaw, isLoading: loadingTasks } = useQuery({
    queryKey: ['studyTasks', user?.id],
    queryFn: () => base44.entities.StudyTask.filter({ user_id: user.id }),
    enabled: !!user
  });
  const allTasks = asArray(allTasksRaw);

  const todayTasks = allTasks.filter(t => 
    isToday(new Date(t.scheduled_date)) && !t.is_completed
  );

  const upcomingTasks = allTasks.filter(t => 
    !isPast(startOfDay(new Date(t.scheduled_date))) && 
    !isToday(new Date(t.scheduled_date)) &&
    !t.is_completed
  ).slice(0, 10);

  const overdueTasks = allTasks.filter(t => 
    isPast(startOfDay(new Date(t.scheduled_date))) && 
    !isToday(new Date(t.scheduled_date)) &&
    !t.is_completed
  );

  const completedTodayCount = allTasks.filter(t => 
    isToday(new Date(t.scheduled_date)) && t.is_completed
  ).length;

  const totalTodayCount = allTasks.filter(t => 
    isToday(new Date(t.scheduled_date))
  ).length;

  const todayProgress = totalTodayCount > 0 
    ? Math.round((completedTodayCount / totalTodayCount) * 100) 
    : 0;

  const completeTaskMutation = useMutation({
    mutationFn: ({ taskId, completed }) => 
      base44.entities.StudyTask.update(taskId, {
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['studyTasks']);
    }
  });

  if (loadingMyPlans || loadingSharedPlans || loadingTasks) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-teal-600" />
            Studijní plánovač
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Organizujte své studium s pomocí AI asistenta
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={createPageUrl('StudyPlanAI')}>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Personalizace
            </Link>
          </Button>
          <Button asChild className="bg-teal-600 hover:bg-teal-700">
            <Link to={createPageUrl('StudyPlanCreate')}>
              <Plus className="w-4 h-4 mr-2" />
              Nový plán
            </Link>
          </Button>
        </div>
      </div>

      {/* Active plan banner */}
      {activePlan && (
        <Card className="mb-6 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-5 h-5 text-teal-600" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {activePlan.title}
                  </h3>
                  {activePlan.is_ai_generated && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Cíl: {activePlan.goal} • Do: {format(new Date(activePlan.target_date), 'd. MMMM yyyy', { locale: cs })}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-white dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-teal-600 transition-all"
                      style={{ width: `${activePlan.progress_percentage || 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-teal-600">
                    {activePlan.progress_percentage || 0}%
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to={createPageUrl('StudyPlanDetail') + `?id=${activePlan.id}`}>
                  Detail
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Dnešní úkoly</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {completedTodayCount}/{totalTodayCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-teal-600" />
              </div>
            </div>
            <div className="mt-2 text-xs text-teal-600 font-medium">
              {todayProgress}% dokončeno
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Nadcházející</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {upcomingTasks.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Po termínu</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {overdueTasks.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Aktivní plány</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {plans.filter(p => p.is_active).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="today">
            <TabsList>
              <TabsTrigger value="today">Dnes</TabsTrigger>
              <TabsTrigger value="upcoming">Nadcházející</TabsTrigger>
              <TabsTrigger value="overdue">Po termínu</TabsTrigger>
              <TabsTrigger value="completed">Dokončené</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="mt-4">
              {todayTasks.length > 0 ? (
                <TaskList 
                  tasks={todayTasks} 
                  onComplete={(taskId, completed) => completeTaskMutation.mutate({ taskId, completed })}
                />
              ) : (
                <EmptyState
                  icon={CheckCircle2}
                  title="Žádné úkoly na dnes"
                  description="Užijte si volný den nebo přidejte nové úkoly!"
                />
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="mt-4">
              {upcomingTasks.length > 0 ? (
                <TaskList 
                  tasks={upcomingTasks} 
                  onComplete={(taskId, completed) => completeTaskMutation.mutate({ taskId, completed })}
                />
              ) : (
                <EmptyState
                  icon={Clock}
                  title="Žádné nadcházející úkoly"
                  description="Naplánujte si nové úkoly nebo požádejte AI o pomoc"
                />
              )}
            </TabsContent>

            <TabsContent value="overdue" className="mt-4">
              {overdueTasks.length > 0 ? (
                <TaskList 
                  tasks={overdueTasks} 
                  onComplete={(taskId, completed) => completeTaskMutation.mutate({ taskId, completed })}
                  showOverdue
                />
              ) : (
                <EmptyState
                  icon={CheckCircle2}
                  title="Nemáte žádné úkoly po termínu"
                  description="Skvělá práce! Máte vše pod kontrolou."
                />
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <TaskList 
                tasks={allTasks.filter(t => t.is_completed).slice(0, 20)} 
                onComplete={(taskId, completed) => completeTaskMutation.mutate({ taskId, completed })}
                showCompleted
              />
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Kalendář</CardTitle>
            </CardHeader>
            <CardContent>
              <PlannerCalendar 
                tasks={allTasks}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
