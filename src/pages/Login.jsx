import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

/* ── Official OAuth provider SVG logos ── */
const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const FacebookLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
  </svg>
);

const MicrosoftLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1h10.5v10.5H1z" fill="#F25022"/>
    <path d="M12.5 1H23v10.5H12.5z" fill="#7FBA00"/>
    <path d="M1 12.5h10.5V23H1z" fill="#00A4EF"/>
    <path d="M12.5 12.5H23V23H12.5z" fill="#FFB900"/>
  </svg>
);

const PROVIDER_META = [
  { id: 'google', label: 'Google', Logo: GoogleLogo },
  { id: 'apple', label: 'Apple', Logo: AppleLogo },
  { id: 'facebook', label: 'Facebook', Logo: FacebookLogo },
  { id: 'azure', label: 'Microsoft', Logo: MicrosoftLogo }
];

const getRedirectTo = () => {
  const params = new URLSearchParams(window.location.search);
  const target = params.get('redirectTo') || '/Dashboard';
  const preferredSiteUrl = import.meta.env.VITE_SITE_URL;
  const siteUrl = import.meta.env.PROD && preferredSiteUrl ? preferredSiteUrl : window.location.origin;
  return `${siteUrl}/auth/callback?redirectTo=${encodeURIComponent(target)}`;
};

const getEnabledProviders = () => {
  const raw = import.meta.env.VITE_AUTH_PROVIDERS;
  if (raw === undefined || raw === null) return PROVIDER_META.map(p => p.id);
  return raw.split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
};

const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, label: 'Minimálně 8 znaků' },
  { test: (p) => /[A-Z]/.test(p), label: 'Jedno velké písmeno' },
  { test: (p) => /[a-z]/.test(p), label: 'Jedno malé písmeno' },
  { test: (p) => /[0-9]/.test(p), label: 'Jedna číslice' },
];

