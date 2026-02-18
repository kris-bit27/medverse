import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { calculateTool, validateInputs } from '@/lib/calculatorEngine';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Calculator, Search, ArrowLeft, ChevronRight, Sparkles, BookOpen,
  Heart, Brain, Droplet, Activity, Wind, Baby, Syringe, Eye,
  AlertTriangle, Scale, FlaskConical, Zap, Monitor, Stethoscope, Ruler,
  Droplets, HeartPulse, TrendingUp, Beaker,
} from 'lucide-react';
import { toast } from 'sonner';

// Icon map
const ICONS = {
  Heart, Brain, Droplet, Activity, Wind, Baby, Syringe, Eye,
  AlertTriangle, Scale, FlaskConical, Zap, Monitor, Stethoscope, Ruler,
  Droplets, HeartPulse, TrendingUp, Calculator, Beaker,
};

// Subcategory labels and colors
const SUBCATEGORIES = {
  'urgentní': { label: 'Urgentní', color: '#ef4444' },
  'kardiologie': { label: 'Kardiologie', color: '#ec4899' },
  'pneumologie': { label: 'Pneumologie', color: '#3b82f6' },
  'nefrologie': { label: 'Nefrologie', color: '#06b6d4' },
  'neurologie': { label: 'Neurologie', color: '#a855f7' },
  'hepatologie': { label: 'Hepatologie', color: '#f59e0b' },
  'interní': { label: 'Interní', color: '#10b981' },
  'ICU': { label: 'ICU', color: '#ef4444' },
  'anesteziologie': { label: 'Anesteziologie', color: '#6366f1' },
  'hematologie': { label: 'Hematologie', color: '#8b5cf6' },
  'pediatrie': { label: 'Pediatrie', color: '#f59e0b' },
};

