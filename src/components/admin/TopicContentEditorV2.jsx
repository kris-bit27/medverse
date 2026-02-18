import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { VersionHistory } from './VersionHistory';
import { ContentReview } from './ContentReview';

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

const cleanAiWrappedText = (value) => {
  if (!value || typeof value !== 'string') return value || '';

  const normalize = (v) => v.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  const cleaned = value.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();

  const tryParse = () => {
    try {
      return JSON.parse(cleaned);
    } catch {
      const first = cleaned.indexOf('{');
      const last = cleaned.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) {
        try {
          return JSON.parse(cleaned.slice(first, last + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  };

  const parsed = tryParse();
  if (parsed?.full_text || parsed?.high_yield || parsed?.deep_dive) {
    return normalize(parsed.full_text || parsed.high_yield || parsed.deep_dive || '');
  }

  const key = cleaned.includes('"full_text"')
    ? 'full_text'
    : cleaned.includes('"high_yield"')
      ? 'high_yield'
      : cleaned.includes('"deep_dive"')
        ? 'deep_dive'
        : null;
  if (key) {
    const keyIndex = cleaned.indexOf(`"${key}"`);
    if (keyIndex !== -1) {
      const afterKey = cleaned.slice(keyIndex);
      const colonIndex = afterKey.indexOf(':');
      if (colonIndex !== -1) {
        let raw = afterKey.slice(colonIndex + 1).trim();
        if (raw.startsWith('"')) raw = raw.slice(1);
        const lastQuote = raw.lastIndexOf('"');
        if (lastQuote !== -1) raw = raw.slice(0, lastQuote);
        raw = raw.replace(/\s*[,}]*\s*$/, '');
        if (raw) return normalize(raw.replace(/\\"/g, '"'));
      }
    }
  }

  return normalize(value);
};

export default function TopicContentEditorV2({ topic, context, onSave }) {
  const [content, setContent] = useState({
    status: topic?.status || 'draft',
    full_text_content: cleanAiWrappedText(topic?.full_text_content),
    bullet_points_summary: cleanAiWrappedText(topic?.bullet_points_summary),
    deep_dive_content: cleanAiWrappedText(topic?.deep_dive_content),
    learning_objectives: topic?.learning_objectives || [],
    source_pack: topic?.source_pack || { internal_refs: [], external_refs: [] },
    sources: topic?.sources || [],
    warnings: topic?.warnings || []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newObjective, setNewObjective] = useState('');
  const [lastGenerated, setLastGenerated] = useState(null);
  const [generationWarnings, setGenerationWarnings] = useState([]);
  const [generationConfidence, setGenerationConfidence] = useState(null);
  const lastUpdatedRaw = topic?.updated_date || topic?.updated_at || topic?.modified_date || topic?.created_date || null;
  const lastUpdatedLabel = lastUpdatedRaw ? `Poslední změna: ${new Date(lastUpdatedRaw).toLocaleString('cs-CZ')}` : '';
  const contextSummary = [
    context?.specialty ? `Obor: ${context.specialty}` : null,
    context?.okruh ? `Okruh: ${context.okruh}` : null,
    topic?.title ? `Téma: ${topic.title}` : null
  ].filter(Boolean).join(' • ');

  const fetchTopicContent = async () => {
    try {
      const fresh = await supabase.from('topics').select('*').eq('id', topic.id).single().then(r => r.data);
      setContent({
        status: fresh?.status || 'draft',
        full_text_content: cleanAiWrappedText(fresh?.full_text_content),
        bullet_points_summary: cleanAiWrappedText(fresh?.bullet_points_summary),
        deep_dive_content: cleanAiWrappedText(fresh?.deep_dive_content),
        learning_objectives: fresh?.learning_objectives || [],
        source_pack: fresh?.source_pack || { internal_refs: [], external_refs: [] },
        sources: fresh?.sources || [],
        warnings: fresh?.warnings || []
      });
      setLastGenerated(null);
      setGenerationWarnings([]);
      setGenerationConfidence(null);
    } catch (error) {
      console.error('Failed to reload topic:', error);
      toast.error('Nepodařilo se načíst verzi tématu');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // ========== DEBUG LOGGING ==========
      console.group('💾 [SAVE DEBUG]');
      console.log('Full content length:', content.full_text_content?.length);
      console.log('First 200 chars:', content.full_text_content?.substring(0, 200));
      console.log(
        'Last 200 chars:',
        content.full_text_content?.substring(
          Math.max(0, (content.full_text_content?.length || 0) - 200)
        )
      );

      // Check for suspicious patterns
      if (content.full_text_content?.includes('Gold standard\\')) {
        console.warn('⚠️ Found backslash escape - might be JSON stringified!');
      }

      // Prepare update data
      const updateData = {
        full_text_content: content.full_text_content,
        bullet_points_summary: content.bullet_points_summary,
        deep_dive_content: content.deep_dive_content,
        last_ai_model_used: lastGenerated?.metadata?.model || null,
        last_ai_cost: lastGenerated?.metadata?.cost?.total || null,
        sources: content.sources || [],
        warnings: content.warnings || [],
        updated_at: new Date().toISOString()
      };

      console.log('Update payload keys:', Object.keys(updateData));
      console.log('Update payload size (bytes):', JSON.stringify(updateData).length);

      // Save to database
      const { error, data } = await supabase
        .from('topics')
        .update(updateData)
        .eq('id', topic.id)
        .select(); // ← IMPORTANT: Return saved data!

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      // Verify what was saved
      console.log('✅ Save successful!');
      console.log('Returned data:', data);

      if (data && data[0]) {
        const saved = data[0];
        console.log('Saved content length:', saved.full_text_content?.length);
        console.log(
          'Saved last 200:',
          saved.full_text_content?.substring(
            Math.max(0, (saved.full_text_content?.length || 0) - 200)
          )
        );

        // Compare lengths
        const originalLength = content.full_text_content?.length || 0;
        const savedLength = saved.full_text_content?.length || 0;

        if (savedLength < originalLength) {
          console.error('🚨 TRUNCATION DETECTED!');
          console.error(`Original: ${originalLength} chars`);
          console.error(`Saved: ${savedLength} chars`);
          console.error(`Lost: ${originalLength - savedLength} chars`);
        } else {
          console.log('✅ Full content saved successfully!');
        }
      }

      console.groupEnd();

      toast.success('Uloženo!');
    } catch (error) {
      console.error('❌ Save failed:', error);
      toast.error(`Chyba: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIGenerate = async (mode) => {
    setIsGenerating(true);
    let didOpenDebugGroup = false;
    try {
      // Validace pro high-yield a deep-dive
      if ((mode === 'topic_generate_high_yield' || mode === 'topic_generate_deep_dive') && !content.full_text_content) {
        toast.error('Nejprve vygeneruj fulltext');
        setIsGenerating(false);
        return;
      }

      const claudeContext = {
        specialty: context?.specialty || '',
        okruh: context?.okruh || '',
        title: topic.title || '',
        full_text: content.full_text_content || ''
      };

      console.log('[Claude] Generuji mód:', mode);
      console.log('[Claude] Context:', claudeContext);

      const response = await fetch('/api/generate-topic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: mode,
          context: {
            specialty: context?.specialty || '',
            okruh: context?.okruh || '',
            title: topic.title || '',
            full_text: content.full_text_content || ''
          }
        })
      });

      const responseText = await response.text();
      let result = null;
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        result = { error: responseText };
      }

      if (!response.ok) {
        throw new Error(result?.error || `API Error: ${response.status}`);
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      const normalizeText = (value) =>
        typeof value === 'string' ? value.replace(/\\n/g, '\n').replace(/\\t/g, '\t') : value;

      const tryParseJsonString = (value) => {
        if (typeof value !== 'string') return null;
        const cleaned = value.replace(/```json\n?|\n?```/g, '').trim();
        if (!cleaned.startsWith('{') || !cleaned.includes('"')) return null;
        try {
          return JSON.parse(cleaned);
        } catch {
          const first = cleaned.indexOf('{');
          const last = cleaned.lastIndexOf('}');
          if (first !== -1 && last !== -1 && last > first) {
            try {
              return JSON.parse(cleaned.slice(first, last + 1));
            } catch {
              return null;
            }
          }
          return null;
        }
      };

      // ========== DEBUG LOGGING ==========
      console.group('🤖 [AI RESPONSE DEBUG]');
      didOpenDebugGroup = true;
      console.log('Raw response (parsed):', result);
      console.log('Raw response text length:', responseText?.length || 0);
      console.log('Content length:', result?.content?.length);

      // Parse JSON content if wrapped in result.content
      if (typeof result?.content === 'string') {
        let textContent = result.content;
        console.log('Before JSON parse:', textContent.substring(0, 200));

        if (textContent.startsWith('```json')) {
          textContent = textContent.replace(/^```json\n/, '').replace(/\n```$/, '');
        }

        try {
          const parsed = JSON.parse(textContent.trim());
          result = { ...result, ...parsed };
          delete result.content;
          console.log('Parsed full_text length:', parsed.full_text?.length);
          console.log('Parsed full_text last 200:', parsed.full_text?.slice(-200));
        } catch (parseError) {
          console.error('Parse JSON content failed:', parseError);
        }
      }

      if (typeof result?.full_text === 'string') {
        const parsed = tryParseJsonString(result.full_text);
        if (parsed) result = { ...result, ...parsed };
      } else if (typeof result?.text === 'string') {
        const parsed = tryParseJsonString(result.text);
        if (parsed) result = { ...result, ...parsed };
      }

      // Extrakce metadata
      const aiMetadata = {
        confidence: result?.confidence || null,
        warnings: result?.warnings || [],
        sources: result?.sources || [],
        _cache: result?._cache || null,
        metadata: {
          model: result?.metadata?.model || 'claude-sonnet-4',
          provider: result?.metadata?.provider || (result?.metadata?.model?.includes('gemini') ? 'google' : 'anthropic'),
          generatedAt: result?.metadata?.generatedAt || new Date().toISOString(),
          cost: result?.metadata?.cost || { total: '0' },
          fallback: result?.metadata?.fallback || false
        }
      };

      setLastGenerated(aiMetadata);
      setGenerationConfidence(aiMetadata.confidence);
      setGenerationWarnings(aiMetadata.warnings);

      // Aplikuj podle módu
      if (mode === 'topic_generate_fulltext_v2') {
        const fullText = normalizeText(result.full_text || result.text || '');
        console.log('[Parse] Full text length:', fullText.length);
        setContent(prev => ({ 
          ...prev, 
          full_text_content: fullText,
          sources: result.sources || [],
          warnings: result.warnings || [],
          source_pack: {
            internal_refs: prev.source_pack?.internal_refs || [],
            external_refs: [
              ...(prev.source_pack?.external_refs || []),
              ...(result.sources || []).map(s => ({ title: s }))
            ]
          }
        }));
        console.log('[State] Set content length:', fullText.length);
        // toast handled below
        
      } else if (mode === 'topic_generate_high_yield') {
        setContent(prev => ({ 
          ...prev, 
          bullet_points_summary: normalizeText(result.high_yield || result.text || ''),
          sources: result.sources || prev.sources || [],
          warnings: result.warnings || prev.warnings || []
        }));
        // toast handled below
        
      } else if (mode === 'topic_generate_deep_dive') {
        setContent(prev => ({ 
          ...prev, 
          deep_dive_content: normalizeText(result.deep_dive || result.text || ''),
          sources: result.sources || prev.sources || [],
          warnings: result.warnings || prev.warnings || [],
          source_pack: {
            internal_refs: prev.source_pack?.internal_refs || [],
            external_refs: [
              ...(prev.source_pack?.external_refs || []),
              ...(result.sources || []).map(s => ({ title: s }))
            ]
          }
        }));
        // toast handled below
      }

      const { error: versionError } = await supabase.rpc('create_topic_version', {
        p_topic_id: topic.id,
        p_change_reason: `AI generation: ${mode}`
      });

      if (versionError) {
        console.error('Version creation failed:', versionError);
      }

      const isCached = result?._cache?.cached;
      if (isCached) {
        toast.success(`⚡ Content loaded from cache (${Math.floor(result._cache.cacheAge / 60)} min old)`);
      } else {
        const isGemini = result.metadata?.provider === 'google' || result.metadata?.model?.includes('gemini');
        const isHaiku = result.metadata?.model?.includes('haiku');
        const modelName = isGemini ? 'Gemini' : isHaiku ? 'Haiku' : 'Sonnet';
        const icon = isGemini ? '⚡' : isHaiku ? '🚀' : '✨';
        toast.success(`${icon} Generated with ${modelName} (cost: $${result.metadata?.cost?.total || '0'})`);
      }

      // Zobraz warnings pokud existují
      if (aiMetadata.warnings.length > 0) {
        toast.warning(`Varování: ${aiMetadata.warnings.join(', ')}`);
      }

      // Zobraz cost
      if (aiMetadata.metadata.cost?.total) {
        console.log(`[Claude] Náklady: $${aiMetadata.metadata.cost.total}`);
      }

    } catch (error) {
      console.error('[Claude] Error:', error);
      toast.error('Chyba při generování: ' + error.message);
    } finally {
      if (didOpenDebugGroup) {
        console.groupEnd();
      }
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
      draft: { color: 'bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-muted))]', icon: AlertTriangle },
      in_review: { color: 'bg-[hsl(var(--mn-warn)/0.12)] text-[hsl(var(--mn-warn))]', icon: Eye },
      published: { color: 'bg-[hsl(var(--mn-success)/0.12)] text-[hsl(var(--mn-success))]', icon: CheckCircle }
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
      <Alert className="bg-[hsl(var(--mn-accent)/0.08)] border-[hsl(var(--mn-accent)/0.2)] dark:border-[hsl(var(--mn-accent)/0.3)]">
        <AlertDescription className="text-sm text-[hsl(var(--mn-accent))] dark:text-[hsl(var(--mn-accent))] space-y-1">
          <div>
            Upravujete téma <strong>{topic.title}</strong> | AI verze: {AI_MODELS.VERSION_TAG}
          </div>
          {contextSummary && (
            <div className="text-xs text-[hsl(var(--mn-accent))]/80 dark:text-[hsl(var(--mn-accent))]/80">
              {contextSummary}
            </div>
          )}
          {lastUpdatedLabel && (
            <div className="text-xs text-[hsl(var(--mn-accent))]/80 dark:text-[hsl(var(--mn-accent))]/80">
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
        <Card className="p-4 bg-[hsl(var(--mn-accent-2)/0.06)]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">AI Generation Metadata</h3>
                <div className="flex gap-2">
                  {lastGenerated?._cache?.cached && (
                    <Badge variant="secondary">
                      ⚡ From Cache
                    </Badge>
                  )}
                  {lastGenerated?.metadata?.model && (
                    <Badge
                      variant="outline"
                      className={
                        lastGenerated.metadata.provider === 'google'
                          ? 'bg-[hsl(var(--mn-accent)/0.06)] text-[hsl(var(--mn-accent))] border-[hsl(var(--mn-accent)/0.2)]'
                          : lastGenerated.metadata.model.includes('haiku')
                            ? 'bg-[hsl(var(--mn-success)/0.06)] text-[hsl(var(--mn-success))] border-[hsl(var(--mn-success)/0.3)]'
                            : 'bg-[hsl(var(--mn-accent-2)/0.06)] text-[hsl(var(--mn-accent-2))] border-[hsl(var(--mn-accent-2)/0.3)]'
                      }
                    >
                      {lastGenerated.metadata.provider === 'google'
                        ? '⚡ Gemini'
                        : lastGenerated.metadata.model.includes('haiku')
                          ? '🚀 Haiku'
                          : '🧠 Sonnet'}
                    </Badge>
                  )}
                </div>
              </div>
              {lastGenerated?.metadata?.fallback && (
                <Badge variant="warning">
                  Fallback: Gemini použit
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <Label className="text-xs text-[hsl(var(--mn-muted))]">Model</Label>
                <div className="font-medium">
                  {lastGenerated?.metadata?.model || content.ai_model || 'N/A'}
                </div>
              </div>

              <div>
                <Label className="text-xs text-[hsl(var(--mn-muted))]">Confidence</Label>
                <div className="font-medium">
                  {lastGenerated?.confidence
                    ? `${(lastGenerated.confidence * 100).toFixed(0)}%`
                    : 'N/A'}
                </div>
              </div>

              <div>
                <Label className="text-xs text-[hsl(var(--mn-muted))]">Náklady</Label>
                <div className="font-medium">
                  ${lastGenerated?.metadata?.cost?.total || content.ai_cost || '0.00'}
                </div>
              </div>

              <div>
                <Label className="text-xs text-[hsl(var(--mn-muted))]">Zdroje</Label>
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

            {lastGenerated?.sources?.length > 0 && (
              <Alert className="bg-[hsl(var(--mn-accent-2)/0.06)] border-[hsl(var(--mn-accent-2)/0.3)]">
                <BookOpen className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold text-[hsl(var(--mn-accent-2))]">
                    📚 Citované zdroje ({lastGenerated.sources.length})
                  </div>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-[hsl(var(--mn-accent-2))]">
                    {lastGenerated.sources.map((source, i) => (
                      <li key={i} className="text-xs">{source}</li>
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

      {content.full_text_content && (
        <div className="mt-4">
          <ContentReview
            content={content.full_text_content}
            specialty={topic.obor?.name || ''}
            mode="topic_generate_fulltext_v2"
            onReviewComplete={(reviewData) => {
              console.log('Review completed:', reviewData);
              // Můžeš uložit review do state nebo DB
            }}
          />
        </div>
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
              <span className="text-xs text-[hsl(var(--mn-muted))]">Markdown</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAIGenerate('topic_generate_fulltext_v2')}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                Generovat Fulltext
              </Button>
            </div>
          </div>
          <Textarea
            value={content.full_text_content}
            onChange={(e) => setContent(prev => ({ ...prev, full_text_content: e.target.value }))}
            className="font-mono text-sm h-[400px]"
            placeholder="Plný text učebnice (markdown)..."
          />
        </TabsContent>

        <TabsContent value="bullets" className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>High-Yield shrnutí</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAIGenerate('topic_generate_high_yield')}
              disabled={isGenerating || !content.full_text_content}
              title="Generovat z plného textu"
            >
              {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ArrowDown className="w-3 h-3 mr-1" />}
              Generovat High-Yield
            </Button>
          </div>
          <Textarea
            value={content.bullet_points_summary}
            onChange={(e) => setContent(prev => ({ ...prev, bullet_points_summary: e.target.value }))}
            className="font-mono text-sm h-[260px]"
            placeholder="- Hlavní bod 1..."
          />
        </TabsContent>

        <TabsContent value="deepdive" className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>Deep Dive - s webem</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAIGenerate('topic_generate_deep_dive')}
              disabled={isGenerating || !content.full_text_content}
            >
              {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
              Generovat Deep Dive
            </Button>
          </div>
          <Textarea
            value={content.deep_dive_content}
            onChange={(e) => setContent(prev => ({ ...prev, deep_dive_content: e.target.value }))}
            className="font-mono text-sm h-[260px]"
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
        <div className="space-y-2 p-4 bg-[hsl(var(--mn-surface-2))] rounded-lg">
          <Label className="text-sm font-semibold">Zdroje a citace</Label>
          {content.source_pack.internal_refs?.length > 0 && (
            <div>
              <div className="text-xs text-[hsl(var(--mn-muted))] mb-1">Interní:</div>
              {content.source_pack.internal_refs.map((ref, i) => (
                <Badge key={i} variant="secondary" className="mr-1 mb-1">{ref.title}</Badge>
              ))}
            </div>
          )}
          {content.source_pack.external_refs?.length > 0 && (
            <div>
              <div className="text-xs text-[hsl(var(--mn-muted))] mb-1">Externí:</div>
              {content.source_pack.external_refs.map((ref, i) => (
                <div key={i} className="text-xs text-[hsl(var(--mn-muted))]">
                  • {ref.title} {ref.publisher && `(${ref.publisher})`}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI-Generated Sources & Warnings */}
      {(content.sources?.length > 0 || content.warnings?.length > 0) && (
        <div className="space-y-3 p-4 bg-[hsl(var(--mn-accent-2)/0.06)] rounded-lg border border-[hsl(var(--mn-accent-2)/0.3)]">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI-generované informace
          </Label>
          
          {content.sources?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--mn-accent-2))]">
                📚 Citované zdroje ({content.sources.length})
              </div>
              <div className="space-y-1">
                {content.sources.map((source, i) => (
                  <div key={i} className="text-sm text-[hsl(var(--mn-muted))] pl-3 border-l-2 border-[hsl(var(--mn-accent-2)/0.4)]">
                    {typeof source === 'string' ? source : source.title || source.citation || JSON.stringify(source)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.warnings?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--mn-warn))] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Varování k ověření ({content.warnings.length})
              </div>
              <div className="space-y-1">
                {content.warnings.map((warning, i) => (
                  <div key={i} className="text-sm text-[hsl(var(--mn-warn))] pl-3 border-l-2 border-[hsl(var(--mn-warn))] bg-[hsl(var(--mn-warn)/0.06)] p-2 rounded">
                    {typeof warning === 'string' ? warning : warning.message || warning.text || JSON.stringify(warning)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Uložit obsah
        </Button>

        <VersionHistory
          topicId={topic.id}
          onRestore={() => {
            fetchTopicContent();
            if (onSave) onSave();
          }}
        />
      </div>
    </div>
  );
}
