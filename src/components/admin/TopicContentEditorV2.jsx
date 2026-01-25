import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TopicContentReviewPanel from './TopicContentReviewPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Save, BookOpen, List, Microscope, ArrowDown, CheckCircle, Shield, Eye, AlertTriangle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { AI_VERSION_TAG } from '../utils/aiConfig';

export default function TopicContentEditorV2({ topic, onSave }) {
  const [content, setContent] = useState({
    status: topic?.status || 'draft',
    full_text_content: topic?.full_text_content || '',
    bullet_points_summary: topic?.bullet_points_summary || '',
    deep_dive_content: topic?.deep_dive_content || '',
    learning_objectives: topic?.learning_objectives || [],
    source_pack: topic?.source_pack || { internal_refs: [], external_refs: [] }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newObjective, setNewObjective] = useState('');
  const [reviewResult, setReviewResult] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.entities.Topic.update(topic.id, {
        ...content,
        updated_by_ai: true,
        ai_version_tag: AI_VERSION_TAG
      });
      toast.success('Obsah uložen');
      onSave?.();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Chyba při ukládání');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIGenerate = async (mode) => {
    setIsGenerating(true);
    try {
      const promptMap = {
        topic_generate_fulltext: `Vytvoř plný studijní text pro téma: ${topic.title}`,
        topic_summarize: `Vytvoř shrnutí z plného textu tématu: ${topic.title}`,
        topic_deep_dive: `Rozviň téma do hloubky: ${topic.title}`,
        topic_reformat: `Přeformátuj tento text pro optimální studium. NEPŘIDÁVEJ nový obsah, pouze zlepši strukturu a čitelnost.\n\n${content.full_text_content || ''}`
      };

      const response = await base44.functions.invoke('invokeEduLLM', {
        mode: mode,
        entityContext: {
          topic: topic,
          entityType: 'topic',
          entityId: topic.id
        },
        userPrompt: promptMap[mode] || `Vytvoř obsah pro téma: ${topic.title}`,
        allowWeb: mode === 'topic_deep_dive'
      });

      const result = response.data || response;

      // Aplikuj výsledek podle módu
      if (mode === 'topic_generate_fulltext') {
        setContent(prev => ({ 
          ...prev, 
          full_text_content: result.text || result.structuredData?.answer_md || '',
          source_pack: result.citations || prev.source_pack
        }));
      } else if (mode === 'topic_summarize') {
        setContent(prev => ({ 
          ...prev, 
          bullet_points_summary: result.text || ''
        }));
      } else if (mode === 'topic_deep_dive') {
        setContent(prev => ({ 
          ...prev, 
          deep_dive_content: result.text || '',
          source_pack: result.citations || prev.source_pack
        }));
      } else if (mode === 'topic_reformat') {
        setContent(prev => ({ 
          ...prev, 
          full_text_content: result.text || '',
          source_pack: result.citations || prev.source_pack
        }));
      }

      setLastGenerated(result);
      toast.success('Obsah vygenerován');
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Chyba při generování: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIReview = async () => {
    setIsGenerating(true);
    setReviewResult(null);
    try {
      const hasContent = content.full_text_content || content.bullet_points_summary || content.deep_dive_content;
      if (!hasContent) {
        toast.error('Nejprve vytvořte nějaký obsah pro hodnocení');
        setIsGenerating(false);
        return;
      }

      // Krok 1: Kritické hodnocení
      const response = await base44.functions.invoke('invokeEduLLM', {
        mode: 'content_review_critic',
        entityContext: {
          topic: { ...topic, ...content },
          entityType: 'topic',
          entityId: topic.id
        },
        userPrompt: `Zhodnoť kvalitu studijního materiálu pro téma "${topic.title}". Materiál:\n\n${content.full_text_content || ''}\n\n${content.bullet_points_summary || ''}`,
        allowWeb: true
      });

      const result = response.data || response;
      const review = result.structuredData || result;
      setReviewResult(review);
      setLastGenerated(result);

      // Ulož skóre do topic
      await base44.entities.Topic.update(topic.id, {
        last_review_score: review.score,
        last_review_summary: JSON.stringify({
          strengths: review.strengths,
          weaknesses: review.weaknesses,
          missing_topics: review.missing_topics
        })
      });

      toast.success(`Hodnocení dokončeno: ${review.score}/10`);
    } catch (error) {
      console.error('AI review error:', error);
      toast.error('Chyba při hodnocení: ' + error.message);
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

  const getStatusBadge = (status) => {
    const variants = {
      draft: { color: 'bg-slate-100 text-slate-700', icon: AlertTriangle },
      in_review: { color: 'bg-amber-100 text-amber-700', icon: Eye },
      published: { color: 'bg-green-100 text-green-700', icon: CheckCircle }
    };
    const variant = variants[status] || variants.draft;
    const Icon = variant.icon;
    return (
      <Badge className={variant.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status === 'draft' ? 'Draft' : status === 'in_review' ? 'In Review' : 'Published'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Alert className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
        <AlertDescription className="text-sm text-teal-700 dark:text-teal-300">
          Upravujete téma <strong>{topic.title}</strong> | AI verze: {AI_VERSION_TAG}
        </AlertDescription>
      </Alert>

      {/* Status selector */}
      <div className="flex items-center gap-4">
        <Label>Status publikace:</Label>
        <Select value={content.status} onValueChange={(v) => setContent(prev => ({ ...prev, status: v }))}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft (koncept)</SelectItem>
            <SelectItem value="in_review">In Review (ke kontrole)</SelectItem>
            <SelectItem value="published">Published (publikováno)</SelectItem>
          </SelectContent>
        </Select>
        {getStatusBadge(content.status)}
      </div>

      {/* AI Review */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleAIReview}
          disabled={isGenerating}
          className="flex-1"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Hodnotit materiál AI
        </Button>
      </div>

      {/* Review result */}
      {reviewResult && (
        <Alert className={reviewResult.score >= 7 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}>
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold">Hodnocení: {reviewResult.score}/10</div>
              {reviewResult.strengths?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-green-700">Silné stránky:</div>
                  <ul className="text-xs list-disc list-inside">
                    {reviewResult.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {reviewResult.weaknesses?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-amber-700">Slabiny:</div>
                  <ul className="text-xs list-disc list-inside">
                    {reviewResult.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              {reviewResult.missing_topics?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700">Chybějící témata:</div>
                  <ul className="text-xs list-disc list-inside">
                    {reviewResult.missing_topics.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Learning objectives */}
      <div className="space-y-3">
        <Label>Výukové cíle pro atestaci</Label>
        <div className="space-y-2">
          {content.learning_objectives.map((obj, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={obj} readOnly className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => removeObjective(i)}>
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

      {/* Content tabs */}
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
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAIGenerate('topic_reformat')}
                disabled={isGenerating || !content.full_text_content}
                title="Přeformátuj existující text pro lepší studium"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FileText className="w-3 h-3 mr-1" />}
                Přeformátovat
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAIGenerate('topic_generate_fulltext')}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                Generovat AI
              </Button>
            </div>
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAIGenerate('topic_summarize')}
              disabled={isGenerating || !content.full_text_content}
              title="Sumarizovat z plného textu"
            >
              {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ArrowDown className="w-3 h-3 mr-1" />}
              Sumarizovat
            </Button>
          </div>
          <Textarea
            value={content.bullet_points_summary}
            onChange={(e) => setContent(prev => ({ ...prev, bullet_points_summary: e.target.value }))}
            className="font-mono text-sm h-[400px]"
            placeholder="- Hlavní bod 1..."
          />
        </TabsContent>

        <TabsContent value="deepdive" className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>Deep Dive (markdown) - s webem</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAIGenerate('topic_deep_dive')}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
              Generovat AI
            </Button>
          </div>
          <Textarea
            value={content.deep_dive_content}
            onChange={(e) => setContent(prev => ({ ...prev, deep_dive_content: e.target.value }))}
            className="font-mono text-sm h-[400px]"
            placeholder="Rozšířený obsah pro pokročilé studium..."
          />
        </TabsContent>
      </Tabs>

      {/* Sources */}
      {content.source_pack && (content.source_pack.internal_refs?.length > 0 || content.source_pack.external_refs?.length > 0) && (
        <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <Label className="text-sm font-semibold">Zdroje a citace</Label>
          {content.source_pack.internal_refs?.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Interní:</div>
              {content.source_pack.internal_refs.map((ref, i) => (
                <Badge key={i} variant="secondary" className="mr-1 mb-1">{ref.title}</Badge>
              ))}
            </div>
          )}
          {content.source_pack.external_refs?.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Externí:</div>
              {content.source_pack.external_refs.map((ref, i) => (
                <div key={i} className="text-xs text-slate-600">
                  • {ref.title} {ref.publisher && `(${ref.publisher})`}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hippo Review Panel - zobrazí se při LOW confidence nebo missing topics */}
      {lastGenerated && (
        <TopicContentReviewPanel 
          topic={topic}
          aiResponse={lastGenerated}
          onContentImproved={(improved) => {
            setLastGenerated(improved);
            toast.success('Obsah vylepšen – zkopírujte ho do editoru');
          }}
        />
      )}

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