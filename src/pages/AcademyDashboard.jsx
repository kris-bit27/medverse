import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import {
  useAcademyCourseProgress,
  useAcademySkillRadar,
  useAcademyProgress,
  useAcademyCertificates,
  useAcademyProfile,
  useAcademyCourses,
} from '@/hooks/useAcademy';
import { ACADEMY_LEVELS } from '@/lib/academy-constants';
import SkillRadarChart from '@/components/academy/SkillRadarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Zap,
  ArrowRight,
  Lock,
  CheckCircle,
  Clock,
  Award,
  BookOpen,
  Rocket,
} from 'lucide-react';

export default function AcademyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedTrack, setSelectedTrack] = React.useState(
    () => localStorage.getItem('academy_track') || 'clinician'
  );

  const handleTrackChange = (track) => {
    setSelectedTrack(track);
    localStorage.setItem('academy_track', track);
  };

  const { data: profile, isLoading: profileLoading } = useAcademyProfile(user?.id);
  const { data: courseProgress = [], isLoading: cpLoading } = useAcademyCourseProgress(user?.id);
  const { data: skillRadar, isLoading: radarLoading } = useAcademySkillRadar(user?.id);
  const { data: allProgress = [], isLoading: progressLoading } = useAcademyProgress(user?.id);
  const { data: certificates = [], isLoading: certsLoading } = useAcademyCertificates(user?.id);
  const { data: allCourses = [] } = useAcademyCourses();

  const academyLevel = profile?.academy_level || 1;
  const academyXp = profile?.academy_xp || 0;

  // Filter courses by selected track (null track = show always)
  const trackCourses = allCourses.filter(
    (c) => !c.track || c.track === selectedTrack
  );

  // Determine which levels are unlocked
  const levelCompletionMap = {};
  for (let l = 1; l <= 4; l++) {
    const coursesInLevel = courseProgress.filter((cp) => {
      const course = trackCourses.find((c) => c.id === cp.course_id);
      return course?.level === l;
    });
    const total = trackCourses.filter((c) => c.level === l).length;
    const completed = coursesInLevel.filter(
      (cp) => cp.completed_lessons === cp.total_lessons && cp.total_lessons > 0
    ).length;
    levelCompletionMap[l] = { completed, total, coursesInLevel };
  }

  const isLevelUnlocked = (level) => {
    if (level === 1) return true;
    const prev = levelCompletionMap[level - 1];
    return prev && prev.total > 0 && prev.completed === prev.total;
  };

  // Find next incomplete lesson for 7-Minute Drill
  const findNextLesson = () => {
    const completedLessonIds = new Set(
      allProgress.filter((p) => p.status === 'completed').map((p) => p.lesson_id)
    );
    for (const course of allCourses.filter((c) => c.level === academyLevel).sort((a, b) => a.order_index - b.order_index)) {
      // We'd need lessons data; navigate to first unlocked course instead
      return course.slug;
    }
    return null;
  };

  // Recent activity - last 5 progress entries
  const recentActivity = [...allProgress]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5);

  const isLoading = profileLoading || cpLoading;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            🧠 AI Academy
            <Badge className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-0">
              Level {academyLevel}
            </Badge>
          </h1>
          <p className="text-[hsl(var(--mn-muted))] mt-1">
            Naučte se efektivně využívat AI v klinické praxi
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
            {academyXp}
          </div>
          <div className="text-xs text-[hsl(var(--mn-muted))]">XP</div>
        </div>
      </div>

      {/* Track Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-[hsl(var(--mn-muted))]">Track:</span>
        {[
          { value: 'clinician', label: 'Clinician', icon: '🩺' },
          { value: 'research', label: 'Research', icon: '🔬' },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => handleTrackChange(t.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selectedTrack === t.value
                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                : 'bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))] border border-transparent hover:border-[hsl(var(--mn-border))]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 7-Minute Drill CTA */}
      <Card className="bg-gradient-to-r from-teal-600 to-teal-500 text-white border-0">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Denní 7minutový trénink</h2>
              <p className="text-white/80 text-sm">
                1 lekce + 1 kvíz + 1 sandbox prompt
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            className="bg-white text-teal-700 hover:bg-white/90"
            onClick={() => {
              const slug = findNextLesson();
              if (slug) {
                navigate(createPageUrl('AcademyCourse') + `?slug=${slug}`);
              } else {
                navigate(createPageUrl('AcademyLevel') + '?level=1');
              }
            }}
          >
            Začít
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Level Progress Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Úrovně</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(ACADEMY_LEVELS).map(([levelNum, levelInfo]) => {
              const level = Number(levelNum);
              const unlocked = isLevelUnlocked(level);
              const lc = levelCompletionMap[level] || { completed: 0, total: 0 };
              const totalLessons = lc.coursesInLevel?.reduce(
                (sum, cp) => sum + (cp.total_lessons || 0),
                0
              ) || 0;
              const completedLessons = lc.coursesInLevel?.reduce(
                (sum, cp) => sum + (cp.completed_lessons || 0),
                0
              ) || 0;
              const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
              const isComplete = totalLessons > 0 && completedLessons === totalLessons;

              return (
                <Card
                  key={level}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !unlocked ? 'opacity-60' : ''
                  }`}
                  onClick={() => {
                    if (unlocked) {
                      navigate(createPageUrl('AcademyLevel') + `?level=${level}`);
                    }
                  }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{levelInfo.icon}</span>
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            Level {level}: {levelInfo.labelCs}
                            {level === 1 && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-0"
                              >
                                ZDARMA
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-[hsl(var(--mn-muted))]">
                            {levelInfo.label}
                          </div>
                        </div>
                      </div>
                      {!unlocked ? (
                        <Lock className="w-5 h-5 text-[hsl(var(--mn-muted))]" />
                      ) : isComplete ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : null}
                    </div>
                    <Progress value={progressPct} className="h-2 mb-2" />
                    <div className="flex justify-between text-xs text-[hsl(var(--mn-muted))]">
                      <span>
                        {completedLessons}/{totalLessons} lekcí
                      </span>
                      <span>
                        {!unlocked
                          ? '🔒 Zamčeno'
                          : isComplete
                          ? 'Dokončeno ✓'
                          : 'Otevřený'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Skill Radar Chart */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Dovednostní radar</h2>
        <Card>
          <CardContent className="p-6">
            {radarLoading ? (
              <Skeleton className="h-[300px] rounded-xl" />
            ) : skillRadar ? (
              <SkillRadarChart data={skillRadar} size={300} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-[hsl(var(--mn-muted))]">
                <div className="text-center">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Dokončete první lekce pro zobrazení radaru</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Nedávná aktivita</h2>
        <Card>
          <CardContent className="p-4">
            {progressLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="py-8 text-center text-[hsl(var(--mn-muted))]">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Zatím žádná aktivita. Začněte první lekcí!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--mn-surface-2))]"
                  >
                    <div className="flex items-center gap-3">
                      {item.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : item.status === 'in_progress' ? (
                        <Clock className="w-4 h-4 text-teal-500" />
                      ) : (
                        <BookOpen className="w-4 h-4 text-[hsl(var(--mn-muted))]" />
                      )}
                      <span className="text-sm">Lekce {item.lesson_id?.slice(0, 8)}...</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[hsl(var(--mn-muted))]">
                      {item.score !== null && item.score !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {item.score}%
                        </Badge>
                      )}
                      <span>
                        {new Date(item.updated_at).toLocaleDateString('cs-CZ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Certificates */}
      {(certificates.length > 0 || certsLoading) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Moje certifikáty</h2>
            <Link
              to={createPageUrl('AcademyCertificates')}
              className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
            >
              Zobrazit vše
            </Link>
          </div>
          {certsLoading ? (
            <div className="flex gap-4 overflow-x-auto">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-64 rounded-xl shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {certificates.map((cert) => (
                <Card key={cert.id} className="shrink-0 w-64">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4 text-teal-500" />
                      <span className="font-medium text-sm">{cert.title}</span>
                    </div>
                    <div className="text-xs text-[hsl(var(--mn-muted))]">
                      {new Date(cert.issued_at).toLocaleDateString('cs-CZ')}
                    </div>
                    <Link
                      to={createPageUrl('AcademyCertificates')}
                      className="text-xs text-teal-600 dark:text-teal-400 hover:underline mt-2 inline-block"
                    >
                      Zobrazit
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Links: Prompt Library + Builder Program */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to={createPageUrl('AcademyPromptLibrary')}>
          <Card className="cursor-pointer hover:shadow-md transition-all h-full">
            <CardContent className="p-5 flex items-center gap-4">
              <span className="text-3xl">📋</span>
              <div>
                <h3 className="font-semibold">Knihovna promptů</h3>
                <p className="text-sm text-[hsl(var(--mn-muted))]">
                  Připravené šablony pro klinickou praxi
                </p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto text-[hsl(var(--mn-muted))]" />
            </CardContent>
          </Card>
        </Link>
        <Link to={createPageUrl('AcademyBuilder')}>
          <Card className="cursor-pointer hover:shadow-md transition-all h-full">
            <CardContent className="p-5 flex items-center gap-4">
              <Rocket className="w-8 h-8 text-pink-500" />
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  Builder Program
                  <Badge className="bg-pink-500/10 text-pink-500 border-0 text-[10px]">Level 4</Badge>
                </h3>
                <p className="text-sm text-[hsl(var(--mn-muted))]">
                  Staňte se contributorem platformy
                </p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto text-[hsl(var(--mn-muted))]" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
