import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search,
  Stethoscope,
  ChevronRight,
  Filter,
  GitBranch
} from 'lucide-react';
import { motion } from 'framer-motion';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import VisibilityBadge from '@/components/common/VisibilityBadge';
import { canAccessContent } from '@/components/utils/permissions';

export default function Tools() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list('-created_date')
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list()
  });

  // Filter tools
  const filteredTools = useMemo(() => {
    let filtered = tools;

    // Filter by access
    filtered = filtered.filter(t => canAccessContent(user, t.visibility));

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }

    // Filter by topic
    if (selectedTopic !== 'all') {
      filtered = filtered.filter(t => t.topic_id === selectedTopic);
    }

    return filtered;
  }, [tools, user, searchQuery, selectedTopic]);

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
          Klinické nástroje
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Rozhodovací algoritmy a klinické kalkulátory
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Hledat nástroje..."
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

      {/* Tools grid */}
      {filteredTools.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredTools.map((tool, i) => {
            const topic = topics.find(t => t.id === tool.topic_id);
            const nodeCount = tool.nodes?.length || 0;
            
            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={createPageUrl('ToolDetail') + `?id=${tool.id}`}>
                  <Card className="h-full hover:shadow-lg transition-all hover:border-teal-200 dark:hover:border-teal-800 group">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center flex-shrink-0">
                          <GitBranch className="w-7 h-7 text-purple-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                              {tool.title}
                            </h3>
                            {tool.visibility && tool.visibility !== 'public' && (
                              <VisibilityBadge visibility={tool.visibility} />
                            )}
                          </div>

                          {tool.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                              {tool.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {topic && (
                                <Badge variant="outline" className="text-xs">
                                  {topic.title}
                                </Badge>
                              )}
                              <span className="text-xs text-slate-500">
                                {nodeCount} kroků
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                          </div>
                        </div>
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
          icon={Stethoscope}
          title="Žádné nástroje"
          description={searchQuery ? 'Zkuste upravit vyhledávání' : 'Zatím nejsou k dispozici žádné nástroje'}
        />
      )}
    </div>
  );
}