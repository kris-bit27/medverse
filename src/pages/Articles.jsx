import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-created_date')
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list()
  });

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
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Hledat články..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedTopic} onValueChange={setSelectedTopic}>
          <SelectTrigger className="w-full sm:w-[200px]">
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
      </div>

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
                  <Card className="h-full hover:shadow-lg transition-all hover:border-teal-200 dark:hover:border-teal-800 group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-6 h-6 text-blue-600" />
                        </div>
                        {article.visibility && article.visibility !== 'public' && (
                          <VisibilityBadge visibility={article.visibility} />
                        )}
                      </div>

                      <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2">
                        {article.title}
                      </h3>

                      {article.summary && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
                          {article.summary}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-4 border-t dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          {topic && (
                            <Badge variant="outline" className="text-xs">
                              {topic.title}
                            </Badge>
                          )}
                          {article.read_time_minutes && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {article.read_time_minutes} min
                            </span>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
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