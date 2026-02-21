import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Bug, Lightbulb, FileQuestion, MessageSquarePlus,
  Clock, CheckCircle2, XCircle, Eye,
  ExternalLink, RefreshCw, ArrowLeft, Shield,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { canAccessAdmin } from '@/components/utils/permissions';

const TYPE_CONFIG = {
  bug:             { label: 'Bug / nefunkční',    icon: Bug,               badgeClass: 'bg-red-500/15    border-red-500/30    text-red-400'    },
  improvement:     { label: 'Vylepšení',           icon: Lightbulb,         badgeClass: 'bg-amber-500/15  border-amber-500/30  text-amber-400'  },
  missing_content: { label: 'Chybějící funkce',   icon: FileQuestion,      badgeClass: 'bg-blue-500/15   border-blue-500/30   text-blue-400'   },
  other:           { label: 'Jiné',               icon: MessageSquarePlus, badgeClass: 'bg-teal-500/15   border-teal-500/30   text-teal-400'   },
};

const STATUS_CONFIG = {
  new:       { label: 'Nový',          icon: Clock,        badgeClass: 'bg-[hsl(var(--mn-accent)/0.15)]  border-[hsl(var(--mn-accent)/0.3)]  text-[hsl(var(--mn-accent))]'  },
  in_review: { label: 'Prověřujeme',  icon: Eye,          badgeClass: 'bg-amber-500/15  border-amber-500/30  text-amber-400'  },
  resolved:  { label: 'Vyřešeno',     icon: CheckCircle2, badgeClass: 'bg-green-500/15  border-green-500/30  text-green-400'  },
  wont_fix:  { label: 'Nezpracujeme', icon: XCircle,      badgeClass: 'bg-[hsl(var(--mn-muted)/0.15)]  border-[hsl(var(--mn-muted)/0.3)]  text-[hsl(var(--mn-muted))]'  },
};

