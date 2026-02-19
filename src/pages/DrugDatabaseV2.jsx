import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Pill, Search, ArrowLeft, ChevronRight, Sparkles, BookOpen,
  AlertTriangle, ExternalLink, Shield, Baby, Beaker, Activity,
  Heart, Syringe, Brain, Stethoscope, FlaskConical, Droplet, Zap,
} from 'lucide-react';

// Category config
const CATEGORIES = {
  'antibiotic': { label: 'Antibiotika', color: '#ef4444', icon: FlaskConical },
  'analgesic': { label: 'Analgetika', color: '#f59e0b', icon: Zap },
  'NSAID': { label: 'NSAID', color: '#f59e0b', icon: Zap },
  'opioid': { label: 'Opioidy', color: '#f97316', icon: Zap },
  'anticoagulant': { label: 'Antikoagulancia', color: '#ec4899', icon: Droplet },
  'antihypertensive': { label: 'Antihypertenziva', color: '#3b82f6', icon: Heart },
  'diuretic': { label: 'Diuretika', color: '#06b6d4', icon: Droplet },
  'antidiabetic': { label: 'Antidiabetika', color: '#10b981', icon: Activity },
  'cardiac': { label: 'Kardiaka', color: '#ec4899', icon: Heart },
  'corticosteroid': { label: 'Kortikoidy', color: '#a855f7', icon: Shield },
  'gastrointestinal': { label: 'GIT', color: '#84cc16', icon: Beaker },
  'psychotropic': { label: 'Psychofarmaka', color: '#8b5cf6', icon: Brain },
  'emergency': { label: 'Urgentní', color: '#ef4444', icon: Syringe },
  'endocrine': { label: 'Endokrinní', color: '#f59e0b', icon: Activity },
  'respiratory': { label: 'Respirační', color: '#3b82f6', icon: Stethoscope },
  'antirheumatic': { label: 'Antirevmatika', color: '#6366f1', icon: Shield },
};

// Pregnancy badge colors
const PREG_COLORS = {
  'A': '#22c55e', 'B': '#22c55e', 'C': '#eab308', 'D': '#f97316', 'X': '#ef4444',
};

