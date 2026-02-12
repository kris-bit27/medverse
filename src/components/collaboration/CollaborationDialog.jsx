import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Mail, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CollaborationDialog({ 
  open, 
  onOpenChange, 
  entity, 
  entityType, 
  entityId 
}) {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState('view');

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => supabase.from('user_profiles').select('*').then(r => r.data || []),
    enabled: open
  });

  const collaborators = entity?.collaborators || [];
  const collaboratorUsers = allUsers.filter(u => 
    collaborators.some(c => c.user_id === u.id)
  );

  const inviteMutation = useMutation({
    mutationFn: async ({ email, permission }) => {
      const targetUser = allUsers.find(u => u.email === email);
      if (!targetUser) throw new Error('Uživatel nenalezen');
      
      const existing = collaborators.find(c => c.user_id === targetUser.id);
      if (existing) throw new Error('Uživatel již má přístup');

      const updated = [
        ...collaborators,
        { user_id: targetUser.id, permission }
      ];

      await base44.entities[entityType].update(entityId, {
        collaborators: updated
      });

      return targetUser;
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries([entityType.toLowerCase(), entityId]);
      setInviteEmail('');
      toast.success(`${user.full_name || user.email} byl(a) pozván(a)`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (userId) => {
      const updated = collaborators.filter(c => c.user_id !== userId);
      await base44.entities[entityType].update(entityId, {
        collaborators: updated
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([entityType.toLowerCase(), entityId]);
      toast.success('Spolupracovník byl odebrán');
    }
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ userId, permission }) => {
      const updated = collaborators.map(c => 
        c.user_id === userId ? { ...c, permission } : c
      );
      await base44.entities[entityType].update(entityId, {
        collaborators: updated
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([entityType.toLowerCase(), entityId]);
      toast.success('Oprávnění změněno');
    }
  });

  const handleInvite = () => {
    if (!inviteEmail) return;
    inviteMutation.mutate({ email: inviteEmail, permission: invitePermission });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Správa spolupracovníků
          </DialogTitle>
          <DialogDescription>
            Pozývejte další uživatele k prohlížení nebo úpravám
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Invite form */}
          <div className="space-y-4 p-4 rounded-lg border bg-slate-50 dark:bg-slate-900">
            <div className="space-y-2">
              <Label htmlFor="email">Email uživatele</Label>
              <Input
                id="email"
                type="email"
                placeholder="uzivatel@email.cz"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Oprávnění</Label>
              <Select value={invitePermission} onValueChange={setInvitePermission}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    Pouze prohlížení
                  </SelectItem>
                  <SelectItem value="edit">
                    Může upravovat
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleInvite}
              disabled={inviteMutation.isPending || !inviteEmail}
              className="w-full"
            >
              {inviteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Pozvat
            </Button>
          </div>

          {/* Current collaborators */}
          <div className="space-y-3">
            <Label>Spolupracovníci ({collaboratorUsers.length})</Label>
            {collaboratorUsers.length > 0 ? (
              <div className="space-y-2">
                {collaboratorUsers.map(user => {
                  const collab = collaborators.find(c => c.user_id === user.id);
                  return (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-xs">
                            {user.full_name?.charAt(0) || user.email.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {user.full_name || user.email}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={collab.permission}
                          onValueChange={(permission) => 
                            updatePermissionMutation.mutate({ 
                              userId: user.id, 
                              permission 
                            })
                          }
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">Prohlížení</SelectItem>
                            <SelectItem value="edit">Úpravy</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeMutation.mutate(user.id)}
                          disabled={removeMutation.isPending}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                Zatím žádní spolupracovníci
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}