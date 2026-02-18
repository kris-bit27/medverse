import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { callApi } from '@/lib/api';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft, Shield, Loader2, CheckCircle, AlertTriangle,
  XCircle, Search, FileText, Sparkles, ArrowRight
} from 'lucide-react';
import { canAccessAdmin } from '@/components/utils/permissions';
import HTMLContent from '@/components/study/HTMLContent';

const VERDICT_CONFIG = {
  pass: { icon: CheckCircle, color: 'text-[hsl(var(--mn-success))]', bg: 'bg-[hsl(var(--mn-success))]/10', label: 'Schváleno' },
  warn: { icon: AlertTriangle, color: 'text-[hsl(var(--mn-warn))]', bg: 'bg-[hsl(var(--mn-warn))]/10', label: 'Varování' },
  fail: { icon: XCircle, color: 'text-[hsl(var(--mn-danger))]', bg: 'bg-[hsl(var(--mn-danger))]/10', label: 'Zamítnuto' },
  error: { icon: XCircle, color: 'text-[hsl(var(--mn-muted))]', bg: 'bg-[hsl(var(--mn-muted))]/10', label: 'Chyba' },
};

const SEVERITY_COLORS = {
  critical: 'bg-[hsl(var(--mn-danger))]/10 text-[hsl(var(--mn-danger))] border-[hsl(var(--mn-danger))]/30',
  major: 'bg-[hsl(var(--mn-warn))]/10 text-[hsl(var(--mn-warn))] border-[hsl(var(--mn-warn))]/30',
  minor: 'bg-[hsl(var(--mn-accent-2))]/10 text-[hsl(var(--mn-accent-2))] border-[hsl(var(--mn-accent-2))]/30',
};

