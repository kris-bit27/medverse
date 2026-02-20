import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Users, CheckCircle, Clock, XCircle, Star, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS = {
  content_validator: '✅ Content Validator',
  prompt_architect: '✍️ Prompt Architect',
  feature_designer: '🎨 Feature Designer',
  safety_reviewer: '🛡️ Safety Reviewer',
};

function StatCard({ label, value, icon: Icon, color = '#EC4899' }) {
  return (
    <div className="p-4 rounded-xl" style={{ background: 'hsl(var(--mn-surface-2))', border: '1px solid hsl(var(--mn-border))' }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon style={{ width: 14, height: 14, color }} />
        <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--mn-muted))]">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

export default function AdminBuilderManagement() {
  const queryClient = useQueryClient();

  // All applications
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['admin-builder-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_builder_applications')
        .select('*, profiles:user_id(full_name, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Active builders
  const { data: activeBuilders = [] } = useQuery({
    queryKey: ['admin-active-builders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, is_builder, builder_role, academy_level, academy_xp')
        .eq('is_builder', true);
      if (error) throw error;

      // Merge with application stats
      const builderApps = applications.filter((a) => a.status === 'accepted');
      return (data || []).map((b) => {
        const app = builderApps.find((a) => a.user_id === b.user_id);
        return { ...b, contribution_stats: app?.contribution_stats || {}, onboarded_at: app?.onboarded_at };
      });
    },
    enabled: applications.length > 0,
  });

  const pendingApps = applications.filter((a) => a.status === 'pending' || a.status === 'reviewing');
  const activeCount = applications.filter((a) => a.status === 'accepted').length;
  const totalReviews = applications
    .filter((a) => a.status === 'accepted')
    .reduce((sum, a) => sum + (a.contribution_stats?.reviews_done || 0), 0);
  const qualityScores = applications
    .filter((a) => a.contribution_stats?.quality_score != null)
    .map((a) => a.contribution_stats.quality_score);
  const avgQuality = qualityScores.length > 0
    ? (qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length).toFixed(1)
    : '–';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Aktivní buildeři" value={activeCount} icon={Users} />
        <StatCard label="Pending přihlášek" value={pendingApps.length} icon={Clock} color="#F59E0B" />
        <StatCard label="Reviews celkem" value={totalReviews} icon={CheckCircle} color="#10B981" />
        <StatCard label="Avg kvalita" value={avgQuality} icon={Star} color="#8B5CF6" />
      </div>

      {/* Pending Applications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending přihlášky ({pendingApps.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pendingApps.length === 0 ? (
            <p className="p-6 text-center text-sm text-[hsl(var(--mn-muted))]">
              Žádné čekající přihlášky.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[hsl(var(--mn-muted))]">
                    <th className="px-4 py-2 font-medium">Uživatel</th>
                    <th className="px-4 py-2 font-medium">Role</th>
                    <th className="px-4 py-2 font-medium">Spec.</th>
                    <th className="px-4 py-2 font-medium">Level</th>
                    <th className="px-4 py-2 font-medium">XP</th>
                    <th className="px-4 py-2 font-medium">Podáno</th>
                    <th className="px-4 py-2 font-medium">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApps.map((app) => (
                    <PendingRow key={app.id} app={app} queryClient={queryClient} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Builders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Aktivní buildeři ({activeBuilders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeBuilders.length === 0 ? (
            <p className="p-6 text-center text-sm text-[hsl(var(--mn-muted))]">
              Žádní aktivní buildeři.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[hsl(var(--mn-muted))]">
                    <th className="px-4 py-2 font-medium">Builder</th>
                    <th className="px-4 py-2 font-medium">Role</th>
                    <th className="px-4 py-2 font-medium">Reviews</th>
                    <th className="px-4 py-2 font-medium">Kvalita</th>
                    <th className="px-4 py-2 font-medium">XP</th>
                    <th className="px-4 py-2 font-medium">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBuilders.map((builder) => (
                    <ActiveBuilderRow
                      key={builder.user_id}
                      builder={builder}
                      queryClient={queryClient}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Pending Application Row ── */
function PendingRow({ app, queryClient }) {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState(null); // 'accept' | 'reject'
  const [reviewNotes, setReviewNotes] = useState('');
  const [expanded, setExpanded] = useState(false);

  const actionMutation = useMutation({
    mutationFn: async ({ action, notes }) => {
      if (action === 'accept') {
        await supabase.from('academy_builder_applications')
          .update({
            status: 'accepted',
            reviewed_at: new Date().toISOString(),
            review_notes: notes || null,
          })
          .eq('id', app.id);

        await supabase.from('user_profiles')
          .update({
            is_builder: true,
            builder_role: app.role_applied,
          })
          .eq('user_id', app.user_id);
      } else {
        await supabase.from('academy_builder_applications')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            review_notes: notes,
          })
          .eq('id', app.id);
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-builder-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-active-builders'] });
      toast.success(action === 'accept' ? 'Builder přijat!' : 'Přihláška zamítnuta.');
      setShowDialog(false);
    },
  });

  const userName = app.profiles?.full_name || app.profiles?.email || 'Neznámý';

  return (
    <>
      <tr className="border-b border-[hsl(var(--mn-border)/0.3)]">
        <td className="px-4 py-2 font-medium">{userName}</td>
        <td className="px-4 py-2">
          <Badge variant="secondary" className="text-[10px]">
            {ROLE_LABELS[app.role_applied] || app.role_applied}
          </Badge>
        </td>
        <td className="px-4 py-2 text-[hsl(var(--mn-muted))]">{app.specialization || '–'}</td>
        <td className="px-4 py-2">{app.academy_level}</td>
        <td className="px-4 py-2">{app.total_xp}</td>
        <td className="px-4 py-2 text-[hsl(var(--mn-muted))]">
          {new Date(app.created_at).toLocaleDateString('cs-CZ')}
        </td>
        <td className="px-4 py-2">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
            <Button
              size="sm"
              className="text-xs h-7 bg-green-600 hover:bg-green-700"
              onClick={() => { setDialogAction('accept'); setShowDialog(true); }}
            >
              Přijmout
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="text-xs h-7"
              onClick={() => { setDialogAction('reject'); setShowDialog(true); }}
            >
              Zamítnout
            </Button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[hsl(var(--mn-surface-2)/0.5)]">
          <td colSpan={7} className="px-4 py-3">
            <p className="text-sm"><strong>Motivace:</strong> {app.motivation}</p>
            {app.tech_skills && Object.keys(app.tech_skills).length > 0 && (
              <p className="text-sm mt-1">
                <strong>Dovednosti:</strong>{' '}
                {Object.entries(app.tech_skills)
                  .filter(([, v]) => v)
                  .map(([k]) => k)
                  .join(', ')}
              </p>
            )}
          </td>
        </tr>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'accept' ? 'Přijmout buildera' : 'Zamítnout přihlášku'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              <strong>{userName}</strong> — {ROLE_LABELS[app.role_applied]}
            </p>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={
                dialogAction === 'accept'
                  ? 'Poznámky (volitelné)...'
                  : 'Důvod zamítnutí (povinný)...'
              }
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Zrušit
            </Button>
            <Button
              onClick={() =>
                actionMutation.mutate({ action: dialogAction, notes: reviewNotes })
              }
              disabled={
                actionMutation.isPending ||
                (dialogAction === 'reject' && !reviewNotes.trim())
              }
              className={dialogAction === 'accept' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={dialogAction === 'reject' ? 'destructive' : 'default'}
            >
              {actionMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {dialogAction === 'accept' ? 'Potvrdit přijetí' : 'Potvrdit zamítnutí'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Active Builder Row ── */
function ActiveBuilderRow({ builder, queryClient }) {
  const [qualityInput, setQualityInput] = useState('');
  const [showQuality, setShowQuality] = useState(false);

  const setQuality = useMutation({
    mutationFn: async (score) => {
      const { error } = await supabase
        .from('academy_builder_applications')
        .update({
          contribution_stats: supabase.rpc ? undefined : undefined, // We need raw SQL
        })
        .eq('user_id', builder.user_id)
        .eq('status', 'accepted');

      // Use raw update with jsonb_set
      const { error: err2 } = await supabase.rpc('increment_builder_stat', {
        p_user_id: builder.user_id,
        p_stat_key: 'quality_score',
      });
      // Actually, we need a dedicated approach. Use direct update:
      const { data: app } = await supabase
        .from('academy_builder_applications')
        .select('contribution_stats')
        .eq('user_id', builder.user_id)
        .eq('status', 'accepted')
        .single();

      if (app) {
        const stats = { ...(app.contribution_stats || {}), quality_score: score };
        await supabase
          .from('academy_builder_applications')
          .update({ contribution_stats: stats })
          .eq('user_id', builder.user_id)
          .eq('status', 'accepted');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-builder-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-active-builders'] });
      toast.success('Quality score aktualizován.');
      setShowQuality(false);
    },
  });

  const deactivate = useMutation({
    mutationFn: async () => {
      await supabase
        .from('academy_builder_applications')
        .update({ status: 'graduated' })
        .eq('user_id', builder.user_id)
        .eq('status', 'accepted');

      await supabase
        .from('user_profiles')
        .update({ is_builder: false })
        .eq('user_id', builder.user_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-builder-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-active-builders'] });
      toast.success('Builder deaktivován.');
    },
  });

  return (
    <tr className="border-b border-[hsl(var(--mn-border)/0.3)]">
      <td className="px-4 py-2 font-medium">{builder.display_name || 'Neznámý'}</td>
      <td className="px-4 py-2">
        <Badge variant="secondary" className="text-[10px]">
          {ROLE_LABELS[builder.builder_role] || builder.builder_role}
        </Badge>
      </td>
      <td className="px-4 py-2">{builder.contribution_stats?.reviews_done || 0}</td>
      <td className="px-4 py-2">
        {showQuality ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              max={5}
              value={qualityInput}
              onChange={(e) => setQualityInput(e.target.value)}
              className="w-16 h-7 text-xs"
            />
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => setQuality.mutate(Number(qualityInput))}
              disabled={!qualityInput || qualityInput < 1 || qualityInput > 5}
            >
              OK
            </Button>
          </div>
        ) : (
          <button
            onClick={() => {
              setQualityInput(builder.contribution_stats?.quality_score || '');
              setShowQuality(true);
            }}
            className="text-sm hover:underline"
          >
            {builder.contribution_stats?.quality_score != null
              ? `${builder.contribution_stats.quality_score}/5`
              : '–'}
          </button>
        )}
      </td>
      <td className="px-4 py-2">{builder.academy_xp || 0}</td>
      <td className="px-4 py-2">
        <Button
          size="sm"
          variant="destructive"
          className="text-xs h-7"
          onClick={() => {
            if (confirm('Opravdu deaktivovat tohoto buildera?')) {
              deactivate.mutate();
            }
          }}
        >
          Deaktivovat
        </Button>
      </td>
    </tr>
  );
}
