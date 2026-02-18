import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  StickyNote, 
  Highlighter, 
  Share2, 
  MoreVertical,
  Trash2,
  Edit,
  Users,
  Loader2,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

export default function TopicNotes({ topicId, user }) {
  const queryClient = useQueryClient();
  const [editingNote, setEditingNote] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [shareDialogNote, setShareDialogNote] = useState(null);
  const [shareEmails, setShareEmails] = useState('');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['topicNotes', topicId, user?.id],
    queryFn: async () => {
      const { data: userNotes } = await supabase.from('user_notes').select('*')
        .eq('topic_id', topicId).eq('user_id', user.id);
      
      // Also fetch shared notes
      const { data: allNotes } = await supabase.from('user_notes').select('*')
        .eq('topic_id', topicId).eq('is_shared', true);
      
      const sharedNotes = allNotes.filter(n => 
        n.user_id !== user.id && 
        (n.shared_with_user_ids?.includes(user.id) || n.is_shared)
      );
      
      return [...userNotes, ...sharedNotes];
    },
    enabled: !!user && !!topicId
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId) => supabase.from('user_notes').delete().eq('id', noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topicNotes', topicId, user?.id] });
      toast.success('Poznámka smazána');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.from('user_notes').update(data).eq('id', id).select().single().then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topicNotes', topicId, user?.id] });
      setEditingNote(null);
      toast.success('Poznámka aktualizována');
    }
  });

  const handleEdit = (note) => {
    setEditingNote(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = () => {
    if (editingNote) {
      updateMutation.mutate({
        id: editingNote,
        data: { content: editContent }
      });
    }
  };

  const handleShare = async () => {
    if (!shareDialogNote) return;

    const emails = shareEmails.split(',').map(e => e.trim()).filter(Boolean);
    
    try {
      // Fetch users by email
      const allUsers = await supabase.from('user_profiles').select('*').then(r => r.data || []);
      const targetUserIds = allUsers
        .filter(u => emails.includes(u.email))
        .map(u => u.id);

      await updateMutation.mutateAsync({
        id: shareDialogNote.id,
        data: {
          is_shared: true,
          shared_with_user_ids: targetUserIds
        }
      });

      toast.success('Poznámka sdílena');
      setShareDialogNote(null);
      setShareEmails('');
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Chyba při sdílení');
    }
  };

  const togglePublicShare = (note) => {
    updateMutation.mutate({
      id: note.id,
      data: { is_shared: !note.is_shared }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--mn-muted))]" />
        </CardContent>
      </Card>
    );
  }

  const myNotes = notes.filter(n => n.user_id === user.id);
  const sharedWithMe = notes.filter(n => n.user_id !== user.id);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <StickyNote className="w-5 h-5 text-[hsl(var(--mn-warn))]" />
            Vaše poznámky ({myNotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myNotes.length === 0 ? (
            <p className="text-sm text-[hsl(var(--mn-muted))] text-center py-4">
              Nemáte zatím žádné poznámky. Označte text v materiálu pro vytvoření poznámky.
            </p>
          ) : (
            <div className="space-y-3">
              {myNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-lg border bg-[hsl(var(--mn-surface-2))]/50 space-y-3"
                >
                  {note.highlighted_text && (
                    <div className="flex items-start gap-2">
                      <Highlighter className="w-4 h-4 text-[hsl(var(--mn-warn))] mt-1 flex-shrink-0" />
                      <p className="text-sm text-[hsl(var(--mn-muted))] bg-[hsl(var(--mn-warn)/0.06)] p-2 rounded border border-[hsl(var(--mn-warn)/0.2)]">
                        "{note.highlighted_text.slice(0, 200)}
                        {note.highlighted_text.length > 200 && '..."'}
                      </p>
                    </div>
                  )}

                  {editingNote === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3 mr-1" />
                          )}
                          Uložit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingNote(null)}>
                          Zrušit
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[hsl(var(--mn-muted))]">
                      {note.content}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {note.context}
                      </Badge>
                      {note.is_shared && (
                        <Badge className="text-xs bg-[hsl(var(--mn-accent)/0.12)] text-[hsl(var(--mn-accent))]">
                          <Share2 className="w-3 h-3 mr-1" />
                          Sdíleno
                        </Badge>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(note)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Upravit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => togglePublicShare(note)}>
                          <Share2 className="w-4 h-4 mr-2" />
                          {note.is_shared ? 'Zrušit sdílení' : 'Sdílet veřejně'}
                        </DropdownMenuItem>
                        <Dialog>
                          <DialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setShareDialogNote(note);
                              }}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Sdílet s uživateli
                            </DropdownMenuItem>
                          </DialogTrigger>
                        </Dialog>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteMutation.mutate(note.id)}
                          className="text-[hsl(var(--mn-danger))]"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Smazat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {sharedWithMe.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-[hsl(var(--mn-accent))]" />
              Sdíleno se mnou ({sharedWithMe.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sharedWithMe.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-lg border bg-[hsl(var(--mn-accent)/0.06)]/50/10 space-y-2"
                >
                  {note.highlighted_text && (
                    <div className="flex items-start gap-2">
                      <Highlighter className="w-4 h-4 text-[hsl(var(--mn-warn))] mt-1 flex-shrink-0" />
                      <p className="text-sm text-[hsl(var(--mn-muted))] bg-[hsl(var(--mn-warn)/0.06)] p-2 rounded border border-[hsl(var(--mn-warn)/0.2)]">
                        "{note.highlighted_text.slice(0, 200)}
                        {note.highlighted_text.length > 200 && '..."'}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-[hsl(var(--mn-muted))]">
                    {note.content}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    Od jiného uživatele
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!shareDialogNote} onOpenChange={(open) => !open && setShareDialogNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sdílet poznámku s uživateli</DialogTitle>
            <DialogDescription>
              Zadejte e-mailové adresy uživatelů oddělené čárkou
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-mailové adresy</Label>
              <Input
                value={shareEmails}
                onChange={(e) => setShareEmails(e.target.value)}
                placeholder="user1@example.com, user2@example.com"
              />
            </div>
            <Button onClick={handleShare} disabled={updateMutation.isPending} className="w-full">
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4 mr-2" />
              )}
              Sdílet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}