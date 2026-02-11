import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronLeft, 
  BookOpen,
  List,
  Zap,
  Target,
  Sparkles,
  Brain,
  FileText,
  Link as LinkIcon,
  AlertTriangle,
  Star,
  Clock,
  TrendingUp,
  Save,
  StickyNote
} from 'lucide-react';
import { toast } from 'sonner';

export default function TopicDetailV2() {
  // Get topicId from query params (MedVerse uses ?id=...)
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('id');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('fulltext');
  const [noteContent, setNoteContent] = useState('');

  // Fetch topic
  const { data: topic, isLoading, error } = useQuery({
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

  // Fetch flashcards for this topic
  const { data: flashcards = [] } = useQuery({
    queryKey: ['topicFlashcards', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('topic_id', topicId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!topicId
  });

  // Fetch user's flashcard progress
  const { data: flashcardProgress = [] } = useQuery({
    queryKey: ['flashcardProgress', user?.id, topicId],
    queryFn: async () => {
      if (!flashcards.length) return [];
      
      const flashcardIds = flashcards.map(f => f.id);
      const { data, error } = await supabase
        .from('user_flashcard_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('flashcard_id', flashcardIds);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && flashcards.length > 0
  });

  // Fetch user note
  const { data: userNote } = useQuery({
    queryKey: ['topicNote', user?.id, topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topic_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
      return data;
    },
    enabled: !!user?.id && !!topicId
  });

  // Initialize note content when loaded
  React.useEffect(() => {
    if (userNote?.content) {
      setNoteContent(userNote.content);
    }
  }, [userNote]);

  // Fetch related topics
  const { data: relatedTopics = [] } = useQuery({
    queryKey: ['relatedTopics', topic?.okruh_id, topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, title, slug, status')
        .eq('okruh_id', topic.okruh_id)
        .eq('status', 'published')
        .neq('id', topicId)
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!topic?.okruh_id
  });

  // Save note mutation
  const saveNote = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('topic_notes')
        .upsert({
          user_id: user.id,
          topic_id: topicId,
          content: noteContent,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,topic_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Poznámka uložena');
      queryClient.invalidateQueries(['topicNote', user?.id, topicId]);
    },
    onError: () => {
      toast.error('Chyba při ukládání poznámky');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <p className="text-red-600">Téma nenalezeno</p>
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
        <Link to="/Studium" className="hover:text-foreground">
          Studium
        </Link>
        <ChevronLeft className="w-4 h-4 rotate-180" />
        <Link to={`/Okruhy?obor_id=${topic.obory?.id}`} className="hover:text-foreground">
          {topic.obory?.name}
        </Link>
        <ChevronLeft className="w-4 h-4 rotate-180" />
        <Link to={`/OkruhDetail?id=${topic.okruhy?.id}`} className="hover:text-foreground">
          {topic.okruhy?.name}
        </Link>
        <ChevronLeft className="w-4 h-4 rotate-180" />
        <span className="text-foreground font-medium">{topic.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{topic.title}</h1>
          {topic.description && (
            <p className="text-muted-foreground">{topic.description}</p>
          )}
          
          <div className="flex items-center gap-3 mt-4">
            <Badge variant={topic.status === 'published' ? 'default' : 'secondary'}>
              {topic.status}
            </Badge>
            
            {topic.ai_model && (
              <Badge variant="outline" className="gap-1">
                <Sparkles className="w-3 h-3" />
                {topic.ai_model}
              </Badge>
            )}
            
            {topic.ai_confidence && (
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="w-3 h-3" />
                Confidence: {(topic.ai_confidence * 100).toFixed(0)}%
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Star className="w-4 h-4 mr-2" />
            Oblíbené
          </Button>
          
          {flashcards.length > 0 && (
            <Button variant="default" size="sm">
              <Zap className="w-4 h-4 mr-2" />
              Review ({flashcards.length} cards)
            </Button>
          )}
        </div>
      </div>

      {/* AI Warnings */}
      {topic.warnings && topic.warnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                  Expert verification needed
                </p>
                <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                  {topic.warnings.map((warning, idx) => (
                    <li key={idx}>• {warning.message || warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="fulltext" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Full Text
              </TabsTrigger>
              <TabsTrigger value="bullet" className="gap-2">
                <List className="w-4 h-4" />
                Quick Overview
              </TabsTrigger>
              <TabsTrigger value="deepdive" className="gap-2">
                <Brain className="w-4 h-4" />
                Deep Dive
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-2">
                <StickyNote className="w-4 h-4" />
                Moje Poznámky
              </TabsTrigger>
              <TabsTrigger value="sources" className="gap-2">
                <LinkIcon className="w-4 h-4" />
                Sources
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="p-6">
          <TabsContent value="fulltext" className="mt-0">
            {topic.full_text_content ? (
              <div className="prose dark:prose-invert max-w-none">
                {topic.full_text_content}
              </div>
            ) : (
              <EmptyContent message="No full text available" />
            )}
          </TabsContent>

          <TabsContent value="bullet" className="mt-0">
            {topic.bullet_points_summary ? (
              <div className="prose dark:prose-invert max-w-none">
                {topic.bullet_points_summary}
              </div>
            ) : (
              <EmptyContent message="No summary available" />
            )}
          </TabsContent>

          <TabsContent value="deepdive" className="mt-0">
            {topic.deep_dive_content ? (
              <div className="prose dark:prose-invert max-w-none">
                {topic.deep_dive_content}
              </div>
            ) : (
              <EmptyContent message="No deep dive content available" />
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-0">
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
                  Vaše poznámky k tématu
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Začněte psát své poznámky zde..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {noteContent.length} znaků • Poznámky se automaticky ukládají
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => saveNote.mutate()}
                  disabled={saveNote.isPending || !noteContent}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saveNote.isPending ? 'Ukládání...' : 'Uložit poznámku'}
                </Button>

                {userNote && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2 py-2">
                    Naposledy uloženo: {new Date(userNote.updated_at).toLocaleString('cs-CZ')}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sources" className="mt-0">
            {topic.sources && topic.sources.length > 0 ? (
              <div className="space-y-3">
                {topic.sources.map((source, idx) => (
                  <Card key={idx} className="border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{source.title || `Source ${idx + 1}`}</p>
                          {source.url && (
                            <a 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-purple-600 hover:underline"
                            >
                              {source.url}
                            </a>
                          )}
                          {source.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {source.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyContent message="No sources cited" />
            )}
          </TabsContent>
        </CardContent>
      </Card>

      {/* Learning Objectives */}
      {topic.learning_objectives && topic.learning_objectives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Learning Objectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {topic.learning_objectives.map((objective, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {idx + 1}
                  </div>
                  <span className="flex-1">{objective}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Flashcards Section */}
      {/* Flashcards Section */}
      {flashcards.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Flashcards ({flashcards.length})
              </div>
              <Button size="sm">
                Start Review
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {flashcards.slice(0, 4).map((card) => {
                const progress = flashcardProgress.find(p => p.flashcard_id === card.id);
                return (
                  <Card key={card.id} className="border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline">
                          Difficulty: {card.difficulty || 2}/3
                        </Badge>
                        {progress && (
                          <Badge variant="default">
                            {progress.repetitions} reviews
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium mb-2">{card.question}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {card.answer}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {flashcards.length > 4 && (
              <div className="text-center mt-4">
                <Button variant="outline" size="sm">
                  Show all {flashcards.length} cards
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Flashcards
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Zatím žádné flashcards</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Vygenerujte AI flashcards z tohoto tématu pro efektivní učení
            </p>
            <Button>
              <Sparkles className="w-4 h-4 mr-2" />
              Generovat Flashcards (AI)
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Spotřebuje 1 AI kredit
            </p>
          </CardContent>
        </Card>
      )}

      {/* User Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            My Notes ({userNotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userNotes.length === 0 ? (
            <EmptyContent message="No notes yet. Start taking notes while studying!" />
          ) : (
            <div className="space-y-3">
              {userNotes.map((note) => (
                <Card key={note.id} className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline">{note.category || 'Note'}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{note.note_text}</p>
                    {note.selected_text && (
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-sm">
                        "{note.selected_text}"
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Topics */}
      {relatedTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {relatedTopics.map((related) => (
                <Link
                  key={related.id}
                  to={`/TopicDetailV2?id=${related.id}`}
                  className="block p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  <p className="font-medium">{related.title}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmptyContent({ message }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p>{message}</p>
    </div>
  );
}
