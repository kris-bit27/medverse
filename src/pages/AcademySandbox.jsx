import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAcademySandboxSessions } from '@/hooks/useAcademy';
import { SANDBOX_TOKEN_COST, SANDBOX_DAILY_LIMIT } from '@/lib/academy-constants';
import EvaluationPanel from '@/components/academy/EvaluationPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Send,
  Loader2,
  Info,
  Terminal,
  Clock,
} from 'lucide-react';

export default function AcademySandbox() {
  const { user } = useAuth();
  const { data: sessions = [], isLoading: sessionsLoading } = useAcademySandboxSessions(user?.id, 5);

  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [storeTranscript, setStoreTranscript] = useState(false);
  const [dailyUsage, setDailyUsage] = useState(null);

  useEffect(() => {
    if (user?.id) {
      supabase
        .rpc('check_sandbox_daily_limit', { p_user_id: user.id })
        .then(({ data }) => {
          if (data !== null && data !== undefined) setDailyUsage(data);
        })
        .catch(console.error);
    }
  }, [user?.id]);

  const handleSend = async () => {
    if (!prompt.trim() || sending) return;
    setSending(true);
    try {
      const clientRequestId = crypto.randomUUID();
      const { data, error } = await supabase.functions.invoke('academy-sandbox-run', {
        body: {
          client_request_id: clientRequestId,
          lesson_id: null,
          prompt: prompt.trim(),
          scenario_type: 'free',
          scenario_context: '',
          store_transcript: storeTranscript,
        },
      });

      if (error) throw error;

      setResponse(data?.ai_response || data?.response || 'AI odpověď není k dispozici.');
      setEvaluation(data?.evaluation || null);
      setDailyUsage((prev) => (prev !== null ? prev + 1 : 1));
    } catch (err) {
      console.error('Sandbox error:', err);
      toast.error('Chyba při komunikaci s AI sandbox.');
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setPrompt('');
    setResponse(null);
    setEvaluation(null);
  };

  const remaining = dailyUsage !== null ? SANDBOX_DAILY_LIMIT - dailyUsage : null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Terminal className="w-6 h-6 text-teal-500" />
          AI Sandbox — Volný režim
        </h1>
        <p className="text-[hsl(var(--mn-muted))] mt-1">
          Procvičte si komunikaci s AI na klinických scénářích
        </p>
      </div>

      {/* Info card */}
      <Card className="border-teal-500/30 bg-teal-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
          <p className="text-sm">
            Procvičte si komunikaci s AI na klinických scénářích. Vaše prompty budou automaticky hodnoceny.
          </p>
        </CardContent>
      </Card>

      {/* Response */}
      {response && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AI odpověď</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{response}</p>
          </CardContent>
        </Card>
      )}

      {evaluation && <EvaluationPanel evaluation={evaluation} />}

      {response && (
        <Button variant="outline" onClick={handleReset}>
          Nový prompt
        </Button>
      )}

      {/* Input */}
      {!response && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
              placeholder="Napište svůj klinický prompt..."
              className="min-h-[120px]"
            />
            <div className="flex items-center justify-between text-xs text-[hsl(var(--mn-muted))]">
              <span>{prompt.length}/2000 znaků</span>
              <span>Tato interakce stojí {SANDBOX_TOKEN_COST} tokenů</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sandbox-store"
                checked={storeTranscript}
                onChange={(e) => setStoreTranscript(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="sandbox-store" className="text-xs text-[hsl(var(--mn-muted))]">
                Uložit záznam konverzace pro mé budoucí reference
              </label>
            </div>

            <div className="flex items-center justify-between">
              <Button onClick={handleSend} disabled={!prompt.trim() || sending}>
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Odeslat
              </Button>
              {remaining !== null && (
                <span className="text-xs text-[hsl(var(--mn-muted))]">
                  Zbývá {remaining}/{SANDBOX_DAILY_LIMIT} sandbox interakcí dnes
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Poslední interakce</h2>
        {sessionsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-[hsl(var(--mn-muted))]">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Zatím žádné sandbox interakce.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {session.user_prompt || session.prompt || 'Sandbox interakce'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[hsl(var(--mn-muted))] mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(session.created_at).toLocaleDateString('cs-CZ')}
                    </div>
                  </div>
                  {session.overall_score !== null && session.overall_score !== undefined && (
                    <Badge
                      variant="secondary"
                      className={`shrink-0 ${
                        session.overall_score >= 60
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                      } border-0`}
                    >
                      {session.overall_score}%
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