export default function ClinicalCalculators() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = searchParams.get('q') || '';
  const initialTool = searchParams.get('tool') || null;

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTool, setSelectedTool] = useState(null);
  const [inputs, setInputs] = useState({});
  const [results, setResults] = useState(null);

  // Fetch all tools
  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['clinical-tools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinical_tools')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('usage_count', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Auto-select tool from URL param
  useEffect(() => {
    if (initialTool && tools.length > 0 && !selectedTool) {
      const found = tools.find(t => t.slug === initialTool);
      if (found) {
        setSelectedTool(found);
      }
    }
  }, [initialTool, tools, selectedTool]);

  // Log usage
  const logUsage = useMutation({
    mutationFn: async ({ toolId, inputData, outputData }) => {
      if (!user) return;
      await supabase.from('tool_usage_log').insert({
        user_id: user.id,
        tool_id: toolId,
        input_data: inputData,
        output_data: outputData,
      });
      await supabase.rpc('increment', {
        table_name: 'clinical_tools',
        row_id: toolId,
        column_name: 'usage_count',
      }).catch(() => {});
    },
  });

  // Filter tools
  const filteredTools = useMemo(() => {
    let list = tools;
    if (selectedCategory !== 'all') {
      list = list.filter(t => t.subcategory === selectedCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.subcategory?.toLowerCase().includes(q) ||
        t.slug?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tools, selectedCategory, searchQuery]);

  // Group by subcategory
  const grouped = useMemo(() => {
    const groups = {};
    for (const t of filteredTools) {
      const cat = t.subcategory || 'ostatní';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    return groups;
  }, [filteredTools]);

  const categories = useMemo(() => ['all', ...new Set(tools.map(t => t.subcategory).filter(Boolean))], [tools]);

  // Handle calculate
  const handleCalculate = () => {
    if (!selectedTool) return;
    const err = validateInputs(selectedTool, inputs);
    if (err) { toast.error(err); return; }

    const res = calculateTool(selectedTool, inputs);
    setResults(res);
    logUsage.mutate({ toolId: selectedTool.id, inputData: inputs, outputData: res });
  };

  // Handle input change
  const updateInput = (name, value) => {
    setInputs(prev => ({ ...prev, [name]: value }));
    setResults(null); // clear on any change
  };

  // Select a tool
  const openTool = (tool) => {
    setSelectedTool(tool);
    setInputs({});
    setResults(null);
    setSearchParams({ tool: tool.slug });
  };

  const closeTool = () => {
    setSelectedTool(null);
    setInputs({});
    setResults(null);
    setSearchParams({});
  };

  // ───── CALCULATOR DETAIL VIEW ─────
  if (selectedTool) {
    const sub = SUBCATEGORIES[selectedTool.subcategory] || {};
    const inputFields = selectedTool.input_fields || [];
    const outputFields = selectedTool.output_fields || [];
    const pearls = selectedTool.clinical_pearls || [];

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Back */}
        <button onClick={closeTool} className="flex items-center gap-1.5 text-sm text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Zpět na kalkulačky
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${sub.color || '#888'} 15%, transparent)` }}>
              {(() => { const I = ICONS[selectedTool.icon] || Calculator; return <I className="w-4 h-4" style={{ color: sub.color }} />; })()}
            </div>
            <span className="mn-caption" style={{ color: sub.color }}>{sub.label?.toUpperCase()}{selectedTool.source_guideline ? ` · ${selectedTool.source_guideline}` : ''}</span>
          </div>
          <h1 className="mn-serif-font text-[24px] sm:text-[28px] font-bold">{selectedTool.name}</h1>
          <p className="text-[hsl(var(--mn-muted))] text-sm mt-1">{selectedTool.description}</p>
        </div>

        {/* Input Form */}
        <Card className="mb-6">
          <CardContent className="p-5 space-y-4">
            {inputFields.map((field) => (
              <div key={field.name}>
                {field.type === 'checkbox' ? (
                  <label className="flex items-start gap-3 cursor-pointer group py-1">
                    <Checkbox
                      checked={!!inputs[field.name]}
                      onCheckedChange={(v) => updateInput(field.name, v)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium group-hover:text-[hsl(var(--mn-accent))] transition-colors">
                        {field.label}
                      </span>
                      {field.points !== undefined && (
                        <span className="ml-2 text-xs mn-mono-font text-[hsl(var(--mn-muted))]">
                          {field.points > 0 ? '+' : ''}{field.points}
                        </span>
                      )}
                      {field.help && (
                        <p className="text-xs text-[hsl(var(--mn-muted))] mt-0.5">{field.help}</p>
                      )}
                    </div>
                  </label>
                ) : field.type === 'select' ? (
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">{field.label}</Label>
                    <Select
                      value={inputs[field.name]?.toString() || ''}
                      onValueChange={(v) => updateInput(field.name, parseFloat(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.options || []).map((opt, i) => (
                          <SelectItem key={i} value={opt.value.toString()}>
                            {opt.label}
                            {opt.value !== undefined && field.type === 'select' && selectedTool.calculation_type !== 'lookup' && (
                              <span className="ml-1 text-[hsl(var(--mn-muted))]">({opt.value > 0 ? '+' : ''}{opt.value})</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.help && <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">{field.help}</p>}
                  </div>
                ) : field.type === 'number' ? (
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">{field.label}</Label>
                    <Input
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step || 1}
                      value={inputs[field.name] || ''}
                      onChange={(e) => updateInput(field.name, e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder={field.min && field.max ? `${field.min}–${field.max}` : ''}
                    />
                    {field.help && <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">{field.help}</p>}
                  </div>
                ) : null}
              </div>
            ))}

            <Button
              onClick={handleCalculate}
              className="w-full mt-2"
              style={{ background: sub.color || 'hsl(var(--mn-accent))', color: '#fff' }}
            >
              <Calculator className="w-4 h-4 mr-2" />
              Vypočítat
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <Card className="mb-6 border-2" style={{ borderColor: `color-mix(in srgb, ${sub.color || '#888'} 40%, transparent)` }}>
            <CardContent className="p-5">
              <span className="mn-caption" style={{ color: sub.color }}>VÝSLEDEK</span>

              <div className="mt-3 space-y-4">
                {outputFields.map((out) => {
                  const val = results[out.name];
                  const color = results[`${out.name}_color`];
                  if (val === undefined || val === null) return null;

                  const colorMap = {
                    green: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
                    yellow: { bg: 'rgba(234,179,8,0.1)', text: '#eab308', border: 'rgba(234,179,8,0.3)' },
                    orange: { bg: 'rgba(249,115,22,0.1)', text: '#f97316', border: 'rgba(249,115,22,0.3)' },
                    red: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
                    blue: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
                  };
                  const c = colorMap[color];

                  if (out.type === 'number') {
                    return (
                      <div key={out.name} className="text-center">
                        <div className="mn-mono-font text-4xl font-bold" style={{ color: sub.color }}>{val}</div>
                        <div className="text-sm text-[hsl(var(--mn-muted))] mt-1">{out.label}</div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={out.name}
                      className="rounded-lg p-3 border"
                      style={c ? { background: c.bg, borderColor: c.border } : { background: 'hsl(var(--mn-surface))' }}
                    >
                      <div className="text-xs font-medium text-[hsl(var(--mn-muted))] mb-1">{out.label}</div>
                      <div className="text-sm font-semibold" style={c ? { color: c.text } : {}}>{val}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clinical Pearls */}
        {pearls.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="mn-ui-font text-sm font-semibold">Klinické perly</span>
              </div>
              <div className="space-y-2">
                {pearls.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[hsl(var(--mn-muted))]">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">💎</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Source */}
        {selectedTool.source_guideline && (
          <div className="text-xs text-[hsl(var(--mn-muted))] flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" />
            Zdroj: {selectedTool.source_guideline}
            {selectedTool.evidence_level && <span className="ml-1 px-1.5 py-0.5 rounded bg-[hsl(var(--mn-surface))] mn-mono-font">Level {selectedTool.evidence_level}</span>}
          </div>
        )}
      </div>
    );
  }

  // ───── CALCULATOR LIST VIEW ─────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      {/* Header */}
      <div>
        <Link to={createPageUrl('ToolsHub')} className="flex items-center gap-1.5 text-sm text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Klinické nástroje
        </Link>
        <span className="mn-caption text-[hsl(var(--mn-accent))]">SKÓROVACÍ SYSTÉMY</span>
        <h1 className="mn-serif-font text-[28px] sm:text-[32px] font-bold mt-1">Kalkulačky</h1>
        <p className="text-[hsl(var(--mn-muted))] mt-2">
          {tools.length} klinických nástrojů v {categories.length - 1} oborech
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--mn-muted))]" />
          <Input
            placeholder="Hledat (Wells, GFR, SOFA...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Obor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny obory</SelectItem>
            {categories.filter(c => c !== 'all').map((cat) => (
              <SelectItem key={cat} value={cat}>
                {SUBCATEGORIES[cat]?.label || cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tools by category */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[hsl(var(--mn-accent))] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="text-center py-20 text-[hsl(var(--mn-muted))]">
          Žádné nástroje nenalezeny
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catTools]) => {
          const sub = SUBCATEGORIES[cat] || {};
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: sub.color || '#888' }} />
                <span className="mn-caption" style={{ color: sub.color }}>{sub.label?.toUpperCase() || cat.toUpperCase()}</span>
                <span className="text-xs text-[hsl(var(--mn-muted))]">({catTools.length})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                {catTools.map((tool) => {
                  const Icon = ICONS[tool.icon] || Calculator;
                  return (
                    <button
                      key={tool.slug}
                      onClick={() => openTool(tool)}
                      className="group flex items-start gap-3 p-4 rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))] text-left transition-all hover:border-[color-mix(in_srgb,var(--tool-color)_30%,hsl(var(--mn-border)))] hover:-translate-y-0.5"
                      style={{ '--tool-color': sub.color || '#888', boxShadow: 'var(--mn-shadow-1)' }}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${sub.color || '#888'} 12%, transparent)` }}>
                        <Icon className="w-4 h-4" style={{ color: sub.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold group-hover:text-[hsl(var(--mn-accent))] transition-colors">{tool.name}</div>
                        <p className="text-xs text-[hsl(var(--mn-muted))] line-clamp-2 mt-0.5">{tool.description}</p>
                        {tool.is_featured && (
                          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-amber-500">
                            <Sparkles className="w-3 h-3" /> Populární
                          </span>
                        )}
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
