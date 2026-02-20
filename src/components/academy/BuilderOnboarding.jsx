import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAcademyTrack } from '@/hooks/useAcademyAnalytics';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, CheckCircle, Loader2, Rocket } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_INSTRUCTIONS = {
  content_validator: {
    title: 'Content Validator',
    icon: '✅',
    instructions: [
      'Ověřujte klinickou správnost AI-generovaného obsahu dle aktuálních guidelines (ČLS, ESC, AHA…)',
      'Kontrolujte terminologii — žádné zastaralé nebo nesprávné názvy',
      'Při pochybnostech: raději označte jako "k ověření" než schvalte',
      'Vždy uveďte specifický důvod zamítnutí nebo návrhu změny',
    ],
  },
  prompt_architect: {
    title: 'Prompt Architect',
    icon: '✍️',
    instructions: [
      'Navrhujte strukturované prompt šablony s jasnými instrukcemi',
      'Každý prompt by měl mít good/bad example pro porovnání',
      'Testujte prompty v Sandboxu před odesláním — důležitá je reprodukovatelnost',
      'Kategorizujte prompty dle workflow: ambulance, vizita, výzkum, dokumentace',
    ],
  },
  feature_designer: {
    title: 'Feature Designer',
    icon: '🎨',
    instructions: [
      'Navrhujte funkce na základě reálných potřeb z klinické praxe',
      'Popisujte user stories: "Jako [role] chci [akci] aby [výsledek]"',
      'Prioritizujte jednoduchost — menší feature dobře implementovaná > velká a buggy',
      'Sbírejte zpětnou vazbu od kolegů před odesláním návrhu',
    ],
  },
  safety_reviewer: {
    title: 'Safety Reviewer',
    icon: '🛡️',
    instructions: [
      'Kontrolujte přítomnost disclaimerů u AI-generovaného obsahu',
      'Ověřte, že kontraindikace a red flags jsou vždy zmíněny',
      'Kontrolujte GDPR compliance — žádné osobní údaje v příkladech',
      'Při zjištění bezpečnostního problému: okamžitě zamítněte a popište riziko',
    ],
  },
};

const REVIEW_CHECKLIST = [
  {
    id: 'clinical_accuracy',
    label: 'Klinická správnost',
    description: 'Informace odpovídají aktuálním guidelines a EBM',
  },
  {
    id: 'pedagogical_clarity',
    label: 'Pedagogická jasnost',
    description: 'Text je srozumitelný, strukturovaný, s příklady',
  },
  {
    id: 'safety_notes',
    label: 'Bezpečnostní poznámky',
    description: 'Obsahuje disclaimery, upozornění na kontraindikace, red flags',
  },
  {
    id: 'sources_cited',
    label: 'Zdroje a citace',
    description: 'Kde je potřeba, jsou uvedeny zdroje (guidelines, SPC, studie)',
  },
  {
    id: 'what_to_verify',
    label: '"Co ověřit" sekce',
    description: 'U AI-generovaného obsahu je označeno, co vyžaduje verifikaci',
  },
];

export default function BuilderOnboarding({ application, onComplete }) {
  const [step, setStep] = useState(0);
  const [checklistConfirmed, setChecklistConfirmed] = useState({});
  const track = useAcademyTrack();
  const startTime = React.useRef(Date.now());

  const role = application.role_applied;
  const roleInfo = ROLE_INSTRUCTIONS[role] || ROLE_INSTRUCTIONS.content_validator;

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('academy_builder_applications')
        .update({ onboarded_at: new Date().toISOString() })
        .eq('id', application.id);
      if (error) throw error;
    },
    onSuccess: () => {
      const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
      track('builder_onboarding_completed', { role, time_spent: timeSpent });
      toast.success('Onboarding dokončen! Vítejte v Builder Programu.');
      onComplete();
    },
  });

  const allChecklistConfirmed = REVIEW_CHECKLIST.every((item) => checklistConfirmed[item.id]);

  const steps = [
    // Step 1: Welcome
    <div key="welcome" className="space-y-4">
      <div className="text-center">
        <span className="text-5xl mb-4 block">🚀</span>
        <h2 className="text-xl font-bold mb-2">Vítejte v Builder Programu</h2>
        <p className="text-[hsl(var(--mn-muted))] max-w-md mx-auto">
          Jako Builder máte vliv na kvalitu obsahu, který studují stovky lékařů. S touto
          zodpovědností přicházejí pravidla:
        </p>
      </div>
      <div className="space-y-3 mt-6">
        {[
          'Kvalita nad kvantitou — raději méně, ale přesně',
          'Při pochybnostech se zeptejte — jsme tu pro vás',
          'Vaše příspěvky jsou viditelné — budujete si reputaci',
          'Za každý příspěvek získáváte XP a tokeny',
        ].map((rule, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--mn-surface-2))]">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <span className="text-sm">{rule}</span>
          </div>
        ))}
      </div>
    </div>,

    // Step 2: Role-specific instructions
    <div key="role" className="space-y-4">
      <div className="text-center">
        <span className="text-5xl mb-4 block">{roleInfo.icon}</span>
        <h2 className="text-xl font-bold mb-2">Vaše role: {roleInfo.title}</h2>
      </div>
      <div className="space-y-3 mt-4">
        {roleInfo.instructions.map((instruction, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--mn-surface-2))]">
            <span className="text-sm font-bold text-pink-500 shrink-0">{i + 1}.</span>
            <span className="text-sm">{instruction}</span>
          </div>
        ))}
      </div>
    </div>,

    // Step 3: Definition of Done
    <div key="checklist" className="space-y-4">
      <div className="text-center mb-4">
        <span className="text-5xl mb-4 block">📋</span>
        <h2 className="text-xl font-bold mb-2">Definition of Done</h2>
        <p className="text-sm text-[hsl(var(--mn-muted))]">
          Potvrďte, že rozumíte každému bodu kontrolního seznamu
        </p>
      </div>
      <div className="space-y-3">
        {REVIEW_CHECKLIST.map((item) => (
          <label
            key={item.id}
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              checklistConfirmed[item.id]
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-[hsl(var(--mn-border))]'
            }`}
          >
            <Checkbox
              checked={!!checklistConfirmed[item.id]}
              onCheckedChange={(checked) =>
                setChecklistConfirmed((prev) => ({ ...prev, [item.id]: checked }))
              }
              className="mt-0.5"
            />
            <div>
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs text-[hsl(var(--mn-muted))]">{item.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>,
  ];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardContent className="p-8">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === step ? 'bg-pink-500 w-8' : i < step ? 'bg-pink-300' : 'bg-[hsl(var(--mn-border))]'
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          {steps[step]}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[hsl(var(--mn-border))]">
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zpět
            </Button>

            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>
                Další
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => completeOnboarding.mutate()}
                disabled={!allChecklistConfirmed || completeOnboarding.isPending}
                className="bg-pink-600 hover:bg-pink-700 text-white"
              >
                {completeOnboarding.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Rocket className="w-4 h-4 mr-2" />
                )}
                Začít jako Builder
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
