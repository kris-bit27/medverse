import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GraduationCap,
  Stethoscope,
  Calendar,
  Building2,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Sparkles,
  Baby,
  PauseCircle,
  AlertCircle,
  Plus,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  { id: 'welcome', title: 'Vítejte', icon: Sparkles },
  { id: 'specialty', title: 'Obor', icon: Stethoscope },
  { id: 'phase', title: 'Fáze přípravy', icon: GraduationCap },
  { id: 'dates', title: 'Termíny', icon: Calendar },
  { id: 'workplace', title: 'Pracoviště', icon: Building2 },
  { id: 'interruptions', title: 'Přerušení', icon: PauseCircle },
];

const INTERRUPTION_REASONS = [
  { value: 'maternity', label: 'Mateřská dovolená', icon: Baby },
  { value: 'parental', label: 'Rodičovská dovolená', icon: Baby },
  { value: 'illness', label: 'Nemoc / pracovní neschopnost', icon: AlertCircle },
  { value: 'military', label: 'Vojenská služba', icon: null },
  { value: 'other', label: 'Jiné přerušení', icon: PauseCircle },
];

const VP_OPTIONS = [
  { value: 'VP2018', label: 'VP 2018 (Věstník MZ 2018)' },
  { value: 'VP2019', label: 'VP 2019 (Věstník MZ 2019)' },
  { value: 'VP2015', label: 'VP 2015 (starší verze)' },
  { value: 'VP2011', label: 'VP 2011 (starší verze)' },
];

const ACCREDITATION_TYPES = [
  { value: 'I', label: 'AZ I. typu' },
  { value: 'II', label: 'AZ II. typu (fakultní)' },
  { value: 'none', label: 'Nevím / bez akreditace' },
];

