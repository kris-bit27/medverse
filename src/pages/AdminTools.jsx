import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
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
  Stethoscope
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import VisibilityBadge from '@/components/common/VisibilityBadge';
import EmptyState from '@/components/common/EmptyState';

export default function AdminTools() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: () => supabase.from('clinical_tools').select('*').order('created_at', { ascending: false }).then(r => r.data || [])
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => supabase.from('topics').select('*').then(r => r.data || [])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.from('clinical_tools').delete().eq('id', id),
    onSuccess: () => queryClient.invalidateQueries(['tools'])
  });

  const filteredTools = useMemo(() => {
    if (!searchQuery) return tools;
    const query = searchQuery.toLowerCase();
    return tools.filter(t => 
      t.title?.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  }, [tools, searchQuery]);

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
          <h1 className="text-2xl font-bold text-[hsl(var(--mn-text))] mb-1">
            Nástroje
          </h1>
          <p className="text-[hsl(var(--mn-muted))]">{tools.length} celkem</p>
        </div>
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link to={createPageUrl('AdminToolEdit')}>
            <Plus className="w-4 h-4 mr-2" />
            Nový nástroj
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--mn-muted))]" />
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
      ) : filteredTools.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Název</TableHead>
                <TableHead>Kroky</TableHead>
                <TableHead>Viditelnost</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTools.map((tool) => (
                <TableRow key={tool.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-[hsl(var(--mn-text))] line-clamp-1">
                        {tool.title}
                      </p>
                      {tool.description && (
                        <p className="text-xs text-[hsl(var(--mn-muted))] line-clamp-1">{tool.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tool.nodes?.length || 0} kroků</Badge>
                  </TableCell>
                  <TableCell>
                    <VisibilityBadge visibility={tool.visibility} />
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
                          <Link to={createPageUrl('ToolDetail') + `?id=${tool.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            Zobrazit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('AdminToolEdit') + `?id=${tool.id}`}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Upravit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => {
                            if (confirm('Opravdu smazat tento nástroj?')) {
                              deleteMutation.mutate(tool.id);
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
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <EmptyState
          icon={Stethoscope}
          title="Žádné nástroje"
          description="Zatím nejsou vytvořeny žádné nástroje"
          action="Vytvořit nástroj"
          onAction={() => window.location.href = createPageUrl('AdminToolEdit')}
        />
      )}
    </div>
  );
}