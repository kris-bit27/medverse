import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import {
  useAcademyCourses,
  useAcademyLessons,
  useAcademyProgress,
} from '@/hooks/useAcademy';
import { ACADEMY_LEVELS, CONTENT_TYPE_ICONS, CONTENT_TYPE_LABELS } from '@/lib/academy-constants';
import AcademyBreadcrumb from '@/components/academy/AcademyBreadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, CheckCircle, Clock, PlayCircle, Circle } from 'lucide-react';

function LessonCard({ lesson, index, status, score, isLocked, courseSlug, navigate }) {
  const ContentIcon = CONTENT_TYPE_ICONS[lesson.content_type] || Circle;
  const contentLabel = CONTENT_TYPE_LABELS[lesson.content_type] || lesson.content_type;

  const statusIcon =
    status === 'completed' ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : status === 'in_progress' ? (
      <PlayCircle className="w-5 h-5 text-teal-500" />
    ) : (
      <Circle className="w-5 h-5 text-[hsl(var(--mn-muted))]" />
    );

  return (
    <Card
      className={`transition-all ${
        isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'
      }`}
      onClick={() => {
        if (!isLocked) {
          navigate(
            createPageUrl('AcademyLesson') +
              `?course=${courseSlug}&lesson=${lesson.slug}`
          );
        }
      }}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div className="shrink-0">{isLocked ? <Lock className="w-5 h-5 text-[hsl(var(--mn-muted))]" /> : statusIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{lesson.title}</span>
            <Badge variant="outline" className="text-xs shrink-0">
              <ContentIcon className="w-3 h-3 mr-1" />
              {contentLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-[hsl(var(--mn-muted))]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ~{lesson.estimated_minutes || 5} min
            </span>
            {lesson.xp_reward > 0 && <span>+{lesson.xp_reward} XP</span>}
          </div>
        </div>
        {score !== null && score !== undefined && (
          <Badge
            variant="secondary"
            className={`shrink-0 ${
              score >= 70 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
            } border-0`}
          >
            {score}%
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

export default function AcademyCourse() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const slug = searchParams.get('slug');

  const { data: allCourses = [], isLoading: coursesLoading } = useAcademyCourses();
  const course = allCourses.find((c) => c.slug === slug);

  const { data: lessons = [], isLoading: lessonsLoading } = useAcademyLessons(course?.id);
  const { data: allProgress = [], isLoading: progressLoading } = useAcademyProgress(user?.id);

  const progressMap = {};
  for (const p of allProgress) {
    progressMap[p.lesson_id] = p;
  }

  const levelInfo = course ? ACADEMY_LEVELS[course.level] : null;

  const completedCount = lessons.filter(
    (l) => progressMap[l.id]?.status === 'completed'
  ).length;
  const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const totalXp = lessons.reduce((sum, l) => sum + (l.xp_reward || 0), 0);
  const totalMinutes = lessons.reduce((sum, l) => sum + (l.estimated_minutes || 5), 0);

  const breadcrumbItems = course
    ? [
        { label: 'Academy', href: createPageUrl('AcademyDashboard') },
        {
          label: `Level ${course.level}`,
          href: createPageUrl('AcademyLevel') + `?level=${course.level}`,
        },
        { label: course.title },
      ]
    : [{ label: 'Academy', href: createPageUrl('AcademyDashboard') }];

  const isLoading = coursesLoading || lessonsLoading || progressLoading;

  if (!isLoading && !course) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <AcademyBreadcrumb items={breadcrumbItems} />
        <Card>
          <CardContent className="p-8 text-center text-[hsl(var(--mn-muted))]">
            Kurz nebyl nalezen.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <AcademyBreadcrumb items={breadcrumbItems} />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Course Header */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <span className="text-3xl">{course.icon || '📘'}</span>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{course.title}</h1>
                <p className="text-[hsl(var(--mn-muted))] mt-1">
                  {course.description}
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-[hsl(var(--mn-muted))]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    ~{totalMinutes} min
                  </span>
                  <span>+{totalXp} XP celkem</span>
                  {course.is_free && (
                    <Badge
                      variant="secondary"
                      className="bg-green-500/10 text-green-600 dark:text-green-400 border-0"
                    >
                      ZDARMA
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Progress value={progressPct} className="h-2" />
            <div className="text-xs text-[hsl(var(--mn-muted))]">
              {completedCount}/{lessons.length} lekcí dokončeno ({progressPct}%)
            </div>
          </div>

          {/* Lesson List */}
          <div className="space-y-3">
            {lessons.map((lesson, index) => {
              const progress = progressMap[lesson.id];
              const status = progress?.status || 'not_started';
              const score = progress?.score ?? null;

              // Lock: if previous lesson not completed and index > 0
              const isLocked =
                index > 0 &&
                !(progressMap[lessons[index - 1]?.id]?.status === 'completed');

              return (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  index={index}
                  status={status}
                  score={score}
                  isLocked={isLocked}
                  courseSlug={slug}
                  navigate={navigate}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
