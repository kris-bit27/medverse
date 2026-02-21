import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import {
  User, GraduationCap, Target, Sparkles, Star,
  ChevronRight, Check, Pencil, Save, X
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import CredentialBadge from '@/components/academy/CredentialBadge';
import { useAcademyProfile } from '@/hooks/useAcademy';

const up = (i = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }
});

const EDUCATION_LEVELS = [
  { value: 'pre_kmen',  label: 'Student medicíny (před kmenem)' },
  { value: 'post_kmen', label: 'Student medicíny (po kmeni)' },
  { value: 'resident',  label: 'Absolvent — příprava na atestaci' },
  { value: 'attending', label: 'Atestovaný lékař' },
  { value: 'specialist',label: 'Lékař se specializací' },
  { value: 'academic',  label: 'Akademik / Výzkumník' },
];

const SPECIALIZATIONS = [
  'Všeobecné lékařství','Chirurgie','Interna','Kardiologie','Neurologie',
  'Psychiatrie','Pediatrie','Gynekologie','Onkologie','Radiologie',
  'Anesteziologie','Ortopedie','Oftalmologie','ORL','Dermatologie',
  'Urologie','Vědecká dráha (research)',
];

const CAREER_PATHS = [
  { value: 'clinical',    label: 'Klinická praxe',          icon: '🏥' },
  { value: 'research',    label: 'Vědecká práce / Research', icon: '🔬' },
  { value: 'academic',    label: 'Akademická dráha',         icon: '👨‍🏫' },
  { value: 'management',  label: 'Medicínský management',    icon: '💼' },
];

const MEDICAL_FIELDS = [
  'Kardiologie','Onkologie','Neurologie','Gastroenterologie','Nefrologie',
  'Pneumologie','Endokrinologie','Hematologie','Revmatologie','Infektologie',
  'Intenzivní medicína','Geriatrie','Pediatrie','Neonatologie','Psychiatrie',
  'Dermatologie','Oftalmologie','ORL','Urologie','Ortopedie','Traumatologie',
  'Plastická chirurgie','Cévní chirurgie','Neurochirurgie','Anesteziologie',
  'Radiologie','Nukleární medicína','Patologie','Molekulární medicína',
  'Genetika','Farmakologie',
];

const ACHIEVEMENT_DEFS = [
  { type: 'profile_display_name', icon: '👤', label: 'Jméno',      tokens: 50 },
  { type: 'profile_specialization',icon: '🎓', label: 'Obor',      tokens: 50 },
  { type: 'profile_interests',     icon: '🎯', label: 'Zájmy',     tokens: 30 },
  { type: 'profile_learning_preferences', icon: '⚡', label: 'Styl učení', tokens: 20 },
  { type: 'profile_bio',           icon: '📝', label: 'Bio',       tokens: 10 },
];

/* styled select */
function MnSelect({ value, onChange, children, disabled }) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} disabled={disabled}
        className="w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm"
        style={{
          background: 'hsl(var(--mn-surface-2))',
          border: '1px solid hsl(var(--mn-border))',
          color: 'hsl(var(--mn-text))',
          fontFamily: 'var(--mn-font-sans)',
          outline: 'none',
          opacity: disabled ? 0.6 : 1,
        }}
        onFocus={e => { e.target.style.borderColor = 'hsl(var(--mn-accent) / 0.5)'; }}
        onBlur={e => { e.target.style.borderColor = 'hsl(var(--mn-border))'; }}
      >{children}</select>
      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 pointer-events-none"
                    style={{ color: 'hsl(var(--mn-muted))' }} />
    </div>
  );
}

/* styled range slider */
function MnSlider({ label, leftLabel, rightLabel, value, onChange, disabled }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="mn-ui-font text-sm font-medium">{label}</label>
        <span className="mn-mono-font text-xs font-bold px-2 py-0.5 rounded-md"
              style={{ background: 'hsl(var(--mn-accent)/0.12)', color: 'hsl(var(--mn-accent))' }}>
          {value}/10
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="mn-ui-font text-xs w-20 text-right shrink-0"
              style={{ color: 'hsl(var(--mn-muted))' }}>{leftLabel}</span>
        <div className="relative flex-1 h-2">
          <div className="absolute inset-0 rounded-full" style={{ background: 'hsl(var(--mn-border))' }} />
          <div className="absolute left-0 top-0 h-full rounded-full"
               style={{ width: `${(value - 1) / 9 * 100}%`, background: 'hsl(var(--mn-accent))' }} />
          <input type="range" min="1" max="10" value={value}
            onChange={e => onChange(parseInt(e.target.value))}
            disabled={disabled}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            style={{ height: '8px' }}
          />
          {/* thumb */}
          <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 pointer-events-none"
               style={{
                 left: `calc(${(value - 1) / 9 * 100}% - 8px)`,
                 background: 'hsl(var(--mn-surface))',
                 borderColor: 'hsl(var(--mn-accent))',
                 boxShadow: '0 0 8px hsl(var(--mn-accent) / 0.4)',
               }} />
        </div>
        <span className="mn-ui-font text-xs w-20 shrink-0"
              style={{ color: 'hsl(var(--mn-muted))' }}>{rightLabel}</span>
      </div>
    </div>
  );
}

