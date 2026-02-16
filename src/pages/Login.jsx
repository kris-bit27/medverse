import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

const PROVIDER_META = [
  { id: 'google', label: 'Google', icon: '🔵' },
  { id: 'apple', label: 'Apple', icon: '🍎' },
  { id: 'facebook', label: 'Facebook', icon: '🔷' },
  { id: 'azure', label: 'Microsoft', icon: '🟢' }
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

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Zadejte e-mail'); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: getRedirectTo() } });
    if (error) toast.error(error.message);
    else setMode('magic-sent');
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

  if (mode === 'magic-sent' || mode === 'reset-sent' || mode === 'register-confirm') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.25),transparent_55%)]" />
        <Card className="relative w-full max-w-md border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur shadow-xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-teal-500" />
            </div>
            <h2 className="text-xl font-semibold">
              {mode === 'magic-sent' && 'Odkaz odeslán!'}
              {mode === 'reset-sent' && 'Odkaz pro reset odeslán!'}
              {mode === 'register-confirm' && 'Registrace dokončena!'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'magic-sent' && `Poslali jsme přihlašovací odkaz na ${email}. Zkontrolujte e-mail (i spam).`}
              {mode === 'reset-sent' && `Odkaz pro obnovení hesla jsme poslali na ${email}. Platí 24 hodin.`}
              {mode === 'register-confirm' && `Potvrzovací e-mail jsme poslali na ${email}. Klikněte na odkaz pro aktivaci účtu.`}
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
                {mode === 'magic' && 'Přihlášení odkazem'}
                {mode === 'reset' && 'Obnovení hesla'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {mode === 'login' && 'Pokračujte do studijního prostoru. Přihlaste se heslem, odkazem, nebo přes OAuth.'}
                {mode === 'register' && 'Vytvořte si účet a začněte se připravovat na atestaci.'}
                {mode === 'magic' && 'Pošleme vám bezpečný jednorázový přihlašovací odkaz na e-mail.'}
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
            {mode === 'login' && (<>
              <div className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Přihlášení</div>
              <div className="mt-1 text-2xl font-semibold">Vítejte zpět</div>
              {providers.length > 0 && (
                <div className="mt-6 space-y-2">
                  {providers.map((p) => (
                    <button key={p.id} type="button" onClick={() => handleOAuth(p.id)}
                      className="group flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-4 py-3 text-left text-sm font-medium transition hover:border-teal-500/40 hover:bg-teal-50 dark:hover:bg-slate-900">
                      <span className="flex items-center gap-3"><span>{p.icon}</span>Pokračovat přes {p.label}</span>
                      <span className="text-xs text-muted-foreground group-hover:text-teal-500">OAuth</span>
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
              <div className="mt-4 flex flex-col gap-2">
                <button type="button" className="text-sm text-teal-600 hover:text-teal-500 text-center" onClick={() => setMode('magic')}>Přihlásit se bez hesla (magic link)</button>
                <div className="text-center text-sm text-muted-foreground">
                  Nemáte účet?{' '}<button type="button" className="text-teal-600 hover:text-teal-500 font-medium" onClick={() => { setMode('register'); setPassword(''); setConfirmPassword(''); }}>Zaregistrujte se</button>
                </div>
              </div>
            </>)}

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

            {mode === 'magic' && (<>
              <div className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Magic Link</div>
              <div className="mt-1 text-2xl font-semibold">Přihlášení bez hesla</div>
              <form onSubmit={handleMagicLink} className="mt-6 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="magic-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="magic-email" type="email" placeholder="vas@email.cz" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" autoComplete="email" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Odesílám...</> : 'Poslat přihlašovací odkaz'}
                </Button>
              </form>
              <div className="mt-4">
                <button type="button" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode('login')}>
                  <ArrowLeft className="w-3.5 h-3.5" />Zpět na přihlášení heslem
                </button>
              </div>
            </>)}

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
