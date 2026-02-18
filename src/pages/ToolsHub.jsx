import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Calculator, Pill, GitBranch, Bot, ChevronRight, Clock, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const SECTIONS = [
  {
    key: 'calculators',
    title: 'Kalkulačky & Skóre',
    description: 'Klinické skórovací systémy pro rozhodování u lůžka',
    icon: Calculator,
    color: 'var(--mn-accent)',
    link: 'ClinicalCalculators',
    countKey: 'tools',
  },
  {
    key: 'drugs',
    title: 'Lékový průvodce',
    description: 'Study-oriented karty léků s klinickými perlami',
    icon: Pill,
    color: '#a855f7',
    link: 'DrugDatabase',
    countKey: 'drugs',
  },
  {
    key: 'algorithms',
    title: 'Klinické algoritmy',
    description: 'Interaktivní rozhodovací stromy dle guidelines',
    icon: GitBranch,
    color: '#3b82f6',
    link: 'ClinicalGuidelines',
    countKey: 'algorithms',
  },
  {
    key: 'ai',
    title: 'AI Konzultant',
    description: 'DDx, léčebný plán, lékové interakce',
    icon: Bot,
    color: '#f59e0b',
    link: 'Tools',
    badge: 'Beta',
  },
];

export default function ToolsHub() {
  const { data: counts = {} } = useQuery({
    queryKey: ['tools-counts'],
    queryFn: async () => {
      const [t, d, g, a] = await Promise.all([
        supabase.from('clinical_tools').select('id', { count: 'exact', head: true }),
        supabase.from('drugs').select('id', { count: 'exact', head: true }),
        supabase.from('clinical_guidelines').select('id', { count: 'exact', head: true }),
        supabase.from('clinical_algorithms').select('id', { count: 'exact', head: true }),
      ]);
      return { tools: t.count || 0, drugs: d.count || 0, guidelines: g.count || 0, algorithms: a.count || 0 };
    },
  });

  const { data: featured = [] } = useQuery({
    queryKey: ['featured-tools'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clinical_tools')
        .select('name, slug, subcategory, icon, color')
        .eq('is_featured', true)
        .order('usage_count', { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">
      {/* Header */}
      <div>
        <span className="mn-caption text-[hsl(var(--mn-accent))]">NÁSTROJE PRO PRAXI</span>
        <h1 className="mn-serif-font text-[28px] sm:text-[32px] font-bold mt-1">
          Klinické Nástroje
        </h1>
        <p className="text-[hsl(var(--mn-muted))] mt-2 max-w-lg">
          Skórovací systémy, lékový průvodce a rozhodovací algoritmy pro každodenní klinickou praxi.
        </p>
      </div>

      {/* Quick search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--mn-muted))]" />
        <Input
          placeholder="Hledat nástroj (např. Wells, GFR, Amiodaron...)"
          className="pl-10"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value) {
              window.location.href = createPageUrl('ClinicalCalculators') + '?q=' + encodeURIComponent(e.target.value);
            }
          }}
        />
      </div>

      {/* 4 Section Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const count = s.countKey ? counts[s.countKey] : null;
          return (
            <Link
              key={s.key}
              to={createPageUrl(s.link)}
              className="group relative flex flex-col p-5 rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))] transition-all hover:border-[hsl(var(--mn-accent)/0.3)] hover:-translate-y-0.5"
              style={{ boxShadow: 'var(--mn-shadow-1)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `color-mix(in srgb, ${s.color} 12%, transparent)` }}
                >
                  <Icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                {s.badge && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: s.badge === 'Připravujeme'
                        ? 'hsl(var(--mn-surface))'
                        : `color-mix(in srgb, ${s.color} 12%, transparent)`,
                      color: s.badge === 'Připravujeme'
                        ? 'hsl(var(--mn-muted))'
                        : s.color,
                    }}
                  >
                    {s.badge}
                  </span>
                )}
              </div>
              <h3 className="mn-ui-font text-base font-semibold">{s.title}</h3>
              <p className="text-sm text-[hsl(var(--mn-muted))] mt-1 flex-1">{s.description}</p>
              {count > 0 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-[hsl(var(--mn-muted))]">
                  <span className="mn-mono-font font-semibold text-[hsl(var(--mn-text))]">{count}</span>
                  nástrojů
                </div>
              )}
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--mn-muted))] opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </div>

      {/* Featured tools */}
      {featured.length > 0 && (
        <div>
          <span className="mn-caption text-[hsl(var(--mn-muted))]">NEJPOUŽÍVANĚJŠÍ</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            {featured.map((t) => (
              <Link
                key={t.slug}
                to={`${createPageUrl('ClinicalCalculators')}?tool=${t.slug}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))] hover:border-[hsl(var(--mn-accent)/0.3)] transition-all"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `color-mix(in srgb, ${t.color || 'hsl(var(--mn-accent))'} 12%, transparent)` }}
                >
                  <Calculator className="w-4 h-4" style={{ color: t.color || 'hsl(var(--mn-accent))' }} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.name}</div>
                  <div className="text-[10px] text-[hsl(var(--mn-muted))] uppercase tracking-wider">{t.subcategory}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
