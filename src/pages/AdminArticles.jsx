import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ChevronLeft,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  BookOpen
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import VisibilityBadge from '@/components/common/VisibilityBadge';
import EmptyState from '@/components/common/EmptyState';

export default function AdminArticles() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-created_date')
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Article.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['articles'])
  });

  const filteredArticles = useMemo(() => {
    if (!searchQuery) return articles;
    const query = searchQuery.toLowerCase();
    return articles.filter(a => 
      a.title?.toLowerCase().includes(query) ||
      a.summary?.toLowerCase().includes(query)
    );
  }, [articles, searchQuery]);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" asChild>
          <Link to={createPageUrl('Admin')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Zpět
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Články
          </h1>
          <p className="text-slate-500">{articles.length} celkem</p>
        </div>
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link to={createPageUrl('AdminArticleEdit')}>
            <Plus className="w-4 h-4 mr-2" />
            Nový článek
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Hledat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner size="lg" className="mt-12" />
      ) : filteredArticles.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Název</TableHead>
                <TableHead>Téma</TableHead>
                <TableHead>Viditelnost</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArticles.map((article) => {
                const topic = topics.find(t => t.id === article.topic_id);
                return (
                  <TableRow key={article.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white line-clamp-1">
                          {article.title}
                        </p>
                        {article.summary && (
                          <p className="text-xs text-slate-500 line-clamp-1">{article.summary}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{topic?.title || '-'}</Badge>
                    </TableCell>
                    <TableCell>
                      <VisibilityBadge visibility={article.visibility} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl('ArticleDetail') + `?id=${article.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Zobrazit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl('AdminArticleEdit') + `?id=${article.id}`}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Upravit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              if (confirm('Opravdu smazat tento článek?')) {
                                deleteMutation.mutate(article.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Smazat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Žádné články"
          description="Zatím nejsou vytvořeny žádné články"
          action="Vytvořit článek"
          onAction={() => window.location.href = createPageUrl('AdminArticleEdit')}
        />
      )}
    </div>
  );
}