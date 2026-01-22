import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronLeft,
  Search,
  Crown,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { canManageUsers, getRoleDisplayName, getRoleBadgeColor } from '@/components/utils/permissions';

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: canManageUsers(currentUser)
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['users'])
  });

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!canManageUsers(currentUser)) {
    return (
      <div className="p-6 text-center">
        <Shield className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <p className="text-slate-500">Nemáte oprávnění ke správě uživatelů</p>
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Uživatelé
          </h1>
          <p className="text-slate-500">{users.length} celkem</p>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Hledat podle jména nebo emailu..."
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
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Uživatel</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Vzdělání</TableHead>
                <TableHead>Plán</TableHead>
                <TableHead>Registrace</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {user.full_name || 'Bez jména'}
                      </p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role || 'student'}
                      onValueChange={(value) => updateUserMutation.mutate({ 
                        id: user.id, 
                        data: { role: value }
                      })}
                      disabled={user.id === currentUser?.id}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">
                          <span className={getRoleBadgeColor('student')}>
                            {getRoleDisplayName('student')}
                          </span>
                        </SelectItem>
                        <SelectItem value="editor">
                          <span className={getRoleBadgeColor('editor')}>
                            {getRoleDisplayName('editor')}
                          </span>
                        </SelectItem>
                        <SelectItem value="admin">
                          <span className={getRoleBadgeColor('admin')}>
                            {getRoleDisplayName('admin')}
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {user.education_level || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.plan || 'free'}
                      onValueChange={(value) => updateUserMutation.mutate({ 
                        id: user.id, 
                        data: { plan: value }
                      })}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="premium">
                          <span className="flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-500" />
                            Premium
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {user.created_date ? format(new Date(user.created_date), 'd.M.yyyy') : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Žádní uživatelé
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