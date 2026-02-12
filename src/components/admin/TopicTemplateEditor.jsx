import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2, 
  Sparkles, 
  Save, 
  BookOpen, 
  Target, 
  Link as LinkIcon,
  Brain,
  AlertCircle,
  CheckCircle,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { AI_MODELS } from '../utils/aiConfig';

export default function TopicTemplateEditor({ topic, onSave }) {
  const [content, setContent] = useState({
    status: topic?.status || 'draft',
    overview_md: topic?.overview_md || '',
    principles_md: topic?.principles_md || '',
    relations_md: topic?.relations_md || '',
    clinical_thinking_md: topic?.clinical_thinking_md || '',
    common_pitfalls_md: topic?.common_pitfalls_md || '',
    mental_model_md: topic?.mental_model_md || '',
    scenarios_md: topic?.scenarios_md || '',
    key_takeaways_md: topic?.key_takeaways_md || '',
    hippo_enabled: topic?.hippo_enabled !== false,
    learning_objectives: topic?.learning_objectives || [],
    source_pack: topic?.source_pack || { internal_refs: [], external_refs: [] }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newObjective, setNewObjective] = useState('');

  const sections = [
    { key: 'overview_md', label: 'Přehled', icon: BookOpen, description: 'Základní úvod do tématu' },
    { key: 'principles_md', label: 'Základní principy', icon: Target, description: 'Fundamentální koncepty' },
    { key: 'relations_md', label: 'Souvislosti a vztahy', icon: LinkIcon, description: 'Jak se téma propojuje' },
    { key: 'clinical_thinking_md', label: 'Klinické myšlení', icon: Brain, description: 'Jak přemýšlet o problému' },
    { key: 'common_pitfalls_md', label: 'Časté chyby', icon: AlertCircle, description: 'Slepé uličky a mýty' },
    { key: 'mental_model_md', label: 'Mentální model', icon: Brain, description: 'Jak si téma představit' },
    { key: 'scenarios_md', label: 'Mini-scénáře', icon: BookOpen, description: 'Ilustrativní příklady' },
    { key: 'key_takeaways_md', label: 'Klíčové body', icon: Target, description: 'Co si zapamatovat' }
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.entities.Topic.update(topic.id, {
        ...content,
        updated_by_ai: true,
        ai_version_tag: AI_MODELS.VERSION_TAG
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

  const handleGenerateAll = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('invokeEduLLM', {
        mode: 'topic_generate_template',
        entityContext: {
          topic: topic,
          entityType: 'topic',
          entityId: topic.id
        },
        userPrompt: `Vygeneruj kompletní obsah podle nového EDU template pro téma: ${topic.title}. Zaměř se na porozumění a souvislosti, ne memorování.`,
        allowWeb: true
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Generování selhalo');
      }

      const result = response.data.structuredData || {};
      
      setContent(prev => ({
        ...prev,
        overview_md: result.overview_md || prev.overview_md,
        principles_md: result.principles_md || prev.principles_md,
        relations_md: result.relations_md || prev.relations_md,
        clinical_thinking_md: result.clinical_thinking_md || prev.clinical_thinking_md,
        common_pitfalls_md: result.common_pitfalls_md || prev.common_pitfalls_md,
        mental_model_md: result.mental_model_md || prev.mental_model_md,
        scenarios_md: result.scenarios_md || prev.scenarios_md,
        key_takeaways_md: result.key_takeaways_md || prev.key_takeaways_md
      }));

      toast.success('Hippo vygeneroval draft obsahu');
    } catch (error) {
      console.error('Generation error:', error);
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
        <AlertDescription className="text-sm text-teal-700 dark:text-teal-300">
          <div className="flex items-center justify-between">
            <span>Upravujete téma <strong>{topic.title}</strong> | EDU Template</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateAll}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 mr-1" />
              )}
              Hippo: vygenerovat draft
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Status and Hippo toggle */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <Label>Status:</Label>
          <Select value={content.status} onValueChange={(v) => setContent(prev => ({ ...prev, status: v }))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
          {getStatusBadge(content.status)}
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={content.hippo_enabled}
            onCheckedChange={(v) => setContent(prev => ({ ...prev, hippo_enabled: v }))}
          />
          <Label>Povolit Hippo</Label>
        </div>
      </div>

      {/* Learning objectives */}
      <div className="space-y-3">
        <Label>Výukové cíle</Label>
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

      {/* Content sections */}
      <Tabs defaultValue="overview_md">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          {sections.map(section => (
            <TabsTrigger key={section.key} value={section.key}>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {sections.map(section => {
          const Icon = section.icon;
          return (
            <TabsContent key={section.key} value={section.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {section.label}
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">{section.description}</p>
                </div>
              </div>
              <Textarea
                value={content[section.key]}
                onChange={(e) => setContent(prev => ({ ...prev, [section.key]: e.target.value }))}
                className="font-mono text-sm h-[400px]"
                placeholder={`Markdown pro ${section.label.toLowerCase()}...`}
              />
            </TabsContent>
          );
        })}
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
