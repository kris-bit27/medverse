import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TipTapEditor from './TipTapEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Save, BookOpen, List, Microscope, ArrowDown, CheckCircle, Shield, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { AI_MODELS } from '../utils/aiConfig';
import { ADMIN_CONTENT_SYSTEM_PROMPT } from './aiSystemPrompt';

const FULLTEXT_TEMPLATE = `FULLTEXT
TASK:
Generate a comprehensive, structured educational text on the given topic.

REQUIREMENTS:
- Depth: advanced medical education (residents / specialists)
- Structure with clear headings and subheadings
- Explain pathophysiology, diagnostics, treatment principles, and clinical decision-making
- Include current standard-of-care approaches
- Adapt recommendations to Czech/European practice where relevant

OPTIONAL (only if appropriate):
- Tables for classification or comparison
- Simple algorithms for decision-making
- References to guideline-level concepts (without citations list)

DO NOT:
- Oversimplify
- Write exam-focused bullet dumps
- Assume beginner-level knowledge

CONTEXT:
Specialty: {{specialty}}
Okruh: {{okruh}}
Téma: {{tema}}
Topic / Question: {{title}}

OUTPUT:
Return the full educational text.`;

const HIGH_YIELD_TEMPLATE = `HIGH-YIELD
TASK:
Extract the most clinically important HIGH-YIELD points from the full text.

RULES:
- Bullet points only
- Focus on decision-making, red flags, key principles
- No repetition of full explanations
- No new information beyond the full text

FULL TEXT:
{{full_text}}

OUTPUT:
Return a concise high-yield bullet list.`;

const DEEP_DIVE_TEMPLATE = `DEEP-DIVE
TASK:
Create an advanced deep-dive expansion of the topic.

INCLUDE:
- Clinical nuances and controversies
- Decision-making trade-offs
- Common pitfalls and mistakes
- Complications and their management
- Differences between international and Czech/European practice
- Emerging trends (if relevant)

RULES:
- Do NOT repeat or summarize the full text
- Add expert reasoning and context
- Use tables or diagrams ONLY if they clarify complex decisions

FULL TEXT:
{{full_text}}

OUTPUT:
Return the deep-dive expert content.`;

const fillTemplate = (template, vars) =>
  Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value || ''),
    template
  );

const buildTemplateMarkdown = (structuredData, title) => {
  if (!structuredData) return '';
  const sections = [
    { key: 'overview_md', title: 'Přehled tématu' },
    { key: 'principles_md', title: 'Základní principy' },
    { key: 'relations_md', title: 'Souvislosti' },
    { key: 'clinical_thinking_md', title: 'Klinické uvažování' },
    { key: 'common_pitfalls_md', title: 'Časté chyby' },
    { key: 'mental_model_md', title: 'Mentální model' },
    { key: 'scenarios_md', title: 'Scénáře' },
    { key: 'key_takeaways_md', title: 'Klíčové body' }
  ];

  const toc = sections
    .filter((s) => structuredData[s.key])
    .map((s, idx) => `${idx + 1}. ${s.title}`)
    .join('\n');

  const body = sections
    .map((s) => structuredData[s.key] ? structuredData[s.key].trim() : '')
    .filter(Boolean)
    .join('\n\n---\n\n');

  return [
    `# ${title || 'Studijní text'}`,
    '',
    '## Obsah',
    toc || '-',
    '',
    body
  ].join('\n');
};

