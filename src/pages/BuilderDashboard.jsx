import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { useAcademyProfile } from '@/hooks/useAcademy';
import { useAcademyTrack } from '@/hooks/useAcademyAnalytics';
import BuilderOnboarding from '@/components/academy/BuilderOnboarding';
import AcademyBreadcrumb from '@/components/academy/AcademyBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle, Star, Zap, ClipboardList, ArrowRight, MessageSquare,
  BookOpen, ExternalLink, Loader2,
} from 'lucide-react';

const ROLE_LABELS = {
  content_validator: { label: 'Content Validator', icon: '✅' },
  prompt_architect: { label: 'Prompt Architect', icon: '✍️' },
  feature_designer: { label: 'Feature Designer', icon: '🎨' },
  safety_reviewer: { label: 'Safety Reviewer', icon: '🛡️' },
};

function StatCard({ icon: Icon, label, value, sub, color = '#EC4899' }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}14` }}>
            <Icon style={{ width: 14, height: 14, color }} />
          </div>
          <span className="text-[10px] text-[hsl(var(--mn-muted))] font-medium uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function BuilderDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const track = useAcademyTrack();
  const { data: profile, isLoading: profileLoading } = useAcademyProfile(user?.id);

  // Fetch builder application (accepted)
  const { data: application, isLoading: appLoading, refetch } = useQuery({
    queryKey: ['builder-application', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_builder_applications')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Redirect if not a builder
  if (!profileLoading && !profile?.is_builder) {
    navigate(createPageUrl('AcademyBuilder'), { replace: true });
    return null;
  }

  // Open tasks based on role
  const builderRole = application?.role_applied || profile?.builder_role;

  const { data: pendingTopics = [], isLoading: topicsLoading } = useQuery({
    queryKey: ['builder-pending-topics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, title, status, created_at, okruh_id')
        .eq('status', 'in_review')
        .eq('is_reviewed', false)
        .order('created_at', { ascending: true })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: builderRole === 'content_validator' || builderRole === 'safety_reviewer',
  });

  const { data: emptyLessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ['builder-empty-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_lessons')
        .select('id, title, content_type, course_id')
        .eq('content', '{}')
        .eq('is_active', true)
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: builderRole === 'prompt_architect',
  });

  // My contributions
  const { data: myContributions = [] } = useQuery({
    queryKey: ['builder-contributions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_feedback')
        .select('id, entity_type, entity_id, feedback_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const isLoading = profileLoading || appLoading;

  // Track page view
  React.useEffect(() => {
    if (application) {
      track('builder_dashboard_viewed', {
        role: builderRole,
        open_tasks_count: pendingTopics.length + emptyLessons.length,
      });
    }
  }, [application?.id]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  // Show onboarding if accepted but not onboarded
  if (application && !application.onboarded_at) {
    return <BuilderOnboarding application={application} onComplete={refetch} />;
  }

  const stats = application?.contribution_stats || {};
  const roleInfo = ROLE_LABELS[builderRole] || { label: builderRole, icon: '🔧' };

  const FEATURE_REQUESTS = [
    { title: 'Tmavý režim pro tiskové verze', type: 'UX' },
    { title: 'Mobilní notifikace pro spaced repetition', type: 'Feature' },
    { title: 'Export studijního plánu do kalendáře', type: 'Feature' },
    { title: 'Vylepšení AI konzultanta — follow-up otázky', type: 'AI' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <AcademyBreadcrumb
        items={[
          { label: 'Academy', href: createPageUrl('AcademyDashboard') },
          { label: 'Builder Dashboard' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Builder Dashboard
            <Badge className="bg-pink-500/10 text-pink-600 dark:text-pink-400 border-0">
              {roleInfo.icon} {roleInfo.label}
            </Badge>
          </h1>
          <p className="text-[hsl(var(--mn-muted))] mt-1">
            Vítej zpět! Zde najdeš své úkoly a statistiky.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={CheckCircle}
          label="Reviews"
          value={stats.reviews_done || 0}
          sub="provedených"
        />
        <StatCard
          icon={BookOpen}
          label="Vytvořeno"
          value={(stats.prompts_created || 0) + (stats.topics_validated || 0)}
          sub="příspěvků"
          color="#10B981"
        />
        <StatCard
          icon={Star}
          label="Kvalita"
          value={stats.quality_score != null ? `${stats.quality_score}/5` : '–'}
          sub={stats.quality_score != null ? 'hodnocení admina' : 'zatím nehodnoceno'}
          color="#F59E0B"
        />
        <StatCard
          icon={Zap}
          label="XP"
          value={profile?.academy_xp || 0}
          sub="celkem"
          color="#8B5CF6"
        />
      </div>

      {/* Open Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Otevřené úkoly
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(builderRole === 'content_validator' || builderRole === 'safety_reviewer') && (
            <>
              {topicsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
              ) : pendingTopics.length === 0 ? (
                <div className="p-8 text-center text-[hsl(var(--mn-muted))]">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Žádné topics čekající na review.</p>
                </div>
              ) : (
                <div>
                  {pendingTopics.map((topic, i) => (
                    <Link
                      key={topic.id}
                      to={`${createPageUrl('TopicDetail')}?id=${topic.id}&builder=1`}
                      className="flex items-center justify-between p-4 hover:bg-[hsl(var(--mn-surface-2)/0.5)] transition-colors"
                      style={{
                        borderBottom: i < pendingTopics.length - 1 ? '1px solid hsl(var(--mn-border) / 0.3)' : 'none',
                      }}
                    >
                      <div>
                        <p className="font-medium text-sm">{topic.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">Content Validation</Badge>
                          <span className="text-xs text-[hsl(var(--mn-muted))]">
                            {new Date(topic.created_at).toLocaleDateString('cs-CZ')}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[hsl(var(--mn-muted))]" />
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {builderRole === 'prompt_architect' && (
            <>
              {lessonsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
              ) : emptyLessons.length === 0 ? (
                <div className="p-8 text-center text-[hsl(var(--mn-muted))]">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Žádné lekce bez obsahu.</p>
                </div>
              ) : (
                <div>
                  {emptyLessons.map((lesson, i) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-4"
                      style={{
                        borderBottom: i < emptyLessons.length - 1 ? '1px solid hsl(var(--mn-border) / 0.3)' : 'none',
                      }}
                    >
                      <div>
                        <p className="font-medium text-sm">{lesson.title}</p>
                        <Badge variant="outline" className="text-[10px] mt-1">
                          {lesson.content_type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {builderRole === 'feature_designer' && (
            <div>
              {FEATURE_REQUESTS.map((fr, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4"
                  style={{
                    borderBottom: i < FEATURE_REQUESTS.length - 1 ? '1px solid hsl(var(--mn-border) / 0.3)' : 'none',
                  }}
                >
                  <div>
                    <p className="font-medium text-sm">{fr.title}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{fr.type}</Badge>
                  </div>
                </div>
              ))}
              <div className="p-4 border-t border-[hsl(var(--mn-border)/0.3)]">
                <Button variant="outline" size="sm" className="text-xs">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Navrhnout vylepšení
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Contributions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Moje příspěvky</CardTitle>
        </CardHeader>
        <CardContent>
          {myContributions.length === 0 ? (
            <p className="text-sm text-[hsl(var(--mn-muted))] text-center py-4">
              Zatím žádné příspěvky. Začněte prvním review!
            </p>
          ) : (
            <div className="space-y-2">
              {myContributions.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--mn-surface-2))]"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {c.feedback_type}
                    </Badge>
                    <span className="text-xs text-[hsl(var(--mn-muted))]">
                      {c.entity_type} #{c.entity_id?.slice(0, 8)}
                    </span>
                  </div>
                  <span className="text-xs text-[hsl(var(--mn-muted))]">
                    {new Date(c.created_at).toLocaleDateString('cs-CZ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
