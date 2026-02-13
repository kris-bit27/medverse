import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TopicNotes from '@/components/TopicNotes';
import FlashcardGenerator from '@/components/FlashcardGenerator';
import ExistingFlashcards from '@/components/ExistingFlashcards';
import ReactMarkdown from 'react-markdown';
import { 
  BookOpen, Zap, Layers, StickyNote, Sparkles,
  ArrowLeft, ChevronRight, AlertTriangle, FileText,
  LinkIcon, Target, TrendingUp
} from 'lucide-react';

export default function TopicDetail() {
  // Support both /TopicDetail/:topicId and ?id=
  const { topicId: paramId } = useParams();
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = paramId || urlParams.get('id');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('fulltext');
  const [sidebarPanel, setSidebarPanel] = useState(null); // null | 'notes' | 'flashcards' | 'sources'

  // Fetch topic
  const { data: topic, isLoading } = useQuery({
    queryKey: ['topic', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select(`
          *,
          obory:obor_id(id, name, slug),
          okruhy:okruh_id(id, name, slug)
        `)
        .eq('id', topicId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!topicId
  });

  // Fetch flashcards + progress
  const { data: flashcards = [] } = useQuery({
    queryKey: ['topicFlashcards', topicId],
    queryFn: async () => {
      const { data } = await supabase.from('flashcards').select('*').eq('topic_id', topicId);
      return data || [];
    },
    enabled: !!topicId
  });

  const { data: flashcardProgress = [] } = useQuery({
    queryKey: ['flashcardProgress', user?.id, topicId],
    queryFn: async () => {
      if (!flashcards.length) return [];
      const ids = flashcards.map(f => f.id);
      const { data } = await supabase
        .from('user_flashcard_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('flashcard_id', ids);
      return data || [];
    },
    enabled: !!user?.id && flashcards.length > 0
  });

  // Fetch related topics
  const { data: relatedTopics = [] } = useQuery({
    queryKey: ['relatedTopics', topic?.okruh_id, topicId],
    queryFn: async () => {
      const { data } = await supabase
        .from('topics')
        .select('id, title, status')
        .eq('okruh_id', topic.okruh_id)
        .neq('id', topicId)
        .limit(5);
      return data || [];
    },
    enabled: !!topic?.okruh_id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card><CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Téma nenalezeno</p>
          <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">Zpět</Button>
        </CardContent></Card>
      </div>
    );
  }

  const contentViews = [
    { id: 'fulltext', label: 'Plný text', icon: BookOpen, content: topic.full_text_content },
    { id: 'summary', label: 'High-Yield', icon: Zap, content: topic.bullet_points_summary },
    { id: 'deepdive', label: 'Deep Dive', icon: Layers, content: topic.deep_dive_content },
  ];
  const currentContent = contentViews.find(v => v.id === activeView)?.content;

  const masteredCount = flashcardProgress.filter(p => p.repetitions >= 3).length;
  const togglePanel = (panel) => setSidebarPanel(prev => prev === panel ? null : panel);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sticky Top Bar */}
      <div className="bg-white dark:bg-slate-900 border-b sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('StudiumV2'))}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Studium
              </Button>
              {topic.obory && (
                <>
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{topic.obory.name}</span>
                </>
              )}
              {topic.okruhy && (
                <>
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{topic.okruhy.name}</span>
                </>
              )}
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant={sidebarPanel === 'notes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => togglePanel('notes')}
              >
                <StickyNote className="w-4 h-4 mr-1" /> Poznámky
              </Button>
              <Button
                variant={sidebarPanel === 'flashcards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => togglePanel('flashcards')}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Kartičky {flashcards.length > 0 && `(${flashcards.length})`}
              </Button>
              {topic.sources?.length > 0 && (
                <Button
                  variant={sidebarPanel === 'sources' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => togglePanel('sources')}
                >
                  <LinkIcon className="w-4 h-4 mr-1" /> Zdroje
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className={`grid gap-6 ${sidebarPanel ? 'lg:grid-cols-3' : 'max-w-5xl mx-auto'}`}>
          {/* Main Content */}
          <div className={sidebarPanel ? 'lg:col-span-2' : ''}>
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-sm">
                <h1 className="text-3xl font-bold mb-3 leading-tight">{topic.title}</h1>
                {topic.description && (
                  <p className="text-muted-foreground mb-4">{topic.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {topic.obory && <Badge variant="outline">{topic.obory.name}</Badge>}
                  {topic.okruhy && <Badge variant="secondary">{topic.okruhy.name}</Badge>}
                  <Badge variant={topic.status === 'published' ? 'default' : 'secondary'}>{topic.status}</Badge>
                  {topic.ai_model && (
                    <Badge variant="outline" className="gap-1"><Sparkles className="w-3 h-3" />{topic.ai_model}</Badge>
                  )}
                  {topic.ai_confidence != null && (
                    <Badge variant="outline" className="gap-1">
                      <TrendingUp className="w-3 h-3" />{(topic.ai_confidence * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </div>

              {/* Warnings */}
              {topic.warnings?.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">Vyžaduje odbornou kontrolu</p>
                      <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                        {topic.warnings.map((w, i) => (
                          <li key={i}>• {w.message || w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Content Tabs */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
                <div className="border-b flex">
                  {contentViews.map(view => {
                    const Icon = view.icon;
                    const isActive = activeView === view.id;
                    return (
                      <button
                        key={view.id}
                        onClick={() => setActiveView(view.id)}
                        className={`flex-1 px-6 py-4 font-medium transition-colors flex items-center justify-center gap-2 ${
                          isActive
                            ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 border-b-2 border-purple-600'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{view.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="p-8">
                  {currentContent ? (
                    <article className="prose prose-lg dark:prose-invert max-w-none
                      prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-slate-100
                      prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-8
                      prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-6 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-200
                      prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-4
                      prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
                      prose-li:text-slate-700 dark:prose-li:text-slate-300 prose-li:leading-relaxed
                      prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-strong:font-semibold
                      prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                      prose-pre:bg-slate-100 dark:prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-200
                      prose-ul:my-4 prose-ol:my-4 prose-li:my-1">
                      <ReactMarkdown>{currentContent}</ReactMarkdown>
                    </article>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      Obsah není k dispozici
                    </div>
                  )}
                </div>
              </div>

              {/* Learning Objectives */}
              {topic.learning_objectives?.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" /> Výukové cíle
                  </h3>
                  <ul className="space-y-2">
                    {topic.learning_objectives.map((obj, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 leading-relaxed">{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related Topics */}
              {relatedTopics.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-lg mb-4">Příbuzná témata</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {relatedTopics.map(related => (
                      <Link
                        key={related.id}
                        to={`/TopicDetail/${related.id}`}
                        className="block p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <p className="font-medium">{related.title}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          {sidebarPanel && (
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {/* Notes Panel */}
                {sidebarPanel === 'notes' && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <StickyNote className="w-5 h-5 text-orange-400" /> Moje poznámky
                    </h3>
                    <TopicNotes topicId={topicId} />
                  </div>
                )}

                {/* Flashcards Panel */}
                {sidebarPanel === 'flashcards' && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" /> Kartičky
                    </h3>

                    {/* Progress summary */}
                    {flashcards.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2">
                          <div className="font-bold text-lg">{flashcards.length}</div>
                          <div className="text-muted-foreground text-xs">Celkem</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-2">
                          <div className="font-bold text-lg text-green-600">{masteredCount}</div>
                          <div className="text-muted-foreground text-xs">Zvládnuto</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-2">
                          <div className="font-bold text-lg text-purple-600">
                            {flashcards.length > 0 ? Math.round((masteredCount / flashcards.length) * 100) : 0}%
                          </div>
                          <div className="text-muted-foreground text-xs">Progres</div>
                        </div>
                      </div>
                    )}

                    {/* Existing flashcards */}
                    <ExistingFlashcards topicId={topicId} />

                    {/* Generator */}
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground mb-3">Vygenerovat nové kartičky z obsahu</p>
                      <FlashcardGenerator 
                        topicId={topicId} 
                        topicContent={currentContent}
                      />
                    </div>
                  </div>
                )}

                {/* Sources Panel */}
                {sidebarPanel === 'sources' && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <LinkIcon className="w-5 h-5 text-blue-400" /> Zdroje
                    </h3>
                    <div className="space-y-3">
                      {(topic.sources || []).map((source, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border">
                          <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{source.title || `Zdroj ${idx + 1}`}</p>
                            {source.url && (
                              <a href={source.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-purple-600 hover:underline truncate block">
                                {source.url}
                              </a>
                            )}
                            {source.description && (
                              <p className="text-xs text-muted-foreground mt-1">{source.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
