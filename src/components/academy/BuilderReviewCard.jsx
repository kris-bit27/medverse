import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useCheckAcademyAchievement } from '@/hooks/useAcademy';
import { useAcademyTrack } from '@/hooks/useAcademyAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, MessageSquare, XCircle, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const REVIEW_CHECKLIST = [
  { id: 'clinical_accuracy', label: 'Klinická správnost', icon: '🏥' },
  { id: 'pedagogical_clarity', label: 'Pedagogická jasnost', icon: '📚' },
  { id: 'safety_notes', label: 'Bezpečnostní poznámky', icon: '🛡️' },
  { id: 'sources_cited', label: 'Zdroje a citace', icon: '📎' },
  { id: 'what_to_verify', label: '"Co ověřit" sekce', icon: '🔍' },
];

export default function BuilderReviewCard({ topic, onAction }) {
  const { user } = useAuth();
  const checkAchievement = useCheckAcademyAchievement();
  const track = useAcademyTrack();
  const [checklist, setChecklist] = useState({});
  const [suggestions, setSuggestions] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [loading, setLoading] = useState(null); // 'approve' | 'suggest' | 'reject'
  const startTime = React.useRef(Date.now());

  React.useEffect(() => {
    track('builder_review_started', { topic_id: topic.id, role: 'content_validator' });
  }, [topic.id]);

  const handleApprove = async () => {
    setLoading('approve');
    try {
      await supabase.from('topics').update({
        is_reviewed: true,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        status: 'published',
      }).eq('id', topic.id);

      await supabase.from('content_feedback').insert({
        user_id: user.id,
        topic_id: topic.id,
        feedback_type: 'builder_approved',
        feedback_text: JSON.stringify({ checklist, action: 'approved' }),
      });

      await supabase.rpc('increment_builder_stat', {
        p_user_id: user.id,
        p_stat_key: 'reviews_done',
      });

      await supabase.from('user_points_history').insert({
        user_id: user.id,
        points: 30,
        reason: 'Academy: Builder content validated',
      });

      track('builder_review_completed', {
        topic_id: topic.id,
        action: 'approved',
      });

      toast.success('Topic schválen a publikován!');
      onAction?.('approved');
    } catch (err) {
      console.error(err);
      toast.error('Chyba při schvalování.');
    } finally {
      setLoading(null);
    }
  };

  const handleSuggestChanges = async () => {
    if (!suggestions.trim()) {
      toast.error('Napište návrhy změn.');
      return;
    }
    setLoading('suggest');
    try {
      await supabase.from('content_feedback').insert({
        user_id: user.id,
        topic_id: topic.id,
        feedback_type: 'builder_suggestions',
        feedback_text: suggestions,
      });

      await supabase.rpc('increment_builder_stat', {
        p_user_id: user.id,
        p_stat_key: 'reviews_done',
      });

      await supabase.from('user_points_history').insert({
        user_id: user.id,
        points: 15,
        reason: 'Academy: Builder suggestion',
      });

      track('builder_review_completed', {
        topic_id: topic.id,
        action: 'suggested',
      });

      toast.success('Návrhy odeslány adminovi.');
      onAction?.('suggested');
    } catch (err) {
      console.error(err);
      toast.error('Chyba při odesílání návrhů.');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Uveďte důvod zamítnutí.');
      return;
    }
    setLoading('reject');
    try {
      await supabase.from('topics').update({
        status: 'draft',
        is_reviewed: false,
      }).eq('id', topic.id);

      await supabase.from('content_feedback').insert({
        user_id: user.id,
        topic_id: topic.id,
        feedback_type: 'builder_rejected',
        feedback_text: rejectReason,
      });

      await supabase.rpc('increment_builder_stat', {
        p_user_id: user.id,
        p_stat_key: 'reviews_done',
      });

      track('builder_review_completed', {
        topic_id: topic.id,
        action: 'rejected',
      });

      toast.success('Topic zamítnut.');
      onAction?.('rejected');
    } catch (err) {
      console.error(err);
      toast.error('Chyba při zamítání.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Topic Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-4 h-4" />
            {topic.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline">{topic.status}</Badge>
            {topic.discipline && <Badge variant="secondary">{topic.discipline}</Badge>}
          </div>

          {/* Content preview */}
          {topic.full_text_content && (
            <div className="max-h-[400px] overflow-y-auto rounded-lg bg-[hsl(var(--mn-surface-2))] p-4 prose prose-sm dark:prose-invert">
              <ReactMarkdown>{topic.full_text_content}</ReactMarkdown>
            </div>
          )}

          {topic.bullet_points_summary && (
            <div className="mt-4 p-3 rounded-lg bg-[hsl(var(--mn-surface-2))]">
              <p className="text-xs font-medium text-[hsl(var(--mn-muted))] mb-2">Shrnutí:</p>
              <p className="text-sm">{topic.bullet_points_summary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kontrolní seznam</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {REVIEW_CHECKLIST.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Checkbox
                  checked={!!checklist[item.id]}
                  onCheckedChange={(checked) =>
                    setChecklist((prev) => ({ ...prev, [item.id]: checked }))
                  }
                />
                <span className="text-sm">
                  {item.icon} {item.label}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleApprove}
              disabled={!!loading}
            >
              {loading === 'approve' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Schválit
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowSuggestions(!showSuggestions); setShowReject(false); }}
              disabled={!!loading}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Navrhnout změny
            </Button>
            <Button
              variant="destructive"
              onClick={() => { setShowReject(!showReject); setShowSuggestions(false); }}
              disabled={!!loading}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Zamítnout
            </Button>
          </div>

          {showSuggestions && (
            <div className="space-y-2 pt-2">
              <Textarea
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                placeholder="Popište navrhované změny..."
                rows={3}
              />
              <Button
                size="sm"
                onClick={handleSuggestChanges}
                disabled={loading === 'suggest' || !suggestions.trim()}
              >
                {loading === 'suggest' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Odeslat návrhy
              </Button>
            </div>
          )}

          {showReject && (
            <div className="space-y-2 pt-2">
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Důvod zamítnutí (povinný)..."
                rows={3}
              />
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReject}
                disabled={loading === 'reject' || !rejectReason.trim()}
              >
                {loading === 'reject' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Potvrdit zamítnutí
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
