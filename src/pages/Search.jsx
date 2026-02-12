import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search as SearchIcon,
  GraduationCap,
  BookOpen,
  Stethoscope,
  ChevronRight,
  Loader2,
  Pill,
  FileText,
} from 'lucide-react';

export default function Search() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState('all');

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Topics search (full-text via search_vector + ilike fallback)
  const { data: topics = [], isLoading: topicsLoading } = useQuery({
    queryKey: ['searchTopics', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const q = debouncedQuery.trim();
      
      // Try full-text search first
      const { data: ftsData } = await supabase
        .from('topics')
        .select('id, title, description, status, obor_id, okruh_id, obory:obor_id(name), okruhy:okruh_id(name)')
        .textSearch('search_vector', q.split(/\s+/).join(' & '), { type: 'plain' })
        .limit(20);

      if (ftsData?.length) return ftsData;

      // Fallback to ilike
      const { data } = await supabase
        .from('topics')
        .select('id, title, description, status, obor_id, okruh_id, obory:obor_id(name), okruhy:okruh_id(name)')
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(20);
      return data || [];
    },
    enabled: debouncedQuery.length >= 2,
  });

  // Questions search
  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['searchQuestions', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const { data } = await supabase
        .from('questions')
        .select('id, question_text, topic_id, difficulty, topics:topic_id(title)')
        .or(`question_text.ilike.%${debouncedQuery.trim()}%`)
        .limit(20);
      return data || [];
    },
    enabled: debouncedQuery.length >= 2,
  });

  // Flashcards search
  const { data: flashcards = [], isLoading: flashcardsLoading } = useQuery({
    queryKey: ['searchFlashcards', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const { data } = await supabase
        .from('flashcards')
        .select('id, question, answer, topic_id, topics:topic_id(title)')
        .or(`question.ilike.%${debouncedQuery.trim()}%,answer.ilike.%${debouncedQuery.trim()}%`)
        .limit(20);
      return data || [];
    },
    enabled: debouncedQuery.length >= 2,
  });

  // Clinical tools search
  const { data: tools = [], isLoading: toolsLoading } = useQuery({
    queryKey: ['searchTools', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const { data } = await supabase
        .from('clinical_tools')
        .select('id, name, slug, category, description')
        .or(`name.ilike.%${debouncedQuery.trim()}%,description.ilike.%${debouncedQuery.trim()}%`)
        .limit(10);
      return data || [];
    },
    enabled: debouncedQuery.length >= 2,
  });

  // Drugs search
  const { data: drugs = [], isLoading: drugsLoading } = useQuery({
    queryKey: ['searchDrugs', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const { data } = await supabase
        .from('drugs')
        .select('id, name, generic_name, category, indication')
        .or(`name.ilike.%${debouncedQuery.trim()}%,generic_name.ilike.%${debouncedQuery.trim()}%`)
        .limit(10);
      return data || [];
    },
    enabled: debouncedQuery.length >= 2,
  });

  const isLoading = topicsLoading || questionsLoading || flashcardsLoading || toolsLoading || drugsLoading;
  const totalResults = topics.length + questions.length + flashcards.length + tools.length + drugs.length;

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Vyhledávání</h1>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Hledej témata, otázky, kartičky, nástroje..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
            autoFocus
          />
        </div>
        {debouncedQuery.length >= 2 && (
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Hledám...</span>
            ) : (
              `${totalResults} výsledků pro „${debouncedQuery}"`
            )}
          </p>
        )}
      </div>

      {debouncedQuery.length >= 2 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Vše ({totalResults})</TabsTrigger>
            <TabsTrigger value="topics">Témata ({topics.length})</TabsTrigger>
            <TabsTrigger value="questions">Otázky ({questions.length})</TabsTrigger>
            <TabsTrigger value="flashcards">Kartičky ({flashcards.length})</TabsTrigger>
            <TabsTrigger value="tools">Nástroje ({tools.length + drugs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            {topics.length > 0 && <ResultSection title="Témata" icon={<GraduationCap className="h-4 w-4" />} items={topics} type="topic" />}
            {questions.length > 0 && <ResultSection title="Otázky" icon={<BookOpen className="h-4 w-4" />} items={questions} type="question" />}
            {flashcards.length > 0 && <ResultSection title="Kartičky" icon={<GraduationCap className="h-4 w-4" />} items={flashcards} type="flashcard" />}
            {tools.length > 0 && <ResultSection title="Nástroje" icon={<Stethoscope className="h-4 w-4" />} items={tools} type="tool" />}
            {drugs.length > 0 && <ResultSection title="Léky" icon={<Pill className="h-4 w-4" />} items={drugs} type="drug" />}
            {!isLoading && totalResults === 0 && (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                Nic nenalezeno pro „{debouncedQuery}"
              </CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="topics" className="mt-4">
            <ResultSection title="Témata" icon={<GraduationCap className="h-4 w-4" />} items={topics} type="topic" expanded />
          </TabsContent>

          <TabsContent value="questions" className="mt-4">
            <ResultSection title="Otázky" icon={<BookOpen className="h-4 w-4" />} items={questions} type="question" expanded />
          </TabsContent>

          <TabsContent value="flashcards" className="mt-4">
            <ResultSection title="Kartičky" icon={<GraduationCap className="h-4 w-4" />} items={flashcards} type="flashcard" expanded />
          </TabsContent>

          <TabsContent value="tools" className="mt-4 space-y-4">
            <ResultSection title="Nástroje" icon={<Stethoscope className="h-4 w-4" />} items={tools} type="tool" expanded />
            <ResultSection title="Léky" icon={<Pill className="h-4 w-4" />} items={drugs} type="drug" expanded />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ResultSection({ title, icon, items, type, expanded }) {
  if (!items?.length) return null;
  const shown = expanded ? items : items.slice(0, 5);

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm flex items-center gap-2">{icon} {title}</h3>
      {shown.map((item) => (
        <Link
          key={item.id}
          to={getResultUrl(item, type)}
          className="block"
        >
          <Card className="hover:bg-accent/50 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{getResultTitle(item, type)}</p>
                <p className="text-sm text-muted-foreground truncate">{getResultSubtitle(item, type)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function getResultTitle(item, type) {
  switch (type) {
    case 'topic': return item.title;
    case 'question': return item.question_text?.substring(0, 100);
    case 'flashcard': return item.question;
    case 'tool': return item.name;
    case 'drug': return item.name;
    default: return item.title || item.name;
  }
}

function getResultSubtitle(item, type) {
  switch (type) {
    case 'topic': return [item.obory?.name, item.okruhy?.name].filter(Boolean).join(' → ') || item.description?.substring(0, 80);
    case 'question': return item.topics?.title || '';
    case 'flashcard': return item.topics?.title || '';
    case 'tool': return item.category || '';
    case 'drug': return [item.generic_name, item.category].filter(Boolean).join(' • ');
    default: return '';
  }
}

function getResultUrl(item, type) {
  switch (type) {
    case 'topic': return createPageUrl('TopicDetail') + `?id=${item.id}`;
    case 'question': return createPageUrl('QuestionDetail') + `?id=${item.id}`;
    case 'flashcard': return createPageUrl('FlashcardReviewV2') + `?topic=${item.topic_id}`;
    case 'tool': return createPageUrl('ToolDetail') + `?slug=${item.slug}`;
    case 'drug': return createPageUrl('DrugDatabase') + `?id=${item.id}`;
    default: return '#';
  }
}

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
