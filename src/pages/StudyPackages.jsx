import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Copy
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

export default function StudyPackages() {
  const [searchQuery, setSearchQuery] = useState('');

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
    </div>
  );
}