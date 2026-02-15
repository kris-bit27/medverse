import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ProgressRing from '@/components/ui/ProgressRing';
import {
  ClipboardList, Plus, Check, ChevronRight, ChevronDown, ChevronLeft,
  Timer, Settings, Baby, Stethoscope, Plane, Pause,
  GraduationCap, BookOpen, Wrench, FileText, Award
} from 'lucide-react';
import { toast } from 'sonner';

const TYPE_ICONS = { staz: Stethoscope, praxe: ClipboardList, vykon: Wrench, kurz: BookOpen, zkouska: GraduationCap, jiny: FileText };
const PHASE_LABELS = { kmen: 'KMEN', specializace: 'SPEC' };
const INT_TYPES = [
  { id: 'maternity', label: 'Mateřská / rodičovská', icon: Baby },
  { id: 'sick', label: 'Dlouhodobá PN', icon: Stethoscope },
  { id: 'abroad', label: 'Zahraniční stáž (mimo VP)', icon: Plane },
  { id: 'other', label: 'Jiné přerušení', icon: Pause },
];

function mBetween(d1, d2) {
  const a = new Date(d1), b = new Date(d2);
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth());
}
function fD(d) { if (!d) return '—'; const t = new Date(d); return `${t.getDate()}.${t.getMonth()+1}.${t.getFullYear()}`; }

