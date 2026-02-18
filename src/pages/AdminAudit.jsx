import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  ChevronLeft,
  FileText,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { canViewAudit } from '@/components/utils/permissions';

const actionColors = {
  create: 'bg-[hsl(var(--mn-success)/0.12)] text-[hsl(var(--mn-success))]',
  update: 'bg-[hsl(var(--mn-accent-2)/0.12)] text-[hsl(var(--mn-accent-2))]',
  delete: 'bg-[hsl(var(--mn-danger)/0.12)] text-[hsl(var(--mn-danger))]'
};

export default function AdminAudit() {
  const { user: currentUser } = useAuth();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100).then(r => r.data || []),
    enabled: canViewAudit(currentUser)
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => supabase.from('user_profiles').select('*').then(r => r.data || []),
    enabled: canViewAudit(currentUser)
  });

  if (!canViewAudit(currentUser)) {
    return (
      <div className="p-6 text-center">
        <Shield className="w-12 h-12 mx-auto text-[hsl(var(--mn-muted))] mb-4" />
        <p className="text-[hsl(var(--mn-muted))]">Nemáte oprávnění k audit logu</p>
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

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[hsl(var(--mn-text))] mb-1">
          Audit log
        </h1>
        <p className="text-[hsl(var(--mn-muted))]">Historie změn v systému</p>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner size="lg" className="mt-12" />
      ) : logs.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Čas</TableHead>
                <TableHead>Uživatel</TableHead>
                <TableHead>Akce</TableHead>
                <TableHead>Entita</TableHead>
                <TableHead>ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const actor = users.find(u => u.id === log.actor_user_id);
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-[hsl(var(--mn-muted))]">
                      {log.created_date 
                        ? format(new Date(log.created_date), 'd.M.yyyy HH:mm', { locale: cs })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-[hsl(var(--mn-text))]">
                        {actor?.full_name || actor?.email || log.actor_user_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={actionColors[log.action] || 'bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-text))]'}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.entity_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[hsl(var(--mn-muted))] font-mono">
                      {log.entity_id?.substring(0, 8)}...
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <EmptyState
          icon={FileText}
          title="Žádné záznamy"
          description="Audit log je prázdný"
        />
      )}
    </div>
  );
}