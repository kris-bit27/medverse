import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Target,
  Calendar,
  Clock,
  Users,
  Trash2,
  Edit,
  CheckCircle2,
  TrendingUp,
  Package,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import TaskList from '@/components/planner/TaskList';
import CollaborationDialog from '@/components/collaboration/CollaborationDialog';
import { format, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function StudyPlanDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const planId = urlParams.get('id');

  const [collaborationOpen, setCollaborationOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; }
  });

  const { data: plan, isLoading } = useQuery({
    queryKey: ['studyPlan', planId],
    queryFn: () => supabase.from('study_plans').select('*').eq('id', planId).single().then(r => r.data),
    enabled: !!planId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['planTasks', planId],
    queryFn: () => supabase.from('study_plan_items').select('*').eq('study_plan_id', planId).then(r => r.data || []),
    enabled: !!planId
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['planPackages', plan?.study_package_ids],
    queryFn: async () => {
      if (!plan?.study_package_ids?.length) return [];
      const all = await supabase.from('study_packages').select('*').then(r => r.data || []);
      return all.filter(p => plan.study_package_ids.includes(p.id));
    },
    enabled: !!plan?.study_package_ids
  });

  const { data: disciplines = [] } = useQuery({
    queryKey: ['planDisciplines', plan?.clinical_discipline_ids],
    queryFn: async () => {
      if (!plan?.clinical_discipline_ids?.length) return [];
      const all = await supabase.from('obory').select('*').order('order_index').then(r => r.data || []);
      return all.filter(d => plan.clinical_discipline_ids.includes(d.id));
    },
    enabled: !!plan?.clinical_discipline_ids
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => supabase.from('user_profiles').select('*').then(r => r.data || [])
  });

  const deleteMutation = useMutation({
    mutationFn: () => supabase.from('study_plans').delete().eq('id', planId),
    onSuccess: () => {
      queryClient.invalidateQueries(['studyPlans']);
      navigate(createPageUrl('StudyPlanner'));
    }
  });

  const completeTaskMutation = useMutation({
    mutationFn: ({ taskId, completed }) => 
      supabase.from('study_plan_items').update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null
      }).eq('id', taskId),
    onSuccess: () => {
      queryClient.invalidateQueries(['planTasks']);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6 lg:p-8 text-center">
        <p className="text-[hsl(var(--mn-muted))]">Plán nenalezen</p>
      </div>
    );
  }

  const isOwner = plan.user_id === user?.id;
  const collaborators = plan.collaborators || [];
  const collaboratorUsers = allUsers.filter(u => 
    collaborators.some(c => c.user_id === u.id)
  );

  const daysRemaining = differenceInDays(new Date(plan.target_date), new Date());
  const completedTasks = tasks.filter(t => t.is_completed).length;
  const totalTasks = tasks.length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zpět
      </Button>

      <span className="mn-caption text-[hsl(var(--mn-accent))]">STUDIJNÍ PLÁN</span>

      <div className="space-y-6">
        {/* Header */}
        <div className="mn-card p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-6 h-6 text-[hsl(var(--mn-accent))]" />
                  <h3 className="mn-ui-font font-semibold text-2xl">{plan.title}</h3>
                  {plan.is_ai_generated && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI
                    </Badge>
                  )}
                  {plan.is_active && (
                    <Badge className="bg-[hsl(var(--mn-success)/0.12)] text-[hsl(var(--mn-success))]">
                      Aktivní
                    </Badge>
                  )}
                </div>
                {plan.description && (
                  <p className="text-[hsl(var(--mn-muted))] mt-1 text-base mb-3">
                    {plan.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {plan.goal}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Do: {format(new Date(plan.target_date), 'd. MMMM yyyy', { locale: cs })}
                  </Badge>
                  {plan.daily_study_hours && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {plan.daily_study_hours}h denně
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  variant="outline"
                  onClick={() => setCollaborationOpen(true)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Spolupráce
                </Button>
                {isOwner && (
                  <>
                    <Button variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Upravit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="text-[hsl(var(--mn-danger))]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-[hsl(var(--mn-muted))] mb-2">Celkový pokrok</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-[hsl(var(--mn-text))]">
                      {plan.progress_percentage || 0}%
                    </span>
                    <Badge variant="secondary">{completedTasks}/{totalTasks} úkolů</Badge>
                  </div>
                  <Progress value={plan.progress_percentage || 0} className="h-2" />
                </div>
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--mn-muted))] mb-2">Zbývající čas</p>
                <div className="flex items-center gap-2">
                  {daysRemaining > 0 ? (
                    <>
                      <span className="text-2xl font-bold text-[hsl(var(--mn-accent))]">
                        {daysRemaining}
                      </span>
                      <span className="text-[hsl(var(--mn-muted))]">dní</span>
                    </>
                  ) : (
                    <Badge className="bg-[hsl(var(--mn-danger)/0.12)] text-[hsl(var(--mn-danger))]">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Po termínu
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--mn-muted))] mb-2">Spolupracovníci</p>
                <div className="flex items-center gap-2">
                  {collaboratorUsers.length > 0 ? (
                    <>
                      <div className="flex -space-x-2">
                        {collaboratorUsers.slice(0, 3).map(u => (
                          <Avatar key={u.id} className="w-8 h-8 border-2 border-white">
                            <AvatarFallback className="bg-[hsl(var(--mn-accent)/0.12)] text-[hsl(var(--mn-accent))] text-xs">
                              {u.full_name?.charAt(0) || u.email.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      {collaboratorUsers.length > 3 && (
                        <span className="text-sm text-[hsl(var(--mn-muted))]">
                          +{collaboratorUsers.length - 3}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-[hsl(var(--mn-muted))]">Bez spolupracovníků</span>
                  )}
                </div>
              </div>
            </div>
        </div>

        {/* Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="tasks">
              <TabsList>
                <TabsTrigger value="tasks">Úkoly</TabsTrigger>
                <TabsTrigger value="progress">Pokrok</TabsTrigger>
                <TabsTrigger value="collaborators">Spolupracovníci</TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="mt-4">
                <TaskList 
                  tasks={tasks} 
                  onComplete={(taskId, completed) => 
                    completeTaskMutation.mutate({ taskId, completed })
                  }
                />
              </TabsContent>

              <TabsContent value="progress" className="mt-4">
                <div className="mn-card p-5">
                  <h3 className="mn-ui-font font-semibold mb-4">Statistiky pokroku</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[hsl(var(--mn-surface-2))]">
                      <div>
                        <p className="text-sm text-[hsl(var(--mn-muted))]">Dokončené úkoly</p>
                        <p className="text-2xl font-bold text-[hsl(var(--mn-text))]">
                          {completedTasks}
                        </p>
                      </div>
                      <CheckCircle2 className="w-8 h-8 text-[hsl(var(--mn-success))]" />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[hsl(var(--mn-surface-2))]">
                      <div>
                        <p className="text-sm text-[hsl(var(--mn-muted))]">Zbývající úkoly</p>
                        <p className="text-2xl font-bold text-[hsl(var(--mn-text))]">
                          {totalTasks - completedTasks}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-[hsl(var(--mn-accent))]" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="collaborators" className="mt-4 space-y-3">
                {collaboratorUsers.map(u => {
                  const collab = collaborators.find(c => c.user_id === u.id);
                  return (
                    <div key={u.id} className="mn-card p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-[hsl(var(--mn-accent)/0.12)] text-[hsl(var(--mn-accent))]">
                                {u.full_name?.charAt(0) || u.email.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-[hsl(var(--mn-text))]">
                                {u.full_name || u.email}
                              </p>
                              <p className="text-sm text-[hsl(var(--mn-muted))]">{u.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={collab.permission === 'edit' ? 'default' : 'secondary'}>
                              {collab.permission === 'edit' ? 'Úpravy' : 'Prohlížení'}
                            </Badge>
                            {collab.progress_percentage > 0 && (
                              <p className="text-sm text-[hsl(var(--mn-muted))] mt-1">
                                Pokrok: {collab.progress_percentage}%
                              </p>
                            )}
                          </div>
                        </div>
                    </div>
                  );
                })}
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            {disciplines.length > 0 && (
              <div className="mn-card p-5">
                <h3 className="mn-ui-font font-semibold text-sm mb-4">Klinické obory</h3>
                  <div className="flex flex-wrap gap-2">
                    {disciplines.map(d => (
                      <Badge key={d.id} variant="outline">{d.name}</Badge>
                    ))}
                  </div>
              </div>
            )}

            {packages.length > 0 && (
              <div className="mn-card p-5">
                <h3 className="mn-ui-font font-semibold text-sm flex items-center gap-2 mb-4">
                  <Package className="w-4 h-4" />
                  Studijní balíčky
                </h3>
                <div className="space-y-2">
                  {packages.map(p => (
                    <Link
                      key={p.id}
                      to={createPageUrl('StudyPackageDetail') + `?id=${p.id}`}
                      className="block p-3 rounded-lg border hover:bg-[hsl(var(--mn-surface))] transition-colors"
                    >
                      <p className="text-sm font-medium">{p.title}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CollaborationDialog
        open={collaborationOpen}
        onOpenChange={setCollaborationOpen}
        entity={plan}
        entityType="StudyPlan"
        entityId={planId}
      />
    </div>
  );
}