export default function TopicContentEditorV2({ topic, context, onSave }) {
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
  const [lastGenerated, setLastGenerated] = useState(null);
  const [generationWarnings, setGenerationWarnings] = useState([]);
  const [generationConfidence, setGenerationConfidence] = useState(null);
  const [useRichEditor, setUseRichEditor] = useState(true);
  const lastUpdatedRaw = topic?.updated_date || topic?.updated_at || topic?.modified_date || topic?.created_date || null;
  const lastUpdatedLabel = lastUpdatedRaw ? `Poslední změna: ${new Date(lastUpdatedRaw).toLocaleString('cs-CZ')}` : '';
  const contextSummary = [
    context?.specialty ? `Obor: ${context.specialty}` : null,
    context?.okruh ? `Okruh: ${context.okruh}` : null,
    topic?.title ? `Téma: ${topic.title}` : null
  ].filter(Boolean).join(' • ');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData = {
        status: content.status,
        full_text_content: content.full_text_content,
        bullet_points_summary: content.bullet_points_summary,
        deep_dive_content: content.deep_dive_content,
        learning_objectives: content.learning_objectives,
        source_pack: content.source_pack,

        // NOVÁ AI METADATA
        ai_model: lastGenerated?.metadata?.model || 'claude-sonnet-4',
        ai_confidence: lastGenerated?.confidence || null,
        ai_warnings: lastGenerated?.warnings || [],
        ai_generated_at: lastGenerated?.metadata?.generatedAt || null,
        ai_cost: lastGenerated?.metadata?.cost?.total
          ? parseFloat(lastGenerated.metadata.cost.total)
          : null,

        // Review status
        review_status: content.status === 'published' ? 'approved' : 'pending'
      };

      await base44.entities.Topic.update(topic.id, updateData);
      toast.success('Téma uloženo');
      if (onSave) onSave();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Chyba při ukládání: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIGenerate = async (mode) => {
    setIsGenerating(true);
    try {
      if ((mode === 'high_yield' || mode === 'deep_dive') && !content.full_text_content) {
        toast.error('Nejprve vygeneruj nebo vlož plný studijní text.');
        return;
      }

      const templateVars = {
        specialty: context?.specialty || '',
        okruh: context?.okruh || '',
        tema: context?.tema || topic.title || '',
        title: topic.title || '',
        full_text: content.full_text_content || ''
      };

      const promptMap = {
        fulltext: fillTemplate(FULLTEXT_TEMPLATE, templateVars),
        high_yield: `INPUT TEXT (EXTRACT-ONLY):\n\n${content.full_text_content || ''}`,
        deep_dive: `REFERENCE (do not repeat):\n\n${content.full_text_content || ''}`
      };

      const response = await base44.functions.invoke('invokeClaudeEduLLM', {
        mode: mode,
        entityContext: {
          topic: topic,
          entityType: 'topic',
          entityId: topic.id
        },
        userPrompt: promptMap[mode] || `Vytvoř obsah pro téma: ${topic.title}`,
        systemPromptOverride: ADMIN_CONTENT_SYSTEM_PROMPT
      });

      const result = response.data || response;
      if (result?.error) {
        throw new Error(result.error);
      }

      const confidenceValue = typeof result?.confidence === 'number' ? result.confidence : null;
      const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
      setGenerationConfidence(confidenceValue);
      setGenerationWarnings(warnings);

      const sources = Array.isArray(result?.sources) ? result.sources : [];
      const mergedSourcePack = {
        internal_refs: content.source_pack?.internal_refs || [],
        external_refs: [
          ...(content.source_pack?.external_refs || []),
          ...sources.map((title) => ({ title }))
        ]
      };

      // Struktura metadata pro uložení
      const aiMetadata = {
        confidence: confidenceValue,
        warnings: warnings,
        metadata: {
          model: result?.metadata?.model || result?.model || 'gemini-2.0-flash',
          usedModel: result?.metadata?.usedModel || result?.model || 'gemini-2.0-flash',
          generatedAt: new Date().toISOString(),
          fallback: result?.metadata?.fallback || false,
          cost: {
            total: result?.metadata?.cost?.total || result?.cost?.total || 0
          }
        },
        sources: sources
      };

      // Aplikuj výsledek podle módu
      if (mode === 'fulltext') {
        const compiled = buildTemplateMarkdown(result.structuredData, topic.title);
        setContent(prev => ({ 
          ...prev, 
          full_text_content: result.full_text || compiled || result.text || '',
          source_pack: result.citations || mergedSourcePack
        }));
      } else if (mode === 'high_yield') {
        setContent(prev => ({ 
          ...prev, 
          bullet_points_summary: result.high_yield || result.text || ''
        }));
      } else if (mode === 'deep_dive') {
        setContent(prev => ({ 
          ...prev, 
          deep_dive_content: result.deep_dive || result.text || '',
          source_pack: result.citations || mergedSourcePack
        }));
      }

      setLastGenerated(aiMetadata);
      const modelName = result?.metadata?.usedModel || result?.metadata?.model || 'Claude Sonnet 4';
      const costTotal = result?.metadata?.cost?.total;
      const sourceCount = sources.length;
      const confidencePct = confidenceValue !== null ? Math.round(confidenceValue * 100) : null;
      toast.success(`Obsah vygenerován • Model: ${modelName}${confidencePct !== null ? ` • Confidence: ${confidencePct}%` : ''}${typeof costTotal === 'number' ? ` • Cost: $${costTotal.toFixed(4)}` : ''} • Zdroje: ${sourceCount}`);
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Chyba při generování: ' + error.message);
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
        <AlertDescription className="text-sm text-teal-700 dark:text-teal-300 space-y-1">
          <div>
            Upravujete téma <strong>{topic.title}</strong> | AI verze: {AI_MODELS.VERSION_TAG}
          </div>
          {contextSummary && (
            <div className="text-xs text-teal-700/80 dark:text-teal-300/80">
              {contextSummary}
            </div>
          )}
          {lastUpdatedLabel && (
            <div className="text-xs text-teal-700/80 dark:text-teal-300/80">
              {lastUpdatedLabel}
            </div>
          )}
        </AlertDescription>
        <Badge variant="outline" className="ml-2">
          AI: {lastGenerated?.metadata?.model || 'Claude Sonnet 4'}
        </Badge>
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

      {/* AI Metadata & Review Panel */}
      {(content.ai_generated_at || lastGenerated) && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">AI Generation Metadata</h3>
              {lastGenerated?.metadata?.fallback && (
                <Badge variant="warning">
                  Fallback: Gemini použit
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Model</Label>
                <div className="font-medium">
                  {lastGenerated?.metadata?.model || content.ai_model || 'N/A'}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Confidence</Label>
                <div className="font-medium">
                  {lastGenerated?.confidence
                    ? `${(lastGenerated.confidence * 100).toFixed(0)}%`
                    : 'N/A'}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Náklady</Label>
                <div className="font-medium">
                  ${lastGenerated?.metadata?.cost?.total || content.ai_cost || '0.00'}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Zdroje</Label>
                <div className="font-medium">
                  {lastGenerated?.sources?.length || content.source_pack?.external_refs?.length || 0}
                </div>
              </div>
            </div>

            {lastGenerated?.warnings?.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold">Vyžaduje ověření odborníkem:</div>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {lastGenerated.warnings.map((w, i) => (
                      <li key={i} className="text-sm">{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {content.status === 'published' && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  ⚠️ Publikovaný obsah - vygenerovaný AI by měl být schválen odborníkem
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>
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
            High-Yield
          </TabsTrigger>
          <TabsTrigger value="deepdive">
            <Microscope className="w-4 h-4 mr-2" />
            Deep Dive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="full" className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Label>Plný studijní text</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setUseRichEditor(!useRichEditor)}
                className="text-xs"
              >
                {useRichEditor ? 'Markdown' : 'Rich editor'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAIGenerate('fulltext')}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                Generovat Fulltext
              </Button>
            </div>
          </div>
          {useRichEditor ? (
            <TipTapEditor
              content={content.full_text_content}
              onChange={(html) => setContent(prev => ({ ...prev, full_text_content: html }))}
              placeholder="Začněte psát studijní text..."
            />
          ) : (
            <Textarea
              value={content.full_text_content}
              onChange={(e) => setContent(prev => ({ ...prev, full_text_content: e.target.value }))}
              className="font-mono text-sm h-[400px]"
              placeholder="Plný text učebnice (markdown/HTML)..."
            />
          )}
        </TabsContent>

        <TabsContent value="bullets" className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>High-Yield shrnutí</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAIGenerate('high_yield')}
              disabled={isGenerating || !content.full_text_content}
              title="Generovat z plného textu"
            >
              {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ArrowDown className="w-3 h-3 mr-1" />}
              Generovat High-Yield
            </Button>
          </div>
          <TipTapEditor
            content={content.bullet_points_summary}
            onChange={(html) => setContent(prev => ({ ...prev, bullet_points_summary: html }))}
            placeholder="- Hlavní bod 1..."
          />
        </TabsContent>

        <TabsContent value="deepdive" className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>Deep Dive - s webem</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAIGenerate('deep_dive')}
              disabled={isGenerating || !content.full_text_content}
            >
              {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
              Generovat Deep Dive
            </Button>
          </div>
          <TipTapEditor
            content={content.deep_dive_content}
            onChange={(html) => setContent(prev => ({ ...prev, deep_dive_content: html }))}
            placeholder="Rozšířený obsah pro pokročilé studium..."
          />
        </TabsContent>
      </Tabs>

      {generationWarnings?.length > 0 && (
        <Alert variant="warning" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Vyžaduje ověření:</div>
            <ul className="list-disc list-inside space-y-1">
              {generationWarnings.map((w, i) => (
                <li key={i} className="text-sm">{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

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
