import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const providers = [
  { id: 'google', label: 'Google' },
  { id: 'apple', label: 'Apple' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'azure', label: 'Microsoft' }
];

const getRedirectTo = () => {
  const params = new URLSearchParams(window.location.search);
  const target = params.get('redirectTo') || '/Dashboard';
  return `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(target)}`;
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Přihlášení</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {providers.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                className="w-full"
                onClick={() => handleOAuth(p.id)}
              >
                Pokračovat přes {p.label}
              </Button>
            ))}
          </div>

          <div className="text-center text-xs text-slate-500">nebo</div>

          <form onSubmit={handleEmail} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              Poslat magic link
            </Button>
          </form>

          <div className="pt-2">
            <Button variant="ghost" className="w-full" onClick={() => navigate('/')}>Zpět na web</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
