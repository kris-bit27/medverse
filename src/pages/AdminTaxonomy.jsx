import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  FileText,
  Loader2
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function AdminTaxonomy() {
  const [okruhDialogOpen, setOkruhDialogOpen] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [editingOkruh, setEditingOkruh] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);
  const [okruhForm, setOkruhForm] = useState({ title: '', order: 0, description: '' });
  const [topicForm, setTopicForm] = useState({ title: '', okruh_id: '', order: 0 });
  const queryClient = useQueryClient();

  const { data: okruhy = [], isLoading } = useQuery({
    queryKey: ['okruhy'],
    queryFn: () => base44.entities.Okruh.list('order')
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list()
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list()
  });

  // Mutations
  const saveOkruhMutation = useMutation({
    mutationFn: async (data) => {
      if (editingOkruh) {
        return base44.entities.Okruh.update(editingOkruh.id, data);
      }
      return base44.entities.Okruh.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['okruhy']);
      setOkruhDialogOpen(false);
      setEditingOkruh(null);
      setOkruhForm({ title: '', order: 0, description: '' });
    }
  });

  const deleteOkruhMutation = useMutation({
    mutationFn: (id) => base44.entities.Okruh.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['okruhy'])
  });

  const saveTopicMutation = useMutation({
    mutationFn: async (data) => {
      if (editingTopic) {
        return base44.entities.Topic.update(editingTopic.id, data);
      }
      return base44.entities.Topic.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['topics']);
      setTopicDialogOpen(false);
      setEditingTopic(null);
      setTopicForm({ title: '', okruh_id: '', order: 0 });
    }
  });

  const deleteTopicMutation = useMutation({
    mutationFn: (id) => base44.entities.Topic.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['topics'])
  });

  const openEditOkruh = (okruh) => {
    setEditingOkruh(okruh);
    setOkruhForm({ title: okruh.title, order: okruh.order || 0, description: okruh.description || '' });
    setOkruhDialogOpen(true);
  };

  const openEditTopic = (topic) => {
    setEditingTopic(topic);
    setTopicForm({ title: topic.title, okruh_id: topic.okruh_id, order: topic.order || 0 });
    setTopicDialogOpen(true);
  };

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
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" asChild>
          <Link to={createPageUrl('Admin')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Zpět
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
        Taxonomie
      </h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Okruhy */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="w-5 h-5" />
              Okruhy ({okruhy.length})
            </CardTitle>
            <Dialog open={okruhDialogOpen} onOpenChange={setOkruhDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => {
                  setEditingOkruh(null);
                  setOkruhForm({ title: '', order: okruhy.length + 1, description: '' });
                }}>
                  <Plus className="w-4 h-4 mr-1" />
                  Přidat
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingOkruh ? 'Upravit okruh' : 'Nový okruh'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Název</Label>
                    <Input
                      value={okruhForm.title}
                      onChange={(e) => setOkruhForm(f => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pořadí</Label>
                    <Input
                      type="number"
                      value={okruhForm.order}
                      onChange={(e) => setOkruhForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Popis</Label>
                    <Input
                      value={okruhForm.description}
                      onChange={(e) => setOkruhForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <Button 
                    onClick={() => saveOkruhMutation.mutate(okruhForm)}
                    disabled={saveOkruhMutation.isPending}
                    className="w-full"
                  >
                    {saveOkruhMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Uložit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-2">
            {okruhy.map((okruh) => {
              const topicCount = topics.filter(t => t.okruh_id === okruh.id).length;
              const questionCount = questions.filter(q => q.okruh_id === okruh.id).length;
              
              return (
                <div 
                  key={okruh.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{okruh.title}</p>
                    <p className="text-xs text-slate-500">{topicCount} témat · {questionCount} otázek</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditOkruh(okruh)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-600"
                      onClick={() => {
                        if (confirm('Opravdu smazat tento okruh?')) {
                          deleteOkruhMutation.mutate(okruh.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {okruhy.length === 0 && (
              <p className="text-center py-8 text-slate-500">Žádné okruhy</p>
            )}
          </CardContent>
        </Card>

        {/* Topics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Témata ({topics.length})
            </CardTitle>
            <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => {
                  setEditingTopic(null);
                  setTopicForm({ title: '', okruh_id: okruhy[0]?.id || '', order: 0 });
                }}>
                  <Plus className="w-4 h-4 mr-1" />
                  Přidat
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTopic ? 'Upravit téma' : 'Nové téma'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Název</Label>
                    <Input
                      value={topicForm.title}
                      onChange={(e) => setTopicForm(f => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Okruh</Label>
                    <Select 
                      value={topicForm.okruh_id} 
                      onValueChange={(v) => setTopicForm(f => ({ ...f, okruh_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte okruh" />
                      </SelectTrigger>
                      <SelectContent>
                        {okruhy.map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pořadí</Label>
                    <Input
                      type="number"
                      value={topicForm.order}
                      onChange={(e) => setTopicForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <Button 
                    onClick={() => saveTopicMutation.mutate(topicForm)}
                    disabled={saveTopicMutation.isPending}
                    className="w-full"
                  >
                    {saveTopicMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Uložit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {okruhy.map((okruh) => {
              const okruhTopics = topics.filter(t => t.okruh_id === okruh.id);
              if (okruhTopics.length === 0) return null;
              
              return (
                <div key={okruh.id} className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">{okruh.title}</p>
                  <div className="space-y-1">
                    {okruhTopics.map((topic) => {
                      const questionCount = questions.filter(q => q.topic_id === topic.id).length;
                      return (
                        <div 
                          key={topic.id}
                          className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-900 dark:text-white">{topic.title}</span>
                            <Badge variant="secondary" className="text-xs">{questionCount}</Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTopic(topic)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600"
                              onClick={() => {
                                if (confirm('Opravdu smazat toto téma?')) {
                                  deleteTopicMutation.mutate(topic.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {topics.length === 0 && (
              <p className="text-center py-8 text-slate-500">Žádná témata</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}