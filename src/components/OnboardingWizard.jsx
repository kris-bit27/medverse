import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, Target, BookOpen, ChevronRight, 
  ChevronLeft, Sparkles, Check
} from 'lucide-react';
import { toast } from 'sonner';

const STEPS = ['welcome', 'role', 'specialty', 'ready'];

const EDUCATION_LEVELS = [
  { value: 'student', label: 'Student medicíny', desc: 'Pregraduální studium', icon: '🎓' },
  { value: 'resident', label: 'Příprava na atestaci', desc: 'Rezident / lékař v přípravě', icon: '🩺' },
  { value: 'attending', label: 'Atestovaný lékař', desc: 'Kontinuální vzdělávání', icon: '⭐' },
];

const SPECIALTIES = [
  'Chirurgie', 'Vnitřní lékařství', 'Pediatrie', 'Gynekologie a porodnictví',
  'Neurologie', 'Anesteziologie a intenzivní medicína', 'Kardiologie',
  'Ortopedie', 'Psychiatrie', 'Onkologie', 'Radiologie', 'Dermatologie',
  'Urologie', 'ORL', 'Oftalmologie', 'Všeobecné lékařství'
];

export default function OnboardingWizard({ onComplete }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    display_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    education_level: '',
    current_specialization: '',
    planned_specialization: '',
    institution: '',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('user_profiles').upsert({
        user_id: user.id,
        display_name: data.display_name,
        education_level: data.education_level,
        current_specialization: data.current_specialization,
        planned_specialization: data.planned_specialization || data.current_specialization,
        institution: data.institution,
        profile_completed: true,
      }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfile']);
      toast.success('Profil uložen!');
      onComplete?.();
    },
    onError: (err) => toast.error('Chyba: ' + err.message),
  });

  const currentStep = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-200 dark:bg-slate-800">
          <div 
            className="h-full bg-purple-600 transition-all duration-500" 
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} 
          />
        </div>

        <div className="p-8">
          {/* Step: Welcome */}
          {currentStep === 'welcome' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Vítejte v MedVerse!</h2>
                <p className="text-muted-foreground">
                  Nastavíme váš profil, abychom mohli přizpůsobit studijní obsah vašim potřebám.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-left">Jak vám máme říkat?</label>
                <Input
                  value={data.display_name}
                  onChange={(e) => setData(d => ({ ...d, display_name: e.target.value }))}
                  placeholder="Vaše jméno"
                  className="text-center text-lg"
                />
              </div>
            </div>
          )}

          {/* Step: Role */}
          {currentStep === 'role' && (
            <div className="space-y-6">
              <div className="text-center">
                <GraduationCap className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                <h2 className="text-xl font-bold mb-1">Jaká je vaše role?</h2>
                <p className="text-sm text-muted-foreground">Přizpůsobíme obtížnost a obsah</p>
              </div>
              <div className="space-y-3">
                {EDUCATION_LEVELS.map(level => (
                  <button
                    key={level.value}
                    onClick={() => setData(d => ({ ...d, education_level: level.value }))}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      data.education_level === level.value
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{level.icon}</span>
                      <div>
                        <div className="font-medium">{level.label}</div>
                        <div className="text-sm text-muted-foreground">{level.desc}</div>
                      </div>
                      {data.education_level === level.value && (
                        <Check className="w-5 h-5 text-purple-600 ml-auto" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Specialty */}
          {currentStep === 'specialty' && (
            <div className="space-y-6">
              <div className="text-center">
                <Target className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                <h2 className="text-xl font-bold mb-1">
                  {data.education_level === 'student' ? 'Co vás zajímá?' : 'Vaše specializace?'}
                </h2>
                <p className="text-sm text-muted-foreground">Vyberte obor (můžete změnit později)</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map(s => (
                  <button
                    key={s}
                    onClick={() => setData(d => ({ ...d, current_specialization: s }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      data.current_specialization === s
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fakulta / Nemocnice (volitelné)</label>
                <Input
                  value={data.institution}
                  onChange={(e) => setData(d => ({ ...d, institution: e.target.value }))}
                  placeholder="Např. 1. LF UK, FN Motol..."
                />
              </div>
            </div>
          )}

          {/* Step: Ready */}
          {currentStep === 'ready' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Vše připraveno!</h2>
                <p className="text-muted-foreground mb-4">
                  {data.display_name}, váš profil je nastavený. Co vás čeká:
                </p>
              </div>
              <div className="grid gap-3 text-left">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <BookOpen className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">Studijní materiály</div>
                    <div className="text-muted-foreground">AI-generované texty pro {data.current_specialization || 'vaše obory'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">Spaced repetition</div>
                    <div className="text-muted-foreground">Kartičky s algoritmen SM-2 pro efektivní opakování</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <Target className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">AI asistent</div>
                    <div className="text-muted-foreground">Copilot pro otázky přímo během studia</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Zpět
              </Button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <Button 
                onClick={() => setStep(s => s + 1)}
                disabled={
                  (currentStep === 'welcome' && !data.display_name.trim()) ||
                  (currentStep === 'role' && !data.education_level)
                }
              >
                Pokračovat <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button 
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {saveMutation.isPending ? 'Ukládám...' : 'Začít studovat'} 
                <Sparkles className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
