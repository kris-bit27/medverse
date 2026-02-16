import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flag, AlertTriangle, Clock, BookX, HelpCircle, Lightbulb, Send, Loader2, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

const TYPES = [
  { id: 'error', label: 'Faktická chyba', icon: AlertTriangle, color: 'text-red-400' },
  { id: 'outdated', label: 'Zastaralé info', icon: Clock, color: 'text-amber-400' },
  { id: 'incomplete', label: 'Chybí obsah', icon: BookX, color: 'text-orange-400' },
  { id: 'unclear', label: 'Nesrozumitelné', icon: HelpCircle, color: 'text-blue-400' },
  { id: 'suggestion', label: 'Návrh', icon: Lightbulb, color: 'text-teal-400' },
];

export default function ContentFeedback({ topicId, topicTitle }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('error');
  const [description, setDescription] = useState('');
  const [quotedText, setQuotedText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (!description.trim()) throw new Error('Popis je povinný');
      const { error } = await supabase.from('content_feedback').insert({
        user_id: user.id,
        topic_id: topicId,
        feedback_type: type,
        description: description.trim(),
        quoted_text: quotedText.trim() || null,
        severity: type === 'error' ? 'high' : type === 'outdated' ? 'high' : 'medium',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Děkujeme za zpětnou vazbu! AI ji analyzuje.');
      setTimeout(() => { setOpen(false); setSubmitted(false); setDescription(''); setQuotedText(''); }, 2000);
    },
    onError: (e) => toast.error(e.message),
  });

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-[hsl(var(--mn-muted))] hover:text-amber-400 transition-colors"
        title="Nahlásit nepřesnost"
      >
        <Flag className="w-3.5 h-3.5" />
        Nahlásit chybu
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-[360px] bg-[hsl(var(--mn-surface))] border border-[hsl(var(--mn-border))] rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2">
          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-[hsl(var(--mn-muted))]">Odesláno! AI analyzuje vaši zpětnou vazbu.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-[hsl(var(--mn-text))]">Nahlásit problém</h4>
                <button onClick={() => setOpen(false)} className="text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Type selection */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id}
                      onClick={() => setType(t.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        type === t.id
                          ? 'bg-slate-700 text-white ring-1 ring-teal-500/50'
                          : 'bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] hover:bg-slate-750'
                      }`}>
                      <Icon className={`w-3 h-3 ${type === t.id ? t.color : ''}`} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Quoted text */}
              <input
                type="text"
                placeholder="Citace problematického textu (volitelné)"
                value={quotedText}
                onChange={e => setQuotedText(e.target.value)}
                className="w-full bg-[hsl(var(--mn-surface-2))] border border-[hsl(var(--mn-border))] rounded-lg px-3 py-2 text-xs text-[hsl(var(--mn-muted))] placeholder-[hsl(var(--mn-muted))] mb-2 focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none"
              />

              {/* Description */}
              <textarea
                placeholder="Popište problém... (např. 'Dávkování metforminu je nesprávné, správně je 500-2000mg/den')"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-[hsl(var(--mn-surface-2))] border border-[hsl(var(--mn-border))] rounded-lg px-3 py-2 text-xs text-[hsl(var(--mn-muted))] placeholder-[hsl(var(--mn-muted))] mb-3 resize-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none"
              />

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-[hsl(var(--mn-muted))]">AI automaticky ověří a navrhne opravu</p>
                <Button
                  size="sm"
                  disabled={!description.trim() || submit.isPending}
                  onClick={() => submit.mutate()}
                  className="bg-teal-600 hover:bg-teal-500 text-white text-xs h-7 px-3"
                >
                  {submit.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                  Odeslat
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
