import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, BookOpen, Target, CheckCircle2, AlertCircle } from 'lucide-react';

const PHASE_LABELS = { kmen: 'Základní kmen', specializace: 'Specializace' };
const CATEGORY_LABELS = {
  staze_kmen: 'Stáže (kmen)', kurzy_kmen: 'Kurzy (kmen)',
  staze_spec: 'Stáže (spec)', kurzy_spec: 'Kurzy (spec)',
  vykony: 'Výkony', zkousky: 'Zkoušky',
};

export default function AttestationProgress() {
  const { user } = useAuth();

  // Get user's specialization profile
  const { data: profile } = useQuery({
    queryKey: ['user-spec-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_specialization_profile')
        .select('*, obory:obor_id(id, name)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      return data;
    },
    enabled: !!user?.id
  });

  // Get attestation progress
  const { data: progress = [] } = useQuery({
    queryKey: ['attestation-progress', user?.id, profile?.obor_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_attestation_progress', {
        p_user_id: user.id,
        p_obor_id: profile.obor_id,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!profile?.obor_id
  });

  // Get total VP requirements for this obor
  const { data: totalReqs = 0 } = useQuery({
    queryKey: ['total-vp-reqs', profile?.obor_id],
    queryFn: async () => {
      const { count } = await supabase
        .from('training_requirements')
        .select('id', { count: 'exact', head: true })
        .eq('obor_id', profile.obor_id);
      return count || 0;
    },
    enabled: !!profile?.obor_id
  });

  // Get VP-topic coverage
  const { data: coverage = 0 } = useQuery({
    queryKey: ['vp-coverage', profile?.obor_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('vp_topic_coverage')
        .select('requirement_id, training_requirements!inner(obor_id)')
        .eq('training_requirements.obor_id', profile.obor_id);
      return new Set((data || []).map(d => d.requirement_id)).size;
    },
    enabled: !!profile?.obor_id
  });

  if (!profile) return null;

  // Overall progress
  const totalStudied = progress.reduce((s, p) => s + Number(p.studied_reqs || 0), 0);
  const totalAll = progress.reduce((s, p) => s + Number(p.total_reqs || 0), 0);
  const overallPct = totalAll > 0 ? Math.round((totalStudied / totalAll) * 100) : 0;

  // Group by phase
  const byPhase = {};
  progress.forEach(p => {
    if (!byPhase[p.phase]) byPhase[p.phase] = [];
    byPhase[p.phase].push(p);
  });

  return (
    <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base">
            <GraduationCap className="w-5 h-5 text-purple-500" />
            Pokrok k atestaci
          </span>
          <Badge variant="outline" className="text-xs">
            {profile.obory?.name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">Celkový pokrok</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">{overallPct}%</span>
          </div>
          <Progress value={overallPct} className="h-2.5" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{totalStudied}/{totalAll} požadavků zvládnuto</span>
            <span>{coverage}/{totalReqs} pokryto studiem</span>
          </div>
        </div>

        {/* By phase */}
        {Object.entries(byPhase).map(([phase, items]) => {
          const phaseStudied = items.reduce((s, i) => s + Number(i.studied_reqs || 0), 0);
          const phaseTotal = items.reduce((s, i) => s + Number(i.total_reqs || 0), 0);
          const phasePct = phaseTotal > 0 ? Math.round((phaseStudied / phaseTotal) * 100) : 0;

          return (
            <div key={phase} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {PHASE_LABELS[phase] || phase}
                </span>
                <span className="text-xs font-bold">{phasePct}%</span>
              </div>
              {items.map(item => {
                const pct = Number(item.completion_pct) || 0;
                return (
                  <div key={item.category} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 truncate">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${pct}%`,
                        background: pct >= 80 ? '#22c55e' : pct >= 40 ? '#a855f7' : pct > 0 ? '#f59e0b' : '#94a3b8'
                      }} />
                    </div>
                    <span className="text-[10px] font-mono w-12 text-right text-muted-foreground">
                      {item.studied_reqs}/{item.total_reqs}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}

        {progress.length === 0 && (
          <div className="text-center py-3">
            <AlertCircle className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs text-muted-foreground">VP požadavky se propojují s tématy studia</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
