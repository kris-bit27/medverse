import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Save, Loader2 } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function AdminToolEdit() {
  const urlParams = new URLSearchParams(window.location.search);
  const toolId = urlParams.get('id');
  const isEdit = !!toolId;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic_id: '',
    visibility: 'members_only',
    nodes: [],
    edges: []
  });

  const { data: tool, isLoading } = useQuery({
    queryKey: ['tool', toolId],
    queryFn: async () => {
      const tools = await supabase.from('clinical_tools').select('*').eq('id', toolId ).then(r => r.data || []);
      return tools[0];
    },
    enabled: isEdit
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => supabase.from('topics').select('*').then(r => r.data || [])
  });

  useEffect(() => {
    if (tool) {
      setFormData({
        title: tool.title || '',
        description: tool.description || '',
        topic_id: tool.topic_id || '',
        visibility: tool.visibility || 'members_only',
        nodes: tool.nodes || [],
        edges: tool.edges || []
      });
    }
  }, [tool]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEdit) {
        return supabase.from('clinical_tools').update(data).eq('id', toolId).select().single().then(r => r.data);
      }
      return supabase.from('clinical_tools').insert(data).select().single().then(r => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tools']);
      window.location.href = createPageUrl('AdminTools');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" asChild>
          <Link to={createPageUrl('AdminTools')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Zpět
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold text-[hsl(var(--mn-text))] mb-8">
        {isEdit ? 'Upravit nástroj' : 'Nový nástroj'}
      </h1>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Základní informace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Název *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Popis</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Téma</Label>
                <Select value={formData.topic_id} onValueChange={(v) => setFormData(f => ({ ...f, topic_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Viditelnost</Label>
                <Select value={formData.visibility} onValueChange={(v) => setFormData(f => ({ ...f, visibility: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Veřejné</SelectItem>
                    <SelectItem value="members_only">Pro členy</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link to={createPageUrl('AdminTools')}>Zrušit</Link>
          </Button>
          <Button type="submit" disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isEdit ? 'Uložit' : 'Vytvořit'}
          </Button>
        </div>
      </form>
    </div>
  );
}