import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calendar,
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
        <div className="w-8 h-8 border-4 border-[hsl(var(--mn-accent))] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <span className="mn-caption text-[hsl(var(--mn-accent))]">PLÁNY STUDIA</span>
          <h1 className="mn-serif-font text-[28px] sm:text-[32px] font-bold mb-2">Studijní Plány</h1>
          <p className="text-[hsl(var(--mn-muted))]">
            Naplánujte si studium a sledujte pokrok
          </p>
        </div>

        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nový plán
        </Button>
      </div>

      {showCreateForm && (
        <div className="rounded-2xl p-5" style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
          <h3 className="mn-ui-font font-semibold mb-4">Vytvořit plán</h3>
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
        </div>
      )}

      {plans.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
            <Calendar className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--mn-muted))]" />
            <h3 className="text-xl font-bold mb-2">Žádné plány</h3>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Vytvořit plán
            </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-2xl p-5 hover:-translate-y-0.5 transition-all" style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
              <div className="flex items-start justify-between mb-4">
                <h3 className="mn-ui-font font-semibold">{plan.title}</h3>
                <Button variant="ghost" size="sm" onClick={() => deletePlan.mutate(plan.id)}>
                  <Trash2 className="w-4 h-4 text-[hsl(var(--mn-danger))]" />
                </Button>
              </div>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
