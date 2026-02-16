import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const parseHashParams = () => {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash);
};

export default function AuthCallback() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const completeAuth = async () => {
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.search);
      const code = params.get('code');
      const redirectTo = params.get('redirectTo') || '/dashboard';
      const errorParam = params.get('error_description') || params.get('error');

      console.log('[AuthCallback] params', Object.fromEntries(params.entries()));

      if (errorParam) {
        setError(errorParam);
        return;
      }

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          console.log('[AuthCallback] exchange result', { error: exchangeError });
          if (exchangeError) {
            setError(exchangeError.message);
            return;
          }
        } else {
          const hashParams = parseHashParams();
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            console.log('[AuthCallback] setSession result', { error: setSessionError });
            if (setSessionError) {
              setError(setSessionError.message);
              return;
            }
          } else {
            const { error: sessionError } = await supabase.auth.getSession();
            console.log('[AuthCallback] getSession result', { error: sessionError });
            if (sessionError) {
              setError(sessionError.message);
              return;
            }
          }
        }
      } catch (err) {
        setError(err.message || 'Auth callback error');
        return;
      }

      window.location.href = redirectTo;
    };

    completeAuth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--mn-bg))] p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Přihlašování</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!error ? (
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--mn-muted))]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Dokončujeme přihlášení...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-red-600">{error}</div>
              <Button variant="outline" onClick={() => window.location.href = '/login'}>
                Zpět na přihlášení
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
