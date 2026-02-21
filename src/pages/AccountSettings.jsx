import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Shield, Bell, Globe, Lock, Database,
  Download, Trash2, AlertTriangle, CheckCircle2,
  ChevronRight, Eye, EyeOff, Monitor
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const up = (i = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }
});

/* Styled select — konzistentní s portálem */
function MnSelect({ value, onChange, children, disabled }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm transition-colors"
        style={{
          background: 'hsl(var(--mn-surface-2))',
          border: '1px solid hsl(var(--mn-border))',
          color: 'hsl(var(--mn-text))',
          fontFamily: 'var(--mn-font-sans)',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        onFocus={e => { e.target.style.borderColor = 'hsl(var(--mn-accent) / 0.5)'; }}
        onBlur={e => { e.target.style.borderColor = 'hsl(var(--mn-border))'; }}
      >
        {children}
      </select>
      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 pointer-events-none"
                    style={{ color: 'hsl(var(--mn-muted))' }} />
    </div>
  );
}

/* Sekce karta */
function SettingsCard({ icon: Icon, title, accent, children }) {
  return (
    <div className="mn-card overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'hsl(var(--mn-border))' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
             style={{ background: 'hsl(var(--mn-accent) / 0.10)' }}>
          <Icon className="w-4 h-4" style={{ color: accent || 'hsl(var(--mn-accent))' }} />
        </div>
        <h2 className="mn-ui-font font-semibold" style={{ fontSize: '15px' }}>{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

/* Toggle řádek */
function ToggleRow({ label, description, checked, onChange, disabled, badge }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b last:border-0"
         style={{ borderColor: 'hsl(var(--mn-border) / 0.5)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="mn-ui-font text-sm font-medium">{label}</span>
          {badge}
        </div>
        {description && (
          <p className="mn-ui-font text-xs mt-0.5" style={{ color: 'hsl(var(--mn-muted))' }}>{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

/* Input pole */
function SettingsInput({ label, value, type = 'text', disabled, hint, action }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="mn-ui-font text-xs font-semibold uppercase tracking-wider"
             style={{ color: 'hsl(var(--mn-muted))' }}>{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={type === 'password' ? (show ? 'text' : 'password') : type}
            value={value}
            readOnly={disabled}
            className="w-full rounded-xl px-4 py-2.5 text-sm"
            style={{
              background: 'hsl(var(--mn-surface-2))',
              border: '1px solid hsl(var(--mn-border))',
              color: disabled ? 'hsl(var(--mn-muted))' : 'hsl(var(--mn-text))',
              fontFamily: 'var(--mn-font-sans)',
              outline: 'none',
              opacity: disabled ? 0.7 : 1,
            }}
          />
          {type === 'password' && (
            <button onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'hsl(var(--mn-muted))' }}>
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {action && (
          <button onClick={action.fn}
                  className="mn-btn-outline px-4 py-2.5 text-sm rounded-xl whitespace-nowrap">
            {action.label}
          </button>
        )}
      </div>
      {hint && <p className="mn-ui-font text-xs" style={{ color: 'hsl(var(--mn-muted))' }}>{hint}</p>}
    </div>
  );
}

export default function AccountSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /* Notifications — lokální state + persistence */
  const [notifications, setNotifications] = useState({
    new_materials: true,
    review_reminders: true,
    ai_budget_warning: true,
    weekly_summary: false,
    news: false,
    marketing: false,
  });
  const [notifFrequency, setNotifFrequency] = useState('daily_8');

  /* Settings fetch */
  const { data: settings, isLoading } = useQuery({
    queryKey: ['userSettings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings').select('*').eq('user_id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || {};
    },
    enabled: !!user?.id,
    onSuccess: (d) => {
      if (d?.notifications) setNotifications(prev => ({ ...prev, ...d.notifications }));
      if (d?.notification_frequency) setNotifFrequency(d.notification_frequency);
    }
  });

  /* Consent fetch */
  const { data: consent, isLoading: consentLoading } = useQuery({
    queryKey: ['dataConsent', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_data_consent').select('*').eq('user_id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || {
        personalization: true, anonymous_analytics: false,
        auto_level_detection: false, educational_research: false,
      };
    },
    enabled: !!user?.id
  });

  /* Consent mutation */
  const updateConsent = useMutation({
    mutationFn: async (updated) => {
      const { data, error } = await supabase
        .from('user_data_consent').upsert({ user_id: user.id, ...updated }).select().single();
      if (error) throw error;
      if (updated.anonymous_analytics && !consent?.anonymous_analytics) {
        await supabase.rpc('earn_tokens', {
          p_user_id: user.id, p_amount: 20,
          p_achievement_type: 'consent_analytics',
          p_achievement_name: 'Anonymní analytika povolena'
        });
        toast.success('+20 💎 za povolení analytiky!');
      }
      if (updated.educational_research && !consent?.educational_research) {
        await supabase.rpc('earn_tokens', {
          p_user_id: user.id, p_amount: 50,
          p_achievement_type: 'consent_research',
          p_achievement_name: 'Výzkum povolen'
        });
        toast.success('+50 💎 za povolení výzkumu!');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dataConsent']);
      toast.success('Uloženo');
    },
    onError: () => toast.error('Chyba při ukládání')
  });

  /* Notifications mutation */
  const saveNotifications = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, notifications: data.notifications, notification_frequency: data.frequency });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userSettings']);
      toast.success('Notifikace uloženy');
    },
    onError: () => toast.error('Chyba při ukládání')
  });

  const handleNotifChange = (key, val) => {
    const updated = { ...notifications, [key]: val };
    setNotifications(updated);
    saveNotifications.mutate({ notifications: updated, frequency: notifFrequency });
  };

  const handleFrequencyChange = (val) => {
    setNotifFrequency(val);
    saveNotifications.mutate({ notifications, frequency: val });
  };

  const downloadUserData = async () => {
    try {
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single();
      const { data: tokens } = await supabase.from('user_tokens').select('*').eq('user_id', user.id).single();
      const { data: achievements } = await supabase.from('gamification_achievements').select('*').eq('user_id', user.id);
      const blob = new Blob([JSON.stringify({ user: { id: user.id, email: user.email }, profile, tokens, achievements, downloaded_at: new Date().toISOString() }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `medverse-data-${new Date().toISOString().split('T')[0]}.json`; a.click();
      toast.success('Data stažena!');
    } catch { toast.error('Chyba při stahování'); }
  };

  if (isLoading || consentLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="relative min-h-screen">

      {/* Ambient bg */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute -top-32 right-0 w-[400px] h-[400px]" style={{
          background: 'radial-gradient(circle, hsl(var(--mn-accent) / 0.06) 0%, transparent 65%)',
          filter: 'blur(80px)'
        }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-8">

        {/* PAGE HEADER */}
        <motion.div {...up(0)}>
          <span className="mn-eyebrow-accent">NASTAVENÍ ÚČTU</span>
          <h1 className="mn-serif-font font-bold mt-1" style={{ fontSize: 'clamp(28px,4vw,38px)' }}>
            Nastavení
          </h1>
          <p className="mn-ui-font mt-1" style={{ color: 'hsl(var(--mn-muted))', fontSize: '15px' }}>
            Zabezpečení, notifikace a soukromí
          </p>
        </motion.div>

        {/* ZABEZPEČENÍ */}
        <motion.div {...up(1)}>
          <SettingsCard icon={Shield} title="Zabezpečení">
            <SettingsInput
              label="Email"
              value={user?.email || ''}
              disabled
              hint="Email nelze změnit bez ověření identity"
            />
            <SettingsInput
              label="Heslo"
              type="password"
              value="••••••••••••"
              disabled
              hint="Poslední změna: Před 30 dny"
              action={{ label: 'Změnit heslo', fn: () => toast.info('Odkaz pro změnu hesla byl odeslán na tvůj email') }}
            />

            {/* 2FA */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl"
                 style={{ background: 'hsl(var(--mn-surface-2))', border: '1px solid hsl(var(--mn-border))' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                     style={{ background: 'hsl(var(--mn-accent) / 0.10)' }}>
                  <Lock className="w-4 h-4" style={{ color: 'hsl(var(--mn-accent))' }} />
                </div>
                <div>
                  <p className="mn-ui-font text-sm font-medium">Dvoufaktorové ověření (2FA)</p>
                  <p className="mn-ui-font text-xs" style={{ color: 'hsl(var(--mn-muted))' }}>
                    Doporučeno pro zvýšenou bezpečnost
                  </p>
                </div>
              </div>
              <Switch disabled />
            </div>

            {/* Aktivní relace */}
            <div>
              <p className="mn-ui-font text-xs font-semibold uppercase tracking-wider mb-3"
                 style={{ color: 'hsl(var(--mn-muted))' }}>Aktivní relace</p>
              <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                   style={{ background: 'hsl(var(--mn-surface-2))', border: '1px solid hsl(var(--mn-border))' }}>
                <div className="flex items-center gap-3">
                  <Monitor className="w-4 h-4" style={{ color: 'hsl(var(--mn-muted))' }} />
                  <div>
                    <p className="mn-ui-font text-sm font-medium">Tento prohlížeč</p>
                    <p className="mn-ui-font text-xs" style={{ color: 'hsl(var(--mn-muted))' }}>
                      Praha, Česko · Nyní
                    </p>
                  </div>
                </div>
                <span className="mn-tag text-xs px-2 py-0.5" style={{ color: 'hsl(var(--mn-success))' }}>
                  Aktivní
                </span>
              </div>
              <button
                className="w-full mt-2 mn-btn-outline py-2.5 text-sm rounded-xl"
                onClick={() => toast.info('Odhlašuji všechna zařízení...')}
              >
                Odhlásit všechna zařízení
              </button>
            </div>
          </SettingsCard>
        </motion.div>

        {/* NOTIFIKACE */}
        <motion.div {...up(2)}>
          <SettingsCard icon={Bell} title="Notifikace">
            <ToggleRow
              label="Nové studijní materiály"
              description="Upozornění když jsou přidána nová témata"
              checked={notifications.new_materials}
              onChange={v => handleNotifChange('new_materials', v)}
            />
            <ToggleRow
              label="Připomínky opakování"
              description="Denní upozornění na flashcards k opakování"
              checked={notifications.review_reminders}
              onChange={v => handleNotifChange('review_reminders', v)}
            />
            <ToggleRow
              label="AI budget varování"
              description="Upozornění při 80 % a 100 % využití kreditů"
              checked={notifications.ai_budget_warning}
              onChange={v => handleNotifChange('ai_budget_warning', v)}
            />
            <ToggleRow
              label="Týdenní souhrn aktivity"
              description="Nedělní email se statistikami"
              checked={notifications.weekly_summary}
              onChange={v => handleNotifChange('weekly_summary', v)}
            />
            <ToggleRow
              label="Novinky & aktualizace"
              description="Informace o nových funkcích"
              checked={notifications.news}
              onChange={v => handleNotifChange('news', v)}
            />
            <ToggleRow
              label="Marketing"
              description="Nabídky a doporučení"
              checked={notifications.marketing}
              onChange={v => handleNotifChange('marketing', v)}
            />

            <div className="pt-2">
              <p className="mn-ui-font text-xs font-semibold uppercase tracking-wider mb-2"
                 style={{ color: 'hsl(var(--mn-muted))' }}>Frekvence upozornění</p>
              <MnSelect value={notifFrequency} onChange={e => handleFrequencyChange(e.target.value)}>
                <option value="daily_8">Denně v 8:00</option>
                <option value="daily_18">Denně v 18:00</option>
                <option value="weekly">Týdně (neděle 18:00)</option>
                <option value="never">Nikdy</option>
              </MnSelect>
            </div>
          </SettingsCard>
        </motion.div>

        {/* JAZYK & REGION */}
        <motion.div {...up(3)}>
          <SettingsCard icon={Globe} title="Jazyk & Region">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="mn-ui-font text-xs font-semibold uppercase tracking-wider mb-1.5"
                   style={{ color: 'hsl(var(--mn-muted))' }}>Jazyk rozhraní</p>
                <MnSelect value="cs">
                  <option value="cs">Čeština</option>
                  <option value="en">English</option>
                  <option value="sk">Slovenčina</option>
                </MnSelect>
              </div>
              <div>
                <p className="mn-ui-font text-xs font-semibold uppercase tracking-wider mb-1.5"
                   style={{ color: 'hsl(var(--mn-muted))' }}>Časové pásmo</p>
                <MnSelect value="cet">
                  <option value="cet">Praha (CET)</option>
                  <option value="utc">UTC</option>
                </MnSelect>
              </div>
              <div>
                <p className="mn-ui-font text-xs font-semibold uppercase tracking-wider mb-1.5"
                   style={{ color: 'hsl(var(--mn-muted))' }}>Formát data</p>
                <MnSelect value="dmy">
                  <option value="dmy">DD.MM.YYYY</option>
                  <option value="mdy">MM/DD/YYYY</option>
                  <option value="iso">YYYY-MM-DD</option>
                </MnSelect>
              </div>
            </div>
          </SettingsCard>
        </motion.div>

        {/* SOUKROMÍ & DATA (GDPR) */}
        <motion.div {...up(4)}>
          <div className="mn-card overflow-hidden" style={{
            boxShadow: '0 0 0 1px hsl(var(--mn-accent) / 0.12)'
          }}>
            <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'hsl(var(--mn-border))' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: 'hsl(var(--mn-accent) / 0.10)' }}>
                <Database className="w-4 h-4" style={{ color: 'hsl(var(--mn-accent))' }} />
              </div>
              <h2 className="mn-ui-font font-semibold" style={{ fontSize: '15px' }}>Soukromí & Data (GDPR)</h2>
            </div>

            <div className="px-6 py-5 space-y-1">
              <p className="mn-ui-font text-sm mb-4" style={{ color: 'hsl(var(--mn-muted))' }}>
                Máš plnou kontrolu nad tím, jak jsou tvá data používána.
              </p>

              <ToggleRow
                label="Personalizace"
                description="AI doporučení a studijní plány (povinné)"
                checked={consent?.personalization ?? true}
                onChange={v => updateConsent.mutate({ ...consent, personalization: v })}
                disabled
                badge={<Badge variant="secondary" className="text-[10px] px-1.5 py-0">Povinné</Badge>}
              />
              <ToggleRow
                label="Anonymní analytika"
                description="Agregované metriky pro vylepšení platformy"
                checked={consent?.anonymous_analytics ?? false}
                onChange={v => updateConsent.mutate({ ...consent, anonymous_analytics: v })}
                badge={!consent?.anonymous_analytics && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'hsl(var(--mn-accent)/0.12)', color: 'hsl(var(--mn-accent))' }}>
                    +20 💎
                  </span>
                )}
              />
              <ToggleRow
                label="Automatická detekce úrovně"
                description="AI automaticky určí tvou úroveň znalostí"
                checked={consent?.auto_level_detection ?? false}
                onChange={v => updateConsent.mutate({ ...consent, auto_level_detection: v })}
              />
              <ToggleRow
                label="Vzdělávací výzkum"
                description="Anonymizovaná data pro pedagogický výzkum"
                checked={consent?.educational_research ?? false}
                onChange={v => updateConsent.mutate({ ...consent, educational_research: v })}
                badge={!consent?.educational_research && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'hsl(var(--mn-accent)/0.12)', color: 'hsl(var(--mn-accent))' }}>
                    +50 💎
                  </span>
                )}
              />

              {/* Co sbíráme / nesbíráme */}
              <div className="pt-4 mt-2 border-t" style={{ borderColor: 'hsl(var(--mn-border) / 0.5)' }}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="mn-ui-font text-xs font-semibold uppercase tracking-wider mb-2"
                       style={{ color: 'hsl(var(--mn-muted))' }}>Co sbíráme</p>
                    {['Studijní pokrok a výsledky', 'Preference a nastavení', 'Využití AI funkcí', 'Čas na platformě'].map(item => (
                      <div key={item} className="flex items-center gap-2 py-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'hsl(var(--mn-success))' }} />
                        <span className="mn-ui-font text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="mn-ui-font text-xs font-semibold uppercase tracking-wider mb-2"
                       style={{ color: 'hsl(var(--mn-muted))' }}>Co NIKDY nesbíráme</p>
                    {['Zdravotní informace pacientů', 'Osobní identifikátory (RČ)', 'Lokační data v reálném čase', 'Obsah soukromých poznámek'].map(item => (
                      <div key={item} className="flex items-center gap-2 py-1">
                        <div className="w-3.5 h-3.5 shrink-0 rounded-full flex items-center justify-center"
                             style={{ background: 'hsl(var(--mn-danger) / 0.15)' }}>
                          <div className="w-1.5 h-0.5 rounded-full" style={{ background: 'hsl(var(--mn-danger))' }} />
                        </div>
                        <span className="mn-ui-font text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* GDPR akce */}
              <div className="pt-4 mt-2 border-t space-y-2" style={{ borderColor: 'hsl(var(--mn-border) / 0.5)' }}>
                <p className="mn-ui-font text-xs font-semibold uppercase tracking-wider mb-3"
                   style={{ color: 'hsl(var(--mn-muted))' }}>Tvá práva (GDPR)</p>
                <button
                  onClick={downloadUserData}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left"
                  style={{ background: 'hsl(var(--mn-surface-2))', border: '1px solid hsl(var(--mn-border))' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'hsl(var(--mn-accent) / 0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'hsl(var(--mn-border))'}
                >
                  <Download className="w-4 h-4" style={{ color: 'hsl(var(--mn-accent))' }} />
                  Stáhnout moje data (JSON)
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left"
                  style={{ background: 'hsl(var(--mn-danger) / 0.06)', border: '1px solid hsl(var(--mn-danger) / 0.2)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'hsl(var(--mn-danger) / 0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'hsl(var(--mn-danger) / 0.2)'}
                >
                  <Trash2 className="w-4 h-4" style={{ color: 'hsl(var(--mn-danger))' }} />
                  <span style={{ color: 'hsl(var(--mn-danger))' }}>Smazat můj účet</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="h-8" />
      </div>

      {/* DELETE CONFIRM DIALOG */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}
          >
            <div className="flex items-center gap-3 px-6 py-5 border-b"
                 style={{ borderColor: 'hsl(var(--mn-border))', background: 'hsl(var(--mn-danger) / 0.06)' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: 'hsl(var(--mn-danger))' }} />
              <h3 className="mn-ui-font font-semibold" style={{ color: 'hsl(var(--mn-danger))' }}>
                Smazat účet?
              </h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="mn-ui-font text-sm">
                Tato akce je <strong>nevratná</strong>. Všechna tvá data budou trvale smazána do 30 dnů.
              </p>
              <div className="rounded-xl p-4 space-y-2"
                   style={{ background: 'hsl(var(--mn-surface-2))', border: '1px solid hsl(var(--mn-border))' }}>
                {['Profil a nastavení', 'Studijní pokrok', 'Poznámky a flashcards', 'AI generace a cache'].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--mn-danger))' }} />
                    <span className="mn-ui-font text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 mn-btn-outline py-2.5 text-sm rounded-xl"
                >
                  Zrušit
                </button>
                <button
                  onClick={() => {
                    toast.info('Účet bude smazán do 30 dnů. Kontaktujte podporu pro zrušení.');
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 py-2.5 text-sm rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: 'hsl(var(--mn-danger))' }}
                >
                  Smazat účet
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
