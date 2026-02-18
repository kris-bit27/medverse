import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TopicNotes from '@/components/TopicNotes';
import FlashcardGenerator from '@/components/FlashcardGenerator';
import ReactMarkdown from 'react-markdown';
import { 
  BookOpen,
  Zap,
  Layers,
  StickyNote,
  Sparkles,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function TopicDetailV4() {
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('id');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('fulltext');
  const [showNotes, setShowNotes] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-[hsl(var(--mn-muted))]">Téma nenalezeno</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const contentViews = [
    { id: 'fulltext', label: 'Full Text', icon: BookOpen, content: topic.full_text_content },
    { id: 'summary', label: 'High-Yield', icon: Zap, content: topic.bullet_points_summary },
    { id: 'deepdive', label: 'Deep Dive', icon: Layers, content: topic.deep_dive_content }
  ];

  const currentContent = contentViews.find(v => v.id === activeView)?.content;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-900 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(createPageUrl('StudiumV2'))}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zpět
            </Button>

            <div className="flex gap-2">
              <Button
                variant={showNotes ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setShowNotes(!showNotes);
                  setShowFlashcards(false);
                }}
              >
                <StickyNote className="w-4 h-4 mr-2" />
                Poznámky
              </Button>
              
              <Button
                variant={showFlashcards ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setShowFlashcards(!showFlashcards);
                  setShowNotes(false);
                }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Kartičky
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-sm">
              <h1 className="text-4xl font-bold mb-4 leading-tight">
                {topic.title}
              </h1>
              
              <div className="flex flex-wrap gap-2">
                {topic.obory && (
                  <Badge variant="outline" className="text-sm">
                    {topic.obory.name}
                  </Badge>
                )}
                {topic.okruhy && (
                  <Badge variant="secondary" className="text-sm">
                    {topic.okruhy.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Content Switcher */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
              <div className="border-b">
                <div className="flex">
                  {contentViews.map((view) => {
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
              </div>

              {/* Content Area */}
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
                    prose-ul:my-4 prose-ol:my-4
                    prose-li:my-1">
                    <ReactMarkdown>{currentContent}</ReactMarkdown>
                  </article>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-500">Obsah není k dispozici</p>
                  </div>
                )}
              </div>
            </div>

            {/* Learning Objectives */}
            {topic.learning_objectives && topic.learning_objectives.length > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <ChevronRight className="w-5 h-5 text-purple-600" />
                  Learning Objectives
                </h3>
                <ul className="space-y-2">
                  {topic.learning_objectives.map((obj, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {obj}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Notes Panel */}
              {showNotes && (
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <StickyNote className="w-5 h-5" />
                    Moje poznámky
                  </h3>
                  <TopicNotes topicId={topicId} />
                </div>
              )}

              {/* Flashcards Panel */}
              {showFlashcards && (
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    AI Kartičky
                  </h3>
                  <FlashcardGenerator 
                    topicId={topicId} 
                    topicContent={currentContent}
                  />
                </div>
              )}

              {/* Info Card - when nothing selected */}
              {!showNotes && !showFlashcards && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-lg mb-3">💡 Tip</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    Použij tlačítka nahoře pro:
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-center gap-2">
                      <StickyNote className="w-4 h-4" />
                      <span>Vytváření poznámek</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Generování kartiček</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
