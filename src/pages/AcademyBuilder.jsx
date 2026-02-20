import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { useAcademyProfile } from '@/hooks/useAcademy';
import { useAcademyTrack } from '@/hooks/useAcademyAnalytics';
import AcademyBreadcrumb from '@/components/academy/AcademyBreadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight, CheckCircle, Clock, Lock, Loader2, AlertTriangle, Rocket,
} from 'lucide-react';
import { toast } from 'sonner';

const BUILDER_ROLES = [
  {
    value: 'content_validator',
    label: 'Content Validator',
    icon: '✅',
    description: 'Kontrolujete klinickou správnost AI-generovaného obsahu',
    skills: ['Klinická praxe', 'Znalost guidelines', 'Attention to detail'],
  },
  {
    value: 'prompt_architect',
    label: 'Prompt Architect',
    icon: '✍️',
    description: 'Navrhujete a testujete klinické prompt šablony',
    skills: ['Prompt engineering', 'Klinické workflow', 'Strukturované myšlení'],
  },
  {
    value: 'feature_designer',
    label: 'Feature Designer',
    icon: '🎨',
    description: 'Navrhujete nové funkce a UX vylepšení platformy',
    skills: ['UX thinking', 'Zpětná vazba', 'Kreativita'],
  },
  {
    value: 'safety_reviewer',
    label: 'Safety Reviewer',
    icon: '🛡️',
    description: 'Kontrolujete GDPR compliance, disclaimery a bezpečnost',
    skills: ['GDPR znalost', 'Klinická bezpečnost', 'Právní povědomí'],
  },
];

const TECH_SKILLS = [
  { value: 'programming', label: 'Programování' },
  { value: 'prompt_engineering', label: 'Prompt engineering' },
  { value: 'data_analysis', label: 'Analýza dat' },
  { value: 'clinical_research', label: 'Klinický výzkum' },
  { value: 'teaching', label: 'Výuka / pedagogika' },
];

const SPECIALIZATIONS = [
  'Všeobecné lékařství', 'Chirurgie', 'Interna', 'Kardiologie',
  'Neurologie', 'Psychiatrie', 'Pediatrie', 'Gynekologie',
  'Onkologie', 'Radiologie', 'Anesteziologie', 'Ortopedie',
  'Oftalmologie', 'ORL', 'Dermatologie', 'Urologie',
];

export default function AcademyBuilder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const track = useAcademyTrack();

  const { data: profile, isLoading: profileLoading } = useAcademyProfile(user?.id);

  // Fetch existing application
  const { data: application, isLoading: appLoading } = useQuery({
    queryKey: ['builder-application', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_builder_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // If user is already a builder, redirect to dashboard
  if (profile?.is_builder) {
    navigate(createPageUrl('BuilderDashboard'), { replace: true });
    return null;
  }

  const isLoading = profileLoading || appLoading;
  const academyLevel = profile?.academy_level || 0;
  const hasPrerequisite = academyLevel >= 2;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // If user has a pending/reviewing/rejected application, show status
  if (application && ['pending', 'reviewing', 'rejected'].includes(application.status)) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <AcademyBreadcrumb
          items={[
            { label: 'Academy', href: createPageUrl('AcademyDashboard') },
            { label: 'Builder Program' },
          ]}
        />
        <ApplicationStatus application={application} userId={user.id} queryClient={queryClient} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <AcademyBreadcrumb
        items={[
          { label: 'Academy', href: createPageUrl('AcademyDashboard') },
          { label: 'Builder Program' },
        ]}
      />

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, hsl(var(--mn-accent) / 0.12) 0%, transparent 50%, rgba(236,72,153,0.08) 100%)',
          }}
        />
        <div className="relative p-8">
          <div className="flex items-center gap-2 mb-4">
            <Rocket className="w-6 h-6 text-pink-500" />
            <Badge className="bg-pink-500/10 text-pink-600 dark:text-pink-400 border-0">
              Level 4
            </Badge>
          </div>
          <h1 className="text-2xl font-bold mb-2">Builder Program</h1>
          <p className="text-[hsl(var(--mn-muted))] max-w-lg">
            Staňte se contributorem MedVerse. Ověřujte obsah, navrhujte prompty, zlepšujte
            platformu a získejte exkluzivní Builder badge.
          </p>
        </div>
      </div>

      {/* Prerequisite check */}
      {!hasPrerequisite ? (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Lock className="w-6 h-6 text-yellow-500 shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="font-semibold text-lg mb-2">
                  Dokončete Level 2 pro přístup k Builder Programu
                </h2>
                <p className="text-sm text-[hsl(var(--mn-muted))] mb-4">
                  Builder Program je dostupný studentům, kteří prošli Level 2 (Klinická AI).
                  Váš aktuální level: {academyLevel}
                </p>
                <Progress value={(academyLevel / 2) * 100} className="h-2 mb-3" />
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl('AcademyDashboard'))}
                >
                  Zpět do Academy
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <BuilderApplicationForm user={user} profile={profile} queryClient={queryClient} track={track} />
      )}
    </div>
  );
}

