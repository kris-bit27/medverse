import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TopicNotes from '@/components/TopicNotes';
import FlashcardGenerator from '@/components/FlashcardGenerator';
import ReactMarkdown from 'react-markdown';
import { 
  BookOpen,
  Zap,
  Layers,
  StickyNote,
  Sparkles,
  ChevronLeft,
  FileText
} from 'lucide-react';

export default function TopicDetailV2() {
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('id');
  
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('fulltext');

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

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to={createPageUrl('StudiumV2')} className="hover:text-foreground">
          Studium
        </Link>
        <ChevronLeft className="w-4 h-4 rotate-180" />
        {topic.obory && (
          <>
            <span className="hover:text-foreground">{topic.obory.name}</span>
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </>
        )}
        {topic.okruhy && (
          <>
            <span className="hover:text-foreground">{topic.okruhy.name}</span>
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </>
        )}
        <span className="text-foreground font-medium">{topic.title}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">{topic.title}</h1>
        <div className="flex items-center gap-2 mt-4">
          {topic.obory && (
            <Badge variant="outline">{topic.obory.name}</Badge>
          )}
          {topic.okruhy && (
            <Badge variant="secondary">{topic.okruhy.name}</Badge>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="fulltext" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Full Text
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <Zap className="w-4 h-4" />
            High-Yield
          </TabsTrigger>
          <TabsTrigger value="deepdive" className="gap-2">
            <Layers className="w-4 h-4" />
            Deep Dive
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <StickyNote className="w-4 h-4" />
            Poznámky
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Kartičky
          </TabsTrigger>
        </TabsList>

        {/* Full Text */}
        <TabsContent value="fulltext">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Úplný obsah
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topic.full_text_content ? (
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{topic.full_text_content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground">Obsah není k dispozici</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* High-Yield */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                High-Yield Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topic.bullet_points_summary ? (
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{topic.bullet_points_summary}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground">Souhrn není k dispozici</p>
              )}
            </CardContent>
          </Card>

          {topic.learning_objectives && topic.learning_objectives.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Learning Objectives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {topic.learning_objectives.map((obj, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-purple-600 font-bold">•</span>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Deep Dive */}
        <TabsContent value="deepdive">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Deep Dive
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topic.deep_dive_content ? (
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{topic.deep_dive_content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground">Deep dive obsah není k dispozici</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <TopicNotes topicId={topicId} />
        </TabsContent>

        {/* Flashcards */}
        <TabsContent value="flashcards">
          <FlashcardGenerator 
            topicId={topicId} 
            topicContent={topic.full_text_content || topic.bullet_points_summary}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
