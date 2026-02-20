/**
 * AdminAcademyContent.jsx — Admin panel for managing AI Academy lesson content
 * Used as a tab in AdminConsole.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Sparkles,
  Pencil,
  RefreshCw,
  AlertTriangle,
  BookOpen,
  Zap,
  Terminal,
  Stethoscope,
  ClipboardCheck,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';

const TYPE_ICONS = {
  article: BookOpen,
  interactive: Zap,
  sandbox: Terminal,
  case_study: Stethoscope,
  quiz: ClipboardCheck,
  video: Play,
};

const TYPE_LABELS = {
  article: 'Článek',
  interactive: 'Interaktivní',
  sandbox: 'Sandbox',
  case_study: 'Case Study',
  quiz: 'Kvíz',
  video: 'Video',
};

function hasContent(content) {
  return content && typeof content === 'object' && Object.keys(content).length > 0;
}

export default function AdminAcademyContent() {
  const qc = useQueryClient();
  const [editLesson, setEditLesson] = useState(null);
  const [editJson, setEditJson] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  // Fetch all lessons with course info
  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['admin-academy-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_lessons')
        .select('id, title, slug, content_type, content, order_index, metadata, is_active, course_id, academy_courses(title, level, order_index)')
        .order('order_index');
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 15000,
  });

  // Generate content mutation
  const generateMutation = useMutation({
    mutationFn: async ({ lessonId, forceRegenerate = false }) => {
      const { data, error } = await supabase.functions.invoke(
        'academy-generate-content',
        {
          body: { lesson_id: lessonId, force_regenerate: forceRegenerate },
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-academy-lessons'] });
      toast.success(
        `Obsah vygenerován (${data.model}, $${(data.cost_usd || 0).toFixed(4)})`
      );
    },
    onError: (err) => {
      toast.error(`Chyba generování: ${err.message}`);
    },
  });

  // Save edited JSON
  const saveMutation = useMutation({
    mutationFn: async ({ lessonId, content }) => {
      const { error } = await supabase
        .from('academy_lessons')
        .update({ content })
        .eq('id', lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-academy-lessons'] });
      toast.success('Obsah uložen.');
      setEditLesson(null);
    },
    onError: (err) => {
      toast.error(`Chyba ukládání: ${err.message}`);
    },
  });

  const handleEditOpen = (lesson) => {
    setEditLesson(lesson);
    setEditJson(JSON.stringify(lesson.content || {}, null, 2));
    setJsonError(null);
  };

  const handleEditSave = () => {
    try {
      const parsed = JSON.parse(editJson);
      setJsonError(null);
      saveMutation.mutate({ lessonId: editLesson.id, content: parsed });
    } catch (e) {
      setJsonError('Nevalidní JSON: ' + e.message);
    }
  };

  const handleBulkGenerate = async () => {
    const missing = lessons.filter(
      (l) =>
        !hasContent(l.content) &&
        l.is_active &&
        ['article', 'quiz', 'case_study'].includes(l.content_type)
    );

    if (missing.length === 0) {
      toast.info('Všechny generovatelné lekce už mají obsah.');
      return;
    }

    if (!confirm(`Generovat obsah pro ${missing.length} lekcí? Odhadovaná cena: ~$${(missing.length * 0.05).toFixed(2)}`)) {
      return;
    }

    setBulkRunning(true);
    setBulkProgress({ current: 0, total: missing.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < missing.length; i++) {
      setBulkProgress({ current: i + 1, total: missing.length });
      try {
        await generateMutation.mutateAsync({
          lessonId: missing[i].id,
          forceRegenerate: false,
        });
        successCount++;
      } catch {
        failCount++;
      }
      // Small delay between calls
      if (i < missing.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    setBulkRunning(false);
    qc.invalidateQueries({ queryKey: ['admin-academy-lessons'] });
    toast.success(`Bulk hotovo: ${successCount} úspěch, ${failCount} chyb.`);
  };

  // Group lessons by course
  const grouped = {};
  for (const lesson of lessons) {
    const courseKey = lesson.course_id || 'unknown';
    if (!grouped[courseKey]) {
      grouped[courseKey] = {
        courseTitle: lesson.academy_courses?.title || 'Neznámý kurz',
        courseLevel: lesson.academy_courses?.level || 0,
        courseOrder: lesson.academy_courses?.order_index || 0,
        lessons: [],
      };
    }
    grouped[courseKey].lessons.push(lesson);
  }

  const sortedGroups = Object.values(grouped).sort(
    (a, b) => a.courseLevel - b.courseLevel || a.courseOrder - b.courseOrder
  );

  // Stats
  const totalLessons = lessons.length;
  const withContent = lessons.filter((l) => hasContent(l.content)).length;
  const needsGeneration = lessons.filter(
    (l) =>
      !hasContent(l.content) &&
      l.is_active &&
      ['article', 'quiz', 'case_study'].includes(l.content_type)
  ).length;
  const pct = totalLessons > 0 ? Math.round((withContent / totalLessons) * 100) : 0;

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[hsl(var(--mn-muted))]">Celkem lekcí</p>
            <p className="text-2xl font-bold">{totalLessons}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[hsl(var(--mn-muted))]">S obsahem</p>
            <p className="text-2xl font-bold text-[hsl(var(--mn-success))]">{withContent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[hsl(var(--mn-muted))]">K vygenerování</p>
            <p className="text-2xl font-bold text-[hsl(var(--mn-accent-2))]">{needsGeneration}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[hsl(var(--mn-muted))]">Pokrytí</p>
            <p className="text-2xl font-bold">{pct}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress + bulk action */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Pokrytí obsahem</h3>
            <Button
              size="sm"
              onClick={handleBulkGenerate}
              disabled={bulkRunning || needsGeneration === 0}
            >
              {bulkRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {bulkProgress.current}/{bulkProgress.total}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generovat vše chybějící ({needsGeneration})
                </>
              )}
            </Button>
          </div>
          <Progress value={pct} className="h-3" />
          {bulkRunning && (
            <div className="mt-2">
              <Progress
                value={(bulkProgress.current / bulkProgress.total) * 100}
                className="h-2"
              />
              <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">
                Generuji lekci {bulkProgress.current}/{bulkProgress.total}...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lesson table grouped by course */}
      {sortedGroups.map((group) => (
        <Card key={group.courseTitle}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Level {group.courseLevel}
              </Badge>
              {group.courseTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--mn-border))]">
                    <th className="text-left p-3 text-[hsl(var(--mn-muted))] font-medium">Lekce</th>
                    <th className="text-left p-3 text-[hsl(var(--mn-muted))] font-medium">Typ</th>
                    <th className="text-center p-3 text-[hsl(var(--mn-muted))] font-medium">Obsah</th>
                    <th className="text-center p-3 text-[hsl(var(--mn-muted))] font-medium">Review</th>
                    <th className="text-right p-3 text-[hsl(var(--mn-muted))] font-medium">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {group.lessons
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((lesson) => {
                      const Icon = TYPE_ICONS[lesson.content_type] || BookOpen;
                      const has = hasContent(lesson.content);
                      const reviewStatus = lesson.metadata?.review_status;
                      const canGenerate = ['article', 'quiz', 'case_study'].includes(
                        lesson.content_type
                      );
                      const isGenerating =
                        generateMutation.isPending &&
                        generateMutation.variables?.lessonId === lesson.id;

                      return (
                        <tr
                          key={lesson.id}
                          className="border-b border-[hsl(var(--mn-border))] last:border-0 hover:bg-[hsl(var(--mn-surface-2))]"
                        >
                          <td className="p-3">
                            <span className="font-medium">{lesson.title}</span>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs gap-1">
                              <Icon className="w-3 h-3" />
                              {TYPE_LABELS[lesson.content_type] || lesson.content_type}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            {has ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-[hsl(var(--mn-muted))] mx-auto" />
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {reviewStatus === 'pending' && (
                              <Badge className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-0">
                                Pending
                              </Badge>
                            )}
                            {reviewStatus === 'approved' && (
                              <Badge className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-0">
                                Schváleno
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Generate/Regenerate */}
                              {canGenerate && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isGenerating || bulkRunning}
                                  onClick={() => {
                                    if (has) {
                                      if (
                                        !confirm(
                                          `Přepsat existující obsah lekce "${lesson.title}"?`
                                        )
                                      )
                                        return;
                                    }
                                    generateMutation.mutate({
                                      lessonId: lesson.id,
                                      forceRegenerate: has,
                                    });
                                  }}
                                  title={has ? 'Regenerovat' : 'Generovat'}
                                >
                                  {isGenerating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : has ? (
                                    <RefreshCw className="w-4 h-4" />
                                  ) : (
                                    <Sparkles className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                              {/* Edit JSON */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditOpen(lesson)}
                                title="Editovat JSON"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* JSON Editor Dialog */}
      <Dialog open={!!editLesson} onOpenChange={(open) => !open && setEditLesson(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Editovat obsah: {editLesson?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Badge variant="outline" className="text-xs">
              {TYPE_LABELS[editLesson?.content_type] || editLesson?.content_type}
            </Badge>
            <Textarea
              value={editJson}
              onChange={(e) => {
                setEditJson(e.target.value);
                setJsonError(null);
              }}
              className="min-h-[400px] font-mono text-xs"
              placeholder="{}"
            />
            {jsonError && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {jsonError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLesson(null)}>
              Zrušit
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
