import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  Zap, TrendingUp, Clock, CreditCard, ArrowUpRight, ArrowDownLeft,
  RefreshCw, Sparkles, AlertTriangle, CheckCircle2, Info
} from 'lucide-react';

const up = (i = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }
});

const TRANSACTION_LABELS = {
  'topic_generation':   { label: 'Generace tématu',      icon: Sparkles,       color: 'hsl(var(--mn-accent))' },
  'flashcard_gen':      { label: 'Generace flashcards',  icon: Zap,            color: 'hsl(var(--mn-accent))' },
  'mcq_generation':     { label: 'Generace MCQ',         icon: Zap,            color: 'hsl(var(--mn-accent))' },
  'ai_consultant':      { label: 'AI Konzultant',        icon: Sparkles,       color: 'hsl(var(--mn-accent-2))' },
  'copilot':            { label: 'AI Copilot',           icon: Sparkles,       color: 'hsl(var(--mn-accent-2))' },
  'achievement':        { label: 'Odměna za aktivitu',   icon: CheckCircle2,   color: 'hsl(var(--mn-success))' },
  'monthly_reset':      { label: 'Měsíční reset',        icon: RefreshCw,      color: 'hsl(var(--mn-muted))' },
  'bonus':              { label: 'Bonus',                icon: TrendingUp,     color: 'hsl(var(--mn-success))' },
};

function resolveTransaction(type) {
  return TRANSACTION_LABELS[type] || { label: type || 'Transakce', icon: CreditCard, color: 'hsl(var(--mn-muted))' };
}