function StatCard({ label, value, colorClass, icon: Icon }) {
  return (
    <Card className="bg-[hsl(var(--mn-surface)/0.5)] border-[hsl(var(--mn-border))]">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className={cn('text-2xl font-bold tabular-nums', colorClass)}>{value}</p>
            <p className="text-xs text-[hsl(var(--mn-muted))] mt-0.5">{label}</p>
          </div>
          {Icon && <Icon className={cn('w-8 h-8 opacity-10', colorClass)} />}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPortalFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('new');
  const [expandedId, setExpandedId] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  const { data: feedbacks = [], isLoading, refetch } = useQuery({
    queryKey: ['adminPortalFeedback', filterType, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('user_feedback')
        .select('*')
        .not('type', 'eq', 'rating')
        .not('type', 'eq', 'content_error')
        .order('created_at', { ascending: false });
      if (filterType !== 'all') query = query.eq('type', filterType);
      if (filterStatus !== 'all') query = query.eq('status', filterStatus);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const updateFeedback = useMutation({
    mutationFn: async ({ id, status, admin_note }) => {
      const { error } = await supabase
        .from('user_feedback')
        .update({ status, admin_note, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminPortalFeedback']);
      toast.success('Aktualizováno');
      setExpandedId(null);
      setAdminNote('');
    },
    onError: () => toast.error('Chyba při aktualizaci'),
  });

  if (!canAccessAdmin(user)) {
    return (
      <div className="p-6 text-center">
        <Shield className="w-12 h-12 mx-auto text-[hsl(var(--mn-muted))] mb-4" />
        <h2 className="text-xl font-semibold text-[hsl(var(--mn-text))] mb-2">Přístup odepřen</h2>
      </div>
    );
  }

  // Counts pro filter bary — nezávisle na filtru
  const newCount = feedbacks.filter(f => f.status === 'new').length;
  const bugCount = feedbacks.filter(f => f.type === 'bug').length;
  const resolvedCount = feedbacks.filter(f => f.status === 'resolved').length;

  const STATUS_FILTERS = ['all', 'new', 'in_review', 'resolved', 'wont_fix'];
  const TYPE_FILTERS = ['all', ...Object.keys(TYPE_CONFIG)];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={createPageUrl('AdminConsole')}
          className="p-2 rounded-lg hover:bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[hsl(var(--mn-text))] flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-[hsl(var(--mn-accent))]" />
            Zpětná vazba k portálu
          </h1>
          <p className="text-sm text-[hsl(var(--mn-muted))]">
            Bugy, návrhy na vylepšení, chybějící funkce
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()} className="ml-auto" title="Obnovit">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Nové (nezpracované)" value={newCount}      colorClass="text-[hsl(var(--mn-accent))]"   icon={Clock}        />
        <StatCard label="Bugy / nefunkční"    value={bugCount}      colorClass="text-red-400"                    icon={Bug}          />
        <StatCard label="Vyřešené"            value={resolvedCount} colorClass="text-green-400"                  icon={CheckCircle2} />
      </div>

      {/* Filtry — status */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[hsl(var(--mn-muted))] uppercase tracking-wider">Status</p>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(s => {
            const conf = STATUS_CONFIG[s];
            const isActive = filterStatus === s;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                  isActive
                    ? 'bg-[hsl(var(--mn-accent))] text-white border-transparent'
                    : 'bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] border-[hsl(var(--mn-border))] hover:text-[hsl(var(--mn-text))]'
                )}
              >
                {s === 'all' ? 'Vše' : (conf?.label || s)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtry — typ */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[hsl(var(--mn-muted))] uppercase tracking-wider">Typ</p>
        <div className="flex gap-1.5 flex-wrap">
          {TYPE_FILTERS.map(t => {
            const conf = TYPE_CONFIG[t];
            const isActive = filterType === t;
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                  isActive
                    ? 'bg-[hsl(var(--mn-accent))] text-white border-transparent'
                    : 'bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] border-[hsl(var(--mn-border))] hover:text-[hsl(var(--mn-text))]'
                )}
              >
                {t === 'all' ? 'Vše' : (conf?.label || t)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Počet výsledků */}
      <p className="text-xs text-[hsl(var(--mn-muted))]">{feedbacks.length} záznamů</p>

      {/* Seznam */}
      {isLoading ? (
        <div className="text-center py-16 text-[hsl(var(--mn-muted))] text-sm">Načítám...</div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-16 text-[hsl(var(--mn-muted))]">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Žádný feedback v tomto filtru</p>
        </div>
      ) : (
        <div className="space-y-2">
          {feedbacks.map((fb) => {
            const typeConf   = TYPE_CONFIG[fb.type]     || TYPE_CONFIG.other;
            const statusConf = STATUS_CONFIG[fb.status] || STATUS_CONFIG.new;
            const TypeIcon   = typeConf.icon;
            const StatusIcon = statusConf.icon;
            const isExpanded = expandedId === fb.id;

            return (
              <Card
                key={fb.id}
                className={cn(
                  'bg-[hsl(var(--mn-surface)/0.5)] border-[hsl(var(--mn-border))] transition-all',
                  isExpanded && 'ring-1 ring-[hsl(var(--mn-accent)/0.4)]'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <TypeIcon className="w-4 h-4 mt-0.5 shrink-0 text-[hsl(var(--mn-muted))]" />

                    <div className="flex-1 min-w-0">
                      {/* Badges + datum */}
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium',
                          typeConf.badgeClass
                        )}>
                          {typeConf.label}
                        </span>
                        <span className={cn(
                          'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium',
                          statusConf.badgeClass
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConf.label}
                        </span>
                        <span className="text-xs text-[hsl(var(--mn-muted))] ml-auto shrink-0">
                          {new Date(fb.created_at).toLocaleDateString('cs-CZ', {
                            day: 'numeric', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Text */}
                      <p className="text-sm text-[hsl(var(--mn-text))] leading-relaxed line-clamp-2">
                        {fb.description}
                      </p>

                      {/* URL */}
                      {fb.page_url && (
                        <p className="text-xs text-[hsl(var(--mn-muted))] mt-1 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          {fb.page_url}
                        </p>
                      )}

                      {/* Admin poznámka */}
                      {fb.admin_note && (
                        <p className="text-xs text-[hsl(var(--mn-accent))] mt-1.5 italic bg-[hsl(var(--mn-accent)/0.06)] rounded px-2 py-1">
                          📝 {fb.admin_note}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs text-[hsl(var(--mn-muted))]"
                      onClick={() => {
                        setExpandedId(isExpanded ? null : fb.id);
                        setAdminNote(fb.admin_note || '');
                      }}
                    >
                      {isExpanded ? 'Zavřít' : 'Spravovat'}
                    </Button>
                  </div>

                  {/* Rozbalený panel */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[hsl(var(--mn-border))] space-y-4">
                      {/* Plný text */}
                      {fb.description?.length > 120 && (
                        <div>
                          <p className="text-xs font-semibold text-[hsl(var(--mn-muted))] mb-1.5 uppercase tracking-wider">
                            Plný text
                          </p>
                          <p className="text-sm text-[hsl(var(--mn-text))] leading-relaxed bg-[hsl(var(--mn-surface-2))] rounded p-3">
                            {fb.description}
                          </p>
                        </div>
                      )}

                      {/* Admin poznámka */}
                      <div>
                        <p className="text-xs font-semibold text-[hsl(var(--mn-muted))] mb-1.5 uppercase tracking-wider">
                          Admin poznámka (interní)
                        </p>
                        <Textarea
                          value={adminNote}
                          onChange={e => setAdminNote(e.target.value)}
                          placeholder="Co jsme zjistili / jak jsme to vyřešili..."
                          className="min-h-[70px] text-sm resize-none bg-[hsl(var(--mn-surface-2))] border-[hsl(var(--mn-border))]"
                        />
                      </div>

                      {/* Změna statusu */}
                      <div>
                        <p className="text-xs font-semibold text-[hsl(var(--mn-muted))] mb-2 uppercase tracking-wider">
                          Změnit status
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(STATUS_CONFIG).map(([status, { label, icon: SIcon }]) => (
                            <Button
                              key={status}
                              variant={fb.status === status ? 'default' : 'outline'}
                              size="sm"
                              className={cn(
                                'gap-1.5 text-xs',
                                fb.status === status && 'bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent-hover))] text-white border-transparent'
                              )}
                              onClick={() => updateFeedback.mutate({ id: fb.id, status, admin_note: adminNote })}
                              disabled={updateFeedback.isPending}
                            >
                              <SIcon className="w-3.5 h-3.5" />
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
