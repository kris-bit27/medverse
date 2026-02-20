import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import {
  useAcademyCourses,
  useAcademyLessons,
  useAcademyCourseProgress,
} from '@/hooks/useAcademy';
import { ACADEMY_LEVELS, CONTENT_TYPE_LABELS } from '@/lib/academy-constants';
import AcademyBreadcrumb from '@/components/academy/AcademyBreadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Clock, BookOpen } from 'lucide-react';

function CourseCard({ course, progress, allCourses, allCourseProgress, navigate }) {
  const completedLessons = progress?.completed_lessons || 0;
  const totalLessons = progress?.total_lessons || 0;
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Check prerequisites
  const prereqs = course.academy_course_prerequisites || [];
  let locked = false;
  let lockReason = '';
  for (const prereq of prereqs) {
    const prereqCourse = allCourses.find((c) => c.id === prereq.prerequisite_course_id);
    const prereqProgress = allCourseProgress.find(
      (cp) => cp.course_id === prereq.prerequisite_course_id
    );
    const prereqComplete =
      prereqProgress &&
      prereqProgress.completed_lessons === prereqProgress.total_lessons &&
      prereqProgress.total_lessons > 0;
    if (!prereqComplete) {
      locked = true;
      lockReason = prereqCourse
        ? `Nejdříve dokončete: ${prereqCourse.title}`
        : 'Splňte předpoklady';
      break;
    }
  }

  return (
    <Card
      className={`transition-all ${
        locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'
      }`}
      onClick={() => {
        if (!locked) {
          navigate(createPageUrl('AcademyCourse') + `?slug=${course.slug}`);
        }
      }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{course.icon || '📘'}</span>
            <div>
              <h3 className="font-semibold text-base">{course.title}</h3>
              <p className="text-sm text-[hsl(var(--mn-muted))] mt-1 line-clamp-2">
                {course.description}
              </p>
            </div>
          </div>
          {locked && <Lock className="w-5 h-5 text-[hsl(var(--mn-muted))] shrink-0" />}
        </div>

        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-[hsl(var(--mn-muted))]">
            <Clock className="w-3 h-3" />
            ~{course.estimated_minutes || 30} min
          </div>
          {course.is_free && (
            <Badge
              variant="secondary"
              className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-0"
            >
              ZDARMA
            </Badge>
          )}
          {course.xp_reward > 0 && (
            <Badge variant="secondary" className="text-xs">
              +{course.xp_reward} XP
            </Badge>
          )}
        </div>

        <Progress value={progressPct} className="h-2 mb-2" />
        <div className="flex justify-between text-xs text-[hsl(var(--mn-muted))]">
          <span>
            {completedLessons}/{totalLessons} lekcí
          </span>
          {locked && <span className="text-yellow-600 dark:text-yellow-400">{lockReason}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AcademyLevel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const level = Number(searchParams.get('level')) || 1;
  const levelInfo = ACADEMY_LEVELS[level] || ACADEMY_LEVELS[1];

  const { data: courses = [], isLoading: coursesLoading } = useAcademyCourses(level);
  const { data: allCourses = [] } = useAcademyCourses();
  const { data: courseProgress = [], isLoading: cpLoading } = useAcademyCourseProgress(user?.id);

  const breadcrumbItems = [
    { label: 'Academy', href: createPageUrl('AcademyDashboard') },
    { label: `Level ${level}: ${levelInfo.labelCs}` },
  ];

  const isLoading = coursesLoading || cpLoading;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <AcademyBreadcrumb items={breadcrumbItems} />

      {/* Level Header */}
      <div className="flex items-center gap-4">
        <span className="text-4xl">{levelInfo.icon}</span>
        <div>
          <h1 className="text-2xl font-bold">
            Level {level}: {levelInfo.labelCs}
          </h1>
          <p className="text-[hsl(var(--mn-muted))]">{levelInfo.label}</p>
        </div>
      </div>

      {/* Course List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-[hsl(var(--mn-muted))]">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Zatím žádné kurzy v tomto levelu.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const progress = courseProgress.find((cp) => cp.course_id === course.id);
            return (
              <CourseCard
                key={course.id}
                course={course}
                progress={progress}
                allCourses={allCourses}
                allCourseProgress={courseProgress}
                navigate={navigate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