/* ── Application Status View ── */
function ApplicationStatus({ application, userId, queryClient }) {
  const statusConfig = {
    pending: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10', label: 'Čeká na posouzení', icon: Clock },
    reviewing: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', label: 'Probíhá posouzení', icon: Clock },
    rejected: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', label: 'Zamítnuto', icon: AlertTriangle },
  };

  const status = statusConfig[application.status];
  const StatusIcon = status.icon;
  const role = BUILDER_ROLES.find((r) => r.value === application.role_applied);

  const reapply = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('academy_builder_applications')
        .delete()
        .eq('id', application.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-application'] });
      toast.success('Přihláška smazána. Můžete podat novou.');
    },
  });

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${status.bg} flex items-center justify-center`}>
            <StatusIcon className={`w-5 h-5 ${status.color}`} />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Vaše přihláška</h2>
            <Badge className={`${status.bg} ${status.color} border-0`}>
              {status.label}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[hsl(var(--mn-muted))]">Role:</span>
            <span className="ml-2 font-medium">{role?.icon} {role?.label}</span>
          </div>
          <div>
            <span className="text-[hsl(var(--mn-muted))]">Podáno:</span>
            <span className="ml-2 font-medium">
              {new Date(application.created_at).toLocaleDateString('cs-CZ')}
            </span>
          </div>
        </div>

        {application.review_notes && (
          <div className="rounded-lg bg-[hsl(var(--mn-surface-2))] p-4">
            <p className="text-sm font-medium mb-1">Zpráva od admina:</p>
            <p className="text-sm text-[hsl(var(--mn-muted))]">{application.review_notes}</p>
          </div>
        )}

        {application.status === 'rejected' && (
          <Button
            variant="outline"
            onClick={() => reapply.mutate()}
            disabled={reapply.isPending}
          >
            {reapply.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Podat novou přihlášku
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Builder Application Form ── */
function BuilderApplicationForm({ user, profile, queryClient, track }) {
  const [role, setRole] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [motivation, setMotivation] = useState('');
  const [techSkills, setTechSkills] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role || !motivation || motivation.length < 50) {
      toast.error('Vyplňte roli a motivaci (min. 50 znaků).');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('academy_builder_applications').insert({
        user_id: user.id,
        role_applied: role,
        specialization,
        motivation,
        tech_skills: techSkills,
        academy_level: profile?.academy_level || 0,
        total_xp: profile?.academy_xp || 0,
      });

      if (error) throw error;

      track('builder_application_submitted', { role, specialization });
      queryClient.invalidateQueries({ queryKey: ['builder-application'] });
      toast.success('Přihláška odeslána! Budeme vás kontaktovat.');
    } catch (err) {
      console.error(err);
      toast.error('Chyba při odesílání přihlášky.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Role selection */}
      <div>
        <h2 className="font-semibold mb-3">Vyberte roli</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BUILDER_ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                role === r.value
                  ? 'border-pink-500 bg-pink-500/5'
                  : 'border-[hsl(var(--mn-border))] hover:border-[hsl(var(--mn-border))]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{r.icon}</span>
                <span className="font-medium text-sm">{r.label}</span>
              </div>
              <p className="text-xs text-[hsl(var(--mn-muted))] mb-2">{r.description}</p>
              <div className="flex flex-wrap gap-1">
                {r.skills.map((s) => (
                  <Badge key={s} variant="secondary" className="text-[10px]">
                    {s}
                  </Badge>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Specialization */}
      <div>
        <h2 className="font-semibold mb-2">Specializace</h2>
        <select
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
          className="w-full p-2 border rounded-xl bg-[hsl(var(--mn-surface))] border-[hsl(var(--mn-border))] text-[hsl(var(--mn-text))]"
        >
          <option value="">Vyber specializaci...</option>
          {SPECIALIZATIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Motivation */}
      <div>
        <h2 className="font-semibold mb-2">Motivace</h2>
        <Textarea
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          placeholder="Proč se chcete stát builderem? Co můžete přinést? (min. 50, max. 500 znaků)"
          rows={4}
          maxLength={500}
        />
        <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">
          {motivation.length}/500 znaků {motivation.length < 50 && motivation.length > 0 && '(min. 50)'}
        </p>
      </div>

      {/* Tech Skills */}
      <div>
        <h2 className="font-semibold mb-2">Technické dovednosti</h2>
        <div className="flex flex-wrap gap-2">
          {TECH_SKILLS.map((skill) => (
            <button
              key={skill.value}
              type="button"
              onClick={() =>
                setTechSkills((prev) => ({
                  ...prev,
                  [skill.value]: !prev[skill.value],
                }))
              }
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                techSkills[skill.value]
                  ? 'bg-pink-500 text-white'
                  : 'bg-[hsl(var(--mn-surface-2))] hover:bg-[hsl(var(--mn-surface-2))]'
              }`}
            >
              {skill.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        disabled={submitting || !role || motivation.length < 50}
        className="w-full bg-pink-600 hover:bg-pink-700 text-white"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Rocket className="w-4 h-4 mr-2" />
        )}
        Odeslat přihlášku
      </Button>
    </form>
  );
}
