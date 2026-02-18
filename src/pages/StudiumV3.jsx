import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen, Search, Sparkles, Zap, Filter, Target,
  ChevronRight, FileText, Layers, Brain, Clock,
  GraduationCap, X, SlidersHorizontal, LayoutGrid, List as ListIcon
} from 'lucide-react';

/* ─── Obor color palette — dynamic for all specialties ─── */
const COLOR_POOL = [
  { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', accent: '#ef4444' },
  { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', accent: '#3b82f6' },
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', accent: '#10b981' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', accent: '#a855f7' },
  { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', accent: '#f97316' },
  { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', accent: '#ec4899' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', accent: '#06b6d4' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', accent: '#f59e0b' },
  { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-[hsl(var(--mn-accent))]', accent: '#14b8a6' },
  { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', accent: '#6366f1' },
  { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', accent: '#f43f5e' },
  { bg: 'bg-lime-500/10', border: 'border-lime-500/30', text: 'text-lime-400', accent: '#84cc16' },
  { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', accent: '#0ea5e9' },
  { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', accent: '#8b5cf6' },
  { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30', text: 'text-fuchsia-400', accent: '#d946ef' },
];

// Stable hash to assign consistent color per obor name
const _oborColorCache = {};
const getOborTheme = (name) => {
  if (!name) return { bg: 'bg-[hsl(var(--mn-surface-2))]', border: 'border-[hsl(var(--mn-border))]', text: 'text-[hsl(var(--mn-muted))]', accent: '#64748b' };
  if (_oborColorCache[name]) return _oborColorCache[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  _oborColorCache[name] = COLOR_POOL[Math.abs(hash) % COLOR_POOL.length];
  return _oborColorCache[name];
};

/* ─── Content availability dots ─── */
function ContentDots({ topic }) {
  const dots = [
    { key: 'fulltext', label: 'Plný text', has: !!topic.full_text_content && topic.full_text_content.length > 100 },
    { key: 'highyield', label: 'High-Yield', has: !!topic.bullet_points_summary && topic.bullet_points_summary.length > 50 },
    { key: 'deepdive', label: 'Deep Dive', has: !!topic.deep_dive_content && topic.deep_dive_content.length > 50 },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {dots.map(d => (
        <div key={d.key} className="group relative flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full transition-all ${d.has ? 'bg-[hsl(var(--mn-success))] shadow-sm shadow-[hsl(var(--mn-success)/0.5)]' : 'bg-[hsl(var(--mn-border))]'}`} />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 text-[10px] bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            {d.label}: {d.has ? '✓' : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Topic Card ─── */
function TopicCard({ topic, mastery }) {
  const theme = getOborTheme(topic.obory?.name);
  const wordCount = topic.full_text_content ? Math.round(topic.full_text_content.split(/\s+/).length) : 0;
  const readTime = Math.max(1, Math.round(wordCount / 200));
  const score = mastery ? Number(mastery.mastery_score) || 0 : 0;

  return (
    <Link to={`${createPageUrl('TopicDetailV2')}?id=${topic.id}`}>
      <div className={`group relative rounded-xl border ${theme.border} bg-[hsl(var(--mn-surface))]/50 hover:bg-[hsl(var(--mn-surface-2))] transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden`}>
        {/* Top accent bar — shows mastery if studied */}
        {score > 0 ? (
          <div className="h-1 w-full bg-[hsl(var(--mn-border))]">
            <div className="h-full transition-all duration-500" style={{
              width: `${score}%`,
              background: score >= 80 ? '#22c55e' : score >= 50 ? '#a855f7' : score >= 20 ? '#f59e0b' : '#64748b'
            }} />
          </div>
        ) : (
          <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${theme.accent}, transparent)` }} />
        )}
        
        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <Badge variant="outline" className={`text-[11px] ${theme.text} ${theme.border} ${theme.bg} border`}>
              {topic.obory?.name}
            </Badge>
            <div className="flex items-center gap-2">
              {score > 0 && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  score >= 80 ? 'text-[hsl(var(--mn-success))] bg-[hsl(var(--mn-success)/0.1)]' :
                  score >= 50 ? 'text-[hsl(var(--mn-warn))] bg-[hsl(var(--mn-warn)/0.1)]' :
                  score >= 20 ? 'text-[hsl(var(--mn-warn))] bg-[hsl(var(--mn-warn)/0.1)]' :
                  'text-[hsl(var(--mn-muted))] bg-[hsl(var(--mn-surface-2))]'
                }`}>{Math.round(score)}%</span>
              )}
              <ContentDots topic={topic} />
            </div>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base text-[hsl(var(--mn-text))] mb-1.5 group-hover:text-[hsl(var(--mn-text))] transition-colors line-clamp-2">
            {topic.title}
          </h3>

          {/* No content indicator */}
          {wordCount === 0 && (
            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] mb-2">
              ⏳ Připravujeme obsah
            </span>
          )}

          {/* Okruh */}
          <p className="text-xs text-[hsl(var(--mn-muted))] mb-3">
            {topic.okruhy?.name}
          </p>

          {/* Description */}
          {topic.description && (
            <p className="text-sm text-[hsl(var(--mn-muted))] mb-4 line-clamp-2 leading-relaxed">
              {topic.description}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--mn-border))]">
            <div className="flex items-center gap-3 text-xs text-[hsl(var(--mn-muted))]">
              {topic.ai_model && (
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[hsl(var(--mn-warn))]" />
                  {topic.ai_model.includes('opus') ? 'Opus 4' : 
                   topic.ai_model.includes('sonnet') ? 'Sonnet 4' : 'AI'}
                </span>
              )}
              {wordCount > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {readTime} min
                </span>
              )}
              {topic.sources?.length > 0 && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {topic.sources.length}
                </span>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-[hsl(var(--mn-muted))] group-hover:text-[hsl(var(--mn-muted))] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Stat Card ─── */
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl bg-[hsl(var(--mn-surface))]/50 border border-[hsl(var(--mn-border))]`}>
      <div className={`p-2 rounded-xl ${accent || 'bg-[hsl(var(--mn-surface-2))]'}`}>
        <Icon className="w-5 h-5 text-[hsl(var(--mn-muted))]" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[hsl(var(--mn-text))]">{value}</p>
        <p className="text-xs text-[hsl(var(--mn-muted))]">{label}</p>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function StudiumV3() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObor, setSelectedObor] = useState('all');
  const [selectedOkruh, setSelectedOkruh] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [contentOnly, setContentOnly] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);

  // Fetch topics
  const { data: allTopics = [], isLoading } = useQuery({
    queryKey: ['topics-v3'],
    queryFn: async () => {
      // Supabase default limit is 1000, need to fetch all
      const PAGE_SIZE = 1000;
      let allData = [];
      let from = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('topics')
          .select(`
            *,
            obory:obor_id(id, name, slug, color),
            okruhy:okruh_id(id, name, slug)
          `)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        allData = allData.concat(data || []);
        hasMore = (data?.length || 0) === PAGE_SIZE;
        from += PAGE_SIZE;
      }
      
      return allData;
    }
  });

  // Fetch user mastery for showing progress on topic cards
  const { data: masteryMap = {} } = useQuery({
    queryKey: ['user-mastery-map', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_topic_mastery')
        .select('topic_id, mastery_score, confidence_level, last_studied_at')
        .eq('user_id', user.id);
      if (error) throw error;
      const map = {};
      (data || []).forEach(m => { map[m.topic_id] = m; });
      return map;
    },
    enabled: !!user?.id
  });

  // Fetch obory & okruhy
  const { data: obory = [] } = useQuery({
    queryKey: ['obory'],
    queryFn: async () => {
      const { data } = await supabase.from('obory').select('*').order('name');
      return data || [];
    }
  });

  const { data: okruhy = [] } = useQuery({
    queryKey: ['okruhy'],
    queryFn: async () => {
      const { data } = await supabase.from('okruhy').select('*').order('name');
      return data || [];
    }
  });

  // Filter & sort
  const filteredTopics = useMemo(() => {
    let filtered = allTopics;

    if (contentOnly) {
      filtered = filtered.filter(t => t.full_text_content?.length > 100);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.okruhy?.name?.toLowerCase().includes(q)
      );
    }

    if (selectedObor !== 'all') {
      filtered = filtered.filter(t => t.obor_id === selectedObor);
    }

    if (selectedOkruh !== 'all') {
      filtered = filtered.filter(t => t.okruh_id === selectedOkruh);
    }

    // Sort
    switch (sortBy) {
      case 'newest': filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
      case 'oldest': filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
      case 'alpha': filtered.sort((a, b) => a.title.localeCompare(b.title, 'cs')); break;
      case 'obor': filtered.sort((a, b) => (a.obory?.name || '').localeCompare(b.obory?.name || '', 'cs')); break;
      case 'mastery_asc': filtered.sort((a, b) => (Number(masteryMap[a.id]?.mastery_score) || 0) - (Number(masteryMap[b.id]?.mastery_score) || 0)); break;
      case 'mastery_desc': filtered.sort((a, b) => (Number(masteryMap[b.id]?.mastery_score) || 0) - (Number(masteryMap[a.id]?.mastery_score) || 0)); break;
    }

    return filtered;
  }, [allTopics, searchQuery, selectedObor, selectedOkruh, sortBy, contentOnly, masteryMap]);

  // Paginated visible topics for grid view
  const visibleTopics = useMemo(() => filteredTopics.slice(0, visibleCount), [filteredTopics, visibleCount]);
  const hasMore = filteredTopics.length > visibleCount;

  // Reset pagination on filter change
  React.useEffect(() => { setVisibleCount(60); }, [searchQuery, selectedObor, selectedOkruh, sortBy, contentOnly]);

  // Group by obor for grouped view
  const groupedByObor = useMemo(() => {
    const groups = {};
    filteredTopics.forEach(t => {
      const key = t.obory?.name || 'Ostatní';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'cs'));
  }, [filteredTopics]);

  // Stats
  const stats = useMemo(() => ({
    total: allTopics.length,
    filtered: filteredTopics.length,
    withFulltext: allTopics.filter(t => t.full_text_content?.length > 100).length,
    oboryCount: new Set(allTopics.map(t => t.obor_id)).size,
  }), [allTopics, filteredTopics]);

  // Active filter count
  const activeFilters = [searchQuery, selectedObor !== 'all', selectedOkruh !== 'all'].filter(Boolean).length;

  // Filtered okruhy based on selected obor
  const filteredOkruhy = useMemo(() => {
    if (selectedObor === 'all') return okruhy;
    return okruhy.filter(o => {
      // Check if any topic in this okruh belongs to the selected obor
      return allTopics.some(t => t.okruh_id === o.id && t.obor_id === selectedObor);
    });
  }, [okruhy, selectedObor, allTopics]);

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-6 h-6 text-[hsl(var(--mn-accent))]" />
              <h1 className="text-2xl font-bold text-[hsl(var(--mn-text))] tracking-tight">Studium</h1>
            </div>
            <p className="text-sm text-[hsl(var(--mn-muted))]">
              {stats.total} témat • {stats.withFulltext} s plným textem • {stats.oboryCount} oborů
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={BookOpen} label="Celkem témat" value={stats.total} accent="bg-[hsl(var(--mn-accent)/0.15)]" />
          <StatCard icon={FileText} label="S fulltextem" value={stats.withFulltext} accent="bg-[hsl(var(--mn-success)/0.15)]" />
          <StatCard icon={Target} label="Oborů" value={stats.oboryCount} accent="bg-[hsl(var(--mn-warn)/0.15)]" />
          <StatCard icon={Filter} label="Zobrazeno" value={stats.filtered} accent="bg-[hsl(var(--mn-accent-2)/0.15)]" />
        </div>

        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--mn-muted))]" />
            <Input
              placeholder="Hledat témata, obory, okruhy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[hsl(var(--mn-surface))] border-[hsl(var(--mn-border))] text-[hsl(var(--mn-text))] placeholder:text-[hsl(var(--mn-muted))] focus:border-[hsl(var(--mn-accent)/0.5)] focus:ring-[hsl(var(--mn-accent)/0.2)]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-muted))]">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`gap-2 border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface))] hover:bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] ${showFilters ? 'border-[hsl(var(--mn-accent)/0.5)] text-[hsl(var(--mn-accent))]' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtry
            {activeFilters > 0 && (
              <Badge className="bg-[hsl(var(--mn-accent))] text-white text-[10px] px-1.5 py-0 ml-1">
                {activeFilters}
              </Badge>
            )}
          </Button>

          {/* View toggle */}
          <div className="flex border border-[hsl(var(--mn-border))] rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-text))]' : 'bg-[hsl(var(--mn-surface))] text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-muted))]'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`p-2 ${viewMode === 'grouped' ? 'bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-text))]' : 'bg-[hsl(var(--mn-surface))] text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-muted))]'}`}
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>

          {/* Content filter */}
          <button
            onClick={() => setContentOnly(!contentOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              contentOnly 
                ? 'bg-[hsl(var(--mn-accent)/0.1)] text-[hsl(var(--mn-accent))] border-[hsl(var(--mn-accent)/0.3)]' 
                : 'bg-[hsl(var(--mn-surface))] text-[hsl(var(--mn-muted))] border-[hsl(var(--mn-border))]'
            }`}
          >
            {contentOnly ? '✓ Pouze s obsahem' : 'Pouze s obsahem'}
          </button>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] bg-[hsl(var(--mn-surface))] border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(var(--mn-surface))] border-[hsl(var(--mn-border))]">
              <SelectItem value="newest">Nejnovější</SelectItem>
              <SelectItem value="oldest">Nejstarší</SelectItem>
              <SelectItem value="alpha">Abecedně</SelectItem>
              <SelectItem value="obor">Dle oboru</SelectItem>
              <SelectItem value="mastery_asc">Nejslabší první</SelectItem>
              <SelectItem value="mastery_desc">Nejsilnější první</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-[hsl(var(--mn-surface))]/50 border border-[hsl(var(--mn-border))] animate-in slide-in-from-top-2">
            <div className="space-y-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-[hsl(var(--mn-muted))]">Obor</label>
              <Select value={selectedObor} onValueChange={(v) => { setSelectedObor(v); setSelectedOkruh('all'); }}>
                <SelectTrigger className="bg-[hsl(var(--mn-surface-2))] border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))] h-9">
                  <SelectValue placeholder="Všechny obory" />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(var(--mn-surface))] border-[hsl(var(--mn-border))]">
                  <SelectItem value="all">Všechny obory</SelectItem>
                  {obory.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: getOborTheme(o.name).accent }} />
                        {o.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-[hsl(var(--mn-muted))]">Okruh</label>
              <Select value={selectedOkruh} onValueChange={setSelectedOkruh}>
                <SelectTrigger className="bg-[hsl(var(--mn-surface-2))] border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))] h-9">
                  <SelectValue placeholder="Všechny okruhy" />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(var(--mn-surface))] border-[hsl(var(--mn-border))]">
                  <SelectItem value="all">Všechny okruhy</SelectItem>
                  {filteredOkruhy.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeFilters > 0 && (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSearchQuery(''); setSelectedObor('all'); setSelectedOkruh('all'); }}
                  className="text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] h-9"
                >
                  <X className="w-3 h-3 mr-1" />
                  Vymazat filtry
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Content */}
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
            <p className="text-[hsl(var(--mn-muted))] mb-6 max-w-md">
              {activeFilters > 0 ? 'Zkuste změnit nebo vymazat filtry' : 'Zatím nejsou k dispozici žádná témata'}
            </p>
            {activeFilters > 0 && (
              <Button
                variant="outline"
                onClick={() => { setSearchQuery(''); setSelectedObor('all'); setSelectedOkruh('all'); }}
                className="border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))]"
              >
                Vymazat filtry
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleTopics.map(topic => (
                <TopicCard key={topic.id} topic={topic} mastery={masteryMap[topic.id]} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount(v => v + 60)}
                  className="border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))]"
                >
                  Načíst dalších 60 ({filteredTopics.length - visibleCount} zbývá)
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Grouped View */
          <div className="space-y-8">
            {groupedByObor.map(([oborName, topics]) => {
              const theme = getOborTheme(oborName);
              return (
                <div key={oborName}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full" style={{ background: theme.accent }} />
                    <h2 className="text-lg font-semibold text-[hsl(var(--mn-text))]">{oborName}</h2>
                    <Badge variant="outline" className="text-[hsl(var(--mn-muted))] border-[hsl(var(--mn-border))] text-xs">
                      {topics.length}
                    </Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topics.map(topic => (
                      <TopicCard key={topic.id} topic={topic} mastery={masteryMap[topic.id]} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}
