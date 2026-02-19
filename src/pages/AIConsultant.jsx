import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { callApi } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Bot, Stethoscope, Pill, AlertTriangle, Send, Loader2,
  Sparkles, RotateCcw, X, Plus, ChevronDown, Shield, Zap,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// ─── DISCLAIMER ───
function Disclaimer() {
  return (
    <div className="rounded-xl border-2 p-4 mb-6" style={{ borderColor: 'hsl(var(--mn-warn) / 0.3)', background: 'hsl(var(--mn-warn) / 0.05)' }}>
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 text-[hsl(var(--mn-warn))] flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-[hsl(var(--mn-warn))]">UPOZORNĚNÍ — Decision Support Tool</h3>
          <p className="text-xs text-[hsl(var(--mn-muted))] mt-1 leading-relaxed">
            Tento nástroj slouží <strong>výhradně</strong> jako podpora klinického rozhodování a vzdělávání.
            Výstupy AI vyžadují vždy ověření lékařem a <strong>neslouží jako doporučení pro léčbu</strong>.
            Vždy postupujte dle aktuálních guidelines a individuálního posouzení pacienta.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── TOKEN BALANCE ───
function TokenBalance() {
  const { user } = useAuth();
  const { data: tokens } = useQuery({
    queryKey: ['userTokens', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_tokens')
        .select('current_tokens, monthly_limit, plan_tier')
        .eq('user_id', user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  if (!tokens) return null;

  const pct = tokens.monthly_limit > 0
    ? Math.round((tokens.current_tokens / tokens.monthly_limit) * 100)
    : 0;

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface))] mb-4">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-[hsl(var(--mn-accent))]" />
        <span className="mn-ui-font text-sm">
          <span className="mn-mono-font font-bold">{tokens.current_tokens}</span>
          <span className="text-[hsl(var(--mn-muted))]"> / {tokens.monthly_limit} tokenů</span>
        </span>
      </div>
      <div className="w-24 h-1.5 rounded-full bg-[hsl(var(--mn-surface-2))] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct > 20 ? 'hsl(var(--mn-accent))' : 'hsl(var(--mn-danger))',
          }}
        />
      </div>
    </div>
  );
}

