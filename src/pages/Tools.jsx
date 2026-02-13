import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search,
  Stethoscope,
  ChevronRight,
  Filter,
  GitBranch,
  Brain,
  Pill
} from 'lucide-react';
import { motion } from 'framer-motion';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import VisibilityBadge from '@/components/common/VisibilityBadge';
import { canAccessContent } from '@/components/utils/permissions';
import DifferentialDiagnosisAI from '@/components/tools/DifferentialDiagnosisAI';
import TreatmentPlannerAI from '@/components/tools/TreatmentPlannerAI';

export default function Tools() {
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

  const { data: toolsRaw, isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: () => supabase.from('clinical_tools').select('*').order('created_at', { ascending: false }).then(r => r.data || [])
  });
  const tools = useMemo(() => asArray(toolsRaw), [toolsRaw]);

  const { data: topicsRaw } = useQuery({
    queryKey: ['topics'],
    queryFn: () => supabase.from('topics').select('*').then(r => r.data || [])
  });
  const topics = useMemo(() => asArray(topicsRaw), [topicsRaw]);

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
          AI asistenti, rozhodovací algoritmy a klinické kalkulátory
        </p>
      </div>

      <Tabs defaultValue="ai" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <TabsTrigger value="ai" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md transition-all">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">AI Asistenti</span>
            <span className="sm:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger value="algorithms" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md transition-all">
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">Algoritmy</span>
            <span className="sm:hidden">Algo</span>
          </TabsTrigger>
          <TabsTrigger value="cases" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md transition-all">
            <Stethoscope className="w-4 h-4" />
            <span className="hidden sm:inline">Moje případy</span>
            <span className="sm:hidden">Případy</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-8">
          <motion.div 
            className="grid md:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-teal-200 dark:border-teal-800 hover:border-teal-300 dark:hover:border-teal-700 cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30 group-hover:scale-110 transition-transform">
                      <Brain className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2">
                        Diferenciální diagnóza
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        AI asistent pro vytvoření seznamu možných diagnóz na základě symptomů
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                      <Pill className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2">
                        Léčebný plán
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        AI návrh komplexního léčebného plánu dle aktuálních doporučení
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          <Tabs defaultValue="differential" className="space-y-6">
            <TabsList>
              <TabsTrigger value="differential">
                <Brain className="w-4 h-4 mr-2" />
                Diferenciální diagnóza
              </TabsTrigger>
              <TabsTrigger value="treatment">
                <Pill className="w-4 h-4 mr-2" />
                Léčebný plán
              </TabsTrigger>
            </TabsList>

            <TabsContent value="differential">
              <DifferentialDiagnosisAI />
            </TabsContent>

            <TabsContent value="treatment">
              <TreatmentPlannerAI />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="algorithms">
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
        </TabsContent>

        <TabsContent value="cases">
          <SavedCases />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SavedCases() {
  const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.items)) return value.items;
    return [];
  };

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; }
  });

  const { data: casesRaw, isLoading } = useQuery({
    queryKey: ['savedCases', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('case_logs').select('*')
        .eq('user_id', user?.id)
        .in('case_type', ['ai_differential', 'ai_treatment'])
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id
  });
  const cases = useMemo(() => asArray(casesRaw), [casesRaw]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (cases.length === 0) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="Žádné uložené případy"
        description="Vytvořte diferenciální diagnózu nebo léčebný plán a uložte si je pro pozdější referenci"
      />
    );
  }

  return (
    <div className="space-y-4">
      {cases.map((caseLog, i) => {
        const isAIDifferential = caseLog.case_type === 'ai_differential';
        const IconComponent = isAIDifferential ? Brain : Pill;
        const bgColor = isAIDifferential 
          ? 'from-teal-500 to-cyan-600' 
          : 'from-purple-500 to-pink-600';

        return (
          <motion.div
            key={caseLog.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${bgColor} flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                        {caseLog.title}
                      </h3>
                      <Badge variant="outline">
                        {isAIDifferential ? 'Diferenciální DG' : 'Léčebný plán'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      <strong>Dotaz:</strong> {caseLog.initial_query}
                    </p>
                    {caseLog.tags && caseLog.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {caseLog.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
