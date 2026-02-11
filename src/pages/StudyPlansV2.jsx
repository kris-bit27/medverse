import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calendar,
  Target,
  Clock,
  Plus,
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
    target_date: '',
    study_hours_per_week: 10
  });

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
      setShowCreateForm(false);
      setFormData({ title: '', target_date: '', study_hours_per_week: 10 });
      queryClient.invalidateQueries(['studyPlans']);
    }
  });

  const deletePlan = useMutation({
    mutationFn: async (planId) => {
      const { error } = await supabase
        .from('study_plans')
        .delete()
        .eq('id', planId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Plán smazán');
      queryClient.invalidateQueries(['studyPlans']);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Studijní Plány</h1>
          <p className="text-muted-foreground">
            Naplánujte si studium a sledujte pokrok
          </p>
        </div>

        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nový plán
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Vytvořit plán</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); createPlan.mutate(formData); }} className="space-y-4">
              <div>
                <Label>Název</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Cílové datum</Label>
                  <Input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>Hodin týdně</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.study_hours_per_week}
                    onChange={(e) => setFormData({ ...formData, study_hours_per_week: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Zrušit
                </Button>
                <Button type="submit">Vytvořit</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {plans.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">Žádné plány</h3>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Vytvořit plán
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>{plan.title}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => deletePlan.mutate(plan.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {new Date(plan.target_date).toLocaleDateString('cs-CZ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{plan.study_hours_per_week}h/týden</span>
                  </div>

                  <Button variant="outline" className="w-full" onClick={() => navigate(createPageUrl('StudiumV2'))}>
                    Začít studovat
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
