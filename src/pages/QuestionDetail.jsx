import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronLeft, 
  Bookmark, 
  BookmarkCheck,
  Eye,
  EyeOff,
  Save,
  Loader2,
  FileDown
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import DifficultyIndicator from '@/components/ui/DifficultyIndicator';
import StatusBadge from '@/components/ui/StatusBadge';
import VisibilityBadge from '@/components/common/VisibilityBadge';
import AnswerSection from '@/components/questions/AnswerSection';
import QuestionActions from '@/components/questions/QuestionActions';
import QuestionAIAssistant from '@/components/ai/QuestionAIAssistant';
import { calculateNextReview, RATINGS } from '@/components/utils/srs';
import { canAccessContent } from '@/components/utils/permissions';
import jsPDF from 'jspdf';

export default function QuestionDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const questionId = urlParams.get('id');

  const [showAnswer, setShowAnswer] = useState(false);
  const [userNote, setUserNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: question, isLoading } = useQuery({
    queryKey: ['question', questionId],
    queryFn: async () => {
      const questions = await base44.entities.Question.filter({ id: questionId });
      return questions[0];
    },
    enabled: !!questionId
  });

  const { data: okruh } = useQuery({
    queryKey: ['okruh', question?.okruh_id],
    queryFn: async () => {
      const okruhy = await base44.entities.Okruh.filter({ id: question.okruh_id });
      return okruhy[0];
    },
    enabled: !!question?.okruh_id
  });

  const { data: topic } = useQuery({
    queryKey: ['topic', question?.topic_id],
    queryFn: async () => {
      const topics = await base44.entities.Topic.filter({ id: question.topic_id });
      return topics[0];
    },
    enabled: !!question?.topic_id
  });

  const { data: progress } = useQuery({
    queryKey: ['questionProgress', user?.id, questionId],
    queryFn: async () => {
      const results = await base44.entities.UserProgress.filter({ 
        user_id: user.id, 
        question_id: questionId 
      });
      if (results.length > 0) {
        setUserNote(results[0].user_note || '');
        return results[0];
      }
      return null;
    },
    enabled: !!user?.id && !!questionId
  });

  const { data: bookmark } = useQuery({
    queryKey: ['bookmark', user?.id, questionId],
    queryFn: async () => {
      const results = await base44.entities.Bookmark.filter({ 
        user_id: user.id, 
        entity_type: 'question',
        entity_id: questionId 
      });
      return results[0];
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
        return base44.entities.UserProgress.update(progress.id, updates);
      } else {
        return base44.entities.UserProgress.create({
          user_id: user.id,
          question_id: questionId,
          ...updates
        });
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
        return base44.entities.Bookmark.delete(bookmark.id);
      } else {
        return base44.entities.Bookmark.create({
          user_id: user.id,
          entity_type: 'question',
          entity_id: questionId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bookmark', user?.id, questionId]);
      queryClient.invalidateQueries(['bookmarks', user?.id]);
    }
  });

  const handleSaveNote = async () => {
    setNoteSaving(true);
    if (progress) {
      await base44.entities.UserProgress.update(progress.id, { user_note: userNote });
    } else {
      await base44.entities.UserProgress.create({
        user_id: user.id,
        question_id: questionId,
        user_note: userNote,
        status: 'new'
      });
    }
    queryClient.invalidateQueries(['questionProgress', user?.id, questionId]);
    setNoteSaving(false);
  };

  const exportToPDF = () => {
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

    // User notes
    if (userNote) {
      yPos += 10;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont(undefined, 'bold');
      doc.text('Moje poznamky:', margin, yPos);
      yPos += 8;
      doc.setFont(undefined, 'normal');
      const noteLines = doc.splitTextToSize(userNote, maxWidth);
      doc.text(noteLines, margin, yPos);
    }

    doc.save(`${question.title.substring(0, 30)}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Otázka nenalezena</p>
      </div>
    );
  }

  const hasAccess = canAccessContent(user, question.visibility);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
        <Link to={createPageUrl('Atestace')} className="hover:text-teal-600 transition-colors">
          Atestace
        </Link>
        {okruh && (
          <>
            <span>/</span>
            <Link to={createPageUrl('OkruhDetail') + `?id=${okruh.id}`} className="hover:text-teal-600 transition-colors">
              {okruh.title}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-slate-900 dark:text-white font-medium truncate max-w-[200px]">
          {question.title}
        </span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white mb-3">
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
            {user && question && (
              <QuestionAIAssistant 
                question={question} 
                user={user}
                onNoteSaved={() => queryClient.invalidateQueries(['questionProgress', user?.id, questionId])}
              />
            )}
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
              className={bookmark ? 'text-amber-500' : 'text-slate-400'}
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
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {question.question_text}
          </p>
        </CardContent>
      </Card>

      {/* Show/hide answer button */}
      {hasAccess ? (
        <>
          <Button
            onClick={() => setShowAnswer(!showAnswer)}
            variant="outline"
            className="w-full mb-6"
          >
            {showAnswer ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showAnswer ? 'Skrýt odpověď' : 'Zobrazit odpověď'}
          </Button>

          {/* Answer */}
          {showAnswer && (
            <>
              <AnswerSection
                answerRich={question.answer_rich}
                answerStructured={question.answer_structured}
                refs={question.refs}
                images={question.images}
              />

              {/* Actions */}
              <div className="mt-6">
                <QuestionActions
                  onAction={(action) => progressMutation.mutate(action)}
                  isLoading={progressMutation.isPending}
                  currentStatus={progress?.status}
                />
              </div>
            </>
          )}

          {/* Notes tab */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Moje poznámky</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Přidejte si vlastní poznámky k této otázce..."
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                className="min-h-[100px] mb-3"
              />
              <Button
                onClick={handleSaveNote}
                disabled={noteSaving}
                size="sm"
              >
                {noteSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Uložit poznámku
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="p-8 text-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Premium obsah
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Tato otázka je dostupná pouze pro Premium uživatele
          </p>
          <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
            <Link to={createPageUrl('Pricing')}>
              Upgradovat na Premium
            </Link>
          </Button>
        </Card>
      )}

      {/* Back button */}
      <div className="mt-8">
        <Button variant="ghost" asChild>
          <Link to={okruh ? createPageUrl('OkruhDetail') + `?id=${okruh.id}` : createPageUrl('Atestace')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Zpět na {okruh?.title || 'Atestace'}
          </Link>
        </Button>
      </div>
    </div>
  );
}