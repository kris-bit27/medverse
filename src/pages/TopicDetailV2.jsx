import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertTriangle
} from 'lucide-react';

export default function TopicDetailV2() {
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('id');
  
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('fulltext');

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
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Téma nenalezeno</p>
            <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">
              Zpět
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const viewButtons = [
    { id: 'fulltext', label: 'Plný text', icon: BookOpen },
    { id: 'summary', label: 'High-Yield', icon: Zap },
    { id: 'deepdive', label: 'Deep Dive', icon: Layers }
  ];

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to={createPageUrl('StudiumV2')} className="hover:text-foreground">
          Studium
        </Link>
        <span>/</span>
        {topic.okruhy && (
          <>
            <span className="hover:text-foreground">{topic.okruhy.name}</span>
            <span>/</span>
          </>
        )}
        <span className="text-foreground font-medium">{topic.title}</span>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{topic.title}</h1>
          {topic.ai_generated && (
            <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-600">
              <AlertTriangle className="w-3 h-3" />
              AI Draft - vyžaduje odbornou kontrolu
            </Badge>
          )}
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex gap-2 border-b">
        {viewButtons.map((btn) => {
          const Icon = btn.icon;
          const isActive = activeView === btn.id;
          
          return (
            <button
              key={btn.id}
              onClick={() => setActiveView(btn.id)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                isActive
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Main Content Card */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-8">
            {activeView === 'fulltext' && (
              topic.full_text_content ? (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{topic.full_text_content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground">Obsah není k dispozici</p>
              )
            )}

            {activeView === 'summary' && (
              topic.bullet_points_summary ? (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{topic.bullet_points_summary}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground">Souhrn není k dispozici</p>
              )
            )}

            {activeView === 'deepdive' && (
              topic.deep_dive_content ? (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{topic.deep_dive_content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground">Deep dive obsah není k dispozici</p>
              )
            )}
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <StickyNote className="w-5 h-5 text-orange-400" />
              Vaše poznámky (0)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TopicNotes topicId={topicId} />
          </CardContent>
        </Card>

        {/* Flashcards Section */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Procvičování
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Vygenerujte otázky pro procvičení tohoto tématu pomocí AI
            </p>
            <FlashcardGenerator 
              topicId={topicId} 
              topicContent={topic.full_text_content || topic.bullet_points_summary}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
