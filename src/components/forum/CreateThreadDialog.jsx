import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateThreadDialog({ open, onOpenChange, disciplines = [] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [disciplineId, setDisciplineId] = useState('');
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');

  const queryClient = useQueryClient();

  const createThreadMutation = useMutation({
    mutationFn: async (data) => {
      const { data: thread } = await supabase.from('forum_threads').insert(data).select().single();
      return thread;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forumThreads'] });
      toast.success('Vlákno vytvořeno');
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast.error('Chyba při vytváření vlákna');
    }
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setVisibility('public');
    setDisciplineId('');
    setTags([]);
    setNewTag('');
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Vyplňte název vlákna');
      return;
    }

    const data = {
      title: title.trim(),
      description: description.trim(),
      visibility,
      tags
    };

    if (visibility === 'discipline_specific' && disciplineId) {
      data.clinical_discipline_id = disciplineId;
    }

    createThreadMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vytvořit nové vlákno</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Název vlákna *</Label>
            <Input
              id="title"
              placeholder="Např. Diferenciální diagnostika febrilií"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Popis</Label>
            <Textarea
              id="description"
              placeholder="Krátký popis tématu diskuse..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Viditelnost</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger id="visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Veřejné - vidí všichni uživatelé</SelectItem>
                <SelectItem value="discipline_specific">Pouze pro určitý obor</SelectItem>
                <SelectItem value="private">Soukromé - pouze pozvaní uživatelé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibility === 'discipline_specific' && (
            <div className="space-y-2">
              <Label htmlFor="discipline">Klinický obor</Label>
              <Select value={disciplineId} onValueChange={setDisciplineId}>
                <SelectTrigger id="discipline">
                  <SelectValue placeholder="Vyberte obor" />
                </SelectTrigger>
                <SelectContent>
                  {disciplines.map(discipline => (
                    <SelectItem key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Tagy</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-[hsl(var(--mn-border))] dark:hover:bg-[hsl(var(--mn-elevated))] rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Přidat tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createThreadMutation.isPending || !title.trim()}
          >
            {createThreadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Vytvářím...
              </>
            ) : (
              'Vytvořit vlákno'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}