export default function OnboardingWizard({ onComplete }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    // Step 1: Specialty
    obor_id: '',
    vp_year: 'VP2019',
    // Step 2: Phase
    phase: 'kmen', // kmen | specializace | before_kmen
    // Step 3: Dates
    enrolled_at: '',
    kmen_started_at: '',
    kmen_completed_at: '',
    kmen_exam_passed: false,
    spec_started_at: '',
    attestation_target_date: '',
    // Step 4: Workplace
    primary_workplace: '',
    primary_workplace_accreditation: '',
    supervisor_name: '',
    faculty: '',
    // Step 5: Interruptions
    interruptions: [], // { reason, reason_detail, started_at, ended_at }
    has_interruptions: false,
  });

  // Fetch obory
  const { data: obory = [] } = useQuery({
    queryKey: ['obory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obory')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const selectedObor = obory.find(o => o.id === form.obor_id);

  const updateForm = (updates) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  // Navigation
  const canGoNext = () => {
    switch (STEPS[step].id) {
      case 'welcome': return true;
      case 'specialty': return !!form.obor_id;
      case 'phase': return !!form.phase;
      case 'dates': return !!form.enrolled_at;
      case 'workplace': return true; // optional
      case 'interruptions': return true;
      default: return true;
    }
  };

  const goNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleSubmit();
  };

  const goBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  // Submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Create specialization profile
      const profileData = {
        user_id: user.id,
        obor_id: form.obor_id,
        phase: form.phase === 'before_kmen' ? 'kmen' : form.phase,
        vp_year: form.vp_year,
        enrolled_at: form.enrolled_at || null,
        kmen_started_at: form.kmen_started_at || null,
        kmen_completed_at: form.kmen_completed_at || null,
        kmen_exam_passed: form.kmen_exam_passed,
        spec_started_at: form.spec_started_at || null,
        attestation_target_date: form.attestation_target_date || null,
        primary_workplace: form.primary_workplace || null,
        primary_workplace_accreditation: form.primary_workplace_accreditation || null,
        supervisor_name: form.supervisor_name || null,
        faculty: form.faculty || null,
        is_active: true,
      };

      const { data: profile, error: profileError } = await supabase
        .from('user_specialization_profile')
        .insert(profileData)
        .select()
        .single();

      if (profileError) throw profileError;

      // 2. Create interruptions if any
      if (form.interruptions.length > 0) {
        const interruptionRows = form.interruptions.map(i => ({
          user_id: user.id,
          specialization_profile_id: profile.id,
          reason: i.reason,
          reason_detail: i.reason_detail || null,
          started_at: i.started_at,
          ended_at: i.ended_at || null,
        }));

        const { error: intError } = await supabase
          .from('user_training_interruptions')
          .insert(interruptionRows);

        if (intError) throw intError;
      }

      // 3. Mark onboarding completed
      await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          onboarding_completed: true,
          current_specialization: selectedObor?.name || '',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      toast.success('Profil nastaven! 🎉');
      queryClient.invalidateQueries();
      onComplete?.();
    } catch (err) {
      console.error('Onboarding error:', err);
      toast.error('Chyba při ukládání: ' + (err.message || 'Neznámá chyba'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add/remove interruption
  const addInterruption = () => {
    updateForm({
      interruptions: [...form.interruptions, { reason: 'maternity', reason_detail: '', started_at: '', ended_at: '' }],
    });
  };

  const removeInterruption = (idx) => {
    updateForm({
      interruptions: form.interruptions.filter((_, i) => i !== idx),
    });
  };

  const updateInterruption = (idx, updates) => {
    const newList = [...form.interruptions];
    newList[idx] = { ...newList[idx], ...updates };
    updateForm({ interruptions: newList });
  };

  // Computed: estimated attestation date
  const estimatedEndDate = (() => {
    if (!form.enrolled_at) return null;
    const start = new Date(form.enrolled_at);
    // Rough estimate based on phase
    const totalMonths = form.phase === 'before_kmen' ? 60 : form.phase === 'kmen' ? 54 : 30;
    const interruptionMonths = form.interruptions.reduce((sum, i) => {
      if (i.started_at && i.ended_at) {
        const d1 = new Date(i.started_at);
        const d2 = new Date(i.ended_at);
        return sum + Math.round((d2 - d1) / (30.44 * 24 * 60 * 60 * 1000));
      }
      return sum;
    }, 0);
    start.setMonth(start.getMonth() + totalMonths + interruptionMonths);
    return start.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => i < step && setStep(i)}
              className={`transition-all duration-300 rounded-full ${
                i === step
                  ? 'w-10 h-3 bg-purple-500'
                  : i < step
                  ? 'w-3 h-3 bg-purple-400 cursor-pointer hover:bg-purple-300'
                  : 'w-3 h-3 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-sm shadow-2xl">
          <CardContent className="p-8">
            {/* ===== STEP: WELCOME ===== */}
            {STEPS[step].id === 'welcome' && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Vítejte v MedVerse</h1>
                  <p className="text-slate-400 text-lg leading-relaxed">
                    Nastavíme váš profil tak, aby MedVerse přesně věděl, kde se v přípravě nacházíte
                    a co ještě potřebujete splnit.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4">
                  {[
                    { icon: Stethoscope, label: 'Váš obor' },
                    { icon: Calendar, label: 'Termíny' },
                    { icon: Building2, label: 'Pracoviště' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <Icon className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-300">{label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">Zabere to cca 2 minuty • Vše můžete později upravit</p>
              </div>
            )}

            {/* ===== STEP: SPECIALTY ===== */}
            {STEPS[step].id === 'specialty' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Váš obor specializace</h2>
                  <p className="text-slate-400">Zvolte obor, na který se připravujete</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Obor *</Label>
                    <Select value={form.obor_id} onValueChange={(v) => updateForm({ obor_id: v })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-12">
                        <SelectValue placeholder="Vyberte obor..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {obory.map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Vzdělávací program</Label>
                    <Select value={form.vp_year} onValueChange={(v) => updateForm({ vp_year: v })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VP_OPTIONS.map(vp => (
                          <SelectItem key={vp.value} value={vp.value}>{vp.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Většina školenců po roce 2019 spadá pod VP 2019
                    </p>
                  </div>

                  {selectedObor && (
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-2 text-purple-400 mb-1">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">{selectedObor.name}</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Logbook s požadavky VP bude přizpůsoben tomuto oboru
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== STEP: PHASE ===== */}
            {STEPS[step].id === 'phase' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Kde se nacházíte?</h2>
                  <p className="text-slate-400">V jaké fázi přípravy aktuálně jste</p>
                </div>

                <div className="grid gap-3">
                  {[
                    {
                      value: 'before_kmen',
                      title: 'Ještě jsem nezačal/a kmen',
                      desc: 'Čekám na zařazení nebo se teprve rozhoduji',
                      color: 'slate',
                    },
                    {
                      value: 'kmen',
                      title: 'Jsem v základním kmeni',
                      desc: 'Absolvuji 30měsíční kmen (praxe + kurzy)',
                      color: 'blue',
                    },
                    {
                      value: 'specializace',
                      title: 'Jsem ve specializačním výcviku',
                      desc: 'Kmen mám hotový, pracuji na specializaci',
                      color: 'purple',
                    },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateForm({ phase: opt.value })}
                      className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                        form.phase === opt.value
                          ? `border-${opt.color}-500 bg-${opt.color}-500/10`
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{opt.title}</p>
                          <p className="text-sm text-slate-400 mt-1">{opt.desc}</p>
                        </div>
                        {form.phase === opt.value && (
                          <CheckCircle className="w-6 h-6 text-purple-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ===== STEP: DATES ===== */}
            {STEPS[step].id === 'dates' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Klíčové termíny</h2>
                  <p className="text-slate-400">Pomůže nám spočítat váš odpočet k atestaci</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Datum zařazení do oboru *</Label>
                    <Input
                      type="date"
                      value={form.enrolled_at}
                      onChange={e => updateForm({ enrolled_at: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  {(form.phase === 'kmen' || form.phase === 'specializace') && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">Začátek kmene</Label>
                      <Input
                        type="date"
                        value={form.kmen_started_at}
                        onChange={e => updateForm({ kmen_started_at: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  )}

                  {form.phase === 'specializace' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Kmen dokončen</Label>
                        <Input
                          type="date"
                          value={form.kmen_completed_at}
                          onChange={e => updateForm({ kmen_completed_at: e.target.value })}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                        <Label className="text-slate-300 cursor-pointer">Kmenová zkouška složena</Label>
                        <Switch
                          checked={form.kmen_exam_passed}
                          onCheckedChange={v => updateForm({ kmen_exam_passed: v })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Začátek specializačního výcviku</Label>
                        <Input
                          type="date"
                          value={form.spec_started_at}
                          onChange={e => updateForm({ spec_started_at: e.target.value })}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label className="text-slate-300">Plánovaný termín atestace (volitelné)</Label>
                    <Input
                      type="date"
                      value={form.attestation_target_date}
                      onChange={e => updateForm({ attestation_target_date: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  {estimatedEndDate && (
                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                      <p className="text-sm text-indigo-300">
                        📅 Odhadovaný konec přípravy: <strong>{estimatedEndDate}</strong>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Orientační odhad na základě délky oboru
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== STEP: WORKPLACE ===== */}
            {STEPS[step].id === 'workplace' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Pracoviště</h2>
                  <p className="text-slate-400">Volitelné – můžete doplnit později</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Akreditované zařízení</Label>
                    <Input
                      value={form.primary_workplace}
                      onChange={e => updateForm({ primary_workplace: e.target.value })}
                      placeholder="např. FN Motol, Nemocnice Na Bulovce..."
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Typ akreditace</Label>
                    <Select
                      value={form.primary_workplace_accreditation}
                      onValueChange={v => updateForm({ primary_workplace_accreditation: v })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Vyberte typ..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCREDITATION_TYPES.map(a => (
                          <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Školitel</Label>
                    <Input
                      value={form.supervisor_name}
                      onChange={e => updateForm({ supervisor_name: e.target.value })}
                      placeholder="Jméno školitele"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Lékařská fakulta (kde jste zařazeni)</Label>
                    <Input
                      value={form.faculty}
                      onChange={e => updateForm({ faculty: e.target.value })}
                      placeholder="např. 1. LF UK, LF MU..."
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ===== STEP: INTERRUPTIONS ===== */}
            {STEPS[step].id === 'interruptions' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Přerušení přípravy</h2>
                  <p className="text-slate-400">
                    Mateřská, nemoc nebo jiné přerušení prodlužuje dobu přípravy
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <div>
                    <p className="font-medium text-white">Měl/a jsem přerušení</p>
                    <p className="text-sm text-slate-400">Mateřská, nemocenská apod.</p>
                  </div>
                  <Switch
                    checked={form.has_interruptions}
                    onCheckedChange={v => {
                      updateForm({ has_interruptions: v });
                      if (v && form.interruptions.length === 0) addInterruption();
                    }}
                  />
                </div>

                {form.has_interruptions && (
                  <div className="space-y-4">
                    {form.interruptions.map((intItem, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                            Přerušení {idx + 1}
                          </Badge>
                          <button
                            onClick={() => removeInterruption(idx)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <Select
                          value={intItem.reason}
                          onValueChange={v => updateInterruption(idx, { reason: v })}
                        >
                          <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INTERRUPTION_REASONS.map(r => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400">Od</Label>
                            <Input
                              type="date"
                              value={intItem.started_at}
                              onChange={e => updateInterruption(idx, { started_at: e.target.value })}
                              className="bg-slate-900 border-slate-700 text-white text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400">Do (prázdné = trvá)</Label>
                            <Input
                              type="date"
                              value={intItem.ended_at}
                              onChange={e => updateInterruption(idx, { ended_at: e.target.value })}
                              className="bg-slate-900 border-slate-700 text-white text-sm"
                            />
                          </div>
                        </div>

                        {intItem.reason === 'other' && (
                          <Input
                            value={intItem.reason_detail}
                            onChange={e => updateInterruption(idx, { reason_detail: e.target.value })}
                            placeholder="Upřesněte důvod..."
                            className="bg-slate-900 border-slate-700 text-white text-sm"
                          />
                        )}
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addInterruption}
                      className="w-full border-dashed border-slate-700 text-slate-400 hover:text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Přidat další přerušení
                    </Button>
                  </div>
                )}

                {!form.has_interruptions && (
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                    <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <p className="text-sm text-green-300">Bez přerušení – skvělé!</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
              <Button
                variant="ghost"
                onClick={goBack}
                disabled={step === 0}
                className="text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Zpět
              </Button>

              <div className="text-xs text-slate-500">
                {step + 1} / {STEPS.length}
              </div>

              <Button
                onClick={goNext}
                disabled={!canGoNext() || isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white min-w-[140px]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : step === STEPS.length - 1 ? (
                  <>
                    Dokončit
                    <CheckCircle className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    Pokračovat
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Skip link */}
        {step === 0 && (
          <div className="text-center mt-4">
            <button
              onClick={onComplete}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-4"
            >
              Přeskočit a nastavit později
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
