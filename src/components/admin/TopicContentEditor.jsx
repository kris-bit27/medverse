import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, Save, BookOpen, List, Microscope, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

export default function TopicContentEditor({ topic, onSave }) {
  const [content, setContent] = useState({
    full_text_content: topic?.full_text_content || '',
    bullet_points_summary: topic?.bullet_points_summary || '',
    deep_dive_content: topic?.deep_dive_content || '',
    learning_objectives: topic?.learning_objectives || []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newObjective, setNewObjective] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await supabase.from('topics').update(content).eq('id', topic.id).select().single().then(r => r.data);
      toast.success('Obsah uložen');
      onSave?.();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Chyba při ukládání');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIGenerate = async (type) => {
    setIsGenerating(true);
    try {
      const MAX_TEXT_CHARS = 8000;
      const fullTextSnippet = (content.full_text_content || '').slice(0, MAX_TEXT_CHARS);
      let prompt = '';
      
      if (type === 'full') {
        prompt = `Vytvoř podrobný studijní text pro téma "${topic.title}" v rozsahu požadovaném pro atestaci z plastické chirurgie. Text musí být v češtině, strukturovaný, vědecky přesný a pokrývat všechny klíčové aspekty tématu. Formátuj pomocí markdown.`;
      } else if (type === 'bullets') {
        prompt = `Vytvoř shrnutí v odrážkách pro téma "${topic.title}" pro rychlé opakování před atestací. Zahrň nejdůležitější body, definice, postupy. Text v češtině, formát markdown.`;
      } else if (type === 'deepdive') {
        prompt = `Vytvoř rozšířený podrobný obsah pro téma "${topic.title}" zahrnující nejnovější poznatky, výzkum, komplikace, edge cases. Pro pokročilé studium. Text v češtině, markdown.`;
      } else if (type === 'objectives') {
        prompt = `Vytvoř seznam konkrétních výukových cílů pro téma "${topic.title}" dle požadavků atestační komise pro plastickou chirurgii. 5-8 cílů v češtině.`;
      } else if (type === 'bullets_from_full') {
        if (!content.full_text_content) {
          toast.error('Nejprve vytvořte plný text');
          setIsGenerating(false);
          return;
        }
        prompt = `Vytvoř stručné shrnutí v odrážkách z následujícího studijního textu. Zaměř se na klíčové body pro rychlé opakování před atestací. Text v češtině, formát markdown.

STUDIJNÍ TEXT:
${fullTextSnippet}`;
      } else if (type === 'deepdive_from_full') {
        if (!content.full_text_content) {
          toast.error('Nejprve vytvořte plný text');
          setIsGenerating(false);
          return;
        }
        prompt = `Na základě následujícího studijního textu vytvoř rozšířený podrobný obsah (Deep Dive) zahrnující:
- Nejnovější výzkum a poznatky
- Pokročilé koncepty a detaily
- Komplikace a edge cases
- Klinické perličky a praktické tipy
- Diferenciální diagnostiku

Text v češtině, formát markdown.

STUDIJNÍ TEXT:
${fullTextSnippet}`;
      }

      const response = await base44.functions.invoke('invokeLLM', {
        prompt,
        add_context_from_internet: type === 'deepdive_from_full',
        maxTokens: type === 'deepdive_from_full' ? 2048 : 1024,
        response_json_schema: type === 'objectives' ? {
          type: "object",
          properties: {
            objectives: {
              type: "array",
              items: { type: "string" }
            }
          }
        } : null
      });

      if (type === 'objectives') {
        setContent(prev => ({ ...prev, learning_objectives: response.objectives }));
        toast.success('Výukové cíle vygenerovány');
      } else if (type === 'bullets_from_full') {
        setContent(prev => ({ ...prev, bullet_points_summary: response }));
        toast.success('Shrnutí vygenerováno z plného textu');
      } else if (type === 'deepdive_from_full') {
        setContent(prev => ({ ...prev, deep_dive_content: response }));
        toast.success('Deep dive obsah vygenerován z plného textu');
      } else {
        const fieldMap = {
          full: 'full_text_content',
          bullets: 'bullet_points_summary',
          deepdive: 'deep_dive_content'
        };
        setContent(prev => ({ ...prev, [fieldMap[type]]: response }));
        toast.success('Obsah vygenerován');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Chyba při generování');
    } finally {
      setIsGenerating(false);
    }
  };


  const addObjective = () => {
    if (newObjective.trim()) {
      setContent(prev => ({
        ...prev,
        learning_objectives: [...prev.learning_objectives, newObjective.trim()]
      }));
      setNewObjective('');
    }
  };

  const removeObjective = (index) => {
    setContent(prev => ({
      ...prev,
      learning_objectives: prev.learning_objectives.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      <Alert className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
        <AlertDescription className="text-sm text-teal-700 dark:text-teal-300">
          Vytvořte studijní obsah pro téma <strong>{topic.title}</strong>. AI může generovat obsah na základě medicínské literatury.
        </AlertDescription>
      </Alert>

      {/* Learning objectives */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Výukové cíle pro atestaci</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAIGenerate('objectives')}
            disabled={isGenerating}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            AI generace
          </Button>
        </div>
        <div className="space-y-2">
          {content.learning_objectives.map((obj, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={obj} readOnly className="flex-1" />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeObjective(i)}
              >
                Smazat
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              placeholder="Přidat nový cíl..."
              onKeyPress={(e) => e.key === 'Enter' && addObjective()}
            />
            <Button onClick={addObjective}>Přidat</Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="full">
            <BookOpen className="w-4 h-4 mr-2" />
            Plný text
          </TabsTrigger>
          <TabsTrigger value="bullets">
            <List className="w-4 h-4 mr-2" />
            Odrážky
          </TabsTrigger>
          <TabsTrigger value="deepdive">
            <Microscope className="w-4 h-4 mr-2" />
            Deep Dive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="full" className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>Plný studijní text (markdown)</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAIGenerate('full')}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
              Generovat AI
            </Button>
          </div>
          <Textarea
            value={content.full_text_content}
            onChange={(e) => setContent(prev => ({ ...prev, full_text_content: e.target.value }))}
            className="font-mono text-sm h-[400px]"
            placeholder="Plný text učebnice..."
          />
        </TabsContent>

        <TabsContent value="bullets" className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>Shrnutí v odrážkách (markdown)</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAIGenerate('bullets_from_full')}
                disabled={isGenerating || !content.full_text_content}
                title="Sumarizovat z plného textu"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                Ze základu
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAIGenerate('bullets')}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                Nový AI
              </Button>
            </div>
          </div>
          <Textarea
            value={content.bullet_points_summary}
            onChange={(e) => setContent(prev => ({ ...prev, bullet_points_summary: e.target.value }))}
            className="font-mono text-sm h-[400px]"
            placeholder="- Hlavní bod 1&#10;- Hlavní bod 2..."
          />
        </TabsContent>

        <TabsContent value="deepdive" className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>Podrobný obsah Deep Dive (markdown)</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAIGenerate('deepdive_from_full')}
                disabled={isGenerating || !content.full_text_content}
                title="Rozšířit z plného textu"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                Rozšířit základ
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAIGenerate('deepdive')}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                Nový AI
              </Button>
            </div>
          </div>
          <Textarea
            value={content.deep_dive_content}
            onChange={(e) => setContent(prev => ({ ...prev, deep_dive_content: e.target.value }))}
            className="font-mono text-sm h-[400px]"
            placeholder="Rozšířený obsah pro pokročilé studium..."
          />
        </TabsContent>
      </Tabs>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full"
      >
        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Uložit obsah
      </Button>
    </div>
  );
}
