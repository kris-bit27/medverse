import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search,
  BookOpen,
  Clock,
  ChevronRight,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import VisibilityBadge from '@/components/common/VisibilityBadge';
import { canAccessContent } from '@/components/utils/permissions';

export default function Articles() {
  const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.items)) return value.items;
    return [];
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; }
  });

  const { data: articlesRaw, isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => supabase.from('articles').select('*').order('created_at', { ascending: false }).then(r => r.data || [])
  });
  const articles = useMemo(() => asArray(articlesRaw), [articlesRaw]);

  const { data: topicsRaw } = useQuery({
    queryKey: ['topics'],
    queryFn: () => supabase.from('topics').select('*').then(r => r.data || [])
  });
  const topics = useMemo(() => asArray(topicsRaw), [topicsRaw]);

  // Filter articles
  const filteredArticles = useMemo(() => {
    let filtered = articles;

    // Filter by access
    filtered = filtered.filter(a => canAccessContent(user, a.visibility));

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.title?.toLowerCase().includes(query) ||
        a.summary?.toLowerCase().includes(query)
      );
    }

    // Filter by topic
    if (selectedTopic !== 'all') {
      filtered = filtered.filter(a => a.topic_id === selectedTopic);
    }

    return filtered;
  }, [articles, user, searchQuery, selectedTopic]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Články
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Klinické přehledy a doporučené postupy
        </p>
      </div>

      {/* Filters */}
      <motion.div 
        className="flex flex-col sm:flex-row gap-4 mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
          <Input
            placeholder="Hledat články..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 focus:ring-2 focus:ring-teal-500 transition-all"
          />
        </div>
        <Select value={selectedTopic} onValueChange={setSelectedTopic}>
          <SelectTrigger className="w-full sm:w-[220px] hover:border-teal-300 dark:hover:border-teal-700 transition-colors">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Téma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechna témata</SelectItem>
            {topics.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Articles grid */}
      {filteredArticles.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article, i) => {
            const topic = topics.find(t => t.id === article.topic_id);
            
            return (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={createPageUrl('ArticleDetail') + `?id=${article.id}`}>
                  <Card className="h-full hover:shadow-xl hover:-translate-y-2 transition-all duration-300 hover:border-teal-300 dark:hover:border-teal-700 group cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                          <BookOpen className="w-7 h-7 text-blue-600 group-hover:text-blue-700 transition-colors" />
                        </div>
                        {article.visibility && article.visibility !== 'public' && (
                          <VisibilityBadge visibility={article.visibility} />
                        )}
                      </div>

                      <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-3 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2 leading-snug">
                        {article.title}
                      </h3>

                      {article.summary && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3 leading-relaxed">
                          {article.summary}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-4 border-t dark:border-slate-700 group-hover:border-teal-200 dark:group-hover:border-teal-800 transition-colors">
                        <div className="flex items-center gap-2 flex-wrap">
                          {topic && (
                            <Badge variant="outline" className="text-xs group-hover:border-teal-300 dark:group-hover:border-teal-700 transition-colors">
                              {topic.title}
                            </Badge>
                          )}
                          {article.read_time_minutes && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {article.read_time_minutes} min
                            </span>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Žádné články"
          description={searchQuery ? 'Zkuste upravit vyhledávání' : 'Zatím nejsou k dispozici žádné články'}
        />
      )}
    </div>
  );
}
