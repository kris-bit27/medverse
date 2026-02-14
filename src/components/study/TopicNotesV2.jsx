import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  StickyNote, 
  Plus, 
  Trash2, 
  Edit2, 
  Pin, 
  PinOff,
  AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

const COLORS = [
  { value: 'yellow', label: 'Žlutá', class: 'bg-yellow-100 border-yellow-300 text-yellow-900' },
  { value: 'blue', label: 'Modrá', class: 'bg-blue-100 border-blue-300 text-blue-900' },
  { value: 'green', label: 'Zelená', class: 'bg-green-100 border-green-300 text-green-900' },
  { value: 'red', label: 'Červená', class: 'bg-red-100 border-red-300 text-red-900' },
  { value: 'purple', label: 'Fialová', class: 'bg-teal-100 border-teal-300 text-teal-900' },
];

export default function TopicNotesV2({ topicId, user }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteColor, setNoteColor] = useState('yellow');
  const queryClient = useQueryClient();

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', topicId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('topic_id', topicId)
        .eq('user_id', user.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!topicId
  });

  // Create note
  const createNoteMutation = useMutation({
    mutationFn: async (noteData) => {
      const { data, error } = await supabase
        .from('user_notes')
        .insert([{
          user_id: user.id,
          topic_id: topicId,
          note_text: noteData.note_text,
          color: noteData.color,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notes', topicId, user?.id]);
      setNoteText('');
      setNoteColor('yellow');
      setIsAdding(false);
      toast.success('Poznámka přidána');
    },
    onError: (error) => {
      toast.error('Chyba při ukládání poznámky');
      console.error(error);
    }
  });

  // Update note
  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('user_notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notes', topicId, user?.id]);
      setEditingId(null);
      setNoteText('');
      toast.success('Poznámka upravena');
    }
  });

  // Delete note
  const deleteNoteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('user_notes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notes', topicId, user?.id]);
      toast.success('Poznámka smazána');
    }
  });

  // Toggle pin
  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }) => {
      const { error } = await supabase
        .from('user_notes')
        .update({ is_pinned: !isPinned })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notes', topicId, user?.id]);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    if (editingId) {
      updateNoteMutation.mutate({
        id: editingId,
        note_text: noteText,
        color: noteColor,
        updated_at: new Date().toISOString()
      });
    } else {
      createNoteMutation.mutate({
        note_text: noteText,
        color: noteColor
      });
    }
  };

  const startEdit = (note) => {
    setEditingId(note.id);
    setNoteText(note.note_text);
    setNoteColor(note.color);
    setIsAdding(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNoteText('');
    setNoteColor('yellow');
    setIsAdding(false);
  };

  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Přihlaste se pro přidání poznámek
        </AlertDescription>
      </Alert>
    );
  }

  const getColorClass = (color) => {
    return COLORS.find(c => c.value === color)?.class || COLORS[0].class;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <StickyNote className="w-5 h-5" />
          Moje poznámky {notes.length > 0 && `(${notes.length})`}
        </h3>
        {!isAdding && (
          <Button
            onClick={() => setIsAdding(true)}
            variant="outline"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Přidat poznámku
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <Card className={getColorClass(noteColor)}>
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Napište svou poznámku..."
                rows={4}
                className="resize-none bg-white/50"
                autoFocus
              />
              
              <div className="flex items-center justify-between gap-3">
                <Select value={noteColor} onValueChange={setNoteColor}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        {color.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                  >
                    Zrušit
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!noteText.trim() || createNoteMutation.isPending}
                  >
                    {editingId ? 'Uložit' : 'Přidat'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Načítání poznámek...
        </div>
      ) : notes.length === 0 ? (
        <Card className="bg-slate-50 dark:bg-slate-900/20">
          <CardContent className="p-8 text-center">
            <StickyNote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">Zatím nemáte žádné poznámky</p>
            <p className="text-sm text-slate-400">
              Klikněte na "Přidat poznámku" pro vytvoření první poznámky
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card
              key={note.id}
              className={`${getColorClass(note.color)} ${
                note.is_pinned ? 'ring-2 ring-offset-2 ring-amber-400' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {note.note_text}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs opacity-60">
                        {formatDistanceToNow(new Date(note.created_at), {
                          addSuffix: true,
                          locale: cs
                        })}
                      </span>
                      {note.updated_at !== note.created_at && (
                        <Badge variant="secondary" className="text-xs">
                          Upraveno
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePinMutation.mutate({
                        id: note.id,
                        isPinned: note.is_pinned
                      })}
                      className="h-8 w-8 p-0"
                    >
                      {note.is_pinned ? (
                        <PinOff className="w-4 h-4" />
                      ) : (
                        <Pin className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(note)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Opravdu smazat tuto poznámku?')) {
                          deleteNoteMutation.mutate(note.id);
                        }
                      }}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