/* sekce karta */
function ProfileCard({ icon: Icon, title, children }) {
  return (
    <div className="mn-card overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'hsl(var(--mn-border))' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
             style={{ background: 'hsl(var(--mn-accent) / 0.10)' }}>
          <Icon className="w-4 h-4" style={{ color: 'hsl(var(--mn-accent))' }} />
        </div>
        <h2 className="mn-ui-font font-semibold" style={{ fontSize: '15px' }}>{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

/* field wrapper */
function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="mn-ui-font text-xs font-semibold uppercase tracking-wider"
               style={{ color: 'hsl(var(--mn-muted))' }}>{label}</label>
      )}
      {children}
      {hint && <p className="mn-ui-font text-xs" style={{ color: 'hsl(var(--mn-muted))' }}>{hint}</p>}
    </div>
  );
}

export default function MyProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const { data: academyProfile } = useAcademyProfile(user?.id);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_profiles')
        .select('*').eq('user_id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || {};
    },
    enabled: !!user?.id
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('gamification_achievements')
        .select('*').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id
  });

  const { data: subjectLevels = [] } = useQuery({
    queryKey: ['subjectLevels', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_subject_levels')
        .select('*').eq('user_id', user.id)
        .order('level', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!user?.id
  });

  const updateProfile = useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase.from('user_profiles')
        .upsert({ user_id: user.id, ...data }).select().single();
      if (error) throw error;
      await checkAchievements(data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfile']);
      queryClient.invalidateQueries(['achievements']);
      toast.success('Profil uložen!');
      setIsEditing(false);
    },
    onError: () => toast.error('Chyba při ukládání')
  });

  const checkAchievements = async (data) => {
    const checks = [
      { type: 'profile_display_name',          cond: data.display_name,                               tokens: 50, name: 'Jméno vyplněno' },
      { type: 'profile_bio',                   cond: data.bio?.length > 20,                           tokens: 10, name: 'Bio vyplněno' },
      { type: 'profile_specialization',        cond: data.current_specialization,                     tokens: 50, name: 'Obor vybrán' },
      { type: 'profile_interests',             cond: data.areas_of_interest?.length >= 2,             tokens: 30, name: '2+ oblasti zájmu' },
      { type: 'profile_learning_preferences',  cond: data.learning_pace !== 5,                        tokens: 20, name: 'Styl učení nastaven' },
    ];
    for (const c of checks) {
      if (!c.cond) continue;
      try {
        const { data: earned } = await supabase.rpc('earn_tokens', {
          p_user_id: user.id, p_amount: c.tokens,
          p_achievement_type: c.type, p_achievement_name: c.name
        });
        if (earned) toast.success(`🎉 +${c.tokens} 💎 za "${c.name}"!`);
      } catch { /* already earned */ }
    }
  };

  const earnedTokens = achievements.reduce((s, a) => s + (a.tokens_earned || 0), 0);
  const maxTokens = 160;
  const pct = Math.min(100, (earnedTokens / maxTokens) * 100);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="relative min-h-screen">

      {/* Ambient bg */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute -top-32 right-0 w-[400px] h-[400px]" style={{
          background: 'radial-gradient(circle, hsl(var(--mn-accent) / 0.07) 0%, transparent 65%)',
          filter: 'blur(80px)'
        }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-8">

        {/* PAGE HEADER */}
        <motion.div {...up(0)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="mn-eyebrow-accent">MŮJ PROFIL</span>
              <div className="flex items-center gap-3 mt-1">
                <h1 className="mn-serif-font font-bold" style={{ fontSize: 'clamp(28px,4vw,38px)' }}>
                  Můj profil
                </h1>
                <CredentialBadge level={academyProfile?.academy_level} size="md" />
              </div>
              <p className="mn-ui-font mt-1" style={{ color: 'hsl(var(--mn-muted))', fontSize: '15px' }}>
                Personalizuj AI asistenta a spravuj informace
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)}
                          className="mn-btn-outline px-4 py-2 text-sm rounded-xl inline-flex items-center gap-2">
                    <X className="w-4 h-4" /> Zrušit
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)}
                        className="mn-btn-cta px-4 py-2 text-sm rounded-xl inline-flex items-center gap-2">
                  <Pencil className="w-4 h-4" /> Upravit profil
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* GAMIFICATION — compact progress strip */}
        <motion.div {...up(1)}>
          <div className="rounded-2xl px-6 py-5" style={{
            background: 'linear-gradient(135deg, hsl(var(--mn-surface)), hsl(var(--mn-surface-2)))',
            border: '1px solid hsl(var(--mn-accent) / 0.2)',
            boxShadow: '0 0 0 1px hsl(var(--mn-accent) / 0.06)'
          }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="mn-ui-font text-sm font-semibold">Dokončenost profilu</p>
                <p className="mn-ui-font text-xs mt-0.5" style={{ color: 'hsl(var(--mn-muted))' }}>
                  Vyplněním profilu získáš AI tokeny navíc
                </p>
              </div>
              <div className="text-right">
                <span className="mn-mono-font font-bold text-xl" style={{ color: 'hsl(var(--mn-accent))' }}>
                  {earnedTokens}
                </span>
                <span className="mn-mono-font text-sm" style={{ color: 'hsl(var(--mn-muted))' }}>
                  /{maxTokens} 💎
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full mb-4" style={{ background: 'hsl(var(--mn-border))' }}>
              <div className="h-full rounded-full transition-all duration-700"
                   style={{
                     width: `${pct}%`,
                     background: 'linear-gradient(90deg, hsl(var(--mn-accent)), hsl(var(--mn-accent-2)))',
                     boxShadow: '0 0 8px hsl(var(--mn-accent) / 0.4)'
                   }} />
            </div>

            {/* Achievement tags */}
            <div className="flex flex-wrap gap-2">
              {ACHIEVEMENT_DEFS.map(a => {
                const earned = achievements.some(ac => ac.achievement_type === a.type);
                return (
                  <div key={a.type}
                       className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                       style={{
                         background: earned ? 'hsl(var(--mn-success) / 0.10)' : 'hsl(var(--mn-surface-2))',
                         border: `1px solid ${earned ? 'hsl(var(--mn-success) / 0.3)' : 'hsl(var(--mn-border))'}`,
                         color: earned ? 'hsl(var(--mn-success))' : 'hsl(var(--mn-muted))',
                       }}>
                    {earned
                      ? <Check className="w-3 h-3" />
                      : <span style={{ fontSize: '11px' }}>{a.icon}</span>
                    }
                    {a.label}
                    {!earned && <span style={{ color: 'hsl(var(--mn-accent))' }}>+{a.tokens}💎</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* FORM */}
        <ProfileFormContent
          profile={profile}
          user={user}
          isEditing={isEditing}
          onSave={(data) => updateProfile.mutate(data)}
          isSaving={updateProfile.isPending}
        />

        {/* AUTOMATICKÁ ÚROVEŇ */}
        {subjectLevels.length > 0 && (
          <motion.div {...up(5)}>
            <ProfileCard icon={Sparkles} title="Automaticky detekovaná úroveň">
              <p className="mn-ui-font text-sm" style={{ color: 'hsl(var(--mn-muted))' }}>
                AI analyzuje tvou aktivitu a automaticky určí úroveň znalostí v každém oboru.
              </p>
              <div className="space-y-3">
                {subjectLevels.map(subject => (
                  <div key={subject.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                       style={{ background: 'hsl(var(--mn-surface-2))', border: '1px solid hsl(var(--mn-border))' }}>
                    <div>
                      <p className="mn-ui-font text-sm font-medium capitalize">{subject.subject}</p>
                      <p className="mn-ui-font text-xs mt-0.5" style={{ color: 'hsl(var(--mn-muted))' }}>
                        {subject.topics_studied} témat · {Math.round(subject.average_score)}% úspěšnost
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <div key={s} className="w-2.5 h-2.5 rounded-sm" style={{
                            background: s <= subject.level
                              ? 'hsl(var(--mn-accent))'
                              : 'hsl(var(--mn-border))',
                            boxShadow: s <= subject.level ? '0 0 6px hsl(var(--mn-accent) / 0.5)' : 'none'
                          }} />
                        ))}
                      </div>
                      <span className="mn-ui-font text-xs px-2 py-0.5 rounded-md"
                            style={{ background: 'hsl(var(--mn-accent)/0.10)', color: 'hsl(var(--mn-accent))' }}>
                        {['', 'Začátečník', 'Mírně pokročilý', 'Pokročilý', 'Velmi pokročilý', 'Expert'][subject.level]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ProfileCard>
          </motion.div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}

function ProfileFormContent({ profile, user, isEditing, onSave, isSaving }) {
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    education_level: profile?.education_level || '',
    year_of_study: profile?.year_of_study || '',
    faculty: profile?.faculty || '',
    institution: profile?.institution || '',
    current_specialization: profile?.current_specialization || '',
    career_paths: profile?.career_paths || [],
    areas_of_interest: profile?.areas_of_interest || [],
    learning_pace: profile?.learning_pace || 5,
    theory_vs_practice: profile?.theory_vs_practice || 5,
    overview_vs_deepdive: profile?.overview_vs_deepdive || 5,
    text_vs_visual: profile?.text_vs_visual || 5,
  });

  useEffect(() => {
    if (profile) setForm({
      display_name: profile.display_name || '',
      bio: profile.bio || '',
      education_level: profile.education_level || '',
      year_of_study: profile.year_of_study || '',
      faculty: profile.faculty || '',
      institution: profile.institution || '',
      current_specialization: profile.current_specialization || '',
      career_paths: profile.career_paths || [],
      areas_of_interest: profile.areas_of_interest || [],
      learning_pace: profile.learning_pace || 5,
      theory_vs_practice: profile.theory_vs_practice || 5,
      overview_vs_deepdive: profile.overview_vs_deepdive || 5,
      text_vs_visual: profile.text_vs_visual || 5,
    });
  }, [profile]);

  const toggle = (arr, item) =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  const inputStyle = (disabled) => ({
    background: 'hsl(var(--mn-surface-2))',
    border: `1px solid hsl(var(--mn-border))`,
    color: disabled ? 'hsl(var(--mn-muted))' : 'hsl(var(--mn-text))',
    borderRadius: '12px',
    opacity: disabled ? 0.7 : 1,
  });

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-6">

      {/* ZÁKLADNÍ INFORMACE */}
      <motion.div {...up(2)}>
        <ProfileCard icon={User} title="Základní informace">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Jméno a příjmení" hint={!form.display_name ? '+50 💎 za vyplnění jména' : ''}>
              <input value={form.display_name}
                onChange={e => setForm({ ...form, display_name: e.target.value })}
                disabled={!isEditing} placeholder="Jan Novák"
                className="w-full px-4 py-2.5 text-sm rounded-xl"
                style={inputStyle(!isEditing)} />
            </Field>
            <Field label="Email">
              <input value={user?.email || ''} disabled
                className="w-full px-4 py-2.5 text-sm rounded-xl"
                style={inputStyle(true)} />
            </Field>
          </div>
          <Field label="Bio" hint={!form.bio || form.bio.length < 20 ? '+10 💎 za bio (min. 20 znaků)' : ''}>
            <textarea value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              disabled={!isEditing}
              placeholder="Student 5. ročníku se zájmem o molekulární onkologii..."
              rows={3}
              className="w-full px-4 py-2.5 text-sm rounded-xl resize-none"
              style={{ ...inputStyle(!isEditing), fontFamily: 'var(--mn-font-sans)', lineHeight: '1.6' }}
            />
          </Field>
        </ProfileCard>
      </motion.div>

      {/* VZDĚLÁVÁNÍ & KARIÉRA */}
      <motion.div {...up(3)}>
        <ProfileCard icon={GraduationCap} title="Vzdělávání & Kariéra">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Stupeň vzdělání">
              <MnSelect value={form.education_level}
                onChange={e => setForm({ ...form, education_level: e.target.value })}
                disabled={!isEditing}>
                <option value="">Vyber...</option>
                {EDUCATION_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </MnSelect>
            </Field>
            <Field label="Specializace" hint={!form.current_specialization ? '+50 💎 za vybraný obor' : ''}>
              <MnSelect value={form.current_specialization}
                onChange={e => setForm({ ...form, current_specialization: e.target.value })}
                disabled={!isEditing}>
                <option value="">Vyber...</option>
                {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </MnSelect>
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Instituce">
              <input value={form.institution}
                onChange={e => setForm({ ...form, institution: e.target.value })}
                disabled={!isEditing} placeholder="Univerzita Karlova"
                className="w-full px-4 py-2.5 text-sm rounded-xl"
                style={inputStyle(!isEditing)} />
            </Field>
            <Field label="Fakulta">
              <input value={form.faculty}
                onChange={e => setForm({ ...form, faculty: e.target.value })}
                disabled={!isEditing} placeholder="1. LF UK"
                className="w-full px-4 py-2.5 text-sm rounded-xl"
                style={inputStyle(!isEditing)} />
            </Field>
          </div>

          <Field label="Kariérní směr">
            <div className="grid grid-cols-2 gap-2">
              {CAREER_PATHS.map(path => {
                const active = form.career_paths.includes(path.value);
                return (
                  <button key={path.value} type="button"
                    onClick={() => isEditing && setForm({ ...form, career_paths: toggle(form.career_paths, path.value) })}
                    disabled={!isEditing}
                    className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                    style={{
                      background: active ? 'hsl(var(--mn-accent) / 0.10)' : 'hsl(var(--mn-surface-2))',
                      border: `1px solid ${active ? 'hsl(var(--mn-accent) / 0.35)' : 'hsl(var(--mn-border))'}`,
                      opacity: !isEditing ? 0.7 : 1,
                      cursor: !isEditing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{path.icon}</span>
                    <span className="mn-ui-font text-sm font-medium">{path.label}</span>
                    {active && <Check className="w-4 h-4 ml-auto shrink-0" style={{ color: 'hsl(var(--mn-accent))' }} />}
                  </button>
                );
              })}
            </div>
          </Field>
        </ProfileCard>
      </motion.div>

      {/* OBLASTI ZÁJMU */}
      <motion.div {...up(4)}>
        <ProfileCard icon={Target} title="Oblasti zájmu">
          <p className="mn-ui-font text-sm" style={{ color: 'hsl(var(--mn-muted))' }}>
            Vyber min. 2 oblasti pro personalizovaná doporučení AI
            {form.areas_of_interest.length < 2 && (
              <span style={{ color: 'hsl(var(--mn-accent))' }}> · +30 💎 za 2+</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {MEDICAL_FIELDS.map(field => {
              const active = form.areas_of_interest.includes(field);
              return (
                <button key={field} type="button"
                  onClick={() => isEditing && setForm({ ...form, areas_of_interest: toggle(form.areas_of_interest, field) })}
                  disabled={!isEditing}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: active ? 'hsl(var(--mn-accent))' : 'hsl(var(--mn-surface-2))',
                    border: `1px solid ${active ? 'hsl(var(--mn-accent))' : 'hsl(var(--mn-border))'}`,
                    color: active ? 'white' : 'hsl(var(--mn-text))',
                    opacity: !isEditing ? 0.7 : 1,
                    cursor: !isEditing ? 'not-allowed' : 'pointer',
                    boxShadow: active ? '0 0 10px hsl(var(--mn-accent) / 0.3)' : 'none',
                  }}
                >
                  {field}
                </button>
              );
            })}
          </div>
        </ProfileCard>
      </motion.div>

      {/* STYL UČENÍ */}
      <motion.div {...up(5)}>
        <ProfileCard icon={Sparkles} title="Styl učení">
          <p className="mn-ui-font text-sm mb-2" style={{ color: 'hsl(var(--mn-muted))' }}>
            AI přizpůsobí obsah tvému stylu učení
            {form.learning_pace === 5 && (
              <span style={{ color: 'hsl(var(--mn-accent))' }}> · +20 💎 za nastavení</span>
            )}
          </p>
          <div className="space-y-6">
            <MnSlider label="Rychlost učení" leftLabel="Pomalý" rightLabel="Rychlý"
              value={form.learning_pace}
              onChange={v => setForm({ ...form, learning_pace: v })}
              disabled={!isEditing} />
            <MnSlider label="Preference obsahu" leftLabel="Teorie" rightLabel="Praxe"
              value={form.theory_vs_practice}
              onChange={v => setForm({ ...form, theory_vs_practice: v })}
              disabled={!isEditing} />
            <MnSlider label="Hloubka" leftLabel="Přehled" rightLabel="Deep dive"
              value={form.overview_vs_deepdive}
              onChange={v => setForm({ ...form, overview_vs_deepdive: v })}
              disabled={!isEditing} />
            <MnSlider label="Formát" leftLabel="Text" rightLabel="Vizuální"
              value={form.text_vs_visual}
              onChange={v => setForm({ ...form, text_vs_visual: v })}
              disabled={!isEditing} />
          </div>
        </ProfileCard>
      </motion.div>

      {/* SAVE */}
      {isEditing && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <button type="submit" disabled={isSaving}
            className="w-full mn-btn-cta py-3 text-sm rounded-xl inline-flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Ukládám...' : 'Uložit změny'}
          </button>
        </motion.div>
      )}
    </form>
  );
}
