import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  BookOpen,
  List,
  Microscope,
  Target,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Shield,
  AlertTriangle
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ReactMarkdown from 'react-markdown';
import DifficultyIndicator from '@/components/ui/DifficultyIndicator';
import StatusBadge from '@/components/ui/StatusBadge';
import HighlightableText from '@/components/study/HighlightableText';
import TopicNotes from '@/components/study/TopicNotes.jsx';
import HTMLContent from '@/components/study/HTMLContent';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EmptyState from '@/components/common/EmptyState';
import { FloatingCopilot } from '@/components/FloatingCopilot';

export default function TopicDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('id');
  const [activeView, setActiveView] = useState('full');
  const [notesKey, setNotesKey] = useState(0);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const handleNoteCreated = () => {
    setNotesKey(prev => prev + 1);
  };

  const { data: topic, isLoading, isError, error } = useQuery({
    queryKey: ['topic', topicId],
    queryFn: async () => {
      const topics = await base44.entities.Topic.filter({ id: topicId });
      return topics[0];
    },
    enabled: !!topicId
  });

  const { data: okruh } = useQuery({
    queryKey: ['okruh', topic?.okruh_id],
    queryFn: async () => {
      const okruhy = await base44.entities.Okruh.filter({ id: topic.okruh_id });
      return okruhy[0];
    },
    enabled: !!topic?.okruh_id
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['topicQuestions', topicId],
    queryFn: () => base44.entities.Question.filter({ topic_id: topicId }),
    enabled: !!topicId
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: () => base44.entities.UserProgress.filter({ user_id: user.id }),
    enabled: !!user?.id
  });

  const handleGeneratePracticeQuestions = async () => {
    if (!topic) return;
    const MAX_SOURCE_CHARS = 8000;
    const sourceText = (topic.full_text_content || topic.bullet_points_summary || '').slice(0, MAX_SOURCE_CHARS);
    const prompt = `Na základě následujícího studijního obsahu vygeneruj 5 atestačních otázek pro opakování:

Téma: ${topic.title}
${sourceText}

Vytvoř otázky různé obtížnosti, které testují klíčové koncepty z tohoto tématu.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini-1.5-pro',
        maxTokens: 2048,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  question_text: { type: "string" },
                  answer_rich: { type: "string" },
                  difficulty: { type: "number" }
                },
                required: ["title", "question_text", "answer_rich", "difficulty"]
              }
            }
          },
          required: ["questions"]
        }
      });

      if (!response?.questions || !Array.isArray(response.questions)) {
        throw new Error('AI nevrátila seznam otázek');
      }

      const generatedQuestions = response.questions.map(q => ({
        ...q,
        okruh_id: topic.okruh_id,
        topic_id: topic.id,
        visibility: 'public'
      }));

      await base44.entities.Question.bulkCreate(generatedQuestions);
      alert(`Vygenerováno ${generatedQuestions.length} nových otázek pro opakování!`);
      window.location.reload();
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Chyba při generování otázek');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nepodařilo se načíst téma. {error?.message || 'Zkuste to prosím znovu.'}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button variant="outline" asChild>
            <Link to={createPageUrl('Atestace')}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Zpět na studium
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <EmptyState
          icon={BookOpen}
          title="Téma nenalezeno"
          description="Toto téma neexistuje nebo bylo smazáno"
          action={
            <Button asChild>
              <Link to={createPageUrl('Atestace')}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Zpět na studium
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const hasContent = topic.overview_md || topic.principles_md || topic.full_text_content || topic.bullet_points_summary || topic.deep_dive_content;
  const hasNewTemplate = topic.overview_md || topic.principles_md || topic.relations_md;

  return (
    <div className="mn-reading p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
        <Link to={createPageUrl('Atestace')} className="hover:text-teal-600 transition-colors">
          Studium
        </Link>
        <span>/</span>
        {okruh && (
          <>
            <Link 
              to={createPageUrl('OkruhDetail') + `?id=${okruh.id}`}
              className="hover:text-teal-600 transition-colors"
            >
              {okruh.title}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-slate-900 dark:text-white font-medium">{topic.title}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-3 mb-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
            {topic.title}
          </h1>
          {topic.is_reviewed ? (
            <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Ověřeno odborníkem
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              AI Draft - vyžaduje odbornou kontrolu
            </Badge>
          )}
        </div>
        
        {topic.learning_objectives && topic.learning_objectives.length > 0 && (
          <Card className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
            <CardContent className="p-4">
              <h3 className="font-semibold text-teal-900 dark:text-teal-100 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Výukové cíle
              </h3>
              <ul className="space-y-1 text-sm text-teal-800 dark:text-teal-200">
                {topic.learning_objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-teal-600 dark:text-teal-400 mt-0.5">•</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* AI-generated metadata: sources and warnings */}
        {(topic.sources?.length > 0 || topic.warnings?.length > 0) && (
          <div className="space-y-3 mt-4">
            {topic.sources?.length > 0 && (
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    📚 Citované zdroje ({topic.sources.length})
                  </h3>
                  <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
                    {topic.sources.map((source, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                        <span>{source}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {topic.warnings?.length > 0 && (
              <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription>
                  <div className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    ⚠️ Vyžaduje ověření odborníkem
                  </div>
                  <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
                    {topic.warnings.map((warning, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>

      {/* Content - New Template or Legacy */}
      {hasNewTemplate ? (
        <div className="space-y-6 mb-8">
          {/* 1. Přehled */}
          {topic.overview_md && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Přehled
                </h2>
                <HTMLContent content={topic.overview_md} />
              </CardContent>
            </Card>
          )}

          {/* 2. Základní principy */}
          {topic.principles_md && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Základní principy
                </h2>
                <HTMLContent content={topic.principles_md} />
              </CardContent>
            </Card>
          )}

          {/* 3. Souvislosti a vztahy */}
          {topic.relations_md && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Souvislosti a vztahy
                </h2>
                <HTMLContent content={topic.relations_md} />
              </CardContent>
            </Card>
          )}

          {/* 4. Klinické myšlení */}
          {topic.clinical_thinking_md && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Klinické myšlení
                </h2>
                <HTMLContent content={topic.clinical_thinking_md} />
              </CardContent>
            </Card>
          )}

          {/* 5. Časté chyby */}
          {topic.common_pitfalls_md && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Časté chyby a slepé uličky
                </h2>
                <HTMLContent content={topic.common_pitfalls_md} />
              </CardContent>
            </Card>
          )}

          {/* 6. Mentální model */}
          {topic.mental_model_md && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Mentální model
                </h2>
                <HTMLContent content={topic.mental_model_md} />
              </CardContent>
            </Card>
          )}

          {/* 7. Mini-scénáře */}
          {topic.scenarios_md && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Mini-scénáře
                </h2>
                <HTMLContent content={topic.scenarios_md} />
              </CardContent>
            </Card>
          )}

          {/* 8. Klíčové body */}
          {topic.key_takeaways_md && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Klíčové body k zapamatování
                </h2>
                <HTMLContent content={topic.key_takeaways_md} />
              </CardContent>
            </Card>
          )}

          {/* 9. Hippo vysvětluje */}
        </div>
      ) : hasContent ? (
        <Tabs value={activeView} onValueChange={setActiveView} className="mb-8">
          <TabsList className="mn-segmented grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="full" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Plný text
            </TabsTrigger>
            <TabsTrigger value="bullets" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              High-Yield
            </TabsTrigger>
            <TabsTrigger value="deepdive" className="flex items-center gap-2">
              <Microscope className="w-4 h-4" />
              Deep Dive
            </TabsTrigger>
          </TabsList>

          <TabsContent value="full">
            <Card>
              <CardContent className="p-6">
                {topic.full_text_content ? (
                  <div className="high-yield-content">
                    <HTMLContent content={topic.full_text_content} />
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">
                    Plný text zatím není dostupný
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bullets">
            <Card>
              <CardContent className="p-6">
                {topic.bullet_points_summary ? (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 italic">
                      Toto jsou klíčové znalosti, které si máš odnést.
                    </p>
                    <div className="high-yield-content">
                      <HTMLContent content={topic.bullet_points_summary} />
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">
                    High-Yield obsah zatím není dostupný
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deepdive">
            <Card>
              <CardContent className="p-6">
                {topic.deep_dive_content ? (
                  <div className="high-yield-content">
                    <HTMLContent content={topic.deep_dive_content} />
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">
                    Podrobný obsah zatím není dostupný
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-2">Studijní obsah zatím není k dispozici</p>
            <p className="text-sm text-slate-400">Přidejte obsah v admin panelu</p>
          </CardContent>
        </Card>
      )}

      {/* User Notes */}
      {hasContent && (
        <div className="mb-8">
          <TopicNotes key={notesKey} topicId={topicId} user={user} />
        </div>
      )}

      {/* Generate practice questions */}
      {hasContent && (
        <Card className="mb-8 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-600" />
                  Procvičování
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Vygenerujte otázky pro procvičení tohoto tématu pomocí AI
                </p>
              </div>
              <Button onClick={handleGeneratePracticeQuestions} className="flex-shrink-0">
                <Sparkles className="w-4 h-4 mr-2" />
                Generovat otázky
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions list */}
      {questions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Otázky k tomuto tématu ({questions.length})
          </h2>
          <div className="space-y-2">
            {questions.map((question) => {
              const questionProgress = progress.find(p => p.question_id === question.id);
              return (
                <Link
                  key={question.id}
                  to={createPageUrl('QuestionDetail') + `?id=${question.id}`}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {question.title}
                    </p>
                    <DifficultyIndicator level={question.difficulty || 1} />
                  </div>
                  <StatusBadge status={questionProgress?.status || 'new'} size="sm" />
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <FloatingCopilot
        topicContent={topic.full_text_content || topic.bullet_points_summary || ''}
        topicTitle={topic.title || ''}
      />
    </div>
  );
}