export default function DrugDatabaseV2() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDrug = searchParams.get('drug') || null;
  const initialSearch = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: drugs = [], isLoading } = useQuery({
    queryKey: ['drugs-v2'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drugs')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Auto-select drug from URL
  useEffect(() => {
    if (initialDrug && drugs.length > 0 && !selectedDrug) {
      const found = drugs.find(d => d.slug === initialDrug);
      if (found) setSelectedDrug(found);
    }
  }, [initialDrug, drugs, selectedDrug]);

  const categories = useMemo(() => {
    const cats = [...new Set(drugs.map(d => d.category).filter(Boolean))];
    return cats.sort();
  }, [drugs]);

  const filteredDrugs = useMemo(() => {
    let list = drugs;
    if (selectedCategory !== 'all') {
      list = list.filter(d => d.category === selectedCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.generic_name?.toLowerCase().includes(q) ||
        d.brand_names?.some(b => b.toLowerCase().includes(q)) ||
        d.therapeutic_class?.toLowerCase().includes(q) ||
        d.atc_code?.toLowerCase().includes(q) ||
        d.indication?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [drugs, selectedCategory, searchQuery]);

  // Group by therapeutic class
  const grouped = useMemo(() => {
    const groups = {};
    for (const d of filteredDrugs) {
      const cls = d.therapeutic_class || d.category || 'Ostatní';
      if (!groups[cls]) groups[cls] = [];
      groups[cls].push(d);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'cs'));
  }, [filteredDrugs]);

  const openDrug = (drug) => {
    setSelectedDrug(drug);
    setActiveTab('overview');
    setSearchParams({ drug: drug.slug });
  };

  const closeDrug = () => {
    setSelectedDrug(null);
    setSearchParams({});
  };

  // ───── DRUG DETAIL VIEW ─────
  if (selectedDrug) {
    const d = selectedDrug;
    const cat = CATEGORIES[d.category] || {};
    const pearls = d.clinical_pearls || [];
    const interactions = d.key_interactions || [];
    const dosage = d.dosage || {};
    const monitoring = d.monitoring || {};
    const specPop = d.special_populations || {};
    const brandNames = d.brand_names || [];

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <button onClick={closeDrug} className="flex items-center gap-1.5 text-sm text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Zpět na průvodce
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${cat.color || '#888'} 15%, transparent)` }}>
              <Pill className="w-4 h-4" style={{ color: cat.color }} />
            </div>
            <span className="mn-caption" style={{ color: cat.color }}>
              {d.therapeutic_class?.toUpperCase() || d.category?.toUpperCase()}
              {d.atc_code ? ` · ${d.atc_code}` : ''}
            </span>
          </div>
          <h1 className="mn-serif-font text-[24px] sm:text-[28px] font-bold">{d.name}</h1>
          {d.generic_name && d.generic_name !== d.name && (
            <p className="text-sm text-[hsl(var(--mn-muted))] mt-0.5">{d.generic_name}</p>
          )}
          {brandNames.length > 0 && (
            <p className="text-sm text-[hsl(var(--mn-muted))] mt-1">
              {brandNames.join(' · ')}
            </p>
          )}
          {d.pregnancy_category && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: `color-mix(in srgb, ${PREG_COLORS[d.pregnancy_category?.[0]] || '#888'} 15%, transparent)`,
                color: PREG_COLORS[d.pregnancy_category?.[0]] || '#888',
              }}>
              <Baby className="w-3 h-3" />
              Těhotenství: {d.pregnancy_category}
            </span>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="overview">Přehled</TabsTrigger>
            <TabsTrigger value="dosing">Dávkování</TabsTrigger>
            <TabsTrigger value="interactions">Interakce</TabsTrigger>
            <TabsTrigger value="pearls">Perly</TabsTrigger>
          </TabsList>

          {/* TAB: Overview */}
          <TabsContent value="overview" className="space-y-4">
            {d.mechanism && (
              <div className="rounded-2xl" style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
                <div className="p-4">
                  <h3 className="mn-ui-font text-sm font-semibold mb-2 text-[hsl(var(--mn-accent))]">Mechanismus účinku</h3>
                  <p className="text-sm text-[hsl(var(--mn-muted))]">{d.mechanism}</p>
                </div>
              </div>
            )}
            {d.indication && (
              <div className="rounded-2xl" style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
                <div className="p-4">
                  <h3 className="mn-ui-font text-sm font-semibold mb-2 text-[hsl(var(--mn-success))]">Indikace</h3>
                  <p className="text-sm text-[hsl(var(--mn-muted))]">{d.indication}</p>
                </div>
              </div>
            )}
            {d.contraindications && (
              <div className="rounded-2xl" style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
                <div className="p-4">
                  <h3 className="mn-ui-font text-sm font-semibold mb-2 text-[hsl(var(--mn-danger))] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Kontraindikace
                  </h3>
                  <p className="text-sm text-[hsl(var(--mn-muted))]">{d.contraindications}</p>
                </div>
              </div>
            )}
            {d.warnings && (
              <div className="rounded-2xl" style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
                <div className="p-4">
                  <h3 className="mn-ui-font text-sm font-semibold mb-2 text-[hsl(var(--mn-warn))] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Upozornění
                  </h3>
                  <p className="text-sm text-[hsl(var(--mn-muted))]">{d.warnings}</p>
                </div>
              </div>
            )}
            {(d.side_effects?.length > 0) && (
              <div className="rounded-2xl" style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
                <div className="p-4">
                  <h3 className="mn-ui-font text-sm font-semibold mb-2">Nežádoucí účinky</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {d.side_effects.map((se, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full bg-[hsl(var(--mn-surface))] text-[hsl(var(--mn-muted))]">{se}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {Object.keys(specPop).length > 0 && (
              <div className="rounded-2xl" style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
                <div className="p-4">
                  <h3 className="mn-ui-font text-sm font-semibold mb-2">Speciální populace</h3>
                  <div className="space-y-2">
                    {Object.entries(specPop).map(([key, val]) => {
                      const labels = { pregnancy: 'Těhotenství', lactation: 'Kojení', elderly: 'Starší pacienti', renal: 'Renální insuficience', hepatic: 'Hepatální insuficience' };
                      return (
                        <div key={key} className="text-sm">
                          <span className="font-medium text-[hsl(var(--mn-text))]">{labels[key] || key}: </span>
                          <span className="text-[hsl(var(--mn-muted))]">{val}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB: Dosing */}
          <TabsContent value="dosing" className="space-y-4">
            <div className="rounded-2xl" style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
              <div className="p-4">
                <h3 className="mn-ui-font text-sm font-semibold mb-3">Dávkování</h3>
                <div className="space-y-3">
                  {Object.entries(dosage).map(([key, val]) => {
                    const labels = {
                      adult: 'Dospělí', pediatric: 'Děti', iv: 'IV podání', renal: 'Renální insuficience',
                      hepatic: 'Jaterní insuficience', elderly: 'Starší', loading: 'Nasycovací dávka',
                      high_dose: 'Vysokodávkový režim', extended_infusion: 'Prodloužená infuze',
                      prophylaxis: 'Profylaxe', therapeutic: 'Terapeutická dávka', acs: 'ACS',
                      oral_loading: 'P.O. nasycení', iv_als: 'IV (ALS)', iv_loading: 'IV nasycení',
                      als: 'ALS protokol', anaphylaxis: 'Anafylaxe', infusion: 'Infuze',
                      pediatric_als: 'Pediatrický ALS', pca: 'PCA pumpa', sc: 'SC',
                      dm2_sc: 'DM2 (SC)', dm2_oral: 'DM2 (p.o.)', obesity: 'Obezita',
                      heart_failure: 'Srdeční selhání', reduced: 'Redukovaná dávka',
                      uti: 'UTI', prostatitis: 'Prostatitida', meningitis: 'Meningitida',
                      gonorrhea: 'Gonorea', chlamydia: 'Chlamydie', pneumonia: 'Pneumonie',
                      c_diff: 'C. difficile', trichomoniasis: 'Trichomoniáza',
                      continuous: 'Kontinuální infuze', acute: 'Akutní',
                      alcohol_withdrawal: 'Alkoholový abstinenční sy.',
                      status_epilepticus: 'Status epilepticus', delirium: 'Delirium',
                      ocd: 'OCD', h_pylori: 'H. pylori eradikace',
                      asthma: 'Astma exacerbace', tapering: 'Snižování dávky',
                      inhalation: 'Inhalačně', nebulization: 'Nebulizace',
                      chemo: 'Chemoterapie', premature_lungs: 'Maturace plic',
                      myxedema: 'Myxedém',
                    };
                    return (
                      <div key={key} className="flex items-start gap-3 p-2.5 rounded-lg bg-[hsl(var(--mn-surface))]">
                        <span className="text-xs font-semibold text-[hsl(var(--mn-accent))] min-w-[100px] mt-0.5 shrink-0">
                          {labels[key] || key}
                        </span>
                        <span className="text-sm text-[hsl(var(--mn-muted))] mn-mono-font">{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {Object.keys(monitoring).length > 0 && (
              <div className="rounded-2xl" style={{ background: 'hsl(var(--mn-surface))', border: '1px solid hsl(var(--mn-border))' }}>
                <div className="p-4">
                  <h3 className="mn-ui-font text-sm font-semibold mb-2">Monitoring</h3>
                  {monitoring.parameters && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {monitoring.parameters.map((p, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-[color-mix(in_srgb,hsl(var(--mn-accent))_10%,transparent)] text-[hsl(var(--mn-accent))]">{p}</span>
                      ))}
                    </div>
                  )}
                  {monitoring.frequency && (
                    <p className="text-sm text-[hsl(var(--mn-muted))]">{monitoring.frequency}</p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB: Interactions */}
          <TabsContent value="interactions" className="space-y-3">
            {interactions.length > 0 ? interactions.map((int, i) => {
              const sevColors = {
                'vysoká': { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '#ef4444', label: 'VYSOKÁ' },
                'střední': { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)', text: '#eab308', label: 'STŘEDNÍ' },
                'nízká': { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', text: '#22c55e', label: 'NÍZKÁ' },
                'info': { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', text: '#3b82f6', label: 'INFO' },
              };
              const sev = sevColors[int.severity] || sevColors['střední'];
              return (
                <div key={i} className="rounded-2xl border" style={{ borderColor: sev.border, background: 'hsl(var(--mn-surface))' }}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold">{int.drug}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: sev.bg, color: sev.text }}>
                        {sev.label}
                      </span>
                    </div>
                    <p className="text-sm text-[hsl(var(--mn-muted))]">{int.effect}</p>
                  </div>
                </div>
              );
            }) : (
              <p className="text-sm text-[hsl(var(--mn-muted))] text-center py-8">Žádné významné interakce zaznamenány</p>
            )}
          </TabsContent>

          {/* TAB: Clinical Pearls */}
          <TabsContent value="pearls" className="space-y-3">
            {pearls.length > 0 ? pearls.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[hsl(var(--mn-surface-2))] border border-[hsl(var(--mn-border))]">
                <span className="text-[hsl(var(--mn-warn))] mt-0.5 flex-shrink-0 text-lg">💎</span>
                <p className="text-sm text-[hsl(var(--mn-muted))]">{p}</p>
              </div>
            )) : (
              <p className="text-sm text-[hsl(var(--mn-muted))] text-center py-8">Klinické perly budou doplněny</p>
            )}
          </TabsContent>
        </Tabs>

        {/* SÚKL link */}
        {d.sukl_url && (
          <a
            href={d.sukl_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))] text-sm text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] hover:border-[hsl(var(--mn-accent)/0.3)] transition-all"
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            Kompletní SPC na SÚKL →
          </a>
        )}
      </div>
    );
  }

  // ───── DRUG LIST VIEW ─────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <div>
        <Link to={createPageUrl('ToolsHub')} className="flex items-center gap-1.5 text-sm text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Klinické nástroje
        </Link>
        <span className="mn-caption text-[hsl(var(--mn-secondary))]">LÉKOVÝ PRŮVODCE</span>
        <h1 className="mn-serif-font text-[28px] sm:text-[32px] font-bold mt-1">Léky</h1>
        <p className="text-[hsl(var(--mn-muted))] mt-2">
          {drugs.length} léků · Study-oriented karty s klinickými perlami
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--mn-muted))]" />
          <Input
            placeholder="Hledat lék (název, ATC, indikace...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny kategorie</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORIES[cat]?.label || cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Drug list grouped by therapeutic class */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[hsl(var(--mn-accent))] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredDrugs.length === 0 ? (
        <div className="text-center py-20 text-[hsl(var(--mn-muted))]">Žádné léky nenalezeny</div>
      ) : (
        grouped.map(([cls, clsDrugs]) => {
          const firstDrug = clsDrugs[0];
          const cat = CATEGORIES[firstDrug?.category] || {};
          return (
            <div key={cls}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: cat.color || '#888' }} />
                <span className="mn-caption" style={{ color: cat.color }}>{cls.toUpperCase()}</span>
                <span className="text-xs text-[hsl(var(--mn-muted))]">({clsDrugs.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                {clsDrugs.map((drug) => {
                  const dCat = CATEGORIES[drug.category] || {};
                  return (
                    <button
                      key={drug.slug || drug.id}
                      onClick={() => openDrug(drug)}
                      className="group flex items-start gap-3 p-4 rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))] text-left transition-all hover:border-[color-mix(in_srgb,var(--d-color)_30%,hsl(var(--mn-border)))] hover:-translate-y-0.5"
                      style={{ '--d-color': dCat.color || '#888', boxShadow: 'var(--mn-shadow-1)' }}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${dCat.color || '#888'} 12%, transparent)` }}>
                        <Pill className="w-4 h-4" style={{ color: dCat.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold group-hover:text-[hsl(var(--mn-accent))] transition-colors">{drug.name}</div>
                        {drug.brand_names?.length > 0 && (
                          <p className="text-[11px] text-[hsl(var(--mn-muted))] truncate mt-0.5">{drug.brand_names.slice(0, 2).join(', ')}</p>
                        )}
                        <p className="text-xs text-[hsl(var(--mn-muted))] line-clamp-1 mt-1">{drug.mechanism?.substring(0, 60)}...</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {drug.atc_code && (
                            <span className="text-[10px] mn-mono-font px-1.5 py-0.5 rounded bg-[hsl(var(--mn-surface))] text-[hsl(var(--mn-muted))]">{drug.atc_code}</span>
                          )}
                          {drug.is_featured && (
                            <span className="text-[10px] text-[hsl(var(--mn-warn))] flex items-center gap-0.5">
                              <Sparkles className="w-3 h-3" /> Klíčový
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[hsl(var(--mn-muted))] opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
