import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const PROVIDER_META = [
  { id: 'google', label: 'Google', accent: 'bg-red-500' },
  { id: 'apple', label: 'Apple', accent: 'bg-slate-900' },
  { id: 'facebook', label: 'Facebook', accent: 'bg-blue-600' },
  { id: 'azure', label: 'Microsoft', accent: 'bg-emerald-500' }
];

const getRedirectTo = () => {
  const params = new URLSearchParams(window.location.search);
  const target = params.get('redirectTo') || '/Dashboard';
  const preferredSiteUrl = import.meta.env.VITE_SITE_URL;
  const siteUrl = import.meta.env.PROD && preferredSiteUrl
    ? preferredSiteUrl
    : window.location.origin;
  return `${siteUrl}/auth/callback?redirectTo=${encodeURIComponent(target)}`;
};

const getEnabledProviders = () => {
  const raw = import.meta.env.VITE_AUTH_PROVIDERS;
  if (raw === undefined || raw === null) return PROVIDER_META.map(p => p.id);
  return raw
    .split(',')
    .map(p => p.trim().toLowerCase())
    .filter(Boolean);
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const enabledProviders = useMemo(() => getEnabledProviders(), []);
  const showEmail = import.meta.env.VITE_AUTH_EMAIL_ENABLED !== 'false';
  const providers = PROVIDER_META.filter(p => enabledProviders.includes(p.id));

  const handleOAuth = async (provider) => {
    const redirectTo = getRedirectTo();
    console.log('[Auth] OAuth start', {
      provider,
      origin: window.location.origin,
      redirectTo
    });

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });

    if (error) {
      console.error('[Auth] OAuth error:', error);
      toast.error(`Přihlášení selhalo: ${error.message}`);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Zadej e-mail');
      return;
    }
    setSubmitting(true);
    const redirectTo = getRedirectTo();
    console.log('[Auth] Email start', {
      email,
      origin: window.location.origin,
      redirectTo
    });

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });

    if (error) {
      console.error('[Auth] Email error:', error);
      toast.error(`E-mail login selhal: ${error.message}`);
    } else {
      toast.success('Poslali jsme přihlašovací odkaz na e-mail');
    }
    setSubmitting(false);
  };

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
                <div className="text-lg font-semibold text-slate-900 dark:text-white">Klinické vzdělávání</div>
              </div>
            </div>
            <div className="mt-10 space-y-4">
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-white">Přihlášení do studijního prostoru</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Pokračujte pomocí ověřeného účtu, nebo si nechte poslat bezpečný přihlašovací odkaz.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  Přístup k premium obsahu
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  Synchronizace napříč zařízeními
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  Ověřené AI výstupy
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  Individuální plán učení
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-10 bg-white/70 dark:bg-slate-950/70">
            <div className="text-sm uppercase tracking-[0.25em] text-slate-500">Přihlášení</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Vyberte metodu</div>

            <div className="mt-6 space-y-3">
              {providers.length === 0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-200">
                  OAuth poskytovatelé nejsou povoleni. Zapněte je v Supabase nebo nastavte `VITE_AUTH_PROVIDERS`.
                </div>
              ) : (
                providers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleOAuth(p.id)}
                    className="group flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-100 transition hover:border-teal-500/40 hover:bg-teal-50 dark:hover:bg-slate-900"
                  >
                    <span className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${p.accent}`} />
                      Pokračovat přes {p.label}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 group-hover:text-teal-500 dark:group-hover:text-teal-300">OAuth</span>
                  </button>
                ))
              )}
            </div>

            {showEmail && (
              <>
                <div className="my-6 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  nebo e-mail
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>

                <form onSubmit={handleEmail} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-slate-600 dark:text-slate-300">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    Poslat magic link
                  </Button>
                </form>
              </>
            )}

            <div className="pt-6">
              <Button variant="ghost" className="w-full text-slate-500 dark:text-slate-300" onClick={() => navigate('/')}>
                Zpět na web
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