export default function AdminContentReview() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [reviewResult, setReviewResult] = useState(null);

  // Search topics
  const { data: topics } = useQuery({
    queryKey: ['admin-topics-review', search],
    queryFn: async () => {
      let q = supabase
        .from('topics')
        .select('id, title, full_text_content, bullet_points_summary, review_status, ai_model')
        .not('full_text_content', 'is', null)
        .order('title')
        .limit(20);
      if (search.trim()) {
        q = q.ilike('title', `%${search.trim()}%`);
      }
      const { data } = await q;
      return data || [];
    },
  });

  // Run review
  const reviewMutation = useMutation({
    mutationFn: async ({ topicId, contentType }) => {
      return callApi('content-review', { topic_id: topicId, content_type: contentType });
    },
    onSuccess: (data) => setReviewResult(data),
  });

  const handleReview = (topic, contentType = 'fulltext') => {
    setSelectedTopic(topic);
    setReviewResult(null);
    reviewMutation.mutate({ topicId: topic.id, contentType });
  };

  if (!canAccessAdmin(user)) {
    return <div className="p-6 text-center"><p>Přístup odepřen</p></div>;
  }

  const review = reviewResult?.review;
  const VerdictIcon = review ? VERDICT_CONFIG[review.verdict]?.icon || Shield : Shield;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <Link to={createPageUrl('Admin')}>
          <Button variant="ghost" size="sm" className="mb-3"><ChevronLeft className="w-4 h-4 mr-1" /> Admin</Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#f97316] to-[hsl(var(--mn-danger))] flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--mn-text))]">Content Review</h1>
            <p className="text-sm text-[hsl(var(--mn-muted))]">GPT-4o cross-model validace Claude-generovaného obsahu</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Topic selector */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--mn-muted))]" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Hledat téma..."
              className="pl-9"
            />
          </div>

          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {topics?.map(t => (
              <button key={t.id} onClick={() => handleReview(t)}
                className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                  selectedTopic?.id === t.id 
                    ? 'border-[hsl(var(--mn-accent))] bg-[hsl(var(--mn-accent)/0.05)]' 
                    : 'border-[hsl(var(--mn-border))] hover:border-[hsl(var(--mn-accent)/0.3)]'
                }`}
              >
                <p className="text-sm font-medium text-[hsl(var(--mn-text))] line-clamp-1">{t.title}</p>
                <div className="flex gap-2 mt-1">
                  {t.full_text_content && <Badge variant="outline" className="text-[9px]">Fulltext</Badge>}
                  {t.bullet_points_summary && <Badge variant="outline" className="text-[9px]">Summary</Badge>}
                  {t.review_status && <Badge variant="outline" className="text-[9px]">{t.review_status}</Badge>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Review result */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedTopic && !reviewMutation.isPending && (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="w-12 h-12 text-[hsl(var(--mn-muted))] mx-auto mb-3 opacity-30" />
                <p className="text-sm text-[hsl(var(--mn-muted))]">Vyber téma k recenzi</p>
                <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">GPT-4o zkontroluje obsah a identifikuje chyby</p>
              </CardContent>
            </Card>
          )}

          {reviewMutation.isPending && (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="w-10 h-10 text-[hsl(var(--mn-accent))] mx-auto mb-3 animate-spin" />
                <p className="text-sm font-medium text-[hsl(var(--mn-text))]">GPT-4o kontroluje obsah...</p>
                <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">"{selectedTopic?.title}"</p>
              </CardContent>
            </Card>
          )}

          {reviewMutation.isError && (
            <Card className="border-[hsl(var(--mn-danger))]/30">
              <CardContent className="p-4">
                <p className="text-sm text-[hsl(var(--mn-danger))]">{reviewMutation.error?.message || 'Chyba při recenzi'}</p>
              </CardContent>
            </Card>
          )}

          {review && (
            <>
              {/* Verdict card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${VERDICT_CONFIG[review.verdict]?.bg} flex items-center justify-center`}>
                      <VerdictIcon className={`w-6 h-6 ${VERDICT_CONFIG[review.verdict]?.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[hsl(var(--mn-text))]">
                          {review.score !== null ? `${review.score}/10` : '—'}
                        </span>
                        <Badge className={VERDICT_CONFIG[review.verdict]?.bg + ' ' + VERDICT_CONFIG[review.verdict]?.color}>
                          {VERDICT_CONFIG[review.verdict]?.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-[hsl(var(--mn-muted))] mt-0.5">{reviewResult.topic_title}</p>
                    </div>
                    <div className="text-right text-[10px] text-[hsl(var(--mn-muted))]">
                      <p>{reviewResult.model}</p>
                      <p>${reviewResult.cost_usd?.toFixed(4)}</p>
                    </div>
                  </div>
                  {review.summary && (
                    <p className="text-sm text-[hsl(var(--mn-muted))] mt-3 border-t border-[hsl(var(--mn-border))] pt-3">
                      {review.summary}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Issues */}
              {review.issues?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[hsl(var(--mn-warn))]" />
                      Nalezené problémy ({review.issues.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {review.issues.map((issue, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.minor}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="outline" className="text-[9px]">{issue.severity}</Badge>
                          <Badge variant="outline" className="text-[9px]">{issue.type}</Badge>
                        </div>
                        {issue.text && (
                          <p className="text-xs text-[hsl(var(--mn-muted))] italic mb-1">"{issue.text}"</p>
                        )}
                        {issue.correction && (
                          <p className="text-xs text-[hsl(var(--mn-text))]">
                            <strong>Oprava:</strong> {issue.correction}
                          </p>
                        )}
                        {issue.explanation && (
                          <p className="text-[11px] text-[hsl(var(--mn-muted))] mt-1">{issue.explanation}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Strengths */}
              {review.strengths?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[hsl(var(--mn-success))]" />
                      Silné stránky
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {review.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-[hsl(var(--mn-muted))] flex items-start gap-2">
                          <span className="text-[hsl(var(--mn-success))] mt-0.5">✓</span> {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Review summary button */}
              {selectedTopic?.bullet_points_summary && reviewResult?.content_type === 'fulltext' && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => handleReview(selectedTopic, 'summary')}
                  disabled={reviewMutation.isPending}
                >
                  <Sparkles className="w-4 h-4" />
                  Zkontrolovat i high-yield shrnutí
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