// ─── RESULT CARD ───
function ResultCard({ result, mode }) {
  if (!result) return null;

  return (
    <div className="rounded-2xl mt-6 border-2 border-[hsl(var(--mn-accent)/0.2)]" style={{ background: 'hsl(var(--mn-surface))' }}>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[hsl(var(--mn-accent))]" />
          <span className="mn-ui-font text-sm font-semibold">
            {mode === 'ddx' ? 'Diferenciální diagnóza' : mode === 'treatment' ? 'Léčebný plán' : 'Analýza interakcí'}
          </span>
        </div>
        <div className="prose prose-sm prose-invert max-w-none text-sm text-[hsl(var(--mn-muted))] [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-[hsl(var(--mn-text))] [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[hsl(var(--mn-text))] [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-[hsl(var(--mn-text))] [&_strong]:text-[hsl(var(--mn-text))] [&_li]:text-sm [&_p]:text-sm [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5">
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

// ─── DDx TAB ───
function DDxMode() {
  const { user } = useAuth();
  const [symptoms, setSymptoms] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [history, setHistory] = useState('');
  const [tests, setTests] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!symptoms.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await callApi('invokeLLM', {
        user_id: user?.id,
        operation: 'ddx_analysis',
        maxTokens: 3000,
        prompt: `Jsi zkušený klinický lékař, specialista na diferenciální diagnostiku. Na základě následujících informací vytvoř diferenciální diagnózu v českém jazyce.

SYMPTOMY: ${symptoms.slice(0, 2000)}
VĚKK: ${age || 'neuvedeno'}
POHLAVÍ: ${sex || 'neuvedeno'}
ANAMNÉZA: ${(history || 'neuvedeno').slice(0, 1500)}
PROVEDENÁ VYŠETŘENÍ: ${(tests || 'žádná').slice(0, 1500)}

Odpověz ve strukturovaném formátu (markdown):
## Diferenciální diagnóza (seřazeno dle pravděpodobnosti)

Pro každou diagnózu (max 5-7):
### 1. Název diagnózy — [pravděpodobnost: vysoká/střední/nízká]
- **Pro:** klíčové příznaky svědčící pro tuto diagnózu
- **Proti:** příznaky, které neodpovídají
- **Doporučené vyšetření:** co provést k potvrzení/vyloučení

## 🚩 Red Flags
Důležitá upozornění, které nelze přehlédnout.

## Doporučený diagnostický postup
Krok za krokem, co provést jako první, druhé, třetí.`
      });
      setResult(res.text || JSON.stringify(res));
    } catch (e) {
      setResult(`❌ Chyba: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-1.5 block">Symptomy a obtíže *</Label>
        <Textarea
          placeholder="Popište symptomy pacienta, průběh, charakter bolesti, provokující faktory..."
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          rows={4}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Věk</Label>
          <Input placeholder="např. 65" value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Pohlaví</Label>
          <Select value={sex} onValueChange={setSex}>
            <SelectTrigger><SelectValue placeholder="Vyberte" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="muž">Muž</SelectItem>
              <SelectItem value="žena">Žena</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-sm font-medium mb-1.5 block">Osobní anamnéza</Label>
        <Textarea placeholder="Předchozí onemocnění, operace, chronická medikace..." value={history} onChange={(e) => setHistory(e.target.value)} rows={2} />
      </div>
      <div>
        <Label className="text-sm font-medium mb-1.5 block">Provedená vyšetření</Label>
        <Textarea placeholder="Labo výsledky, EKG, zobrazovací metody..." value={tests} onChange={(e) => setTests(e.target.value)} rows={2} />
      </div>
      <Button onClick={handleAnalyze} disabled={loading || !symptoms.trim()} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Stethoscope className="w-4 h-4 mr-2" />}
        {loading ? 'Analyzuji...' : 'Analyzovat'}
      </Button>
      <p className="text-xs text-center text-[hsl(var(--mn-muted))] mt-2">Stojí 8 tokenů</p>
      <ResultCard result={result} mode="ddx" />
    </div>
  );
}

// ─── TREATMENT TAB ───
function TreatmentMode() {
  const { user } = useAuth();
  const [diagnosis, setDiagnosis] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [comorbidities, setComorbidities] = useState('');
  const [allergies, setAllergies] = useState('');
  const [currentMeds, setCurrentMeds] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePlan = async () => {
    if (!diagnosis.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await callApi('invokeLLM', {
        user_id: user?.id,
        operation: 'treatment_plan',
        maxTokens: 3000,
        prompt: `Jsi zkušený klinický lékař. Na základě následujících informací navrhni léčebný plán v českém jazyce.

DIAGNÓZA: ${diagnosis.slice(0, 1000)}
VĚK: ${age || 'neuvedeno'}
POHLAVÍ: ${sex || 'neuvedeno'}
KOMORBIDITY: ${(comorbidities || 'žádné').slice(0, 1000)}
ALERGIE: ${(allergies || 'žádné').slice(0, 500)}
SOUČASNÁ MEDIKACE: ${(currentMeds || 'žádná').slice(0, 1000)}

Odpověz ve strukturovaném formátu (markdown):
## Léčebný plán: [diagnóza]

### Farmakologická léčba
Pro každý lék:
- **Název léku** (generický) — dávka, frekvence, délka léčby
- Důvod volby, alternativy

### ⚠ Kontraindikace a úpravy
Úpravy dle komorbidit, alergie, věku, pohlaví. Interakce se současnou medikací.

### Nefarmakologická léčba
Režimová opatření, dieta, rehabilitace, edukace.

### Monitoring
Co sledovat, jak často, warning signs pro pacienta.

### Follow-up
Kdy a jak kontrolovat efekt léčby, kdy eskalovat.`
      });
      setResult(res.text || JSON.stringify(res));
    } catch (e) {
      setResult(`❌ Chyba: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-1.5 block">Diagnóza *</Label>
        <Input placeholder="např. Komunitní pneumonie, CURB-65 = 2" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Věk</Label>
          <Input placeholder="např. 72" value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Pohlaví</Label>
          <Select value={sex} onValueChange={setSex}>
            <SelectTrigger><SelectValue placeholder="Vyberte" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="muž">Muž</SelectItem>
              <SelectItem value="žena">Žena</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-sm font-medium mb-1.5 block">Komorbidity</Label>
        <Textarea placeholder="DM2, hypertenze, CKD G3a, fibrilace síní..." value={comorbidities} onChange={(e) => setComorbidities(e.target.value)} rows={2} />
      </div>
      <div>
        <Label className="text-sm font-medium mb-1.5 block">Alergie</Label>
        <Input placeholder="Penicilin, sulfonamidy..." value={allergies} onChange={(e) => setAllergies(e.target.value)} />
      </div>
      <div>
        <Label className="text-sm font-medium mb-1.5 block">Současná medikace</Label>
        <Textarea placeholder="Metformin 1000mg 2×, ramipril 5mg, apixaban 5mg 2×..." value={currentMeds} onChange={(e) => setCurrentMeds(e.target.value)} rows={2} />
      </div>
      <Button onClick={handlePlan} disabled={loading || !diagnosis.trim()} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
        {loading ? 'Generuji plán...' : 'Navrhnout léčebný plán'}
      </Button>
      <p className="text-xs text-center text-[hsl(var(--mn-muted))] mt-2">Stojí 8 tokenů</p>
      <ResultCard result={result} mode="treatment" />
    </div>
  );
}

// ─── DRUG INTERACTIONS TAB ───
function InteractionsMode() {
  const { user } = useAuth();
  const [drugInputs, setDrugInputs] = useState(['', '']);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch drug names for autocomplete hints
  const { data: drugNames = [] } = useQuery({
    queryKey: ['drug-names-list'],
    queryFn: async () => {
      const { data } = await supabase.from('drugs').select('name, generic_name').order('name');
      return data || [];
    },
  });

  const addDrug = () => setDrugInputs(prev => [...prev, '']);
  const removeDrug = (i) => setDrugInputs(prev => prev.filter((_, idx) => idx !== i));
  const updateDrug = (i, val) => setDrugInputs(prev => prev.map((d, idx) => idx === i ? val : d));

  const filledDrugs = drugInputs.filter(d => d.trim());

  const handleCheck = async () => {
    if (filledDrugs.length < 2) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await callApi('invokeLLM', {
        user_id: user?.id,
        operation: 'drug_interactions',
        maxTokens: 3000,
        prompt: `Jsi klinický farmaceut a expert na lékové interakce. Analyzuj následující kombinaci léků v českém jazyce.

LÉKY: ${filledDrugs.join(', ')}

Odpověz ve strukturovaném formátu (markdown):
## Analýza lékových interakcí

### Nalezené interakce
Pro každou nalezenou interakci:
#### ⚠ [Lék A] ↔ [Lék B] — [Závažnost: VYSOKÁ / STŘEDNÍ / NÍZKÁ]
- **Mechanismus:** jak interakce vzniká
- **Klinický dopad:** co se stane pacientovi
- **Doporučení:** jak řešit (úprava dávky, monitoring, alternativa, KI)

### ✅ Bezpečné kombinace
Kombinace, které jsou bez klinicky významné interakce.

### Monitoring
Co monitorovat u tohoto pacienta se specifickým ohledem na tyto léky.

### Celkové hodnocení
Stručné shrnutí rizika polypragmazie, doporučení pro úpravu medikace.

Pokud nenajdeš žádné interakce, uveď to jasně.`
      });
      setResult(res.text || JSON.stringify(res));
    } catch (e) {
      setResult(`❌ Chyba: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">Seznam léků (min. 2)</Label>
        <div className="space-y-2">
          {drugInputs.map((drug, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[hsl(var(--mn-surface))] flex items-center justify-center text-xs mn-mono-font text-[hsl(var(--mn-muted))] flex-shrink-0">
                {i + 1}
              </div>
              <Input
                placeholder={`Lék ${i + 1} (název nebo generikum)`}
                value={drug}
                onChange={(e) => updateDrug(i, e.target.value)}
                list="drug-suggestions"
                className="flex-1"
              />
              {drugInputs.length > 2 && (
                <button onClick={() => removeDrug(i)} className="text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-danger))] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <datalist id="drug-suggestions">
          {drugNames.map((d, i) => (
            <option key={i} value={d.name} />
          ))}
        </datalist>
        <button
          onClick={addDrug}
          className="flex items-center gap-1.5 text-sm text-[hsl(var(--mn-accent))] mt-2 hover:underline"
        >
          <Plus className="w-3.5 h-3.5" />
          Přidat lék
        </button>
      </div>

      <Button onClick={handleCheck} disabled={loading || filledDrugs.length < 2} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pill className="w-4 h-4 mr-2" />}
        {loading ? 'Kontroluji interakce...' : `Zkontrolovat interakce (${filledDrugs.length} léků)`}
      </Button>
      <p className="text-xs text-center text-[hsl(var(--mn-muted))] mt-2">Stojí 5 tokenů</p>
      <ResultCard result={result} mode="interactions" />
    </div>
  );
}

// ─── MAIN PAGE ───
export default function AIConsultant() {
  const [activeTab, setActiveTab] = useState('ddx');

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <Link to={createPageUrl('ToolsHub')} className="flex items-center gap-1.5 text-sm text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Klinické nástroje
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[color-mix(in_srgb,#f59e0b_15%,transparent)]">
            <Bot className="w-4 h-4 text-[hsl(var(--mn-warn))]" />
          </div>
          <span className="mn-caption text-[hsl(var(--mn-warn))]">AI KONZULTANT · BETA</span>
        </div>
        <h1 className="mn-serif-font text-[24px] sm:text-[28px] font-bold">AI Konzultant</h1>
        <p className="text-[hsl(var(--mn-muted))] text-sm mt-1">
          Diferenciální diagnóza, léčebný plán a kontrola lékových interakcí
        </p>
      </div>

      <Disclaimer />
      <TokenBalance />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="ddx" className="text-xs sm:text-sm">
            <Stethoscope className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
            DDx
          </TabsTrigger>
          <TabsTrigger value="treatment" className="text-xs sm:text-sm">
            <Shield className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
            Léčba
          </TabsTrigger>
          <TabsTrigger value="interactions" className="text-xs sm:text-sm">
            <Pill className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
            Interakce
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ddx"><DDxMode /></TabsContent>
        <TabsContent value="treatment"><TreatmentMode /></TabsContent>
        <TabsContent value="interactions"><InteractionsMode /></TabsContent>
      </Tabs>
    </div>
  );
}
