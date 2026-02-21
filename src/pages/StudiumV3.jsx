import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen, Search, Zap, Filter, Target,
  ChevronRight, ChevronDown, FileText, Layers, Clock,
  X, SlidersHorizontal, LayoutGrid, List as ListIcon,
  Flame, CheckCircle2, TrendingUp, Plus, Microscope
} from 'lucide-react';

/* ═══ COLOR PALETTE ═══ */
const COLOR_POOL = [
  '#ef4444','#3b82f6','#10b981','#a855f7','#f97316','#ec4899','#06b6d4',
  '#f59e0b','#14b8a6','#6366f1','#f43f5e','#84cc16','#0ea5e9','#8b5cf6',
  '#d946ef','#22d3ee','#e11d48','#65a30d','#dc2626','#7c3aed',
];
const _cc = {};
const getOborColor = (name) => {
  if (!name) return '#64748b';
  if (_cc[name]) return _cc[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  _cc[name] = COLOR_POOL[Math.abs(h) % COLOR_POOL.length];
  return _cc[name];
};

/* ═══ CONTENT TYPE INDICATORS ═══ */
function ContentDots({ topic, compact = false }) {
  const types = [
    { key: 'ft', label: 'Fulltext', has: !!topic.full_text_content && topic.full_text_content.length > 100, icon: FileText, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { key: 'hy', label: 'High-Yield', has: !!topic.bullet_points_summary && topic.bullet_points_summary.length > 50, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { key: 'dd', label: 'Deep Dive', has: !!topic.deep_dive_content && topic.deep_dive_content.length > 50, icon: Microscope, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {types.map(t => (
          <div key={t.key} title={t.has ? t.label : `${t.label} – chybí`}
            className={`w-[18px] h-[18px] rounded flex items-center justify-center ${t.has ? t.bg : 'bg-[hsl(var(--mn-surface-2))]'}`}>
            <t.icon className={`w-3 h-3 ${t.has ? t.color : 'text-[hsl(var(--mn-muted))]'}`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {types.map(t => t.has ? (
        <span key={t.key} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.color} ${t.bg}`}>
          <t.icon className="w-3 h-3" /> {t.label}
        </span>
      ) : (
        <span key={t.key} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-[hsl(var(--mn-muted))] bg-[hsl(var(--mn-surface-2))] line-through opacity-50">
          <t.icon className="w-3 h-3" /> {t.label}
        </span>
      ))}
    </div>
  );
}

/* ═══ MASTERY BADGE ═══ */
function MasteryBadge({ score }) {
  if (!score || score === 0) return null;
  const s = Number(score);
  const cfg = s >= 80 ? { label: 'Zvládnuto', cls: 'text-emerald-400 bg-emerald-500/10' }
    : s >= 50 ? { label: 'Učím se', cls: 'text-blue-400 bg-blue-500/10' }
    : s >= 20 ? { label: 'Zahájeno', cls: 'text-amber-400 bg-amber-500/10' }
    : { label: 'Nové', cls: 'text-[hsl(var(--mn-muted))] bg-[hsl(var(--mn-surface-2))]' };
  return <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfg.cls}`}>{cfg.label}</span>;
}

/* ═══ STAT CARD ═══ */
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-[hsl(var(--mn-surface-2))] border border-[hsl(var(--mn-border))]">
      <div className={`p-2 rounded-xl ${accent || 'bg-[hsl(var(--mn-surface-2))]'}`}>
        <Icon className="w-5 h-5 text-[hsl(var(--mn-muted))]" />
      </div>
      <div>
        <p className="mn-mono-font text-2xl font-bold text-[hsl(var(--mn-text))]">{value}</p>
        <p className="text-xs text-[hsl(var(--mn-muted))]">{label}</p>
      </div>
    </div>
  );
}

/* ═══ ADD OBOR MODAL ═══ */
function AddOborModal({ visible, onClose, allObory, pinned, onToggle }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    if (!q.trim()) return allObory;
    return allObory.filter(o => o.name.toLowerCase().includes(q.toLowerCase()));
  }, [q, allObory]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-[560px] max-h-[80vh] bg-[hsl(var(--mn-surface))] rounded-2xl border border-[hsl(var(--mn-border))] shadow-2xl flex flex-col overflow-hidden">
        <div className="p-5 pb-0 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-[hsl(var(--mn-text))]">Vyberte obory pro lištu</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] flex items-center justify-center hover:text-[hsl(var(--mn-text))]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--mn-muted))]" />
            <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Hledat obor..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-text))] text-sm outline-none focus:border-[hsl(var(--mn-accent))]" />
          </div>
          <p className="text-xs text-[hsl(var(--mn-muted))] mb-3">
            <span className="mn-mono-font font-bold text-[hsl(var(--mn-accent))]">{pinned.length}</span> oborů v liště · klikněte pro přidání/odebrání
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <div className="grid grid-cols-2 gap-2">
            {list.map(ob => {
              const on = pinned.includes(ob.id);
              const col = ob.color || getOborColor(ob.name);
              return (
                <button key={ob.id} onClick={() => onToggle(ob.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                    on ? 'bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-text))] ring-2' : 'bg-[hsl(var(--mn-surface-2))]/50 text-[hsl(var(--mn-muted))] border border-[hsl(var(--mn-border))] hover:bg-[hsl(var(--mn-surface-2))]'
                  }`}
                  style={on ? { ringColor: col, borderColor: col } : undefined}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: col }} />
                  <span className="flex-1 truncate">{ob.name}</span>
                  {on && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: col }} />}
                </button>
              );
            })}
          </div>
          {list.length === 0 && <p className="text-center text-[hsl(var(--mn-muted))] py-8">Žádný obor neodpovídá</p>}
        </div>
        <div className="p-4 border-t border-[hsl(var(--mn-border))] flex justify-end flex-shrink-0">
          <Button onClick={onClose} className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent))]/80 text-white">Hotovo</Button>
        </div>
      </div>
    </div>
  );
}

/* ═══ TOPIC CARD ═══ */
function TopicCard({ topic, mastery, fcCount, mcqCount, dueCount }) {
  const col = topic.obory?.color || getOborColor(topic.obory?.name);
  const score = mastery ? Number(mastery.mastery_score) || 0 : 0;

  return (
    <Link to={`${createPageUrl('TopicDetailV2')}?id=${topic.id}`}>
      <div className="group relative rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))] hover:bg-[hsl(var(--mn-elevated))] transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden">
        {score > 0 ? (
          <div className="h-1 w-full bg-[hsl(var(--mn-border))]">
            <div className="h-full transition-all duration-500" style={{ width: `${score}%`, background: score >= 80 ? '#22c55e' : score >= 50 ? '#3b82f6' : '#f59e0b' }} />
          </div>
        ) : (
          <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${col}, transparent)` }} />
        )}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2 gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-[hsl(var(--mn-text))] line-clamp-2 leading-snug">{topic.title}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: col }} />
                <span className="text-[11px] text-[hsl(var(--mn-muted))] truncate">{topic.okruhy?.name}</span>
              </div>
            </div>
            <MasteryBadge score={score} />
          </div>
          <ContentDots topic={topic} />
          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2.5 text-[11px] text-[hsl(var(--mn-muted))]">
            {(fcCount || 0) > 0 && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{fcCount} FC</span>}
            {(mcqCount || 0) > 0 && <span className="flex items-center gap-1"><Target className="w-3 h-3" />{mcqCount} MCQ</span>}
            {(dueCount || 0) > 0 && (
              <span className="flex items-center gap-1 ml-auto text-amber-400 font-semibold">
                <Flame className="w-3 h-3" />{dueCount} k opakování
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ═══ OKRUH ACCORDION ═══ */
function OkruhSection({ okruh, topics, masteryMap, fcMap, mcqMap, dueMap }) {
  const [open, setOpen] = useState(() => topics.some(t => (dueMap[t.id] || 0) > 0));
  const totalDue = topics.reduce((s, t) => s + (dueMap[t.id] || 0), 0);
  const avgProgress = topics.length > 0 ? Math.round(topics.reduce((s, t) => s + (Number(masteryMap[t.id]?.mastery_score) || 0), 0) / topics.length) : 0;
  const contentCounts = {
    ft: topics.filter(t => t.full_text_content?.length > 100).length,
    hy: topics.filter(t => t.bullet_points_summary?.length > 50).length,
    dd: topics.filter(t => t.deep_dive_content?.length > 50).length,
  };

  return (
    <div className="rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface))] overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[hsl(var(--mn-surface-2))]/50 transition-colors">
        <ChevronRight className={`w-4 h-4 text-[hsl(var(--mn-muted))] transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className="font-semibold text-sm text-[hsl(var(--mn-text))] flex-1">{okruh.name}</span>
        {/* Content coverage mini */}
        <div className="flex gap-1.5 mr-2 text-[10px] mn-mono-font">
          <span className="text-teal-400">{contentCounts.ft}<span className="text-[hsl(var(--mn-muted))]">/{topics.length}</span></span>
          <span className="text-[hsl(var(--mn-border))]">·</span>
          <span className="text-amber-400">{contentCounts.hy}</span>
          <span className="text-[hsl(var(--mn-border))]">·</span>
          <span className="text-purple-400">{contentCounts.dd}</span>
        </div>
        <span className="text-xs mn-mono-font text-[hsl(var(--mn-muted))]">{topics.length} témat</span>
        {totalDue > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
            <Flame className="w-3 h-3" />{totalDue}
          </span>
        )}
        {/* Progress bar */}
        <div className="w-12 h-1 rounded-full bg-[hsl(var(--mn-border))] overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${avgProgress}%`, background: avgProgress >= 80 ? '#22c55e' : '#14b8a6' }} />
        </div>
        <span className="text-[11px] mn-mono-font text-[hsl(var(--mn-muted))] w-7 text-right">{avgProgress}%</span>
      </button>
      {open && (
        <div className="border-t border-[hsl(var(--mn-border))]">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {topics.map(t => (
              <TopicCard key={t.id} topic={t} mastery={masteryMap[t.id]} fcCount={fcMap[t.id]} mcqCount={mcqMap[t.id]} dueCount={dueMap[t.id]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* ═══ MAIN COMPONENT ═══════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════ */
export default function StudiumV3() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [pinnedObory, setPinnedObory] = useState([]);
  const [activeObory, setActiveObory] = useState([]);
  const [selOkruh, setSelOkruh] = useState('all');
  const [sortBy, setSortBy] = useState('obor');
  const [viewMode, setViewMode] = useState('grouped');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [contentOnly, setContentOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);
  const searchRef = useRef(null);

  // Ctrl+K
  useEffect(() => {
    const h = e => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); } };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  /* ─── DATA FETCHING ─── */
  const { data: allTopics = [], isLoading } = useQuery({
    queryKey: ['topics-v3'],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let all = [], from = 0, more = true;
      while (more) {
        const { data, error } = await supabase
          .from('topics')
          .select('*, obory:obor_id(id, name, slug, color, icon), okruhy:okruh_id(id, name, slug)')
          .eq('status', 'published')
          .order('title')
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        all = all.concat(data || []);
        more = (data?.length || 0) === PAGE_SIZE;
        from += PAGE_SIZE;
      }
      return all;
    }
  });

  const { data: obory = [] } = useQuery({
    queryKey: ['obory'],
    queryFn: async () => {
      const { data } = await supabase.from('obory').select('*').eq('is_active', true).order('name');
      return data || [];
    }
  });

  const { data: okruhy = [] } = useQuery({
    queryKey: ['okruhy'],
    queryFn: async () => {
      const { data } = await supabase.from('okruhy').select('*').eq('is_active', true).order('name');
      return data || [];
    }
  });

  const { data: masteryMap = {} } = useQuery({
    queryKey: ['mastery-map', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_topic_mastery').select('topic_id, mastery_score, confidence_level, last_studied_at').eq('user_id', user.id);
      const m = {};
      (data || []).forEach(r => { m[r.topic_id] = r; });
      return m;
    },
    enabled: !!user?.id
  });

  // Flashcard & MCQ counts per topic
  const { data: fcMap = {} } = useQuery({
    queryKey: ['fc-counts'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_flashcard_counts_per_topic').select('*');
      // Fallback: count manually if RPC doesn't exist
      if (!data) {
        const { data: fcs } = await supabase.from('flashcards').select('topic_id');
        const m = {};
        (fcs || []).forEach(f => { m[f.topic_id] = (m[f.topic_id] || 0) + 1; });
        return m;
      }
      const m = {};
      data.forEach(r => { m[r.topic_id] = r.count; });
      return m;
    },
    retry: false,
    // Fallback on error
    onError: () => ({})
  });

  const { data: mcqMap = {} } = useQuery({
    queryKey: ['mcq-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('questions').select('topic_id');
      const m = {};
      (data || []).forEach(q => { m[q.topic_id] = (m[q.topic_id] || 0) + 1; });
      return m;
    }
  });

  // Due flashcards (next_review <= today)
  const { data: dueMap = {} } = useQuery({
    queryKey: ['due-cards', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_flashcard_progress')
        .select('flashcard_id, flashcards(topic_id)')
        .eq('user_id', user.id)
        .lte('next_review', new Date().toISOString().split('T')[0]);
      const m = {};
      (data || []).forEach(r => {
        const tid = r.flashcards?.topic_id;
        if (tid) m[tid] = (m[tid] || 0) + 1;
      });
      return m;
    },
    enabled: !!user?.id
  });

  // User profile for preferences
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_specialization_profile').select('obor_id').eq('user_id', user.id).eq('is_active', true);
      return data || [];
    },
    enabled: !!user?.id
  });

  // Initialize pinned obory from user profile
  useEffect(() => {
    if (profile?.length > 0 && pinnedObory.length === 0) {
      const ids = profile.map(p => p.obor_id);
      setPinnedObory(ids);
      setActiveObory(ids);
    }
  }, [profile]);

  /* ─── DERIVED DATA ─── */
  const visPills = useMemo(() => obory.filter(o => pinnedObory.includes(o.id)), [obory, pinnedObory]);

  const filteredTopics = useMemo(() => {
    let items = [...allTopics];
    if (contentOnly) items = items.filter(t => t.full_text_content?.length > 100);
    if (activeObory.length > 0) items = items.filter(t => activeObory.includes(t.obor_id));
    if (selOkruh !== 'all') items = items.filter(t => t.okruh_id === selOkruh);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(t => t.title.toLowerCase().includes(q) || t.okruhy?.name?.toLowerCase().includes(q) || t.obory?.name?.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case 'alpha': items.sort((a, b) => a.title.localeCompare(b.title, 'cs')); break;
      case 'obor': items.sort((a, b) => (a.obory?.name || '').localeCompare(b.obory?.name || '', 'cs') || a.title.localeCompare(b.title, 'cs')); break;
      case 'mastery_asc': items.sort((a, b) => (Number(masteryMap[a.id]?.mastery_score) || 0) - (Number(masteryMap[b.id]?.mastery_score) || 0)); break;
      case 'mastery_desc': items.sort((a, b) => (Number(masteryMap[b.id]?.mastery_score) || 0) - (Number(masteryMap[a.id]?.mastery_score) || 0)); break;
      case 'due_first': items.sort((a, b) => (dueMap[b.id] || 0) - (dueMap[a.id] || 0)); break;
      default: items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return items;
  }, [allTopics, search, activeObory, selOkruh, sortBy, contentOnly, masteryMap, dueMap]);

  // Group: Obor → Okruh → Topics
  const groupedByOborOkruh = useMemo(() => {
    const oborGroups = {};
    filteredTopics.forEach(t => {
      const oborName = t.obory?.name || 'Ostatní';
      const oborId = t.obor_id || '_other';
      const okruhName = t.okruhy?.name || 'Ostatní';
      const okruhId = t.okruh_id || '_other';
      if (!oborGroups[oborId]) oborGroups[oborId] = { name: oborName, color: t.obory?.color || getOborColor(oborName), icon: t.obory?.icon, okruhy: {} };
      if (!oborGroups[oborId].okruhy[okruhId]) oborGroups[oborId].okruhy[okruhId] = { name: okruhName, topics: [] };
      oborGroups[oborId].okruhy[okruhId].topics.push(t);
    });
    return Object.entries(oborGroups).sort(([,a], [,b]) => a.name.localeCompare(b.name, 'cs'));
  }, [filteredTopics]);

  const filteredOkruhy = useMemo(() => {
    if (activeObory.length === 0) return okruhy;
    return okruhy.filter(o => allTopics.some(t => t.okruh_id === o.id && activeObory.includes(t.obor_id)));
  }, [okruhy, activeObory, allTopics]);

  const stats = useMemo(() => ({
    total: allTopics.length,
    filtered: filteredTopics.length,
    withFulltext: allTopics.filter(t => t.full_text_content?.length > 100).length,
    withHY: allTopics.filter(t => t.bullet_points_summary?.length > 50).length,
    withDD: allTopics.filter(t => t.deep_dive_content?.length > 50).length,
    totalDue: Object.values(dueMap).reduce((s, v) => s + v, 0),
  }), [allTopics, filteredTopics, dueMap]);

  const toggleActive = id => { setActiveObory(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); setSelOkruh('all'); };
  const togglePinned = id => {
    setPinnedObory(p => { const n = p.includes(id) ? p.filter(x => x !== id) : [...p, id]; if (!n.includes(id)) setActiveObory(a => a.filter(x => x !== id)); return n; });
  };

  const activeFilters = (activeObory.length > 0 ? 1 : 0) + (selOkruh !== 'all' ? 1 : 0) + (search ? 1 : 0);
  const visibleTopics = filteredTopics.slice(0, visibleCount);
  const hasMore = filteredTopics.length > visibleCount;

  useEffect(() => { setVisibleCount(60); }, [search, activeObory, selOkruh, sortBy, contentOnly]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <AddOborModal visible={showModal} onClose={() => setShowModal(false)} allObory={obory} pinned={pinnedObory} onToggle={togglePinned} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="mn-caption text-[hsl(var(--mn-accent))]">STUDIUM</span>
          <h1 className="mn-serif-font text-[28px] sm:text-[32px] font-bold text-[hsl(var(--mn-text))] tracking-tight mt-1">Studium</h1>
          <p className="text-sm text-[hsl(var(--mn-muted))]">
            {activeObory.length > 0 ? obory.filter(o => activeObory.includes(o.id)).map(o => o.name).join(', ') : `${stats.total} témat · ${stats.withFulltext} s fulltextem`}
          </p>
        </div>
        <Link to={createPageUrl('TestGeneratorV2')}>
          <Button className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent))]/80 text-white gap-2">
            <Zap className="w-4 h-4" /> Začít test
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard icon={BookOpen} label="Témata" value={stats.filtered} accent="bg-[hsl(var(--mn-accent)/0.15)]" />
        <StatCard icon={FileText} label="Fulltext" value={stats.withFulltext} accent="bg-teal-500/15" />
        <StatCard icon={Zap} label="High-Yield" value={stats.withHY} accent="bg-amber-500/15" />
        <StatCard icon={Microscope} label="Deep Dive" value={stats.withDD} accent="bg-purple-500/15" />
        <StatCard icon={Flame} label="K opakování" value={stats.totalDue} accent="bg-amber-500/15" />
      </div>

      {/* Obory Pills */}
      {visPills.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-[hsl(var(--mn-muted))] uppercase tracking-widest mr-1">Obory:</span>
          {visPills.map(ob => {
            const col = ob.color || getOborColor(ob.name);
            const on = activeObory.includes(ob.id);
            return (
              <button key={ob.id} onClick={() => toggleActive(ob.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  on ? 'text-white' : 'text-[hsl(var(--mn-muted))] border-[hsl(var(--mn-border))] hover:border-[hsl(var(--mn-muted))]'
                }`}
                style={on ? { background: `${col}22`, borderColor: col, color: col } : undefined}>
                <span className="w-2 h-2 rounded-full" style={{ background: col }} />
                {ob.name}
              </button>
            );
          })}
          <button onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))] hover:border-[hsl(var(--mn-accent))] hover:text-[hsl(var(--mn-accent))] transition-colors">
            <Plus className="w-3 h-3" /> Přidat obory
          </button>
          {activeObory.length > 0 && (
            <button onClick={() => setActiveObory([])} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))]">
              <X className="w-3 h-3" /> Vymazat
            </button>
          )}
        </div>
      )}

      {/* No pills yet hint */}
      {visPills.length === 0 && !isLoading && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--mn-accent)/0.05)] border border-[hsl(var(--mn-accent)/0.15)]">
          <Zap className="w-4 h-4 text-[hsl(var(--mn-accent))]" />
          <p className="text-sm text-[hsl(var(--mn-muted))] flex-1">
            Přidejte si obory pro rychlý filtr.
          </p>
          <Button size="sm" variant="outline" onClick={() => setShowModal(true)} className="text-[hsl(var(--mn-accent))] border-[hsl(var(--mn-accent)/0.3)]">
            <Plus className="w-3 h-3 mr-1" /> Vybrat obory
          </Button>
        </div>
      )}

      {/* Search + Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--mn-muted))]" />
          <Input ref={searchRef} placeholder="Hledat témata...  ⌘K" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-[hsl(var(--mn-surface))] border-[hsl(var(--mn-border))] text-[hsl(var(--mn-text))] placeholder:text-[hsl(var(--mn-muted))]" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--mn-muted))]"><X className="w-4 h-4" /></button>}
        </div>

        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}
          className={`gap-2 border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface))] text-[hsl(var(--mn-muted))] ${showFilters ? 'border-[hsl(var(--mn-accent)/0.5)] text-[hsl(var(--mn-accent))]' : ''}`}>
          <SlidersHorizontal className="w-4 h-4" /> Filtry
          {activeFilters > 0 && <Badge className="bg-[hsl(var(--mn-accent))] text-white text-[10px] px-1.5 py-0 ml-1">{activeFilters}</Badge>}
        </Button>

        <div className="flex border border-[hsl(var(--mn-border))] rounded-md overflow-hidden">
          {[['grid', LayoutGrid], ['grouped', Layers]].map(([m, Ic]) => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`p-2 ${viewMode === m ? 'bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-text))]' : 'bg-[hsl(var(--mn-surface))] text-[hsl(var(--mn-muted))]'}`}>
              <Ic className="w-4 h-4" />
            </button>
          ))}
        </div>

        <button onClick={() => setContentOnly(!contentOnly)}
          className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${contentOnly ? 'bg-[hsl(var(--mn-accent)/0.1)] text-[hsl(var(--mn-accent))] border-[hsl(var(--mn-accent)/0.3)]' : 'bg-[hsl(var(--mn-surface))] text-[hsl(var(--mn-muted))] border-[hsl(var(--mn-border))]'}`}>
          {contentOnly ? '✓ Pouze s obsahem' : 'Pouze s obsahem'}
        </button>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px] bg-[hsl(var(--mn-surface))] border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[hsl(var(--mn-surface))] border-[hsl(var(--mn-border))]">
            <SelectItem value="obor">Dle oboru</SelectItem>
            <SelectItem value="alpha">Abecedně</SelectItem>
            <SelectItem value="due_first">K opakování</SelectItem>
            <SelectItem value="mastery_asc">Nejslabší</SelectItem>
            <SelectItem value="mastery_desc">Nejsilnější</SelectItem>
            <SelectItem value="newest">Nejnovější</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-[hsl(var(--mn-surface))]/50 border border-[hsl(var(--mn-border))] animate-in slide-in-from-top-2">
          <div className="space-y-1.5 min-w-[180px]">
            <label className="text-xs font-medium text-[hsl(var(--mn-muted))]">Okruh</label>
            <Select value={selOkruh} onValueChange={setSelOkruh}>
              <SelectTrigger className="bg-[hsl(var(--mn-surface-2))] border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))] h-9">
                <SelectValue placeholder="Všechny okruhy" />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(var(--mn-surface))] border-[hsl(var(--mn-border))]">
                <SelectItem value="all">Všechny okruhy</SelectItem>
                {filteredOkruhy.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {activeFilters > 0 && (
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setActiveObory([]); setSelOkruh('all'); }} className="text-[hsl(var(--mn-muted))] h-9">
                <X className="w-3 h-3 mr-1" /> Vymazat filtry
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="text-xs text-[hsl(var(--mn-muted))] flex items-center gap-1.5">
        <span className="mn-mono-font font-bold text-[hsl(var(--mn-text))]">{filteredTopics.length}</span>
        {filteredTopics.length === 1 ? 'téma' : filteredTopics.length < 5 ? 'témata' : 'témat'}
        {filteredTopics.length !== allTopics.length && <span> z {allTopics.length}</span>}
      </div>

      {/* ═══ CONTENT ═══ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[hsl(var(--mn-border))] border-t-[hsl(var(--mn-accent))] rounded-full animate-spin" />
            <p className="text-sm text-[hsl(var(--mn-muted))]">Načítám témata...</p>
          </div>
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="w-16 h-16 text-[hsl(var(--mn-muted))] mb-4" />
          <h3 className="text-xl font-semibold text-[hsl(var(--mn-muted))] mb-2">Žádná témata nenalezena</h3>
          <p className="text-[hsl(var(--mn-muted))] mb-6">Zkuste změnit filtry nebo hledání</p>
          <Button variant="outline" onClick={() => { setSearch(''); setActiveObory([]); setSelOkruh('all'); setContentOnly(false); }}>Zobrazit vše</Button>
        </div>
      ) : viewMode === 'grouped' ? (
        /* ─── GROUPED: Obor → Okruh → Topics ─── */
        <div className="space-y-8">
          {groupedByOborOkruh.map(([oborId, oborGroup]) => (
            <div key={oborId}>
              {/* Obor header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: oborGroup.color }} />
                <h2 className="text-lg font-bold text-[hsl(var(--mn-text))]">{oborGroup.name}</h2>
                <Badge variant="outline" className="text-[hsl(var(--mn-muted))] border-[hsl(var(--mn-border))] text-xs">
                  {Object.values(oborGroup.okruhy).reduce((s, ok) => s + ok.topics.length, 0)} témat
                </Badge>
              </div>
              {/* Okruh accordions */}
              <div className="space-y-2 ml-1 pl-4 border-l-2" style={{ borderColor: `${oborGroup.color}33` }}>
                {Object.entries(oborGroup.okruhy).sort(([,a],[,b]) => a.name.localeCompare(b.name, 'cs')).map(([okId, okGroup]) => (
                  <OkruhSection key={okId} okruh={{ id: okId, name: okGroup.name }} topics={okGroup.topics}
                    masteryMap={masteryMap} fcMap={fcMap} mcqMap={mcqMap} dueMap={dueMap} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ─── FLAT GRID ─── */
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTopics.map(t => (
              <TopicCard key={t.id} topic={t} mastery={masteryMap[t.id]} fcCount={fcMap[t.id]} mcqCount={mcqMap[t.id]} dueCount={dueMap[t.id]} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setVisibleCount(v => v + 60)} className="border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))]">
                Načíst dalších 60 ({filteredTopics.length - visibleCount} zbývá)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap p-3 rounded-xl bg-[hsl(var(--mn-surface))]/50 border border-[hsl(var(--mn-border))] text-[11px]">
        <span className="font-bold text-[hsl(var(--mn-muted))] uppercase tracking-wider text-[10px]">Legenda:</span>
        <span className="flex items-center gap-1 text-teal-400"><FileText className="w-3 h-3" /> <b>Fulltext</b> <span className="text-[hsl(var(--mn-muted))]">— atestační text</span></span>
        <span className="flex items-center gap-1 text-amber-400"><Zap className="w-3 h-3" /> <b>High-Yield</b> <span className="text-[hsl(var(--mn-muted))]">— klíčové body</span></span>
        <span className="flex items-center gap-1 text-purple-400"><Microscope className="w-3 h-3" /> <b>Deep Dive</b> <span className="text-[hsl(var(--mn-muted))]">— výzkum</span></span>
      </div>

      {/* Preference hint */}
      {visPills.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--mn-accent)/0.04)] border border-[hsl(var(--mn-accent)/0.1)] text-xs text-[hsl(var(--mn-muted))]">
          <Zap className="w-3.5 h-3.5 text-[hsl(var(--mn-accent))]" />
          <span>Obory v liště odpovídají vašemu profilu. Další přidáte tlačítkem <b className="text-[hsl(var(--mn-accent))]">+ Přidat obory</b> nebo změníte v{' '}
            <Link to={createPageUrl('AccountSettings')} className="text-[hsl(var(--mn-accent))] underline underline-offset-2 decoration-dotted">nastavení profilu</Link>.
          </span>
        </div>
      )}
    </div>
  );
}