// ═══ Onboarding Wizard ═══
function Onboarding({ obor, onComplete, onCancel }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState({ kmenDone: null, kmenDate: '', enrollDate: '', expectedEnd: '', ints: [], adding: false, tmp: { type: 'maternity', from: '', to: '' } });
  const intM = d.ints.reduce((s, i) => s + mBetween(i.from, i.to), 0);
  const addInt = () => { if (d.tmp.from && d.tmp.to) setD(x => ({ ...x, ints: [...x.ints, { ...x.tmp, id: Date.now() }], adding: false, tmp: { type: 'maternity', from: '', to: '' } })); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel}><ChevronLeft className="w-4 h-4 mr-1" />Zpět</Button>
        <div><h2 className="text-xl font-bold">{obor.name}</h2><p className="text-xs text-muted-foreground">{obor.kmen_type} kmen · {obor.min_years} let</p></div>
      </div>
      <div className="flex gap-2">
        {['Kmen','Termíny','Přerušení'].map((s,i) => (
          <div key={i} className="flex-1">
            <div className={`h-1 rounded-full mb-1 ${i <= step ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            <span className={`text-[10px] font-medium ${i <= step ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground'}`}>{s}</span>
          </div>
        ))}
      </div>

      {step === 0 && <div className="space-y-4">
        <div><h3 className="text-lg font-bold">Základní kmen</h3><p className="text-sm text-muted-foreground">Máš absolvovaný {obor.kmen_type || 'základní'} kmen?</p></div>
        <div className="grid grid-cols-2 gap-3">
          {[{ v: true, l: 'Ano, mám hotový kmen', desc: 'Kmenové požadavky se automaticky splní', ic: '✅' },
            { v: false, l: 'Ne, jsem v kmeni', desc: 'Uvidíš i kmenové požadavky', ic: '📖' }].map(o => (
            <button key={String(o.v)} onClick={() => setD(x => ({ ...x, kmenDone: o.v }))}
              className={`p-4 rounded-xl border text-left transition-all ${d.kmenDone === o.v ? 'border-teal-500/50 bg-teal-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
              <div className="text-xl mb-2">{o.ic}</div>
              <div className={`text-sm font-semibold ${d.kmenDone === o.v ? 'text-teal-600 dark:text-teal-400' : ''}`}>{o.l}</div>
              <div className="text-xs text-muted-foreground mt-1">{o.desc}</div>
            </button>
          ))}
        </div>
        {d.kmenDone === true && <div><Label className="text-xs">Datum absolvování kmenové zkoušky</Label><Input type="date" value={d.kmenDate} onChange={e => setD(x => ({ ...x, kmenDate: e.target.value }))} className="w-48 mt-1" /></div>}
      </div>}

      {step === 1 && <div className="space-y-4">
        <div><h3 className="text-lg font-bold">Termíny vzdělávání</h3><p className="text-sm text-muted-foreground">Kdy jsi se zapsal/a do oboru?</p></div>
        <div><Label className="text-xs">Datum zápisu do specializačního vzdělávání</Label><Input type="date" value={d.enrollDate} onChange={e => setD(x => ({ ...x, enrollDate: e.target.value }))} className="w-48 mt-1" /></div>
        <div><Label className="text-xs">Plánovaný termín atestace (volitelné)</Label><Input type="date" value={d.expectedEnd} onChange={e => setD(x => ({ ...x, expectedEnd: e.target.value }))} className="w-48 mt-1" />
          <p className="text-xs text-muted-foreground mt-1">Min. délka: {obor.min_years || 5} let ({(obor.min_years || 5) * 12} měsíců)</p></div>
      </div>}

      {step === 2 && <div className="space-y-4">
        <div><h3 className="text-lg font-bold">Přerušení přípravy</h3><p className="text-sm text-muted-foreground">Mateřská, PN apod. — doba se připočte k celkovému času.</p></div>
        {d.ints.length > 0 && <div className="space-y-2">
          {d.ints.map(int => { const it = INT_TYPES.find(t => t.id === int.type) || INT_TYPES[3]; const Ic = it.icon; return (
            <div key={int.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <Ic className="w-4 h-4 text-muted-foreground" /><div className="flex-1"><div className="text-sm font-medium">{it.label}</div><div className="text-xs text-muted-foreground">{fD(int.from)} – {fD(int.to)} · {mBetween(int.from, int.to)} měs.</div></div>
              <button onClick={() => setD(x => ({ ...x, ints: x.ints.filter(i => i.id !== int.id) }))} className="text-muted-foreground hover:text-red-500 text-sm">×</button>
            </div>); })}
          <p className="text-xs text-muted-foreground">Celkem: <strong className="text-amber-500">{intM} měs.</strong></p>
        </div>}
        {d.adding ? (
          <Card><CardContent className="p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">{INT_TYPES.map(it => { const Ic = it.icon; return (
              <button key={it.id} onClick={() => setD(x => ({ ...x, tmp: { ...x.tmp, type: it.id } }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${d.tmp.type === it.id ? 'border-teal-500/50 bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'border-slate-200 dark:border-slate-700'}`}><Ic className="w-3 h-3" />{it.label}</button>); })}</div>
            <div className="flex gap-3"><div className="flex-1"><Label className="text-xs">Od</Label><Input type="date" value={d.tmp.from} onChange={e => setD(x => ({ ...x, tmp: { ...x.tmp, from: e.target.value } }))} className="mt-1" /></div>
              <div className="flex-1"><Label className="text-xs">Do</Label><Input type="date" value={d.tmp.to} onChange={e => setD(x => ({ ...x, tmp: { ...x.tmp, to: e.target.value } }))} className="mt-1" /></div></div>
            <div className="flex gap-2 justify-end"><Button variant="ghost" size="sm" onClick={() => setD(x => ({ ...x, adding: false }))}>Zrušit</Button><Button size="sm" onClick={addInt} disabled={!d.tmp.from || !d.tmp.to}>Přidat</Button></div>
          </CardContent></Card>
        ) : <Button variant="outline" className="w-full" onClick={() => setD(x => ({ ...x, adding: true }))}><Plus className="w-4 h-4 mr-2" />Přidat přerušení</Button>}
      </div>}

      <div className="flex gap-2 justify-end pt-2">
        {step > 0 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Zpět</Button>}
        {step < 2 ? <Button onClick={() => setStep(s => s + 1)} disabled={step === 0 && d.kmenDone === null}>Pokračovat</Button>
          : <Button onClick={() => onComplete({ kmen_done: d.kmenDone, kmen_date: d.kmenDate || null, enroll_date: d.enrollDate || null, expected_end: d.expectedEnd || null, interruptions: d.ints })}>Hotovo – zobrazit logbook</Button>}
      </div>
    </div>
  );
}

