import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bug, Lightbulb, FileQuestion, MessageSquarePlus, Send, CheckCircle2 } from 'lucide-react';

const FEEDBACK_TYPES = [
  {
    value: 'bug',
    label: 'Nefunkční stránka / bug',
    icon: Bug,
    activeBg: 'bg-red-500/15 border-red-500 text-red-400',
    idleBg: 'bg-red-500/5 border-red-500/20 text-[hsl(var(--mn-muted))]',
    placeholder: 'Co se stalo? Na jaké stránce? Jak to reprodukovat?',
  },
  {
    value: 'improvement',
    label: 'Návrh na vylepšení',
    icon: Lightbulb,
    activeBg: 'bg-amber-500/15 border-amber-500 text-amber-400',
    idleBg: 'bg-amber-500/5 border-amber-500/20 text-[hsl(var(--mn-muted))]',
    placeholder: 'Co by ti v portálu pomohlo? Co ti chybí nebo vadí?',
  },
  {
    value: 'missing_content',
    label: 'Chybějící funkce / sekce',
    icon: FileQuestion,
    activeBg: 'bg-blue-500/15 border-blue-500 text-blue-400',
    idleBg: 'bg-blue-500/5 border-blue-500/20 text-[hsl(var(--mn-muted))]',
    placeholder: 'Jaká funkce nebo sekce portálu ti chybí?',
  },
  {
    value: 'other',
    label: 'Jiné',
    icon: MessageSquarePlus,
    activeBg: 'bg-teal-500/15 border-teal-500 text-teal-400',
    idleBg: 'bg-teal-500/5 border-teal-500/20 text-[hsl(var(--mn-muted))]',
    placeholder: 'Napiš nám cokoliv...',
  },
];

export default function FeedbackModal({ open, onClose }) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState('bug');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setSubmitted(false);
      setDescription('');
      setSelectedType('bug');
    }
  }, [open]);

  const selectedConfig = FEEDBACK_TYPES.find(t => t.value === selectedType);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Prosím vyplň popis.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('user_feedback').insert({
        user_id: user?.id || null,
        type: selectedType,
        description: description.trim(),
        page_url: window.location.pathname,
        page_context: {
          url: window.location.href,
          title: document.title,
        },
        status: 'new',
      });
      if (error) throw error;
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
      }, 2200);
    } catch (err) {
      console.error('[FeedbackModal]', err);
      toast.error('Nepodařilo se odeslat. Zkus to znovu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-[hsl(var(--mn-surface))] border-[hsl(var(--mn-border))]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[hsl(var(--mn-border))]">
          <DialogTitle className="flex items-center gap-2 text-base text-[hsl(var(--mn-text))]">
            <MessageSquarePlus className="w-4 h-4 text-[hsl(var(--mn-accent))]" />
            Zpětná vazba k portálu
          </DialogTitle>
          <p className="text-xs text-[hsl(var(--mn-muted))] mt-0.5">
            Nahlásit bug nebo navrhnout vylepšení — každý feedback čteme
          </p>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-10 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[hsl(var(--mn-accent)/0.1)] flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-[hsl(var(--mn-accent))]" />
            </div>
            <div>
              <p className="font-semibold text-base text-[hsl(var(--mn-text))]">Odesláno, díky!</p>
              <p className="text-sm text-[hsl(var(--mn-muted))] mt-1">
                Feedback jsme dostali a podíváme se na to.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Typ */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[hsl(var(--mn-muted))] uppercase tracking-wider">
                Typ
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_TYPES.map(({ value, label, icon: Icon, activeBg, idleBg }) => {
                  const isSelected = selectedType === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setSelectedType(value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left',
                        isSelected ? activeBg : idleBg,
                        'hover:opacity-90'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Popis */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[hsl(var(--mn-muted))] uppercase tracking-wider">
                Popis
              </p>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={selectedConfig?.placeholder}
                className="min-h-[110px] resize-none text-sm bg-[hsl(var(--mn-surface-2))] border-[hsl(var(--mn-border))]"
                autoFocus
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-[hsl(var(--mn-muted))] opacity-60">
                {user ? user.email : 'anonymní'}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={onClose}
                  className="text-[hsl(var(--mn-muted))]">
                  Zrušit
                </Button>
                <Button
                  size="sm"
                  className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent-hover))] text-white gap-2"
                  onClick={handleSubmit}
                  disabled={loading || !description.trim()}
                >
                  {loading
                    ? <span className="animate-spin inline-block">⟳</span>
                    : <Send className="w-3.5 h-3.5" />}
                  Odeslat
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
