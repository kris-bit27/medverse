import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TopicNotes from '@/components/TopicNotes';
import StudySessionTracker from '@/components/StudySessionTracker';
import FlashcardGenerator from '@/components/FlashcardGenerator';
import ReactMarkdown from 'react-markdown';
import { 
  BookOpen,
  FileText,
  List,
  StickyNote,
  Sparkles,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function TopicDetailV3() {
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('id');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('content');

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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate(createPageUrl('StudiumV2'))}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zpět na studium
        </Button>

        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{topic.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {topic.obory && (
                <Badge variant="outline">{topic.obory.name}</Badge>
              )}
              {topic.okruhy && (
                <Badge variant="secondary">{topic.okruhy.name}</Badge>
              )}
              {topic.difficulty && (
                <Badge>{topic.difficulty}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Study Timer */}
        <StudySessionTracker topicId={topicId} sessionType="reading" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="content" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Full Text
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <FileText className="w-4 h-4" />
            High-Yield
          </TabsTrigger>
          <TabsTrigger value="deepdive" className="gap-2">
            <List className="w-4 h-4" />
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

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Úplný obsah (Full Text)</CardTitle>
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

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>High-Yield Summary</CardTitle>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="w-5 h-5" />
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

        {/* Deep Dive Tab */}
        <TabsContent value="deepdive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deep Dive - Pokročilý obsah</CardTitle>
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

        {/* Notes Tab */}
        <TabsContent value="notes">
          <TopicNotes topicId={topicId} />
        </TabsContent>

        {/* Flashcards Tab */}
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
