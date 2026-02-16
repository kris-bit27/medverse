import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Trash2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function NotesTab({ question, user }) {
  const [newNote, setNewNote] = useState('');
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['userNotes', user?.id, question.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_notes').select('*')
        .eq('user_id', user.id).eq('topic_id', question.id);
      return data || [];
    },
    enabled: !!user?.id
  });

  const createNoteMutation = useMutation({
    mutationFn: async (content) => {
      const { data } = await supabase.from('user_notes').insert({
        user_id: user.id,
        topic_id: question.id,
        note_text: content,
      }).select().single();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userNotes', user?.id, question.id]);
      setNewNote('');
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId) => {
      await supabase.from('user_notes').delete().eq('id', noteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userNotes', user?.id, question.id]);
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--mn-muted))]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing notes */}
      {notes.length > 0 && (
        <div className="space-y-3">
          {notes.map(note => (
            <Card key={note.id} className={note.is_ai_generated ? 'border-teal-200 dark:border-teal-800' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {note.is_ai_generated && (
                      <>
                        <Sparkles className="w-4 h-4 text-teal-600" />
                        <Badge variant="outline" className="text-xs">AI generováno</Badge>
                      </>
                    )}
                    <span className="text-xs text-[hsl(var(--mn-muted))]">
                      {new Date(note.created_date).toLocaleDateString('cs-CZ')}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                    disabled={deleteNoteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {note.is_ai_generated ? (
                  <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown>{note.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-[hsl(var(--mn-muted))] whitespace-pre-wrap">
                    {note.content}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New note form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nová poznámka</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Přidejte si vlastní poznámky k této otázce..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[120px] mb-3"
          />
          <Button
            onClick={() => createNoteMutation.mutate(newNote)}
            disabled={!newNote.trim() || createNoteMutation.isPending}
          >
            {createNoteMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Uložit poznámku
          </Button>
        </CardContent>
      </Card>

      {notes.length === 0 && !newNote && (
        <Card className="bg-[hsl(var(--mn-surface-2))]/50">
          <CardContent className="p-6 text-center text-sm text-[hsl(var(--mn-muted))]">
            Zatím nemáte žádné poznámky k této otázce.
          </CardContent>
        </Card>
      )}
    </div>
  );
}