export default function AICredits() {
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) { setError('Nejste přihlášen'); return; }

      const userId = session.user.id;

      const { data: tokensData, error: tokensError } = await supabase
        .from('user_tokens').select('*').eq('user_id', userId).single();

      if (tokensError && tokensError.code !== 'PGRST116') throw tokensError;

      if (!tokensData) {
        const { data: newTokens, error: insertError } = await supabase
          .from('user_tokens').insert({ user_id: userId }).select().single();
        if (insertError) throw insertError;
        setTokens(newTokens);
      } else {
        setTokens(tokensData);
      }

      const { data: transData, error: transError } = await supabase
        .from('token_transactions').select('*').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(20);

      if (transError) throw transError;
      setTransactions(transData || []);
    } catch (err) {
      setError(err.message || 'Chyba při načítání');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="mn-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10">
        <div className="mn-card p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-[hsl(var(--mn-danger))] mx-auto mb-3" />
          <p className="text-[hsl(var(--mn-danger))] mb-4">{error}</p>
          <button onClick={loadData} className="mn-btn-cta px-5 py-2.5 text-sm rounded-xl">
            Zkusit znovu
          </button>
        </div>
      </div>
    );
  }

  if (!tokens) return null;

  const used = tokens.monthly_limit - tokens.current_tokens;
  const pct = Math.min(100, (used / tokens.monthly_limit) * 100);
  const remaining = tokens.current_tokens;
  const daysLeft = Math.max(0, Math.ceil((new Date(tokens.next_reset_date) - new Date()) / 86400000));

  const barColor = pct > 90
    ? 'hsl(var(--mn-danger))'
    : pct > 70
      ? 'hsl(var(--mn-warn))'
      : 'hsl(var(--mn-accent))';

  const barGlow = pct > 90
    ? 'hsl(var(--mn-danger) / 0.4)'
    : pct > 70
      ? 'hsl(var(--mn-warn) / 0.4)'
      : 'hsl(var(--mn-accent) / 0.4)';

  return (
    <div className="relative min-h-screen">

      {/* Ambient bg */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute -top-32 right-0 w-[500px] h-[500px]" style={{
          background: 'radial-gradient(circle, hsl(var(--mn-accent) / 0.08) 0%, transparent 65%)',
          filter: 'blur(80px)'
        }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-8">

        {/* ── PAGE HEADER ── */}
        <motion.div {...up(0)}>
          <span className="mn-eyebrow-accent">AI KREDITY & BILLING</span>
          <h1 className="mn-serif-font font-bold mt-1" style={{ fontSize: 'clamp(28px,4vw,38px)' }}>
            Využití AI tokenů
          </h1>
          <p className="mn-ui-font mt-1" style={{ color: 'hsl(var(--mn-muted))', fontSize: '15px' }}>
            Sleduj spotřebu a spravuj svůj plán
          </p>
        </motion.div>

        {/* ── HERO BALANCE ── */}
        <motion.div {...up(1)}>
          <div className="relative rounded-2xl overflow-hidden" style={{
            background: 'linear-gradient(135deg, hsl(var(--mn-surface)) 0%, hsl(var(--mn-surface-2)) 100%)',
            border: '1px solid hsl(var(--mn-border))',
            boxShadow: `0 0 0 1px hsl(var(--mn-accent) / 0.08), 0 8px 32px ${barGlow.replace('0.4','0.10')}`
          }}>
            {/* Glow */}
            <div className="absolute top-0 right-0 w-72 h-72 pointer-events-none" style={{
              background: `radial-gradient(circle, ${barGlow.replace('0.4','0.14')} 0%, transparent 70%)`,
              filter: 'blur(50px)'
            }} />

            <div className="relative px-8 py-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{
                      background: pct > 90 ? 'hsl(var(--mn-danger))' : 'hsl(var(--mn-success))',
                      boxShadow: `0 0 8px ${pct > 90 ? 'hsl(var(--mn-danger))' : 'hsl(var(--mn-success))'}`,
                    }} />
                    <span className="mn-eyebrow">Tento měsíc</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="mn-mono-font font-bold" style={{ fontSize: 'clamp(36px,5vw,52px)', color: barColor }}>
                      {remaining.toLocaleString('cs')}
                    </span>
                    <span className="mn-mono-font text-xl" style={{ color: 'hsl(var(--mn-muted))' }}>
                      / {tokens.monthly_limit.toLocaleString('cs')}
                    </span>
                    <span className="mn-ui-font text-sm" style={{ color: 'hsl(var(--mn-muted))' }}>tokenů zbývá</span>
                  </div>
                </div>

                {/* % badge */}
                <div className="text-right">
                  <div className="mn-mono-font font-bold text-2xl" style={{ color: barColor }}>
                    {(100 - pct).toFixed(0)}%
                  </div>
                  <div className="mn-ui-font text-xs mt-1" style={{ color: 'hsl(var(--mn-muted))' }}>
                    zbývá
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="rounded-full overflow-hidden mb-3" style={{
                height: '8px',
                background: 'hsl(var(--mn-border))'
              }}>
                <div className="h-full rounded-full transition-all duration-700" style={{
                  width: `${100 - pct}%`,
                  background: `linear-gradient(90deg, ${barColor}, ${barColor.replace(')', ' / 0.7)')})`,
                  boxShadow: `0 0 8px ${barGlow}`
                }} />
              </div>

              <div className="flex items-center justify-between">
                <span className="mn-ui-font text-xs" style={{ color: 'hsl(var(--mn-muted))' }}>
                  Využito: <strong style={{ color: 'hsl(var(--mn-text))' }}>{used.toLocaleString('cs')}</strong> tokenů
                </span>
                <span className="mn-ui-font text-xs" style={{ color: 'hsl(var(--mn-muted))' }}>
                  Reset za: <strong style={{ color: 'hsl(var(--mn-text))' }}>{daysLeft} {daysLeft === 1 ? 'den' : daysLeft < 5 ? 'dny' : 'dní'}</strong>
                </span>
              </div>

              {/* Warning */}
              {pct > 90 && (
                <div className="mt-5 flex items-start gap-3 px-4 py-3 rounded-xl" style={{
                  background: 'hsl(var(--mn-danger) / 0.08)',
                  border: '1px solid hsl(var(--mn-danger) / 0.25)'
                }}>
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'hsl(var(--mn-danger))' }} />
                  <p className="mn-ui-font text-sm" style={{ color: 'hsl(var(--mn-danger))' }}>
                    Blížíš se limitu. Zvaž upgrade nebo použij Free AI model.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── STAT KARTY ── */}
        <motion.div {...up(2)}>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                icon: Zap, label: 'Celkem generací',
                value: transactions.filter(t => t.amount < 0).length,
                color: 'hsl(var(--mn-accent))',
                glow: 'hsl(var(--mn-accent) / 0.15)',
                bg: 'hsl(var(--mn-accent) / 0.10)'
              },
              {
                icon: TrendingUp, label: 'Celkem získáno',
                value: (tokens.total_tokens_earned || 0).toLocaleString('cs') + ' 💎',
                color: 'hsl(var(--mn-success))',
                glow: 'hsl(var(--mn-success) / 0.15)',
                bg: 'hsl(var(--mn-success) / 0.10)'
              },
              {
                icon: CreditCard, label: 'Celkem utraceno',
                value: (tokens.total_tokens_used || 0).toLocaleString('cs') + ' 💎',
                color: 'hsl(var(--mn-accent-2))',
                glow: 'hsl(var(--mn-accent-2) / 0.15)',
                bg: 'hsl(var(--mn-accent-2) / 0.10)'
              },
            ].map((s, i) => (
              <div key={i} className="group relative rounded-2xl p-5 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--mn-surface)), hsl(var(--mn-surface-2)))',
                  border: '1px solid hsl(var(--mn-border))',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = `0 8px 28px ${s.glow}`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                     style={{ background: `radial-gradient(ellipse at 50% -20%, ${s.glow}, transparent 70%)` }} />
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                       style={{ background: s.bg, boxShadow: `0 0 16px ${s.glow}` }}>
                    <s.icon style={{ width: 16, height: 16, color: s.color }} />
                  </div>
                  <p className="mn-eyebrow mb-1" style={{ color: 'hsl(var(--mn-muted))' }}>{s.label}</p>
                  <p className="mn-mono-font font-bold text-2xl" style={{ color: s.color }}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── AKTUÁLNÍ PLÁN ── */}
        <motion.div {...up(3)}>
          <div className="mn-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="mn-eyebrow-accent">AKTUÁLNÍ PLÁN</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="mn-serif-font font-bold text-2xl" style={{ color: 'hsl(var(--mn-accent))' }}>
                  {tokens.plan_tier
                    ? tokens.plan_tier.charAt(0).toUpperCase() + tokens.plan_tier.slice(1)
                    : 'Student'}
                </p>
                <p className="mn-ui-font text-sm mt-1" style={{ color: 'hsl(var(--mn-muted))' }}>
                  {(tokens.monthly_limit || 1000).toLocaleString('cs')} tokenů/měsíc
                  {tokens.plan_price_czk ? ` · ${tokens.plan_price_czk} Kč` : ' · Zdarma'}
                </p>
              </div>
              <button className="mn-btn-outline px-5 py-2.5 text-sm rounded-xl inline-flex items-center gap-2">
                Změnit plán <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Plán tabulka */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { name: 'Student', tokens: '1 000', price: 'Zdarma', current: tokens.plan_tier === 'student' || !tokens.plan_tier },
                { name: 'Resident', tokens: '5 000', price: '249 Kč', current: tokens.plan_tier === 'resident' },
                { name: 'Specialist', tokens: '20 000', price: '599 Kč', current: tokens.plan_tier === 'specialist' },
              ].map((plan) => (
                <div key={plan.name} className="rounded-xl p-4 text-center transition-all"
                  style={{
                    background: plan.current
                      ? 'hsl(var(--mn-accent) / 0.08)'
                      : 'hsl(var(--mn-surface-2))',
                    border: plan.current
                      ? '1px solid hsl(var(--mn-accent) / 0.3)'
                      : '1px solid hsl(var(--mn-border))',
                  }}
                >
                  <p className="mn-ui-font font-semibold text-sm">{plan.name}</p>
                  <p className="mn-mono-font font-bold mt-1" style={{
                    fontSize: '18px',
                    color: plan.current ? 'hsl(var(--mn-accent))' : 'hsl(var(--mn-text))'
                  }}>{plan.tokens}</p>
                  <p className="mn-ui-font text-xs mt-0.5" style={{ color: 'hsl(var(--mn-muted))' }}>
                    {plan.price}
                  </p>
                  {plan.current && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                         style={{ background: 'hsl(var(--mn-accent) / 0.15)', color: 'hsl(var(--mn-accent))' }}>
                      <CheckCircle2 className="w-2.5 h-2.5" /> Aktivní
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── TRANSACTION HISTORY ── */}
        <motion.div {...up(4)}>
          <div className="mn-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{
              borderColor: 'hsl(var(--mn-border))'
            }}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: 'hsl(var(--mn-accent))' }} />
                <span className="mn-eyebrow-accent">NEDÁVNÁ AKTIVITA</span>
              </div>
              <span className="mn-ui-font text-xs" style={{ color: 'hsl(var(--mn-muted))' }}>
                Posledních {transactions.length} transakcí
              </span>
            </div>

            {transactions.length === 0 ? (
              <div className="py-16 text-center">
                <Zap className="w-10 h-10 mx-auto mb-3" style={{ color: 'hsl(var(--mn-muted))' }} />
                <p className="mn-ui-font" style={{ color: 'hsl(var(--mn-muted))' }}>
                  Zatím žádná aktivita
                </p>
              </div>
            ) : (
              <div>
                {transactions.map((tx, i) => {
                  const isPositive = tx.amount > 0;
                  const meta = resolveTransaction(tx.type);
                  const Icon = meta.icon;

                  return (
                    <div key={tx.id}
                      className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[hsl(var(--mn-elevated)/0.4)]"
                      style={{
                        borderBottom: i < transactions.length - 1
                          ? '1px solid hsl(var(--mn-border) / 0.4)'
                          : 'none'
                      }}
                    >
                      {/* Ikona */}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{
                        background: isPositive
                          ? 'hsl(var(--mn-success) / 0.10)'
                          : 'hsl(var(--mn-accent) / 0.08)',
                      }}>
                        {isPositive
                          ? <ArrowDownLeft style={{ width: 16, height: 16, color: 'hsl(var(--mn-success))' }} />
                          : <Icon style={{ width: 16, height: 16, color: meta.color }} />
                        }
                      </div>

                      {/* Label */}
                      <div className="flex-1 min-w-0">
                        <p className="mn-ui-font text-sm font-medium truncate">{meta.label}</p>
                        <p className="mn-ui-font text-xs truncate" style={{ color: 'hsl(var(--mn-muted))' }}>
                          {new Date(tx.created_at).toLocaleDateString('cs-CZ', {
                            day: 'numeric', month: 'short',
                            hour: '2-digit', minute: '2-digit'
                          })}
                          {tx.description && ` · ${tx.description}`}
                        </p>
                      </div>

                      {/* Částka */}
                      <div className="mn-mono-font font-bold text-sm shrink-0" style={{
                        color: isPositive ? 'hsl(var(--mn-success))' : 'hsl(var(--mn-text))'
                      }}>
                        {isPositive ? '+' : ''}{tx.amount} 💎
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── INFO FOOTER ── */}
        <motion.div {...up(5)}>
          <div className="flex items-start gap-3 px-5 py-4 rounded-xl" style={{
            background: 'hsl(var(--mn-surface-2))',
            border: '1px solid hsl(var(--mn-border))'
          }}>
            <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'hsl(var(--mn-muted))' }} />
            <p className="mn-ui-font text-sm" style={{ color: 'hsl(var(--mn-muted))' }}>
              Tokeny se obnovují vždy 1. den v měsíci. Nevyužité tokeny se nepřenášejí.
              Při vyčerpání limitu je AI Copilot a generace obsahu automaticky pozastavena.
            </p>
          </div>
        </motion.div>

        <div className="h-8" />
      </div>
    </div>
  );
}