// ═══ Countdown Banner ═══
function Countdown({ profile, obor }) {
  if (!profile?.enroll_date || !obor) return null;
  const totalM = (obor.min_years || 5) * 12;
  const intM = (profile.interruptions || []).reduce((s, i) => s + mBetween(i.from, i.to), 0);
  const adj = totalM + intM;
  const elapsed = mBetween(profile.enroll_date, new Date().toISOString().split('T')[0]);
  const rem = Math.max(0, adj - elapsed);
  const pct = Math.min(100, Math.round((elapsed / adj) * 100));
  const exp = new Date(profile.enroll_date); exp.setMonth(exp.getMonth() + adj);
  const u = rem <= 6 ? 'red' : rem <= 12 ? 'amber' : 'emerald';
  const cls = { red: 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400', amber: 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400', emerald: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' };
  const bar = { red: 'bg-red-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500' };
  return (
    <div className={`rounded-xl border p-3 ${cls[u]}`}>
      <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2 text-sm font-bold"><Timer className="w-4 h-4" />Zbývá {rem} měsíců</div><span className="text-xs opacity-60">{pct}% uplynulo</span></div>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"><div className={`h-full rounded-full transition-all ${bar[u]}`} style={{ width: `${pct}%` }} /></div>
      <div className="flex justify-between mt-1.5 text-[10px] opacity-50"><span>Zápis: {fD(profile.enroll_date)}</span><span>Cíl: {fD(exp.toISOString().split('T')[0])}</span></div>
      {intM > 0 && <p className="text-[10px] opacity-40 mt-1">Přerušeno {intM} měs. → celkem {adj} měs.</p>}
    </div>
  );
}

// ═══ Requirement Card ═══
function ReqCard({ req, done, auto, onToggle }) {
  const [exp, setExp] = useState(false);
  const Icon = TYPE_ICONS[req.requirement_type] || FileText;
  const det = []; if (req.duration_months) det.push(`${req.duration_months} měs.`); if (req.hours) det.push(`${req.hours} hod.`); if (req.min_count) det.push(`min. ${req.min_count}×`);
  return (
    <div className={`rounded-xl border transition-all ${done ? 'border-teal-500/20 bg-teal-500/5' : 'border-slate-200 dark:border-slate-700'} ${auto ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExp(!exp)}>
        <button onClick={e => { e.stopPropagation(); onToggle(); }} className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${done ? 'border-teal-500 bg-teal-500' : 'border-slate-300 dark:border-slate-600'}`}>
          {done && <Check className="w-3 h-3 text-white" />}</button>
        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${done ? 'line-through text-muted-foreground' : ''}`}>{req.title}</div>
          {det.length > 0 && <div className="text-xs text-muted-foreground">{det.join(' · ')}</div>}
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">{PHASE_LABELS[req.phase] || 'SPEC'}</Badge>
        {exp ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>
      {exp && <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-800"><div className="pt-2 space-y-1 text-xs text-muted-foreground">
        {req.description && <p>{req.description}</p>}
        {req.workplace_type && <p>📍 {req.workplace_type}</p>}
        {req.min_supervised > 0 && <p>👨‍⚕️ Min. pod dohledem: {req.min_supervised}×</p>}
        {!req.is_mandatory && <p className="text-amber-500">⚡ Doporučené</p>}
        {auto && <p className="text-teal-500">✅ Auto-splněno (kmen absolvován)</p>}
      </div></div>}
    </div>
  );
}

// ═══ Custom Entry Card ═══
function CustCard({ entry }) {
  const [exp, setExp] = useState(false);
  return (
    <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5">
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExp(!exp)}>
        <div className="w-5 h-5 rounded-md border-2 border-emerald-500 bg-emerald-500 flex-shrink-0 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
        <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{entry.procedure_name}</div><div className="text-xs text-muted-foreground">{fD(entry.date)}</div></div>
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">VLASTNÍ</Badge>
      </div>
      {exp && <div className="px-3 pb-3 border-t border-emerald-500/10"><div className="pt-2 space-y-1 text-xs text-muted-foreground">
        {entry.description && <p>{entry.description}</p>}{entry.was_supervised && <p>👨‍⚕️ Pod dohledem</p>}
      </div></div>}
    </div>
  );
}

// ═══ Add Entry Dialog ═══
function AddDialog({ open, onOpenChange, userId }) {
  const qc = useQueryClient();
  const [f, sF] = useState({ procedure_name: '', date: new Date().toISOString().split('T')[0], description: '', was_supervised: false });
  const mut = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('logbook_entries').insert({ user_id: userId, ...f }); if (error) throw error; },
    onSuccess: () => { toast.success('Záznam přidán!'); qc.invalidateQueries(['logbookEntries']); onOpenChange(false); sF({ procedure_name: '', date: new Date().toISOString().split('T')[0], description: '', was_supervised: false }); },
    onError: () => toast.error('Chyba při ukládání'),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Nový záznam</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label className="text-xs">Název výkonu / aktivity</Label><Input value={f.procedure_name} onChange={e => sF(x => ({ ...x, procedure_name: e.target.value }))} placeholder="Např. Apendektomie" className="mt-1" /></div>
        <div><Label className="text-xs">Datum</Label><Input type="date" value={f.date} onChange={e => sF(x => ({ ...x, date: e.target.value }))} className="mt-1 w-48" /></div>
        <div><Label className="text-xs">Poznámky</Label><Textarea value={f.description} onChange={e => sF(x => ({ ...x, description: e.target.value }))} rows={2} className="mt-1" /></div>
        <div className="flex items-center gap-2"><input type="checkbox" checked={f.was_supervised} onChange={e => sF(x => ({ ...x, was_supervised: e.target.checked }))} className="rounded" id="sup" /><Label htmlFor="sup" className="text-xs">Pod dohledem školitele</Label></div>
        <div className="flex gap-2 justify-end pt-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button><Button onClick={() => mut.mutate()} disabled={!f.procedure_name.trim()}>Přidat</Button></div>
      </div>
    </DialogContent></Dialog>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════
export default function LogbookV2() {
  const { user } = useAuth();
  const [sel, setSel] = useState(null);
  const [profiles, setProfiles] = useState(() => { try { return JSON.parse(localStorage.getItem('mv_lb_p') || '{}'); } catch { return {}; } });
  const [prog, setProg] = useState(() => { try { return JSON.parse(localStorage.getItem('mv_lb_g') || '{}'); } catch { return {}; } });
  const [showOB, setShowOB] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [fPh, setFPh] = useState('all');
  const [fTy, setFTy] = useState('all');

  useEffect(() => { localStorage.setItem('mv_lb_p', JSON.stringify(profiles)); }, [profiles]);
  useEffect(() => { localStorage.setItem('mv_lb_g', JSON.stringify(prog)); }, [prog]);

  const { data: obory = [] } = useQuery({ queryKey: ['obory'], queryFn: async () => { const { data } = await supabase.from('obory').select('*').order('name'); return data || []; } });
  const obor = obory.find(o => o.id === sel);
  const profile = sel ? profiles[sel] : null;

  const { data: vpReqs = [] } = useQuery({
    queryKey: ['trainingReqs', sel],
    queryFn: async () => { const { data } = await supabase.from('training_requirements').select('*').eq('obor_id', sel).order('order_index'); return data || []; },
    enabled: !!sel,
  });

  const { data: custEntries = [] } = useQuery({
    queryKey: ['logbookEntries', user?.id],
    queryFn: async () => { const { data } = await supabase.from('logbook_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }); return data || []; },
    enabled: !!user?.id,
  });

  const eProg = useMemo(() => {
    if (!profile?.kmen_done) return prog;
    const ep = { ...prog };
    vpReqs.filter(r => r.phase === 'kmen').forEach(r => { ep[r.id] = { status: 'completed', auto: true }; });
    return ep;
  }, [prog, profile, vpReqs]);

  const stats = useMemo(() => { const t = vpReqs.length, c = vpReqs.filter(r => eProg[r.id]?.status === 'completed').length; return { t, c, pct: t > 0 ? Math.round(c / t * 100) : 0 }; }, [vpReqs, eProg]);
  const kR = vpReqs.filter(r => r.phase === 'kmen'), sR = vpReqs.filter(r => r.phase !== 'kmen');
  const kD = kR.filter(r => eProg[r.id]?.status === 'completed').length;
  const sD = sR.filter(r => eProg[r.id]?.status === 'completed').length;

  const filtered = useMemo(() => {
    let i = vpReqs;
    if (fPh !== 'all') i = i.filter(r => r.phase === fPh);
    if (fTy !== 'all') i = i.filter(r => r.requirement_type === fTy);
    return i;
  }, [vpReqs, fPh, fTy]);
  const isF = fPh !== 'all' || fTy !== 'all';
  const toggle = id => setProg(p => ({ ...p, [id]: { status: p[id]?.status === 'completed' ? 'pending' : 'completed' } }));

  // Onboarding
  if (sel && showOB && obor) return (
    <div className="container max-w-2xl mx-auto p-6">
      <Onboarding obor={obor} onComplete={data => { setProfiles(p => ({ ...p, [sel]: data })); setShowOB(false); }} onCancel={() => { setSel(null); setShowOB(false); }} />
    </div>
  );
  if (sel && !profile && obor) { if (!showOB) setTimeout(() => setShowOB(true), 0); return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" /></div>; }

  // Overview
  if (!sel) return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-3"><ClipboardList className="w-7 h-7 text-teal-500" />Logbook & Plánovač VP</h1>
        <p className="text-sm text-muted-foreground mt-1">Sleduj plnění vzdělávacího programu dle MZČR 2019.</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {obory.map(o => { const has = !!profiles[o.id]; return (
          <button key={o.id} onClick={() => setSel(o.id)} className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all hover:border-teal-500/30 hover:bg-teal-500/5 ${has ? 'border-teal-500/20 bg-teal-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0"><Award className="w-4 h-4 text-teal-500" /></div>
            <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{o.name}</div><div className="text-xs text-muted-foreground">{o.min_years} let · {o.kmen_type || '—'} kmen{has && ' · ✅'}</div></div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>); })}
      </div>
    </div>
  );

  // Detail
  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => { setSel(null); setFPh('all'); setFTy('all'); }}><ChevronLeft className="w-4 h-4 mr-1" />Zpět</Button>
        <Button variant="ghost" size="sm" onClick={() => setShowOB(true)}><Settings className="w-4 h-4 mr-1" />Profil</Button>
      </div>

      <div className="flex items-center gap-4">
        <ProgressRing progress={stats.pct} size={64} strokeWidth={5}><span className="text-sm font-bold">{stats.pct}%</span></ProgressRing>
        <div><h1 className="text-xl font-bold">{obor?.name}</h1><p className="text-xs text-muted-foreground">{obor?.kmen_type} kmen · {obor?.min_years} let · {stats.c}/{stats.t} splněno{profile?.kmen_done && ' · kmen ✅'}</p></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-3"><div className="text-[10px] font-bold text-blue-500 mb-1.5">KMEN {profile?.kmen_done && '✅'}</div><Progress value={kR.length > 0 ? (kD / kR.length) * 100 : 0} className="h-1.5" /><div className="text-[10px] text-muted-foreground mt-1">{kD}/{kR.length}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[10px] font-bold text-purple-500 mb-1.5">SPECIALIZACE</div><Progress value={sR.length > 0 ? (sD / sR.length) * 100 : 0} className="h-1.5" /><div className="text-[10px] text-muted-foreground mt-1">{sD}/{sR.length}</div></CardContent></Card>
      </div>

      <Countdown profile={profile} obor={obor} />

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[{ k: 'all', l: 'Vše' }, { k: 'kmen', l: 'Kmen' }, { k: 'specializace', l: 'Spec' }].map(f => (
          <Button key={f.k} variant={fPh === f.k ? 'default' : 'outline'} size="sm" className="text-xs h-7 px-3" onClick={() => setFPh(f.k)}>{f.l}</Button>
        ))}
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 self-center mx-1" />
        {Object.entries(TYPE_ICONS).map(([k, Ic]) => (
          <Button key={k} variant={fTy === k ? 'default' : 'outline'} size="sm" className="text-xs h-7 px-2.5" onClick={() => setFTy(fTy === k ? 'all' : k)}>
            <Ic className="w-3 h-3 mr-1" />{k.charAt(0).toUpperCase() + k.slice(1)}</Button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2 pb-20">
        {!isF ? (<>
          {!profile?.kmen_done && kR.length > 0 && <>
            <h3 className="text-xs font-bold text-blue-500 tracking-wider mt-2">ZÁKLADNÍ KMEN ({obor?.kmen_type})</h3>
            {kR.map(r => <ReqCard key={r.id} req={r} done={eProg[r.id]?.status === 'completed'} auto={eProg[r.id]?.auto} onToggle={() => toggle(r.id)} />)}
          </>}
          {profile?.kmen_done && kR.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-blue-500/15 bg-blue-500/5">
              <Check className="w-5 h-5 text-blue-500" /><div><div className="text-sm font-semibold text-blue-600 dark:text-blue-400">Kmen absolvován</div><div className="text-xs text-muted-foreground">{kR.length} požadavků auto-splněno{profile.kmen_date && ` · ${fD(profile.kmen_date)}`}</div></div>
            </div>
          )}
          <h3 className="text-xs font-bold text-purple-500 tracking-wider mt-4">SPECIALIZOVANÝ VÝCVIK</h3>
          {sR.map(r => <ReqCard key={r.id} req={r} done={eProg[r.id]?.status === 'completed'} auto={false} onToggle={() => toggle(r.id)} />)}
          {custEntries.length > 0 && <>
            <h3 className="text-xs font-bold text-emerald-500 tracking-wider mt-4">VLASTNÍ ZÁZNAMY ({custEntries.length})</h3>
            {custEntries.map(e => <CustCard key={e.id} entry={e} />)}
          </>}
        </>) : (<>
          {filtered.length > 0 ? filtered.map(r => <ReqCard key={r.id} req={r} done={eProg[r.id]?.status === 'completed'} auto={eProg[r.id]?.auto} onToggle={() => toggle(r.id)} />)
            : <p className="text-center text-sm text-muted-foreground py-8">Žádné požadavky</p>}
        </>)}
      </div>

      <Button size="lg" className="fixed bottom-6 right-6 rounded-xl shadow-lg h-12 w-12 p-0 bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowAdd(true)}><Plus className="w-5 h-5" /></Button>
      <AddDialog open={showAdd} onOpenChange={setShowAdd} userId={user?.id} />
    </div>
  );
}
