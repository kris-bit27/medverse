import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  useAcademyCourses,
  useAcademyLessons,
  useAcademyProgress,
  useAcademyCourseProgress,
  useUpdateProgress,
  useCheckAcademyAchievement,
  useAcademyProfile,
} from '@/hooks/useAcademy';
import { CONTENT_TYPE_ICONS, CONTENT_TYPE_LABELS, SANDBOX_TOKEN_COST, SANDBOX_DAILY_LIMIT } from '@/lib/academy-constants';
import { ACADEMY_ACHIEVEMENTS, ACADEMY_XP_REWARDS } from '@/lib/academy-achievements';
import { useAcademyTrack } from '@/hooks/useAcademyAnalytics';
import AcademyBreadcrumb from '@/components/academy/AcademyBreadcrumb';
import EvaluationPanel from '@/components/academy/EvaluationPanel';
import LessonCompleteBanner from '@/components/academy/LessonCompleteBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Send,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';

// ─── ArticleLesson ────────────────────────────────────────
function ArticleLesson({ lesson, onComplete }) {
  const content = lesson.content || {};
  const body = content.body || content.markdown || content.text || '';

  return (
    <div className="space-y-6">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>

      {content.clinical_pearl && (
        <Card className="border-teal-500/30 bg-teal-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-teal-700 dark:text-teal-400 mb-1">
                  Clinical Pearl
                </p>
                <p className="text-sm">{content.clinical_pearl}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {content.key_takeaways && content.key_takeaways.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Shrnutí</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.key_takeaways.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button onClick={onComplete} className="w-full sm:w-auto">
        <CheckCircle className="w-4 h-4 mr-2" />
        Dokončit lekci
      </Button>
    </div>
  );
}

// ─── QuizLesson ───────────────────────────────────────────
function QuizLesson({ lesson, onComplete, existingProgress }) {
  const content = lesson.content || {};
  const questions = content.questions || [];
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-[hsl(var(--mn-muted))]">
          <p>Tento kvíz zatím nemá žádné otázky.</p>
          <Button onClick={onComplete} className="mt-4">
            Přeskočit a dokončit
          </Button>
        </CardContent>
      </Card>
    );
  }

  const q = questions[currentQ];
  const isCorrect = selected === q?.correct;
  const correctCount = answers.filter((a) => a.correct).length;
  const scorePct = Math.round((correctCount / questions.length) * 100);
  const passed = scorePct >= 70;

  const handleAnswer = (optIndex) => {
    if (answered) return;
    setSelected(optIndex);
    setAnswered(true);
    setAnswers((prev) => [
      ...prev,
      { question: currentQ, selected: optIndex, correct: optIndex === q.correct },
    ]);
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setFinished(true);
      // Auto-complete handled via effect
    }
  };

  const handleRetry = () => {
    setCurrentQ(0);
    setSelected(null);
    setAnswered(false);
    setAnswers([]);
    setFinished(false);
  };

  if (finished) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <div className="text-4xl">{passed ? '🎉' : '😔'}</div>
          <h3 className="text-xl font-bold">
            {correctCount}/{questions.length} správně ({scorePct}%)
          </h3>
          <p className="text-[hsl(var(--mn-muted))]">
            {passed
              ? 'Gratulujeme! Kvíz jste úspěšně dokončili.'
              : 'Pro dokončení potřebujete alespoň 70%. Zkuste to znovu.'}
          </p>
          {passed ? (
            <Button onClick={() => onComplete(scorePct, answers)}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Pokračovat
            </Button>
          ) : (
            <Button variant="outline" onClick={handleRetry}>
              Zkusit znovu
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-[hsl(var(--mn-muted))]">
        <span>
          Otázka {currentQ + 1} z {questions.length}
        </span>
        <Progress
          value={((currentQ + 1) / questions.length) * 100}
          className="h-2 w-32"
        />
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="font-medium">{q.question}</p>

          <div className="space-y-2">
            {(q.options || []).map((opt, i) => {
              let cls = 'p-3 rounded-lg border cursor-pointer transition-all text-sm text-left w-full';
              if (!answered) {
                cls +=
                  selected === i
                    ? ' border-teal-500 bg-teal-500/10'
                    : ' border-[hsl(var(--mn-border))] hover:border-teal-500/50';
              } else {
                if (i === q.correct) {
                  cls += ' border-green-500 bg-green-500/10';
                } else if (i === selected && !isCorrect) {
                  cls += ' border-red-500 bg-red-500/10';
                } else {
                  cls += ' border-[hsl(var(--mn-border))] opacity-50';
                }
              }
              return (
                <button
                  key={i}
                  className={cls}
                  onClick={() => handleAnswer(i)}
                  disabled={answered}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {answered && q.explanation && (
            <div className="p-3 rounded-lg bg-[hsl(var(--mn-surface-2))] text-sm">
              <p className="font-medium mb-1">Vysvětlení:</p>
              <p className="text-[hsl(var(--mn-muted))]">{q.explanation}</p>
            </div>
          )}

          {answered && (
            <Button onClick={handleNext} className="w-full">
              {currentQ < questions.length - 1 ? 'Další otázka' : 'Zobrazit výsledky'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── SandboxLessonContent ─────────────────────────────────
function SandboxLessonContent({ lesson, onComplete, userId }) {
  const content = lesson.content || {};
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [storeTranscript, setStoreTranscript] = useState(false);
  const [dailyUsage, setDailyUsage] = useState(null);

  useEffect(() => {
    if (userId) {
      supabase
        .rpc('check_sandbox_daily_limit', { p_user_id: userId })
        .then(({ data }) => {
          if (data !== null && data !== undefined) setDailyUsage(data);
        })
        .catch(console.error);
    }
  }, [userId]);

  const handleSend = async () => {
    if (!prompt.trim() || sending) return;
    setSending(true);
    try {
      const clientRequestId = crypto.randomUUID();
      const { data, error } = await supabase.functions.invoke('academy-sandbox-run', {
        body: {
          client_request_id: clientRequestId,
          lesson_id: lesson.id,
          prompt: prompt.trim(),
          scenario_type: 'lesson',
          scenario_context: content.scenario || '',
          store_transcript: storeTranscript,
        },
      });

      if (error) throw error;

      setResponse(data?.ai_response || data?.response || 'AI odpověď není k dispozici.');
      setEvaluation(data?.evaluation || null);

      if (data?.evaluation?.overall_score >= 60) {
        onComplete(data.evaluation.overall_score);
      }

      setDailyUsage((prev) => (prev !== null ? prev + 1 : 1));
    } catch (err) {
      console.error('Sandbox error:', err);
      toast.error('Chyba při komunikaci s AI sandbox.');
    } finally {
      setSending(false);
    }
  };

  const remaining = dailyUsage !== null ? SANDBOX_DAILY_LIMIT - dailyUsage : null;

  return (
    <div className="space-y-4">
      {content.scenario && (
        <Card className="border-teal-500/30 bg-teal-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">Scénář</p>
                <p className="text-sm">{content.scenario}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {response && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AI odpověď</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-sm">{response}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {evaluation && <EvaluationPanel evaluation={evaluation} />}

      {!response && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
              placeholder="Napište svůj prompt..."
              className="min-h-[120px]"
            />
            <div className="flex items-center justify-between text-xs text-[hsl(var(--mn-muted))]">
              <span>{prompt.length}/2000 znaků</span>
              <span>Tato interakce stojí {SANDBOX_TOKEN_COST} tokenů</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="store-transcript"
                checked={storeTranscript}
                onChange={(e) => setStoreTranscript(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="store-transcript" className="text-xs text-[hsl(var(--mn-muted))]">
                Uložit záznam konverzace pro mé budoucí reference
              </label>
            </div>

            <div className="flex items-center justify-between">
              <Button onClick={handleSend} disabled={!prompt.trim() || sending}>
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Odeslat
              </Button>
              {remaining !== null && (
                <span className="text-xs text-[hsl(var(--mn-muted))]">
                  Zbývá {remaining}/{SANDBOX_DAILY_LIMIT} sandbox interakcí dnes
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── CaseStudyLesson ──────────────────────────────────────
function CaseStudyLesson({ lesson, onComplete, userId }) {
  const content = lesson.content || {};
  const patient = content.patient || {};
  const isStopTheAI = content.stop_the_ai === true;

  const [answer, setAnswer] = useState('');
  const [sending, setSending] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [response, setResponse] = useState(null);
  const [showIdeal, setShowIdeal] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim() || sending) return;
    setSending(true);
    try {
      const clientRequestId = crypto.randomUUID();
      const scenarioCtx = isStopTheAI
        ? `Pacient: ${patient.name || 'N/A'}, ${patient.age || 'N/A'} let. AI odpověď k posouzení: ${content.ai_response_with_error || ''}`
        : `Pacient: ${patient.name || 'N/A'}, ${patient.age || 'N/A'} let. Příznaky: ${patient.symptoms || 'N/A'}. Anamnéza: ${patient.history || 'N/A'}.`;

      const { data, error } = await supabase.functions.invoke('academy-sandbox-run', {
        body: {
          client_request_id: clientRequestId,
          lesson_id: lesson.id,
          prompt: answer.trim(),
          scenario_type: 'case_study',
          scenario_context: scenarioCtx,
          store_transcript: false,
        },
      });

      if (error) throw error;

      setResponse(data?.ai_response || data?.response || null);
      setEvaluation(data?.evaluation || null);

      if (data?.evaluation?.overall_score >= 60) {
        onComplete(data.evaluation.overall_score);
      }
    } catch (err) {
      console.error('Case study error:', err);
      toast.error('Chyba při odesílání odpovědi.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Patient info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Kazuistika</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {patient.name && <p><span className="font-medium">Pacient:</span> {patient.name}, {patient.age} let</p>}
          {patient.symptoms && <p><span className="font-medium">Příznaky:</span> {patient.symptoms}</p>}
          {patient.history && <p><span className="font-medium">Anamnéza:</span> {patient.history}</p>}
        </CardContent>
      </Card>

      {/* Stop the AI variant */}
      {isStopTheAI && content.ai_response_with_error && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              AI odpověď k posouzení
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{content.ai_response_with_error}</p>
          </CardContent>
        </Card>
      )}

      {/* Question */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-medium text-sm">
            {isStopTheAI
              ? 'Najděte problém v této AI odpovědi:'
              : content.question || 'Jaký je váš postup?'}
          </p>

          {!evaluation && (
            <>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Napište svou odpověď..."
                className="min-h-[120px]"
              />
              <Button onClick={handleSubmit} disabled={!answer.trim() || sending}>
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Odeslat
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* AI response */}
      {response && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Hodnocení AI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{response}</p>
          </CardContent>
        </Card>
      )}

      {evaluation && <EvaluationPanel evaluation={evaluation} />}

      {/* Ideal approach */}
      {content.ideal_approach && evaluation && (
        <Card>
          <CardContent className="p-4">
            <button
              className="flex items-center gap-2 text-sm font-medium w-full text-left"
              onClick={() => setShowIdeal(!showIdeal)}
            >
              {showIdeal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Ideální postup
            </button>
            {showIdeal && (
              <p className="text-sm mt-3 text-[hsl(var(--mn-muted))] whitespace-pre-wrap">
                {content.ideal_approach}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── InteractiveLesson ────────────────────────────────────
function InteractiveLesson({ lesson, onComplete }) {
  const content = lesson.content || {};
  const steps = content.steps || [];
  const [currentStep, setCurrentStep] = useState(0);

  if (steps.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-[hsl(var(--mn-muted))]">
          <p>Tato interaktivní lekce zatím nemá žádné kroky.</p>
          <Button onClick={onComplete} className="mt-4">
            Dokončit
          </Button>
        </CardContent>
      </Card>
    );
  }

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-[hsl(var(--mn-muted))]">
        <span>
          Krok {currentStep + 1} z {steps.length}
        </span>
        <Progress
          value={((currentStep + 1) / steps.length) * 100}
          className="h-2 w-32"
        />
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold">{step.title}</h3>
          <div className="text-sm whitespace-pre-wrap">{step.content}</div>

          {step.action && (
            <div className="p-3 rounded-lg bg-teal-500/5 border border-teal-500/20 text-sm">
              <p className="font-medium text-teal-700 dark:text-teal-400 mb-1">Akce:</p>
              <p>{step.action}</p>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep((c) => c - 1)}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Zpět
            </Button>
            {isLast ? (
              <Button onClick={onComplete}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Dokončit
              </Button>
            ) : (
              <Button onClick={() => setCurrentStep((c) => c + 1)}>
                Další
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main AcademyLesson ───────────────────────────────────
export default function AcademyLesson() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const updateProgress = useUpdateProgress();
  const checkAchievement = useCheckAcademyAchievement();
  const track = useAcademyTrack();

  const courseSlug = searchParams.get('course');
  const lessonSlug = searchParams.get('lesson');

  const { data: allCourses = [], isLoading: coursesLoading } = useAcademyCourses();
  const course = allCourses.find((c) => c.slug === courseSlug);

  const { data: lessons = [], isLoading: lessonsLoading } = useAcademyLessons(course?.id);
  const { data: allProgress = [], isLoading: progressLoading } = useAcademyProgress(user?.id);
  const { data: courseProgressList = [] } = useAcademyCourseProgress(user?.id);
  const { data: academyProfile } = useAcademyProfile(user?.id);

  const lesson = lessons.find((l) => l.slug === lessonSlug);
  const lessonIndex = lessons.findIndex((l) => l.slug === lessonSlug);
  const prevLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;

  const progressMap = {};
  for (const p of allProgress) {
    progressMap[p.lesson_id] = p;
  }

  const currentProgress = lesson ? progressMap[lesson.id] : null;
  const [completed, setCompleted] = useState(false);
  const startTimeRef = useRef(Date.now());

  // Mark as in_progress on mount + analytics
  useEffect(() => {
    if (lesson && user) {
      if (!currentProgress || currentProgress.status === 'not_started') {
        updateProgress.mutate({
          lessonId: lesson.id,
          status: 'in_progress',
        });
      }
      track('lesson_started', {
        lesson_id: lesson.id,
        content_type: lesson.content_type,
        course_id: course?.id,
      });
    }
    startTimeRef.current = Date.now();
  }, [lesson?.id]);

  const handleComplete = useCallback(
    (score, quizAnswers) => {
      if (!lesson || !user) return;
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      updateProgress.mutate(
        {
          lessonId: lesson.id,
          status: 'completed',
          score: score ?? undefined,
          timeSpentSeconds: timeSpent,
          quizAnswers: quizAnswers ?? undefined,
        },
        {
          onSuccess: async () => {
            setCompleted(true);

            // ── Analytics ──
            track('lesson_completed', {
              lesson_id: lesson.id,
              content_type: lesson.content_type,
              course_id: course?.id,
              score,
              time_spent_seconds: timeSpent,
            });

            // ── XP reward ──
            const xpAmount = lesson.xp_reward || ACADEMY_XP_REWARDS.lesson_complete;
            try {
              await supabase.from('user_points_history').insert({
                user_id: user.id,
                points: xpAmount,
                reason: `Academy: ${lesson.title}`,
              });
            } catch (e) {
              console.error('XP insert error:', e);
            }

            // ── Achievement checks ──
            const completedCount = allProgress.filter(
              (p) => p.status === 'completed'
            ).length + 1; // +1 for current

            // First lesson
            if (completedCount === 1) {
              checkAchievement.mutate({
                achievementType: 'academy_first_lesson',
                tokens: ACADEMY_ACHIEVEMENTS.academy_first_lesson.tokens,
                name: ACADEMY_ACHIEVEMENTS.academy_first_lesson.name,
              });
            }

            // 5 lessons
            if (completedCount === 5) {
              checkAchievement.mutate({
                achievementType: 'academy_5_lessons',
                tokens: ACADEMY_ACHIEVEMENTS.academy_5_lessons.tokens,
                name: ACADEMY_ACHIEVEMENTS.academy_5_lessons.name,
              });
            }

            // Perfect quiz
            if (lesson.content_type === 'quiz' && score === 100) {
              checkAchievement.mutate({
                achievementType: 'academy_first_quiz_perfect',
                tokens: ACADEMY_ACHIEVEMENTS.academy_first_quiz_perfect.tokens,
                name: ACADEMY_ACHIEVEMENTS.academy_first_quiz_perfect.name,
              });
            }

            // Sandbox: first interaction
            if (lesson.content_type === 'sandbox') {
              checkAchievement.mutate({
                achievementType: 'academy_first_sandbox',
                tokens: ACADEMY_ACHIEVEMENTS.academy_first_sandbox.tokens,
                name: ACADEMY_ACHIEVEMENTS.academy_first_sandbox.name,
              });
            }

            // Sandbox prompt master (score >= 90)
            if (lesson.content_type === 'sandbox' && score >= 90) {
              checkAchievement.mutate({
                achievementType: 'academy_prompt_master',
                tokens: ACADEMY_ACHIEVEMENTS.academy_prompt_master.tokens,
                name: ACADEMY_ACHIEVEMENTS.academy_prompt_master.name,
              });
            }

            // Case study: stop the AI safety champion
            if (
              lesson.content_type === 'case_study' &&
              lesson.content?.stop_the_ai === true &&
              score >= 60
            ) {
              checkAchievement.mutate({
                achievementType: 'academy_safety_champion',
                tokens: ACADEMY_ACHIEVEMENTS.academy_safety_champion.tokens,
                name: ACADEMY_ACHIEVEMENTS.academy_safety_champion.name,
              });
            }

            // ── Course completion check ──
            const allCourseLessonsComplete = lessons.every(
              (l) =>
                l.id === lesson.id ||
                allProgress.some(
                  (p) => p.lesson_id === l.id && p.status === 'completed'
                )
            );

            if (allCourseLessonsComplete && course) {
              track('course_completed', { course_id: course.id, level: course.level });

              // ── Level completion check ──
              const sameLevelCourses = allCourses.filter(
                (c) => c.level === course.level
              );
              const allLevelComplete = sameLevelCourses.every((c) => {
                if (c.id === course.id) return true;
                const cp = courseProgressList.find(
                  (p) => p.course_id === c.id
                );
                return cp && cp.completed_lessons >= cp.total_lessons;
              });

              if (allLevelComplete) {
                const achievementKey = `academy_level_${course.level}_complete`;
                const ach = ACADEMY_ACHIEVEMENTS[achievementKey];
                if (ach) {
                  checkAchievement.mutate({
                    achievementType: achievementKey,
                    tokens: ach.tokens,
                    name: ach.name,
                  });
                }

                track('level_completed', { level: course.level });

                // Auto-generate certificate
                try {
                  await supabase.from('academy_certificates').upsert(
                    {
                      user_id: user.id,
                      level: course.level,
                      issued_at: new Date().toISOString(),
                      is_public: false,
                    },
                    { onConflict: 'user_id,level' }
                  );
                } catch (e) {
                  console.error('Certificate generation error:', e);
                }

                toast.success(
                  `Gratulujeme! Dokončili jste Level ${course.level}!`
                );
              }
            }
          },
          onError: (err) => {
            console.error('Progress update error:', err);
            toast.error('Chyba při ukládání pokroku.');
          },
        }
      );
    },
    [lesson?.id, user?.id, allProgress, lessons, course, allCourses, courseProgressList]
  );

  const handleSandboxComplete = useCallback(
    (score) => {
      handleComplete(score);
    },
    [handleComplete]
  );

  const isLoading = coursesLoading || lessonsLoading || progressLoading;

  const breadcrumbItems = course
    ? [
        { label: 'Academy', href: createPageUrl('AcademyDashboard') },
        {
          label: course.title,
          href: createPageUrl('AcademyCourse') + `?slug=${courseSlug}`,
        },
        { label: lesson?.title || 'Lekce' },
      ]
    : [{ label: 'Academy', href: createPageUrl('AcademyDashboard') }];

  if (!isLoading && !lesson) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <AcademyBreadcrumb items={breadcrumbItems} />
        <Card>
          <CardContent className="p-8 text-center text-[hsl(var(--mn-muted))]">
            Lekce nebyla nalezena.
          </CardContent>
        </Card>
      </div>
    );
  }

  const courseCompleted =
    completed &&
    !nextLesson &&
    lessons.every(
      (l) => l.id === lesson?.id || progressMap[l.id]?.status === 'completed'
    );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <AcademyBreadcrumb items={breadcrumbItems} />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Top bar: lesson position + navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={!prevLesson}
                onClick={() =>
                  prevLesson &&
                  navigate(
                    createPageUrl('AcademyLesson') +
                      `?course=${courseSlug}&lesson=${prevLesson.slug}`
                  )
                }
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-[hsl(var(--mn-muted))]">
                Lekce {lessonIndex + 1}/{lessons.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!nextLesson}
                onClick={() =>
                  nextLesson &&
                  navigate(
                    createPageUrl('AcademyLesson') +
                      `?course=${courseSlug}&lesson=${nextLesson.slug}`
                  )
                }
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {lesson.xp_reward > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{lesson.xp_reward} XP
              </Badge>
            )}
          </div>

          {/* Lesson title */}
          <div>
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-[hsl(var(--mn-muted))]">
              <Badge variant="outline" className="text-xs">
                {CONTENT_TYPE_LABELS[lesson.content_type] || lesson.content_type}
              </Badge>
              {lesson.estimated_minutes && <span>~{lesson.estimated_minutes} min</span>}
            </div>
          </div>

          {/* Content based on type */}
          {completed ? (
            <LessonCompleteBanner
              xpEarned={lesson.xp_reward || 0}
              nextLessonSlug={nextLesson?.slug}
              courseSlug={courseSlug}
              courseCompleted={courseCompleted}
            />
          ) : (
            <>
              {lesson.content_type === 'article' && (
                <ArticleLesson lesson={lesson} onComplete={() => handleComplete()} />
              )}
              {lesson.content_type === 'quiz' && (
                <QuizLesson
                  lesson={lesson}
                  onComplete={(score, answers) => handleComplete(score, answers)}
                  existingProgress={currentProgress}
                />
              )}
              {lesson.content_type === 'sandbox' && (
                <SandboxLessonContent
                  lesson={lesson}
                  onComplete={handleSandboxComplete}
                  userId={user?.id}
                />
              )}
              {lesson.content_type === 'case_study' && (
                <CaseStudyLesson
                  lesson={lesson}
                  onComplete={handleSandboxComplete}
                  userId={user?.id}
                />
              )}
              {lesson.content_type === 'interactive' && (
                <InteractiveLesson lesson={lesson} onComplete={() => handleComplete()} />
              )}
              {lesson.content_type === 'video' && (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    {lesson.content?.video_url ? (
                      <div className="aspect-video">
                        <iframe
                          src={lesson.content.video_url}
                          className="w-full h-full rounded-lg"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <p className="text-[hsl(var(--mn-muted))]">Video není k dispozici.</p>
                    )}
                    <Button onClick={() => handleComplete()}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Dokončit lekci
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