export default function Login() {
  const navigate = useNavigate();
  // 'login' | 'register' | 'reset' | 'reset-sent' | 'register-confirm'
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const enabledProviders = useMemo(() => getEnabledProviders(), []);
  const providers = PROVIDER_META.filter(p => enabledProviders.includes(p.id));

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, checks: PASSWORD_RULES.map(r => ({ ...r, passed: false })) };
    const checks = PASSWORD_RULES.map(r => ({ ...r, passed: r.test(password) }));
    return { score: checks.filter(c => c.passed).length, checks };
  }, [password]);

  const handleOAuth = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: getRedirectTo() } });
    if (error) toast.error(`Přihlášení selhalo: ${error.message}`);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Vyplňte e-mail a heslo'); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login')) toast.error('Nesprávný e-mail nebo heslo');
      else if (error.message.includes('Email not confirmed')) toast.error('E-mail zatím není ověřen — zkontrolujte svou schránku');
      else toast.error(error.message);
    } else {
      toast.success('Přihlášení úspěšné!');
      navigate('/Dashboard');
    }
    setSubmitting(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Vyplňte e-mail a heslo'); return; }
    if (password !== confirmPassword) { toast.error('Hesla se neshodují'); return; }
    if (passwordStrength.score < 4) { toast.error('Heslo nesplňuje požadavky bezpečnosti'); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: getRedirectTo() } });
    if (error) {
      if (error.message.includes('already registered')) toast.error('Tento e-mail je již registrován — zkuste se přihlásit');
      else if (error.message.includes('weak_password') || error.message.includes('leaked')) toast.error('Toto heslo je příliš slabé nebo bylo kompromitováno. Zvolte jiné.');
      else toast.error(error.message);
    } else {
      setMode('register-confirm');
    }
    setSubmitting(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Zadejte e-mail'); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: getRedirectTo() });
    if (error) toast.error(error.message);
    else setMode('reset-sent');
    setSubmitting(false);
  };

  if (mode === 'reset-sent' || mode === 'register-confirm') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.25),transparent_55%)]" />
        <Card className="relative w-full max-w-md border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur shadow-xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-teal-500" />
            </div>
            <h2 className="text-xl font-semibold">
              {mode === 'reset-sent' ? 'Odkaz pro reset odeslán!' : 'Registrace dokončena!'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'reset-sent'
                ? `Odkaz pro obnovení hesla jsme poslali na ${email}. Platí 24 hodin.`
                : `Potvrzovací e-mail jsme poslali na ${email}. Klikněte na odkaz pro aktivaci účtu.`}
            </p>
            <Button variant="outline" onClick={() => { setMode('login'); setPassword(''); setConfirmPassword(''); }}>
              <ArrowLeft className="w-4 h-4 mr-2" />Zpět na přihlášení
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.25),transparent_55%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.18),transparent_45%)]" />
      <Card className="relative w-full max-w-4xl overflow-hidden border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 shadow-[0_30px_80px_-40px_rgba(15,118,110,0.7)] backdrop-blur">
        <CardContent className="grid gap-0 p-0 md:grid-cols-[1.1fr_1fr]">
          <div className="p-10 md:p-12 border-b border-slate-200 dark:border-slate-900 md:border-b-0 md:border-r">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500" />
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-teal-600 dark:text-teal-300">MedVerse</div>
                <div className="text-lg font-semibold">Klinické vzdělávání</div>
              </div>
            </div>
            <div className="mt-10 space-y-4">
              <h1 className="text-3xl font-semibold leading-tight">
                {mode === 'login' && 'Přihlášení'}
                {mode === 'register' && 'Registrace'}
                {mode === 'reset' && 'Obnovení hesla'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {mode === 'login' && 'Pokračujte do studijního prostoru. Přihlaste se heslem nebo přes OAuth.'}
                {mode === 'register' && 'Vytvořte si účet a začněte se připravovat na atestaci.'}
                {mode === 'reset' && 'Pošleme odkaz pro nastavení nového hesla.'}
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                {['Přístup k premium obsahu', 'Synchronizace napříč zařízeními', 'Ověřené AI výstupy', 'Individuální plán učení'].map((t, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">{t}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8 md:p-10 bg-white/70 dark:bg-slate-950/70">
            {/* ═══ LOGIN ═══ */}
            {mode === 'login' && (<>
              <div className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Přihlášení</div>
              <div className="mt-1 text-2xl font-semibold">Vítejte zpět</div>
              {providers.length > 0 && (
                <div className="mt-6 space-y-2">
                  {providers.map((p) => (
                    <button key={p.id} type="button" onClick={() => handleOAuth(p.id)}
                      className="group flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-4 py-3 text-left text-sm font-medium transition hover:border-teal-500/40 hover:bg-teal-50 dark:hover:bg-slate-900">
                      <span className="flex items-center gap-3">
                        <p.Logo />
                        Pokračovat přes {p.label}
                      </span>
                      <span className="text-xs text-muted-foreground group-hover:text-teal-500">→</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />nebo e-mailem<div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="vas@email.cz" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">Heslo</Label>
                    <button type="button" className="text-xs text-teal-600 hover:text-teal-500" onClick={() => setMode('reset')}>Zapomněli jste heslo?</button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-10" autoComplete="current-password" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Přihlašuji...</> : 'Přihlásit se'}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Nemáte účet?{' '}<button type="button" className="text-teal-600 hover:text-teal-500 font-medium" onClick={() => { setMode('register'); setPassword(''); setConfirmPassword(''); }}>Zaregistrujte se</button>
              </div>
            </>)}

            {/* ═══ REGISTER ═══ */}
            {mode === 'register' && (<>
              <div className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Registrace</div>
              <div className="mt-1 text-2xl font-semibold">Vytvořit účet</div>
              <form onSubmit={handleRegister} className="mt-6 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="reg-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="reg-email" type="email" placeholder="vas@email.cz" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-password">Heslo</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="reg-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-10" autoComplete="new-password" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= passwordStrength.score ? (passwordStrength.score <= 2 ? 'bg-red-500' : passwordStrength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-200 dark:bg-slate-700'}`} />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {passwordStrength.checks.map((c, i) => (
                          <span key={i} className={c.passed ? 'text-emerald-500' : 'text-muted-foreground'}>{c.passed ? '✓' : '○'} {c.label}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-confirm">Potvrzení hesla</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="reg-confirm" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-9" autoComplete="new-password" />
                  </div>
                  {confirmPassword && password !== confirmPassword && <p className="text-xs text-red-500 mt-1">Hesla se neshodují</p>}
                </div>
                <Button type="submit" className="w-full" disabled={submitting || passwordStrength.score < 4 || password !== confirmPassword}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registruji...</> : 'Vytvořit účet'}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Již máte účet?{' '}<button type="button" className="text-teal-600 hover:text-teal-500 font-medium" onClick={() => { setMode('login'); setPassword(''); setConfirmPassword(''); }}>Přihlaste se</button>
              </div>
            </>)}

            {/* ═══ RESET ═══ */}
            {mode === 'reset' && (<>
              <div className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Reset hesla</div>
              <div className="mt-1 text-2xl font-semibold">Obnovení hesla</div>
              <form onSubmit={handleReset} className="mt-6 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="reset-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="reset-email" type="email" placeholder="vas@email.cz" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" autoComplete="email" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Odesílám...</> : 'Poslat odkaz pro reset'}
                </Button>
              </form>
              <div className="mt-4">
                <button type="button" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode('login')}>
                  <ArrowLeft className="w-3.5 h-3.5" />Zpět na přihlášení
                </button>
              </div>
            </>)}

            <div className="pt-5 mt-4 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={() => navigate('/')}>Zpět na web</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
