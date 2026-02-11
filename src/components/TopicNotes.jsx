import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  StickyNote,
  Save,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

export default function TopicNotes({ topicId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);

  // Fetch user notes for this topic
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['topicNotes', topicId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('topic_id', topicId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!topicId
  });

  // Create/Update note mutation
  const saveNote = useMutation({
    mutationFn: async ({ content, noteId }) => {
      if (noteId) {
        // Update existing note
        const { error } = await supabase
          .from('user_notes')
          .update({
            content: content,
            updated_at: new Date().toISOString()
          })
          .eq('id', noteId);

        if (error) throw error;
      } else {
        // Create new note
        const { error } = await supabase
          .from('user_notes')
          .insert({
            user_id: user.id,
            topic_id: topicId,
            content: content,
            is_private: true
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingNoteId ? 'Poznámka aktualizována!' : 'Poznámka uložena!');
      queryClient.invalidateQueries(['topicNotes']);
      setIsEditing(false);
      setNoteContent('');
      setEditingNoteId(null);
    },
    onError: () => {
      toast.error('Chyba při ukládání poznámky');
    }
  });

  // Delete note mutation
  const deleteNote = useMutation({
    mutationFn: async (noteId) => {
      const { error } = await supabase
        .from('user_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Poznámka smazána!');
      queryClient.invalidateQueries(['topicNotes']);
    },
    onError: () => {
      toast.error('Chyba při mazání poznámky');
    }
  });

  const handleEdit = (note) => {
    setNoteContent(note.content);
    setEditingNoteId(note.id);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!noteContent.trim()) {
      toast.error('Poznámka nemůže být prázdná');
      return;
    }

    saveNote.mutate({
      content: noteContent,
      noteId: editingNoteId
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNoteContent('');
    setEditingNoteId(null);
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <StickyNote className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Přihlaste se pro vytváření poznámek
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create/Edit Note Form */}
      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingNoteId ? 'Upravit poznámku' : 'Nová poznámka'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Začněte psát své poznámky..."
              rows={6}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saveNote.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Uložit
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Zrušit
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsEditing(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Přidat poznámku
        </Button>
      )}

      {/* Notes List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString('cs-CZ')}
                    </span>
                    {note.is_private && (
                      <Badge variant="outline" className="text-xs">
                        Soukromá
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(note)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Opravdu smazat poznámku?')) {
                          deleteNote.mutate(note.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                
                {note.updated_at !== note.created_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Upraveno {new Date(note.updated_at).toLocaleDateString('cs-CZ')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <StickyNote className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Zatím žádné poznámky. Začněte psát!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
