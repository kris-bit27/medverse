import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search as SearchIcon,
  GraduationCap,
  BookOpen,
  Stethoscope,
  ChevronRight
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import DifficultyIndicator from '@/components/ui/DifficultyIndicator';
import { canAccessContent } from '@/components/utils/permissions';

export default function Search() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list()
  });

  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list()
  });

  const { data: tools = [], isLoading: toolsLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list()
  });

  const isLoading = questionsLoading || articlesLoading || toolsLoading;

  // Filter results
  const results = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return { questions: [], articles: [], tools: [] };

    const filteredQuestions = questions
      .filter(q => canAccessContent(user, q.visibility))
      .filter(q => 
        q.title?.toLowerCase().includes(query) ||
        q.question_text?.toLowerCase().includes(query)
      );

    const filteredArticles = articles
      .filter(a => canAccessContent(user, a.visibility))
      .filter(a => 
        a.title?.toLowerCase().includes(query) ||
        a.summary?.toLowerCase().includes(query)
      );

    const filteredTools = tools
      .filter(t => canAccessContent(user, t.visibility))
      .filter(t => 
        t.title?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );

    return {
      questions: filteredQuestions,
      articles: filteredArticles,
      tools: filteredTools
    };
  }, [searchQuery, questions, articles, tools, user]);

  const totalResults = results.questions.length + results.articles.length + results.tools.length;

  // Update URL when search changes
  useEffect(() => {
    if (searchQuery) {
      window.history.replaceState(null, '', createPageUrl('Search') + `?q=${encodeURIComponent(searchQuery)}`);
    }
  }, [searchQuery]);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Search input */}
      <div className="relative mb-8">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
        <Input
          placeholder="Hledat otázky, články, nástroje..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-14 text-lg"
          autoFocus
        />
      </div>

      {isLoading ? (
        <LoadingSpinner size="lg" className="mt-12" />
      ) : searchQuery ? (
        <>
          {/* Results count */}
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {totalResults > 0 
              ? `Nalezeno ${totalResults} výsledků`
              : 'Žádné výsledky'
            }
          </p>

          {totalResults > 0 && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="all">
                  Vše ({totalResults})
                </TabsTrigger>
                <TabsTrigger value="questions">
                  Otázky ({results.questions.length})
                </TabsTrigger>
                <TabsTrigger value="articles">
                  Články ({results.articles.length})
                </TabsTrigger>
                <TabsTrigger value="tools">
                  Nástroje ({results.tools.length})
                </TabsTrigger>
              </TabsList>

              <div className="space-y-4">
                {/* Questions */}
                {(activeTab === 'all' || activeTab === 'questions') && results.questions.length > 0 && (
                  <div>
                    {activeTab === 'all' && (
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5" />
                        Otázky
                      </h3>
                    )}
                    <div className="space-y-2">
                      {results.questions.slice(0, activeTab === 'all' ? 5 : undefined).map(q => (
                        <Link
                          key={q.id}
                          to={createPageUrl('QuestionDetail') + `?id=${q.id}`}
                          className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 transition-colors group"
                        >
                          <GraduationCap className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors truncate">
                              {q.title}
                            </p>
                            <DifficultyIndicator level={q.difficulty || 1} showLabel={false} />
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Articles */}
                {(activeTab === 'all' || activeTab === 'articles') && results.articles.length > 0 && (
                  <div>
                    {activeTab === 'all' && (
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Články
                      </h3>
                    )}
                    <div className="space-y-2">
                      {results.articles.slice(0, activeTab === 'all' ? 5 : undefined).map(a => (
                        <Link
                          key={a.id}
                          to={createPageUrl('ArticleDetail') + `?id=${a.id}`}
                          className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 transition-colors group"
                        >
                          <BookOpen className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors truncate">
                              {a.title}
                            </p>
                            {a.summary && (
                              <p className="text-sm text-slate-500 truncate">{a.summary}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools */}
                {(activeTab === 'all' || activeTab === 'tools') && results.tools.length > 0 && (
                  <div>
                    {activeTab === 'all' && (
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Stethoscope className="w-5 h-5" />
                        Nástroje
                      </h3>
                    )}
                    <div className="space-y-2">
                      {results.tools.slice(0, activeTab === 'all' ? 5 : undefined).map(t => (
                        <Link
                          key={t.id}
                          to={createPageUrl('ToolDetail') + `?id=${t.id}`}
                          className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 transition-colors group"
                        >
                          <Stethoscope className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors truncate">
                              {t.title}
                            </p>
                            {t.description && (
                              <p className="text-sm text-slate-500 truncate">{t.description}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Tabs>
          )}

          {totalResults === 0 && (
            <EmptyState
              icon={SearchIcon}
              title="Nic nenalezeno"
              description="Zkuste jiný hledaný výraz"
            />
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <SearchIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            Začněte psát pro vyhledávání
          </p>
        </div>
      )}
    </div>
  );
}