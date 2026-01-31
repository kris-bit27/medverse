import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package,
  Plus,
  Search,
  Clock,
  BookOpen,
  HelpCircle,
  Wrench,
  Users,
  Lock,
  Sparkles,
  TrendingUp,
  Copy,
  Upload,
  Loader2,
  FileText,
  FileCheck
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import HTMLContent from '@/components/study/HTMLContent';
import { toast } from 'sonner';
import { isAdmin } from '@/components/utils/permissions';

export default function StudyPackages() {
  const [searchQuery, setSearchQuery] = useState('');
  const [aiTitle, setAiTitle] = useState('');
  const [aiFocus, setAiFocus] = useState('');
  const [aiFile, setAiFile] = useState(null);
  const [processMode, setProcessMode] = useState('FULLTEXT');
  const [selectedPackId, setSelectedPackId] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicOkruhId, setTopicOkruhId] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: myPackages = [], isLoading: loadingMy } = useQuery({
    queryKey: ['myStudyPackages', user?.id],
    queryFn: () => base44.entities.StudyPackage.filter({ created_by: user.email }),
    enabled: !!user
  });

  const { data: sharedPackages = [], isLoading: loadingShared } = useQuery({
    queryKey: ['sharedStudyPackages', user?.id],
    queryFn: async () => {
      const all = await base44.entities.StudyPackage.list();
      return all.filter(p => 
        (p.shared_with?.includes(user.id) || 
         p.collaborators?.some(c => c.user_id === user.id)) && 
        p.created_by !== user.email
      );
    },
    enabled: !!user
  });

  const { data: publicPackages = [], isLoading: loadingPublic } = useQuery({
    queryKey: ['publicStudyPackages'],
    queryFn: () => base44.entities.StudyPackage.filter({ is_public: true })
  });

  const { data: disciplines = [] } = useQuery({
    queryKey: ['clinicalDisciplines'],
    queryFn: () => base44.entities.ClinicalDiscipline.list()
  });

  const { data: okruhy = [] } = useQuery({
    queryKey: ['okruhy'],
    queryFn: () => base44.entities.Okruh.list('title'),
    enabled: !!user && isAdmin(user)
  });

  const { data: aiPacks = [], refetch: refetchAiPacks } = useQuery({
    queryKey: ['aiStudyPacks', user?.id],
    queryFn: async () => {
      const all = await base44.entities.StudyPack.filter({ user_id: user.id }, '-created_date');
      return all || [];
    },
    enabled: !!user
  });

  const { data: aiPackDetail, refetch: refetchAiPackDetail } = useQuery({
    queryKey: ['aiStudyPack', selectedPackId],
    queryFn: async () => {
      const pack = await base44.entities.StudyPack.filter({ id: selectedPackId }).then(r => r[0]);
      if (!pack) return { pack: null, outputs: [], files: [] };
      const outputs = await base44.entities.StudyPackOutput.filter({ pack_id: selectedPackId });
      const files = await base44.entities.StudyPackFile.filter({ pack_id: selectedPackId });
      return { pack, outputs, files };
    },
    enabled: !!selectedPackId,
    refetchInterval: (data) => {
      if (!data?.pack) return false;
      return ['READY', 'ERROR'].includes(data.pack.status) ? false : 5000;
    }
  });

  useEffect(() => {
    if (!selectedPackId && aiPacks.length > 0) {
      setSelectedPackId(aiPacks[0].id);
    }
  }, [aiPacks, selectedPackId]);

  const processMutation = useMutation({
    mutationFn: async () => {
      return base44.functions.invoke('processStudyPack', {
        packId: selectedPackId,
        mode: processMode
      });
    },
    onSuccess: () => {
      toast.success('Zpracování spuštěno');
      refetchAiPackDetail();
    },
    onError: (error) => {
      console.error(error);
      toast.error('Zpracování se nepodařilo spustit');
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Uživatel není přihlášen');
      }
      if (!aiTitle.trim()) {
        throw new Error('Vyplňte název');
      }
      if (!aiFile) {
        throw new Error('Vyberte soubor');
      }
      if (aiFile.size > 10 * 1024 * 1024) {
        throw new Error('Soubor je příliš velký (max 10MB)');
      }
      const { file_url } = await base44.integrations.Core.UploadFile({ file: aiFile });
      const pack = await base44.entities.StudyPack.create({
        user_id: user.id,
        title: aiTitle.trim(),
        status: 'UPLOADED',
        topic_focus: aiFocus.trim() || null
      });
      await base44.entities.StudyPackFile.create({
        pack_id: pack.id,
        filename: aiFile.name,
        mime_type: aiFile.type,
        size_bytes: aiFile.size,
        storage_url: file_url
      });
      return pack;
    },
    onSuccess: (pack) => {
      toast.success('Soubor nahrán');
      setAiTitle('');
      setAiFocus('');
      setAiFile(null);
      setSelectedPackId(pack.id);
      refetchAiPacks();
    },
    onError: (error) => {
      toast.error(error.message || 'Nahrání se nepodařilo');
    }
  });

  const saveTopicMutation = useMutation({
    mutationFn: async () => {
      if (!topicTitle.trim() || !topicOkruhId) {
        throw new Error('Vyplňte název a okruh');
      }
      const fullOutput = (aiPackDetail?.outputs || []).find(o => o.mode === 'FULLTEXT');
      const highOutput = (aiPackDetail?.outputs || []).find(o => o.mode === 'HIGH_YIELD');
      return base44.entities.Topic.create({
        title: topicTitle.trim(),
        okruh_id: topicOkruhId,
        full_text_content: fullOutput?.content_html || '',
        bullet_points_summary: highOutput?.content_html || ''
      });
    },
    onSuccess: () => {
      toast.success('Téma vytvořeno');
      setSaveDialogOpen(false);
      setTopicTitle('');
      setTopicOkruhId('');
    },
    onError: (error) => {
      toast.error(error.message || 'Uložení se nepodařilo');
    }
  });

  const getDisciplineName = (id) => {
    return disciplines.find(d => d.id === id)?.name || 'Neurčeno';
  };

  const filterPackages = (packages) => {
    if (!searchQuery) return packages;
    return packages.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const PackageCard = ({ pkg, showActions = false }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2 mb-1">
              {pkg.is_ai_generated && (
                <Sparkles className="w-4 h-4 text-purple-500" />
              )}
              {pkg.title}
            </CardTitle>
            <CardDescription className="text-sm line-clamp-2">
              {pkg.description}
            </CardDescription>
          </div>
          <div className="flex gap-1 ml-2">
            {pkg.is_public ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                Veřejný
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Soukromý
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <HelpCircle className="w-4 h-4" />
              {pkg.question_ids?.length || 0} otázek
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              {pkg.article_ids?.length || 0} článků
            </span>
            <span className="flex items-center gap-1">
              <Wrench className="w-4 h-4" />
              {pkg.tool_ids?.length || 0} nástrojů
            </span>
          </div>

          {pkg.clinical_discipline_id && (
            <Badge variant="outline" className="text-xs">
              {getDisciplineName(pkg.clinical_discipline_id)}
            </Badge>
          )}

          {pkg.estimated_hours && (
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              ~{pkg.estimated_hours}h studia
            </div>
          )}

          {pkg.tags && pkg.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {pkg.tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button asChild className="flex-1 bg-teal-600 hover:bg-teal-700">
              <Link to={createPageUrl('StudyPackageDetail') + `?id=${pkg.id}`}>
                Zobrazit detail
              </Link>
            </Button>
            {showActions && pkg.is_public && (
              <Button variant="outline" size="icon" title="Zkopírovat balíček">
                <Copy className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const aiPackOutputs = aiPackDetail?.outputs || [];
  const fullOutput = aiPackOutputs.find(o => o.mode === 'FULLTEXT');
  const highOutput = aiPackOutputs.find(o => o.mode === 'HIGH_YIELD');

  const statusLabel = (status) => {
    switch (status) {
      case 'UPLOADED':
        return { label: 'Nahráno', variant: 'secondary' };
      case 'CHUNKED':
        return { label: 'Zpracování', variant: 'outline' };
      case 'GENERATED':
        return { label: 'Generováno', variant: 'outline' };
      case 'READY':
        return { label: 'Hotovo', variant: 'default' };
      case 'ERROR':
        return { label: 'Chyba', variant: 'destructive' };
      default:
        return { label: status || 'Neznámý', variant: 'outline' };
    }
  };

  const parseCitations = (value) => {
    if (!value) return [];
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value;
  };

  const citations = parseCitations(fullOutput?.citations_json || highOutput?.citations_json);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-teal-600" />
            Studijní balíčky
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Kurátorované kolekce materiálů pro efektivní studium
          </p>
        </div>
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link to={createPageUrl('StudyPackageCreate')}>
            <Plus className="w-4 h-4 mr-2" />
            Vytvořit balíček
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Hledat balíčky..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* AI Study Pack */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                AI Study Pack
              </CardTitle>
              <CardDescription>
                Nahrajte text/PDF a nechte si vytvořit plný text i high-yield shrnutí.
              </CardDescription>
            </div>
            {aiPackDetail?.pack && (
              <Badge variant={statusLabel(aiPackDetail.pack.status).variant}>
                {statusLabel(aiPackDetail.pack.status).label}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Název balíčku</label>
                <Input
                  value={aiTitle}
                  onChange={(e) => setAiTitle(e.target.value)}
                  placeholder="Např. Aorta – přehled"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Co přesně zpracovat (fokus)</label>
                <Input
                  value={aiFocus}
                  onChange={(e) => setAiFocus(e.target.value)}
                  placeholder="Např. Akutní appendicitida"
                />
                <div className="text-xs text-slate-500">
                  AI vyfiltruje relevantní části z dokumentu.
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Soubor (PDF, TXT, MD)</label>
                <Input
                  type="file"
                  accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
                  onChange={(e) => setAiFile(e.target.files?.[0] || null)}
                />
                {aiFile && (
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {aiFile.name}
                  </div>
                )}
              </div>
              <Button
                className="w-full bg-teal-600 hover:bg-teal-700"
                disabled={uploadMutation.isPending}
                onClick={() => uploadMutation.mutate()}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Nahrávám...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Nahrát a vytvořit balíček
                  </>
                )}
              </Button>

              <div className="space-y-2 pt-4 border-t">
                <div className="text-sm font-medium">Moje AI balíčky</div>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {aiPacks.length === 0 && (
                    <div className="text-sm text-slate-500">Zatím žádné balíčky</div>
                  )}
                  {aiPacks.map((pack) => (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => setSelectedPackId(pack.id)}
                      className={`w-full text-left p-2 rounded-md border transition ${
                        selectedPackId === pack.id
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="text-sm font-medium">{pack.title}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <FileCheck className="w-3 h-3" />
                        {statusLabel(pack.status).label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {!aiPackDetail?.pack ? (
                <div className="border rounded-lg p-6 text-sm text-slate-500">
                  Vyberte balíček pro zobrazení výstupů.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => processMutation.mutate()}
                      disabled={processMutation.isPending || aiPackDetail.pack.status === 'READY'}
                    >
                      {processMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Zpracovávám...
                        </>
                      ) : (
                        'Spustit zpracování'
                      )}
                    </Button>
                    <Tabs value={processMode} onValueChange={setProcessMode} className="ml-2">
                      <TabsList>
                        <TabsTrigger value="FULLTEXT">Plný text</TabsTrigger>
                        <TabsTrigger value="HIGH_YIELD">High-yield</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    {processMode === 'HIGH_YIELD' && (
                      <div className="text-xs text-slate-500">
                        High-yield se generuje z plného textu (může trvat déle).
                      </div>
                    )}
                    {isAdmin(user) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTopicTitle(aiPackDetail.pack.title || '');
                          setSaveDialogOpen(true);
                        }}
                        disabled={!fullOutput}
                      >
                        Uložit jako téma
                      </Button>
                    )}
                  </div>

                  <Tabs defaultValue="full">
                    <TabsList>
                      <TabsTrigger value="full">Plný text</TabsTrigger>
                      <TabsTrigger value="high">High-yield</TabsTrigger>
                    </TabsList>
                    <TabsContent value="full" className="mt-4">
                      {fullOutput ? (
                        <HTMLContent content={fullOutput.content_html || ''} />
                      ) : (
                        <div className="text-sm text-slate-500">Zatím bez výstupu.</div>
                      )}
                    </TabsContent>
                    <TabsContent value="high" className="mt-4">
                      {highOutput ? (
                        <HTMLContent content={highOutput.content_html || ''} />
                      ) : (
                        <div className="text-sm text-slate-500">Zatím bez výstupu.</div>
                      )}
                    </TabsContent>
                  </Tabs>

                  {citations.length > 0 && (
                    <details className="border rounded-md p-4">
                      <summary className="cursor-pointer font-medium">Citace</summary>
                      <div className="mt-3 space-y-3 text-sm">
                        {citations.map((c, idx) => (
                          <div key={idx} className="border rounded-md p-3">
                            <div className="font-medium">{c.sectionTitle}</div>
                            <div className="text-xs text-slate-500">
                              Chunky: {(c.chunkIds || []).join(', ')}
                            </div>
                            {(c.quoteSnippets || []).length > 0 && (
                              <ul className="list-disc pl-5 mt-2">
                                {c.quoteSnippets.map((q, qIdx) => (
                                  <li key={qIdx}>{q}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="my">
        <TabsList>
          <TabsTrigger value="my">Moje balíčky</TabsTrigger>
          <TabsTrigger value="shared">Sdílené se mnou</TabsTrigger>
          <TabsTrigger value="public">Veřejné balíčky</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-6">
          {loadingMy ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filterPackages(myPackages).length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterPackages(myPackages).map(pkg => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Package}
              title="Zatím nemáte žádné balíčky"
              description="Vytvořte si první studijní balíček nebo požádejte AI Copilota o pomoc"
              action={
                <Button asChild className="bg-teal-600 hover:bg-teal-700">
                  <Link to={createPageUrl('StudyPackageCreate')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Vytvořit balíček
                  </Link>
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="shared" className="mt-6">
          {loadingShared ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filterPackages(sharedPackages).length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterPackages(sharedPackages).map(pkg => (
                <PackageCard key={pkg.id} pkg={pkg} showActions />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="Žádné sdílené balíčky"
              description="Zde se zobrazí balíčky, které s vámi sdíleli ostatní uživatelé"
            />
          )}
        </TabsContent>

        <TabsContent value="public" className="mt-6">
          {loadingPublic ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filterPackages(publicPackages).length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterPackages(publicPackages).map(pkg => (
                <PackageCard key={pkg.id} pkg={pkg} showActions />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="Zatím žádné veřejné balíčky"
              description="Buďte první, kdo vytvoří a sdílí studijní balíček s komunitou"
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Uložit jako téma</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Název tématu</label>
              <Input value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Okruh</label>
              <Select value={topicOkruhId} onValueChange={setTopicOkruhId}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte okruh" />
                </SelectTrigger>
                <SelectContent>
                  {okruhy.map((okruh) => (
                    <SelectItem key={okruh.id} value={okruh.id}>
                      {okruh.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => saveTopicMutation.mutate()}
              disabled={saveTopicMutation.isPending}
            >
              {saveTopicMutation.isPending ? 'Ukládám...' : 'Uložit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
