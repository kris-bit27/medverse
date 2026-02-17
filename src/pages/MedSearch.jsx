import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { callApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search, Sparkles, ExternalLink, BookOpen, Loader2, Users,
  Calendar, FileText, ChevronDown, ChevronUp, ArrowRight,
  Microscope, Brain, Clock, RotateCcw, AlertTriangle
} from 'lucide-react';
import HTMLContent from '@/components/study/HTMLContent';

const EXAMPLE_QUERIES = [
  'Diferenciální diagnostika bolesti na hrudi',
  'Léčba rezistentní hypertenze aktuální guidelines',
  'SGLT2 inhibitory u srdečního selhání evidence',
  'Diagnostika a léčba plicní embolie',
  'Nové biologické léky u astmatu anti-IL5',
  'Screening kolorektálního karcinomu doporučení',
];

function ArticleCard({ article, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-md bg-[hsl(var(--mn-accent)/0.1)] flex items-center justify-center text-xs font-bold text-[hsl(var(--mn-accent))] shrink-0 mt-0.5">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <a href={article.url} target="_blank" rel="noopener noreferrer"
              className="text-sm font-medium text-[hsl(var(--mn-text))] hover:text-[hsl(var(--mn-accent))] transition-colors leading-snug inline-flex items-start gap-1.5">
              {article.title}
              <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 opacity-40" />
            </a>
            
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-[hsl(var(--mn-muted))]">
              {article.authors && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{article.authors}</span>
                </span>
              )}
              {article.journal && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {article.journal}
                </span>
              )}
              {article.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {article.year}
                </span>
              )}
              {article.doi && (
                <a href={`https://doi.org/${article.doi}`} target="_blank" rel="noopener noreferrer"
                  className="hover:text-[hsl(var(--mn-accent))]">
                  DOI
                </a>
              )}
            </div>

            {article.abstract && (
              <>
                <button onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 mt-2 text-xs text-[hsl(var(--mn-accent))] hover:underline">
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {expanded ? 'Skrýt abstrakt' : 'Zobrazit abstrakt'}
                </button>
                {expanded && (
                  <p className="mt-2 text-xs text-[hsl(var(--mn-muted))] leading-relaxed border-l-2 border-[hsl(var(--mn-border))] pl-3">
                    {article.abstract}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MedSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('answer');
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Fetch recent searches from topic context (optional)
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_profiles').select('current_specialization').eq('user_id', user.id).single();
      return data;
    },
    enabled: !!user,
  });

  // PubMed search + AI synthesis
  const searchMutation = useMutation({
    mutationFn: async ({ q, mode }) => {
      return callApi('med-search', { query: q, mode });
    },
    onSuccess: () => {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    },
  });

  const handleSearch = (q, mode = 'answer') => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    searchMutation.mutate({ q: searchQuery, mode });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch(null, 'answer');
  };

  const result = searchMutation.data;
  const articles = result?.articles || [];
  const answer = result?.answer;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3 pt-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-accent-2))] flex items-center justify-center shadow-lg">
          <Microscope className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[hsl(var(--mn-text))]">
            Medicínské vyhledávání
          </h1>
          <p className="text-[hsl(var(--mn-muted))] mt-1">
            PubMed + AI syntéza · Hledej odborné články a získej odpovědi s citacemi
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--mn-muted))]" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Zadej klinickou otázku nebo hledej v PubMed..."
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-[hsl(var(--mn-surface))] border border-[hsl(var(--mn-border))] text-[hsl(var(--mn-text))] placeholder-[hsl(var(--mn-muted))] focus:ring-2 focus:ring-[hsl(var(--mn-accent)/0.3)] focus:border-[hsl(var(--mn-accent)/0.4)] outline-none transition-all"
            />
          </div>
          <Button
            onClick={() => handleSearch(null, 'answer')}
            disabled={!query.trim() || searchMutation.isPending}
            className="h-12 px-5 bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent-2))] text-white gap-2 rounded-xl"
          >
            {searchMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            AI Odpověď
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSearch(null, 'search')}
            disabled={!query.trim() || searchMutation.isPending}
            className="h-12 px-4 rounded-xl gap-2"
          >
            <Search className="w-4 h-4" />
            PubMed
          </Button>
        </div>
      </div>

      {/* Example queries (shown when no results) */}
      {!result && !searchMutation.isPending && (
        <div className="space-y-3">
          <p className="text-xs text-[hsl(var(--mn-muted))] uppercase tracking-wider font-medium">Příklady dotazů</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((q, i) => (
              <button key={i} onClick={() => { setQuery(q); handleSearch(q, 'answer'); }}
                className="px-3 py-2 rounded-lg bg-[hsl(var(--mn-surface-2))] border border-[hsl(var(--mn-border))] text-sm text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-accent))] hover:border-[hsl(var(--mn-accent)/0.3)] transition-colors text-left">
                {q}
              </button>
            ))}
          </div>

          {/* Info cards */}
          <div className="grid sm:grid-cols-3 gap-3 pt-4">
            {[
              { icon: Microscope, title: 'PubMed databáze', desc: '36M+ odborných článků z recenzovaných časopisů' },
              { icon: Brain, title: 'AI syntéza', desc: 'Claude analyzuje abstrakta a vytvoří odpověď s citacemi' },
              { icon: FileText, title: 'Citace', desc: 'Každé tvrzení odkazuje na konkrétní PubMed článek' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <Card key={i}>
                <CardContent className="p-4 text-center">
                  <Icon className="w-6 h-6 text-[hsl(var(--mn-accent))] mx-auto mb-2" />
                  <p className="text-sm font-medium text-[hsl(var(--mn-text))]">{title}</p>
                  <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {searchMutation.isPending && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--mn-accent)/0.1)] flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[hsl(var(--mn-accent))] animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[hsl(var(--mn-text))]">Prohledávám PubMed...</p>
            <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">Stahuju abstrakta a připravuju AI syntézu</p>
          </div>
        </div>
      )}

      {/* Error */}
      {searchMutation.isError && (
        <Card className="border-[hsl(var(--mn-danger)/0.3)]">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[hsl(var(--mn-danger))] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[hsl(var(--mn-text))]">Chyba při vyhledávání</p>
              <p className="text-xs text-[hsl(var(--mn-muted))]">{searchMutation.error?.message || 'Zkuste to znovu'}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleSearch(null, 'answer')} className="ml-auto gap-1.5">
              <RotateCcw className="w-3 h-3" /> Zkusit znovu
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !searchMutation.isPending && (
        <div ref={resultsRef} className="space-y-4">
          {/* Result header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-[hsl(var(--mn-muted))]">
              Nalezeno <strong className="text-[hsl(var(--mn-text))]">{articles.length}</strong> článků pro „{result.query}"
              {result.pubmedQuery && result.pubmedQuery !== result.query && (
                <span className="ml-1 text-[hsl(var(--mn-accent))]">
                  → PubMed: „{result.pubmedQuery}"
                </span>
              )}
            </p>
          </div>

          {/* Tabs */}
          {answer && (
            <div className="flex gap-1 border-b border-[hsl(var(--mn-border))]">
              {[
                { key: 'answer', label: 'AI Odpověď', icon: Sparkles },
                { key: 'articles', label: `Články (${articles.length})`, icon: FileText },
              ].map(tab => (
                <button key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-[hsl(var(--mn-accent))] text-[hsl(var(--mn-accent))]'
                      : 'border-transparent text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))]'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* AI Answer */}
          {(activeTab === 'answer' && answer) && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-[hsl(var(--mn-accent)/0.1)] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[hsl(var(--mn-accent))]" />
                  </div>
                  <span className="text-sm font-semibold text-[hsl(var(--mn-text))]">AI Syntéza</span>
                  <span className="text-[10px] text-[hsl(var(--mn-muted))]">
                    na základě {articles.length} PubMed článků
                  </span>
                </div>

                {/* Disclaimer */}
                <div className="flex items-start gap-2 px-3 py-2 mb-4 rounded-lg bg-[hsl(var(--mn-warn)/0.08)] border border-[hsl(var(--mn-warn)/0.2)]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--mn-warn))] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[hsl(var(--mn-muted))] leading-relaxed">
                    AI odpověď vychází výhradně z PubMed abstrakt zobrazených níže. Může obsahovat nepřesnosti — vždy ověřte v primárních zdrojích.
                  </p>
                </div>

                <div className="prose prose-sm max-w-none">
                  <HTMLContent content={answer} />
                </div>

                {/* Cited articles quick reference */}
                <div className="mt-5 pt-4 border-t border-[hsl(var(--mn-border))]">
                  <p className="text-xs font-semibold text-[hsl(var(--mn-muted))] mb-2 uppercase tracking-wider">
                    Citované zdroje
                  </p>
                  <div className="space-y-1.5">
                    {articles.map((a, i) => (
                      <a key={a.pmid} href={a.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-start gap-2 text-xs text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-accent))] transition-colors">
                        <span className="text-[hsl(var(--mn-accent))] font-bold shrink-0">[{i + 1}]</span>
                        <span className="line-clamp-1">
                          {a.authors && `${a.authors}. `}
                          {a.title}
                          {a.journal && ` ${a.journal}`}
                          {a.year && ` (${a.year})`}
                        </span>
                        <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 opacity-40" />
                      </a>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Articles list */}
          {(activeTab === 'articles' || !answer) && (
            <div className="space-y-3">
              {articles.map((article, i) => (
                <ArticleCard key={article.pmid} article={article} index={i} />
              ))}
              {articles.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-10 h-10 text-[hsl(var(--mn-muted))] mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-[hsl(var(--mn-muted))]">Žádné články nenalezeny</p>
                  <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">Zkuste upravit hledaný výraz</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
