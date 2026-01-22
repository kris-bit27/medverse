import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
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
  create: 'bg-emerald-100 text-emerald-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800'
};

export default function AdminAudit() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 100),
    enabled: canViewAudit(currentUser)
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: canViewAudit(currentUser)
  });

  if (!canViewAudit(currentUser)) {
    return (
      <div className="p-6 text-center">
        <Shield className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <p className="text-slate-500">Nemáte oprávnění k audit logu</p>
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          Audit log
        </h1>
        <p className="text-slate-500">Historie změn v systému</p>
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
                    <TableCell className="text-slate-500">
                      {log.created_date 
                        ? format(new Date(log.created_date), 'd.M.yyyy HH:mm', { locale: cs })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {actor?.full_name || actor?.email || log.actor_user_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={actionColors[log.action] || 'bg-slate-100 text-slate-800'}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.entity_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">
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