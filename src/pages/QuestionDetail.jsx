import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  Bookmark, 
  BookmarkCheck,
  FileDown,
  CheckCircle2,
  Sparkles,
  Brain,
  StickyNote,
  AlertCircle
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DifficultyIndicator from '@/components/ui/DifficultyIndicator';
import StatusBadge from '@/components/ui/StatusBadge';
import VisibilityBadge from '@/components/common/VisibilityBadge';
import QuestionActions from '@/components/questions/QuestionActions';
import OfficialAnswerTab from '@/components/questions/OfficialAnswerTab';
import AIExamTab from '@/components/questions/AIExamTab';
import QuizFlashcardsTab from '@/components/questions/QuizFlashcardsTab';
import NotesTab from '@/components/questions/NotesTab';
import { calculateNextReview, RATINGS } from '@/components/utils/srs';
import { canAccessContent } from '@/components/utils/permissions';
import { canUseFeature } from '@/components/utils/featureAccess';
import jsPDF from 'jspdf';

export default function QuestionDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const questionId = urlParams.get('id');

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; }
  });

  const { data: question, isLoading, error: questionError } = useQuery({
    queryKey: ['question', questionId],
    queryFn: async () => {
      const questions = await supabase.from('questions').select('*').eq('id', questionId ).then(r => r.data || []);
      return questions[0];
    },
    enabled: !!questionId,
    retry: 2
  });

  const { data: okruh } = useQuery({
    queryKey: ['okruh', question?.okruh_id],
    queryFn: async () => {
      const okruhy = await supabase.from('okruhy').select('*').eq('id', question.okruh_id ).then(r => r.data || []);
      return okruhy[0];
    },
    enabled: !!question?.okruh_id
  });

  const { data: topic } = useQuery({
    queryKey: ['topic', question?.topic_id],
    queryFn: async () => {
      const topics = await supabase.from('topics').select('*').eq('id', question.topic_id ).then(r => r.data || []);
      return topics[0];
    },
    enabled: !!question?.topic_id
  });

  const { data: progress } = useQuery({
    queryKey: ['questionProgress', user?.id, questionId],
    queryFn: async () => {
      const { data: results } = await supabase.from('user_flashcard_progress').select('*')
        .eq('user_id', user.id)
        .eq('flashcard_id', questionId);
      return results?.[0] || null;
    },
    enabled: !!user?.id && !!questionId
  });

  const { data: bookmark } = useQuery({
    queryKey: ['bookmark', user?.id, questionId],
    queryFn: async () => {
      const { data: results } = await supabase.from('bookmarks').select('*')
        .eq('user_id', user.id)
        .eq('entity_type', 'question')
        .eq('entity_id', questionId);
      return results?.[0];
    },
    enabled: !!user?.id && !!questionId
  });

  // Mutations
  const progressMutation = useMutation({
    mutationFn: async (action) => {
      const rating = action === 'mastered' ? RATINGS.EASY : 
                    action === 'learning' ? RATINGS.MEDIUM : RATINGS.HARD;
      
      const updates = calculateNextReview(progress || {}, rating);
      
      if (progress) {
        return supabase.from('user_flashcard_progress').update(updates).eq('id', progress.id).select().single().then(r => r.data);
      } else {
        return supabase.from('user_flashcard_progress').insert({
          user_id: user.id,
          flashcard_id: questionId,
          ...updates
        }).select().single().then(r => r.data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['questionProgress', user?.id, questionId]);
      queryClient.invalidateQueries(['userProgress', user?.id]);
    }
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (bookmark) {
        return supabase.from('bookmarks').delete().eq('id', bookmark.id);
      } else {
        return supabase.from('bookmarks').insert({
          user_id: user.id,
          entity_type: 'question',
          entity_id: questionId
        }).select().single().then(r => r.data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bookmark', user?.id, questionId]);
      queryClient.invalidateQueries(['bookmarks', user?.id]);
    }
  });

  const exportToPDF = () => {
    const pdfCheck = canUseFeature(user, 'pdf_export');
    if (!pdfCheck.allowed) {
      alert(pdfCheck.reason);
      return;
    }
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPos = 20;

    // Title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    const titleLines = doc.splitTextToSize(question.title, maxWidth);
    doc.text(titleLines, margin, yPos);
    yPos += titleLines.length * 8 + 10;

    // Question text
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Otazka:', margin, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');
    const questionLines = doc.splitTextToSize(question.question_text, maxWidth);
    doc.text(questionLines, margin, yPos);
    yPos += questionLines.length * 6 + 10;

    // Answer
    if (question.answer_rich) {
      doc.setFont(undefined, 'bold');
      doc.text('Odpoved:', margin, yPos);
      yPos += 8;
      doc.setFont(undefined, 'normal');
      const answerLines = doc.splitTextToSize(question.answer_rich, maxWidth);
      answerLines.forEach(line => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, margin, yPos);
        yPos += 6;
      });
    }

    doc.save(`${question.title.substring(0, 30)}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Načítám otázku..." />
      </div>
    );
  }

  if (questionError) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nepodařilo se načíst otázku. Zkuste to prosím znovu.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Otázka nenalezena
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasAccess = canAccessContent(user, question.visibility);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[hsl(var(--mn-muted))] mb-6">
        <Link to={createPageUrl('Studium')} className="hover:text-[hsl(var(--mn-accent))] transition-colors">
          Studium
        </Link>
        {okruh && (
          <>
            <span>/</span>
            <Link to={createPageUrl('OkruhDetail') + `?id=${okruh.id}`} className="hover:text-[hsl(var(--mn-accent))] transition-colors">
              {okruh.title}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[hsl(var(--mn-text))] font-medium truncate max-w-[200px]">
          {question.title}
        </span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-xl lg:text-2xl font-bold text-[hsl(var(--mn-text))] mb-3">
              {question.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <DifficultyIndicator level={question.difficulty || 1} />
              <StatusBadge status={progress?.status || 'new'} />
              {topic && <Badge variant="outline">{topic.title}</Badge>}
              <VisibilityBadge visibility={question.visibility} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={exportToPDF}
              title="Export do PDF"
            >
              <FileDown className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => bookmarkMutation.mutate()}
              className={bookmark ? 'text-[hsl(var(--mn-warn))]' : 'text-[hsl(var(--mn-muted))]'}
            >
              {bookmark ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Question text */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Otázka</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--mn-muted))] leading-relaxed whitespace-pre-wrap">
            {question.question_text}
          </p>
        </CardContent>
      </Card>

      {/* Tab layout */}
      {hasAccess ? (
        <>
          <Tabs defaultValue="official" className="mb-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="official" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Oficiální odpověď
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Hippo vysvětluje
              </TabsTrigger>
              <TabsTrigger value="quiz" className="gap-2">
                <Brain className="w-4 h-4" />
                Procvičování
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-2">
                <StickyNote className="w-4 h-4" />
                Poznámky
              </TabsTrigger>
            </TabsList>

            <TabsContent value="official" className="mt-6">
              <OfficialAnswerTab question={question} />
            </TabsContent>

            <TabsContent value="ai" className="mt-6">
              <AIExamTab
                question={question}
                user={user}
                topic={topic}
                onNoteSaved={() => queryClient.invalidateQueries(['userNotes', user?.id, questionId])}
              />
            </TabsContent>

            <TabsContent value="quiz" className="mt-6">
              <QuizFlashcardsTab question={question} user={user} topic={topic} />
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              <NotesTab question={question} user={user} />
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <QuestionActions
            onAction={(action) => progressMutation.mutate(action)}
            isLoading={progressMutation.isPending}
            currentStatus={progress?.status}
          />
        </>
      ) : (
        <Card className="p-8 text-center bg-gradient-to-br from-[hsl(var(--mn-warn)/0.06)] to-[hsl(var(--mn-warn)/0.04)] border-[hsl(var(--mn-warn)/0.2)]">
          <h3 className="text-lg font-semibold text-[hsl(var(--mn-text))] mb-2">
            Premium obsah
          </h3>
          <p className="text-[hsl(var(--mn-muted))] mb-4">
            Tato otázka je dostupná pouze pro Premium uživatele
          </p>
          <Button asChild className="bg-gradient-to-r from-[hsl(var(--mn-warn))] to-[#f97316] hover:opacity-90">
            <Link to={createPageUrl('Pricing')}>
              Upgradovat na Premium
            </Link>
          </Button>
        </Card>
      )}

      {/* Back button */}
      <div className="mt-8">
        <Button variant="ghost" asChild>
          <Link to={okruh ? createPageUrl('OkruhDetail') + `?id=${okruh.id}` : createPageUrl('Studium')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Zpět na {okruh?.title || 'Studium'}
          </Link>
        </Button>
      </div>
    </div>
  );
}