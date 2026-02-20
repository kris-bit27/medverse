import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Clock,
  CheckCircle,
  BarChart3,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = '#14b8a6' }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${color}14` }}
          >
            <Icon style={{ width: 16, height: 16, color }} />
          </div>
          <span className="text-xs text-[hsl(var(--mn-muted))] font-medium uppercase tracking-wider">
            {label}
          </span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {sub && (
          <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAcademyAnalytics() {
  // Active users (users who have at least one progress record)
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-academy-analytics'],
    queryFn: async () => {
      const [
        progressRes,
        lessonsRes,
        coursesRes,
        certsRes,
        sandboxRes,
        eventsRes,
      ] = await Promise.all([
        supabase.from('academy_user_progress').select('user_id, status, score, time_spent_seconds'),
        supabase
          .from('academy_lessons')
          .select('id, title, content_type, course_id, academy_courses(title, level)')
          .eq('is_active', true),
        supabase
          .from('academy_courses')
          .select('id, title, level')
          .eq('is_active', true),
        supabase
          .from('academy_certificates')
          .select('id, user_id, level'),
        supabase
          .from('academy_sandbox_sessions')
          .select('id, user_id, created_at'),
        supabase
          .from('analytics_events')
          .select('id, event_type, created_at')
          .like('event_type', 'lesson_%')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      const progress = progressRes.data || [];
      const lessons = lessonsRes.data || [];
      const courses = coursesRes.data || [];
      const certs = certsRes.data || [];
      const sandboxSessions = sandboxRes.data || [];
      const events = eventsRes.data || [];

      // Unique active users
      const activeUsers = new Set(progress.map((p) => p.user_id)).size;

      // Completion stats
      const completed = progress.filter((p) => p.status === 'completed');
      const avgScore =
        completed.length > 0
          ? Math.round(
              completed.reduce((sum, p) => sum + (p.score || 0), 0) /
                completed.filter((p) => p.score != null).length || 0
            )
          : 0;

      const totalTimeSeconds = completed.reduce(
        (sum, p) => sum + (p.time_spent_seconds || 0),
        0
      );
      const avgTimeMinutes =
        completed.length > 0
          ? Math.round(totalTimeSeconds / completed.length / 60)
          : 0;

      // Per-lesson stats
      const lessonStats = lessons.map((l) => {
        const lessonProgress = progress.filter((p) => p.lesson_id === l.id);
        const lessonCompleted = lessonProgress.filter(
          (p) => p.status === 'completed'
        );
        const scores = lessonCompleted
          .filter((p) => p.score != null)
          .map((p) => p.score);
        return {
          id: l.id,
          title: l.title,
          content_type: l.content_type,
          course_title: l.academy_courses?.title || '?',
          level: l.academy_courses?.level || 0,
          started: lessonProgress.length,
          completed: lessonCompleted.length,
          avg_score: scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null,
          completion_rate:
            lessonProgress.length > 0
              ? Math.round(
                  (lessonCompleted.length / lessonProgress.length) * 100
                )
              : 0,
        };
      });

      // Per-level completion
      const levelStats = [1, 2, 3, 4].map((level) => {
        const levelCerts = certs.filter((c) => c.level === level);
        return {
          level,
          certified: new Set(levelCerts.map((c) => c.user_id)).size,
        };
      });

      return {
        activeUsers,
        totalLessons: lessons.length,
        totalCourses: courses.length,
        completions: completed.length,
        avgScore,
        avgTimeMinutes,
        sandboxSessions: sandboxSessions.length,
        certificates: certs.length,
        lessonStats: lessonStats.sort(
          (a, b) => b.completed - a.completed
        ),
        levelStats,
        recentEventsCount: events.length,
      };
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Aktivní studenti"
          value={stats.activeUsers}
          sub="unikátních uživatelů"
        />
        <StatCard
          icon={CheckCircle}
          label="Dokončení"
          value={stats.completions}
          sub={`avg ${stats.avgTimeMinutes} min / lekce`}
          color="#10B981"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg skóre"
          value={stats.avgScore > 0 ? `${stats.avgScore}%` : '–'}
          sub="u hodnocených lekcí"
          color="#8B5CF6"
        />
        <StatCard
          icon={GraduationCap}
          label="Certifikáty"
          value={stats.certificates}
          sub={`${stats.sandboxSessions} sandbox relací`}
          color="#F59E0B"
        />
      </div>

      {/* Level completion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Certifikace dle levelu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {stats.levelStats.map((ls) => (
              <div
                key={ls.level}
                className="text-center p-3 rounded-lg bg-[hsl(var(--mn-surface-2))]"
              >
                <p className="text-xs text-[hsl(var(--mn-muted))] mb-1">
                  Level {ls.level}
                </p>
                <p className="text-xl font-bold">{ls.certified}</p>
                <p className="text-xs text-[hsl(var(--mn-muted))]">
                  certifikovaných
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lesson stats table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Statistiky lekcí ({stats.totalLessons})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[hsl(var(--mn-muted))]">
                  <th className="px-4 py-2 font-medium">Lekce</th>
                  <th className="px-4 py-2 font-medium">Kurz</th>
                  <th className="px-4 py-2 font-medium">Typ</th>
                  <th className="px-4 py-2 font-medium text-right">Zahájeno</th>
                  <th className="px-4 py-2 font-medium text-right">Dokončeno</th>
                  <th className="px-4 py-2 font-medium text-right">% úspěch</th>
                  <th className="px-4 py-2 font-medium text-right">Avg skóre</th>
                </tr>
              </thead>
              <tbody>
                {stats.lessonStats.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-[hsl(var(--mn-border)/0.3)] hover:bg-[hsl(var(--mn-surface-2)/0.5)]"
                  >
                    <td className="px-4 py-2 font-medium max-w-[200px] truncate">
                      {l.title}
                    </td>
                    <td className="px-4 py-2 text-[hsl(var(--mn-muted))] max-w-[150px] truncate">
                      {l.course_title}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {l.content_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right">{l.started}</td>
                    <td className="px-4 py-2 text-right">{l.completed}</td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={
                          l.completion_rate >= 70
                            ? 'text-green-500'
                            : l.completion_rate >= 40
                            ? 'text-yellow-500'
                            : 'text-[hsl(var(--mn-muted))]'
                        }
                      >
                        {l.completion_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {l.avg_score != null ? `${l.avg_score}%` : '–'}
                    </td>
                  </tr>
                ))}
                {stats.lessonStats.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[hsl(var(--mn-muted))]">
                      Zatím žádná data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
