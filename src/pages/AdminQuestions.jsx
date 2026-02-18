import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  CheckSquare,
  Square
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import DifficultyIndicator from '@/components/ui/DifficultyIndicator';
import VisibilityBadge from '@/components/common/VisibilityBadge';
import { canEditContent } from '@/components/utils/permissions';

export default function AdminQuestions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOkruh, setFilterOkruh] = useState('all');
  const [filterVisibility, setFilterVisibility] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const queryClient = useQueryClient();

  const { user } = useAuth();

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: () => supabase.from('questions').select('*').order('created_at', { ascending: false }).then(r => r.data || [])
  });

  const { data: okruhy = [] } = useQuery({
    queryKey: ['okruhy'],
    queryFn: () => supabase.from('okruhy').select('*').order('order_index').then(r => r.data || [])
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => supabase.from('topics').select('*').then(r => r.data || [])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.from('questions').delete().eq('id', id),
    onSuccess: () => {
      queryClient.invalidateQueries(['questions']);
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => supabase.from('questions').delete().eq('id', id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['questions']);
      setSelectedIds([]);
    }
  });

  // Filter questions
  const filteredQuestions = useMemo(() => {
    let filtered = questions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.title?.toLowerCase().includes(query) ||
        q.question_text?.toLowerCase().includes(query)
      );
    }

    if (filterOkruh !== 'all') {
      filtered = filtered.filter(q => q.okruh_id === filterOkruh);
    }

    if (filterVisibility !== 'all') {
      filtered = filtered.filter(q => q.visibility === filterVisibility);
    }

    return filtered;
  }, [questions, searchQuery, filterOkruh, filterVisibility]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredQuestions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQuestions.map(q => q.id));
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Opravdu smazat ${selectedIds.length} otázek?`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  if (!canEditContent(user)) {
    return (
      <div className="p-6 text-center">
        <p className="text-[hsl(var(--mn-muted))]">Nemáte oprávnění</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
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
            Otázky
          </h1>
          <p className="text-[hsl(var(--mn-muted))]">
            {questions.length} celkem
            {selectedIds.length > 0 && ` · ${selectedIds.length} označeno`}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Smazat označené ({selectedIds.length})
            </Button>
          )}
          <Button asChild className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)]">
            <Link to={createPageUrl('AdminQuestionEdit')}>
              <Plus className="w-4 h-4 mr-2" />
              Nová otázka
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--mn-muted))]" />
              <Input
                placeholder="Hledat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterOkruh} onValueChange={setFilterOkruh}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Okruh" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny okruhy</SelectItem>
                {okruhy.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterVisibility} onValueChange={setFilterVisibility}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Viditelnost" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny</SelectItem>
                <SelectItem value="public">Veřejné</SelectItem>
                <SelectItem value="members_only">Pro členy</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner size="lg" className="mt-12" />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSelectAll}
                    className="h-8 w-8"
                  >
                    {selectedIds.length === filteredQuestions.length && filteredQuestions.length > 0 ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Název</TableHead>
                <TableHead>Okruh</TableHead>
                <TableHead>Obtížnost</TableHead>
                <TableHead>Viditelnost</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.map((question) => {
                const okruh = okruhy.find(o => o.id === question.okruh_id);
                const topic = topics.find(t => t.id === question.topic_id);

                return (
                  <TableRow key={question.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleSelect(question.id)}
                        className="h-8 w-8"
                      >
                        {selectedIds.includes(question.id) ? (
                          <CheckSquare className="w-4 h-4 text-[hsl(var(--mn-accent))]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[hsl(var(--mn-text))] line-clamp-1">
                          {question.title}
                        </p>
                        {topic && (
                          <p className="text-xs text-[hsl(var(--mn-muted))]">{topic.title}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{okruh?.title || '-'}</Badge>
                    </TableCell>
                    <TableCell>
                      <DifficultyIndicator level={question.difficulty || 1} showLabel={false} />
                    </TableCell>
                    <TableCell>
                      <VisibilityBadge visibility={question.visibility} />
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
                            <Link to={createPageUrl('QuestionDetail') + `?id=${question.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Zobrazit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl('AdminQuestionEdit') + `?id=${question.id}`}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Upravit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-[hsl(var(--mn-danger))]"
                            onClick={() => {
                              if (confirm('Opravdu smazat tuto otázku?')) {
                                deleteMutation.mutate(question.id);
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
              {filteredQuestions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[hsl(var(--mn-muted))]">
                    Žádné otázky
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}