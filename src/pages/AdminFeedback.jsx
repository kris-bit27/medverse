import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { callApi } from '@/lib/api';
import {
  Flag, AlertTriangle, Clock, BookX, HelpCircle, Lightbulb,
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp,
  Shield, ArrowLeft, Sparkles, FileText, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { canAccessAdmin } from '@/components/utils/permissions';

const TYPE_META = {
  error:      { label: 'Faktická chyba', icon: AlertTriangle, color: 'text-red-400 bg-red-500/10' },
  outdated:   { label: 'Zastaralé',      icon: Clock,         color: 'text-amber-400 bg-amber-500/10' },
  incomplete: { label: 'Chybí obsah',    icon: BookX,         color: 'text-orange-400 bg-orange-500/10' },
  unclear:    { label: 'Nesrozumitelné', icon: HelpCircle,    color: 'text-blue-400 bg-blue-500/10' },
  suggestion: { label: 'Návrh',          icon: Lightbulb,     color: 'text-teal-400 bg-teal-500/10' },
};

const STATUS_META = {
  pending:   { label: 'Čeká',       color: 'bg-slate-500/20 text-[hsl(var(--mn-muted))]' },
  analyzing: { label: 'Analyzuje',  color: 'bg-blue-500/20 text-blue-400' },
  approved:  { label: 'Schváleno',  color: 'bg-green-500/20 text-green-400' },
  rejected:  { label: 'Zamítnuto',  color: 'bg-red-500/20 text-red-400' },
  applied:   { label: 'Aplikováno', color: 'bg-teal-500/20 text-teal-400' },
};

function FeedbackCard({ fb, onApply, onReject, onAnalyze }) {
  const [expanded, setExpanded] = useState(false);
  const typeMeta = TYPE_META[fb.feedback_type] || TYPE_META.suggestion;
  const statusMeta = STATUS_META[fb.status] || STATUS_META.pending;
  const TypeIcon = typeMeta.icon;
  const ai = fb.ai_analysis;

  return (
    <Card className="bg-[hsl(var(--mn-surface)/0.5)] border-[hsl(var(--mn-border))] overflow-hidden">
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`p-2 rounded-lg ${typeMeta.color} shrink-0`}>
              <TypeIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Link
                  to={`${createPageUrl('TopicDetailV5')}?id=${fb.topic_id}`}
                  className="text-sm font-medium text-white hover:text-teal-400 transition-colors truncate"
                >
                  {fb.topics?.title || 'Neznámé téma'}
                </Link>
                <Badge className={`text-[10px] ${statusMeta.color} border-0`}>
                  {statusMeta.label}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {typeMeta.label}
                </Badge>
              </div>
              <p className="text-sm text-[hsl(var(--mn-muted))] leading-relaxed">{fb.description}</p>
              {fb.quoted_text && (
                <p className="text-xs text-[hsl(var(--mn-muted))] mt-1 italic border-l-2 border-[hsl(var(--mn-border))] pl-2">
                  „{fb.quoted_text}"
                </p>
              )}
              <p className="text-[10px] text-[hsl(var(--mn-muted))] mt-1.5">
                {new Date(fb.created_at).toLocaleString('cs-CZ')}
                {fb.severity && ` · ${fb.severity}`}
              </p>
            </div>
          </div>

          <button onClick={() => setExpanded(!expanded)} className="p-1 text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* AI Analysis (expandable) */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-[hsl(var(--mn-border))] space-y-3">
            {ai ? (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-[hsl(var(--mn-muted))] font-medium">AI Analýza</span>
                  <span className={`font-bold ${ai.valid ? 'text-green-400' : 'text-red-400'}`}>
                    {ai.valid ? 'Oprávněný' : 'Neoprávněný'}
                  </span>
                  <span className="text-[hsl(var(--mn-muted))]">· confidence: {(ai.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="text-xs text-[hsl(var(--mn-muted))] leading-relaxed">{ai.reasoning}</p>
                {ai.evidence?.length > 0 && (
                  <div className="text-[10px] text-[hsl(var(--mn-muted))]">
                    Evidence: {ai.evidence.join('; ')}
                  </div>
                )}
                {ai.suggested_fix && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                    <p className="text-[10px] text-green-400 font-medium mb-1">Navrhovaná oprava:</p>
                    <p className="text-xs text-[hsl(var(--mn-muted))] whitespace-pre-wrap">{ai.suggested_fix}</p>
                    {ai.fix_location && (
                      <p className="text-[10px] text-[hsl(var(--mn-muted))] mt-1">Kde: {ai.fix_location}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-[hsl(var(--mn-muted))]">AI analýza zatím nebyla provedena.</p>
            )}

            {fb.admin_notes && (
              <p className="text-[10px] text-[hsl(var(--mn-muted))] italic">Admin: {fb.admin_notes}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {!ai && fb.status === 'pending' && (
                <Button size="sm" variant="outline" onClick={() => onAnalyze(fb.id)}
                  className="text-xs h-7 gap-1.5">
                  <Sparkles className="w-3 h-3" /> AI Analýza
                </Button>
              )}
              {fb.status !== 'applied' && fb.status !== 'rejected' && (
                <>
                  <Button size="sm" onClick={() => onApply(fb)}
                    className="text-xs h-7 gap-1.5 bg-green-600 hover:bg-green-500">
                    <CheckCircle2 className="w-3 h-3" /> Aplikovat opravu
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onReject(fb.id)}
                    className="text-xs h-7 gap-1.5 text-red-400 border-red-500/30 hover:bg-red-500/10">
                    <XCircle className="w-3 h-3" /> Zamítnout
                  </Button>
                </>
              )}
              <Link
                to={`${createPageUrl('TopicDetailV5')}?id=${fb.topic_id}`}
                className="ml-auto text-[10px] text-[hsl(var(--mn-muted))] hover:text-teal-400 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> Otevřít téma
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['adminFeedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_feedback')
        .select('*, topics(id, title)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (feedbackId) => {
      const res = await callApi('analyze-feedback', { feedback_id: feedbackId });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeedback'] });
      toast.success('AI analýza dokončena');
    },
    onError: (e) => toast.error(`Chyba: ${e.message}`),
  });

  const applyMutation = useMutation({
    mutationFn: async (fb) => {
      const ai = fb.ai_analysis;
      if (!ai?.suggested_fix) {
        await supabase.from('content_feedback').update({
          status: 'applied',
          applied_at: new Date().toISOString(),
          applied_by: 'admin',
          admin_notes: 'Potvrzeno adminem bez automatické opravy.',
        }).eq('id', fb.id);
        return;
      }

      // Try to apply the fix
      const { data: topic } = await supabase
        .from('topics')
        .select('full_text_content')
        .eq('id', fb.topic_id)
        .single();

      if (topic?.full_text_content && fb.quoted_text && topic.full_text_content.includes(fb.quoted_text)) {
        const updated = topic.full_text_content.replace(fb.quoted_text, ai.suggested_fix);
        await supabase.from('topics').update({
          full_text_content: updated,
          updated_at: new Date().toISOString(),
        }).eq('id', fb.topic_id);
      }

      await supabase.from('content_feedback').update({
        status: 'applied',
        applied_at: new Date().toISOString(),
        applied_by: 'admin',
      }).eq('id', fb.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeedback'] });
      toast.success('Oprava aplikována');
    },
    onError: (e) => toast.error(`Chyba: ${e.message}`),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id) => {
      await supabase.from('content_feedback').update({
        status: 'rejected',
        admin_notes: 'Zamítnuto adminem.',
      }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeedback'] });
      toast.success('Feedback zamítnut');
    },
  });

  if (!canAccessAdmin(user)) {
    return (
      <div className="p-6 text-center">
        <Shield className="w-12 h-12 mx-auto text-[hsl(var(--mn-muted))] mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Přístup odepřen</h2>
      </div>
    );
  }

  const filtered = statusFilter === 'all' ? feedbacks : feedbacks.filter(f => f.status === statusFilter);
  const counts = {
    all: feedbacks.length,
    pending: feedbacks.filter(f => f.status === 'pending').length,
    approved: feedbacks.filter(f => f.status === 'approved').length,
    rejected: feedbacks.filter(f => f.status === 'rejected').length,
    applied: feedbacks.filter(f => f.status === 'applied').length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to={createPageUrl('AdminConsole')} className="p-2 rounded-lg hover:bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Flag className="w-5 h-5 text-amber-400" />
            Content Feedback
          </h1>
          <p className="text-sm text-[hsl(var(--mn-muted))]">
            {counts.pending} čeká na posouzení · {counts.applied} aplikováno
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {Object.entries({ all: 'Vše', pending: 'Čeká', approved: 'Schváleno', rejected: 'Zamítnuto', applied: 'Aplikováno' }).map(([key, label]) => (
          <button key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === key
                ? 'bg-teal-600 text-[hsl(var(--mn-text))]'
                : 'bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] hover:bg-[hsl(var(--mn-elevated))]'
            }`}>
            {label} ({counts[key] || 0})
          </button>
        ))}
      </div>

      {/* Batch analyze */}
      {counts.pending > 0 && (
        <div className="mb-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => analyzeMutation.mutate(null)}
            disabled={analyzeMutation.isPending}
            className="text-xs gap-1.5"
          >
            {analyzeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            AI Analyzovat čekající ({counts.pending})
          </Button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--mn-muted))]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 text-[hsl(var(--mn-muted))] mx-auto mb-3" />
          <p className="text-sm text-[hsl(var(--mn-muted))]">Žádné reporty v této kategorii</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(fb => (
            <FeedbackCard
              key={fb.id}
              fb={fb}
              onAnalyze={(id) => analyzeMutation.mutate(id)}
              onApply={(f) => applyMutation.mutate(f)}
              onReject={(id) => rejectMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
