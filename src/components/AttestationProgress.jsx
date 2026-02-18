import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { GraduationCap, AlertCircle } from 'lucide-react';

const PHASE_LABELS = { kmen: 'Základní kmen', specializace: 'Specializace' };
const CATEGORY_LABELS = {
  staze_kmen: 'Stáže (kmen)', kurzy_kmen: 'Kurzy (kmen)',
  staze_spec: 'Stáže (spec)', kurzy_spec: 'Kurzy (spec)',
  vykony: 'Výkony', zkousky: 'Zkoušky',
};

export default function AttestationProgress() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['user-spec-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_specialization_profile')
        .select('*, obory:obor_id(id, name)').eq('user_id', user.id).eq('is_active', true).single();
      return data;
    },
    enabled: !!user?.id
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['attestation-progress', user?.id, profile?.obor_id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_attestation_progress', { p_user_id: user.id, p_obor_id: profile.obor_id });
      return data || [];
    },
    enabled: !!user?.id && !!profile?.obor_id
  });

  const { data: totalReqs = 0 } = useQuery({
    queryKey: ['total-vp-reqs', profile?.obor_id],
    queryFn: async () => {
      const { count } = await supabase.from('training_requirements').select('id', { count: 'exact', head: true }).eq('obor_id', profile.obor_id);
      return count || 0;
    },
    enabled: !!profile?.obor_id
  });

  const { data: coverage = 0 } = useQuery({
    queryKey: ['vp-coverage', profile?.obor_id],
    queryFn: async () => {
      const { data } = await supabase.from('vp_topic_coverage').select('requirement_id, training_requirements!inner(obor_id)').eq('training_requirements.obor_id', profile.obor_id);
      return new Set((data || []).map(d => d.requirement_id)).size;
    },
    enabled: !!profile?.obor_id
  });

  if (!profile) return null;

  const totalStudied = progress.reduce((s, p) => s + Number(p.studied_reqs || 0), 0);
  const totalAll = progress.reduce((s, p) => s + Number(p.total_reqs || 0), 0);
  const overallPct = totalAll > 0 ? Math.round((totalStudied / totalAll) * 100) : 0;

  const byPhase = {};
  progress.forEach(p => { if (!byPhase[p.phase]) byPhase[p.phase] = []; byPhase[p.phase].push(p); });

  return (
    <div className="p-6 rounded-2xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface)/0.5)]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-[hsl(var(--mn-accent))]" />
          <h3 className="mn-ui-font font-semibold">Pokrok k atestaci</h3>
        </div>
        <span className="mn-ui-font text-xs px-2.5 py-1 rounded-full border border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))]">
          {profile.obory?.name}
        </span>
      </div>

      <div className="space-y-4">
        {/* Overall progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="mn-ui-font text-[hsl(var(--mn-muted))]">Celkový pokrok</span>
            <span className="mn-mono-font font-bold text-[hsl(var(--mn-accent))]">{overallPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[hsl(var(--mn-border))] overflow-hidden">
            <div className="h-full rounded-full bg-[hsl(var(--mn-accent))] transition-all" style={{ width: `${overallPct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] mn-ui-font text-[hsl(var(--mn-muted))] mt-1.5">
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
                <span className="mn-caption text-[hsl(var(--mn-muted))]">{PHASE_LABELS[phase] || phase}</span>
                <span className="mn-mono-font text-xs font-bold">{phasePct}%</span>
              </div>
              {items.map(item => {
                const pct = Number(item.completion_pct) || 0;
                return (
                  <div key={item.category} className="flex items-center gap-3">
                    <span className="mn-ui-font text-xs text-[hsl(var(--mn-muted))] w-24 truncate">{CATEGORY_LABELS[item.category] || item.category}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[hsl(var(--mn-border))] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${pct}%`,
                        background: pct >= 80 ? '#22c55e' : pct >= 40 ? 'hsl(var(--mn-accent))' : pct > 0 ? '#f59e0b' : 'transparent'
                      }} />
                    </div>
                    <span className="mn-mono-font text-[10px] w-10 text-right text-[hsl(var(--mn-muted))]">{item.studied_reqs}/{item.total_reqs}</span>
                  </div>
                );
              })}
            </div>
          );
        })}

        {progress.length === 0 && (
          <div className="text-center py-3">
            <AlertCircle className="w-6 h-6 mx-auto text-[hsl(var(--mn-muted))] mb-2" />
            <p className="mn-ui-font text-xs text-[hsl(var(--mn-muted))]">VP požadavky se propojují s tématy studia</p>
          </div>
        )}
      </div>
    </div>
  );
}
