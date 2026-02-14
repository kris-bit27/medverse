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

/* ─── Obor color palette ─── */
const OBOR_COLORS = {
  'Chirurgie': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', accent: '#ef4444' },
  'Vnitřní lékařství': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', accent: '#3b82f6' },
  'Neurologie': { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', accent: '#a855f7' },
  'Pediatrie': { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', accent: '#22c55e' },
  'Anesteziologie a intenzivní medicína': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', accent: '#f97316' },
  'Gynekologie a porodnictví': { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', accent: '#ec4899' },
  'Interna': { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', accent: '#06b6d4' },
};

const getOborTheme = (name) => OBOR_COLORS[name] || { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', accent: '#64748b' };

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
          <div className={`w-2 h-2 rounded-full transition-all ${d.has ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-300 dark:bg-slate-600'}`} />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            {d.label}: {d.has ? '✓' : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Topic Card ─── */
function TopicCard({ topic }) {
  const theme = getOborTheme(topic.obory?.name);
  const wordCount = topic.full_text_content ? Math.round(topic.full_text_content.split(/\s+/).length) : 0;
  const readTime = Math.max(1, Math.round(wordCount / 200));

  return (
    <Link to={`${createPageUrl('TopicDetailV2')}?id=${topic.id}`}>
      <div className={`group relative rounded-xl border ${theme.border} bg-white dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/20 hover:-translate-y-0.5 overflow-hidden`}>
        {/* Top accent bar */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${theme.accent}, transparent)` }} />
        
        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <Badge variant="outline" className={`text-[11px] ${theme.text} ${theme.border} ${theme.bg} border`}>
              {topic.obory?.name}
            </Badge>
            <ContentDots topic={topic} />
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 mb-1.5 group-hover:text-white transition-colors line-clamp-2">
            {topic.title}
          </h3>

          {/* Okruh */}
          <p className="text-xs text-slate-500 mb-3">
            {topic.okruhy?.name}
          </p>

          {/* Description */}
          {topic.description && (
            <p className="text-sm text-slate-400 mb-4 line-clamp-2 leading-relaxed">
              {topic.description}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {topic.ai_model && (
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500/70" />
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
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Stat Card ─── */
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800`}>
      <div className={`p-2 rounded-lg ${accent || 'bg-slate-100 dark:bg-slate-800'}`}>
        <Icon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
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
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch topics
  const { data: allTopics = [], isLoading } = useQuery({
    queryKey: ['topics-v3'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select(`
          *,
          obory:obor_id(id, name, slug, color),
          okruhy:okruh_id(id, name, slug)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
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
    }

    return filtered;
  }, [allTopics, searchQuery, selectedObor, selectedOkruh, sortBy]);

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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-6 h-6 text-teal-400" />
              <h1 className="text-2xl font-bold text-white tracking-tight">Studium</h1>
            </div>
            <p className="text-sm text-slate-400">
              {stats.total} témat • {stats.withFulltext} s plným textem • {stats.oboryCount} oborů
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={BookOpen} label="Celkem témat" value={stats.total} accent="bg-teal-500/20" />
          <StatCard icon={FileText} label="S fulltextem" value={stats.withFulltext} accent="bg-emerald-500/20" />
          <StatCard icon={Target} label="Oborů" value={stats.oboryCount} accent="bg-amber-500/20" />
          <StatCard icon={Filter} label="Zobrazeno" value={stats.filtered} accent="bg-blue-500/20" />
        </div>

        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Hledat témata, obory, okruhy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-50 dark:bg-slate-900/70 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-500 focus:border-teal-500/50 focus:ring-teal-500/20"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`gap-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 ${showFilters ? 'border-teal-500/50 text-teal-300' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtry
            {activeFilters > 0 && (
              <Badge className="bg-teal-500 text-white text-[10px] px-1.5 py-0 ml-1">
                {activeFilters}
              </Badge>
            )}
          </Button>

          {/* View toggle */}
          <div className="flex border border-slate-300 dark:border-slate-700 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'bg-slate-50 dark:bg-slate-900/70 text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`p-2 ${viewMode === 'grouped' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'bg-slate-50 dark:bg-slate-900/70 text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] bg-slate-50 dark:bg-slate-900/70 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
              <SelectItem value="newest">Nejnovější</SelectItem>
              <SelectItem value="oldest">Nejstarší</SelectItem>
              <SelectItem value="alpha">Abecedně</SelectItem>
              <SelectItem value="obor">Dle oboru</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2">
            <div className="space-y-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-slate-400">Obor</label>
              <Select value={selectedObor} onValueChange={(v) => { setSelectedObor(v); setSelectedOkruh('all'); }}>
                <SelectTrigger className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 h-9">
                  <SelectValue placeholder="Všechny obory" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
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
              <label className="text-xs font-medium text-slate-400">Okruh</label>
              <Select value={selectedOkruh} onValueChange={setSelectedOkruh}>
                <SelectTrigger className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 h-9">
                  <SelectValue placeholder="Všechny okruhy" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
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
                  className="text-slate-400 hover:text-white h-9"
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
              <div className="w-10 h-10 border-3 border-slate-300 dark:border-slate-700 border-t-teal-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Načítám témata...</p>
            </div>
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="w-16 h-16 text-slate-700 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Žádná témata nenalezena</h3>
            <p className="text-slate-500 mb-6 max-w-md">
              {activeFilters > 0 ? 'Zkuste změnit nebo vymazat filtry' : 'Zatím nejsou k dispozici žádná témata'}
            </p>
            {activeFilters > 0 && (
              <Button
                variant="outline"
                onClick={() => { setSearchQuery(''); setSelectedObor('all'); setSelectedOkruh('all'); }}
                className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Vymazat filtry
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTopics.map(topic => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
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
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{oborName}</h2>
                    <Badge variant="outline" className="text-slate-500 border-slate-300 dark:border-slate-700 text-xs">
                      {topics.length}
                    </Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topics.map(topic => (
                      <TopicCard key={topic.id} topic={topic} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
