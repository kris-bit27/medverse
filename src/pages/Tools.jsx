
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
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
          AI asistenti, rozhodovací algoritmy a klinické kalkulátory
        </p>
      </div>

      <Tabs defaultValue="ai" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Asistenti
          </TabsTrigger>
          <TabsTrigger value="algorithms" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Algoritmy
          </TabsTrigger>
          <TabsTrigger value="cases" className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            Moje případy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow border-2 border-teal-200 dark:border-teal-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-1">
                      Diferenciální diagnóza
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      AI asistent pro vytvoření seznamu možných diagnóz na základě symptomů
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-2 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <Pill className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-1">
                      Léčebný plán
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      AI návrh komplexního léčebného plánu dle aktuálních doporučení
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['savedCases', user?.id],
    queryFn: () => base44.entities.CaseLog.filter({ 
      user_id: user?.id,
      case_type: { $in: ['ai_differential', 'ai_treatment'] }
    }, '-created_date'),
    enabled: !!user?.id
  });

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
