import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { createPageUrl } from '@/utils';
import AcademyBreadcrumb from '@/components/academy/AcademyBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Copy, Check, ArrowRight, BookOpen, Search, Filter,
} from 'lucide-react';
import { toast } from 'sonner';

const WORKFLOW_LABELS = {
  ambulance: { label: 'Ambulance', color: '#3B82F6' },
  vizita: { label: 'Vizita', color: '#10B981' },
  výzkum: { label: 'Výzkum', color: '#8B5CF6' },
  dokumentace: { label: 'Dokumentace', color: '#F59E0B' },
};

const DIFFICULTY_LABELS = {
  beginner: { label: 'Začátečník', color: '#10B981' },
  intermediate: { label: 'Pokročilý', color: '#F59E0B' },
  advanced: { label: 'Expert', color: '#EF4444' },
};

export default function AcademyPromptLibrary() {
  const navigate = useNavigate();
  const [selectedWorkflow, setSelectedWorkflow] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['prompt-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_lessons')
        .select('*')
        .eq('content_type', 'prompt_template')
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return data || [];
    },
  });

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const content = t.content || {};
      if (selectedWorkflow !== 'all' && content.workflow !== selectedWorkflow) return false;
      if (selectedDifficulty !== 'all' && content.difficulty !== selectedDifficulty) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          (content.template_name || '').toLowerCase().includes(q) ||
          (content.tags || []).some((tag) => tag.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [templates, selectedWorkflow, selectedDifficulty, searchQuery]);

  const handleCopy = async (template, id) => {
    try {
      await navigator.clipboard.writeText(template);
      setCopiedId(id);
      toast.success('Prompt zkopírován do schránky!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Kopírování se nezdařilo.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <AcademyBreadcrumb
        items={[
          { label: 'Academy', href: createPageUrl('AcademyDashboard') },
          { label: 'Knihovna promptů' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          📋 Knihovna promptů
        </h1>
        <p className="text-[hsl(var(--mn-muted))] mt-1">
          Připravené prompt šablony pro klinickou praxi. Kopírujte, upravte a použijte.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--mn-muted))]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hledat šablony..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface))] text-[hsl(var(--mn-text))]"
          />
        </div>

        {/* Workflow filter */}
        <select
          value={selectedWorkflow}
          onChange={(e) => setSelectedWorkflow(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface))] text-[hsl(var(--mn-text))]"
        >
          <option value="all">Všechny workflow</option>
          {Object.entries(WORKFLOW_LABELS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>

        {/* Difficulty filter */}
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface))] text-[hsl(var(--mn-text))]"
        >
          <option value="all">Všechny úrovně</option>
          {Object.entries(DIFFICULTY_LABELS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* Templates */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-[hsl(var(--mn-muted))]">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Žádné šablony odpovídající filtrům.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTemplates.map((t) => {
            const content = t.content || {};
            const isExpanded = expandedId === t.id;
            const workflow = WORKFLOW_LABELS[content.workflow];
            const difficulty = DIFFICULTY_LABELS[content.difficulty];

            return (
              <Card
                key={t.id}
                className="cursor-pointer transition-all hover:shadow-md"
                onClick={() => setExpandedId(isExpanded ? null : t.id)}
              >
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{content.template_name || t.title}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {workflow && (
                          <Badge
                            variant="secondary"
                            className="text-[10px]"
                            style={{ backgroundColor: `${workflow.color}14`, color: workflow.color }}
                          >
                            {workflow.label}
                          </Badge>
                        )}
                        {difficulty && (
                          <Badge
                            variant="secondary"
                            className="text-[10px]"
                            style={{ backgroundColor: `${difficulty.color}14`, color: difficulty.color }}
                          >
                            {difficulty.label}
                          </Badge>
                        )}
                        {(content.tags || []).slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(content.template, t.id);
                      }}
                    >
                      {copiedId === t.id ? (
                        <Check className="w-3 h-3 mr-1 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3 mr-1" />
                      )}
                      {copiedId === t.id ? 'Zkopírováno' : 'Kopírovat'}
                    </Button>
                  </div>

                  {/* Template preview (collapsed) */}
                  {!isExpanded && (
                    <pre className="text-xs text-[hsl(var(--mn-muted))] whitespace-pre-wrap line-clamp-3 font-mono bg-[hsl(var(--mn-surface-2))] rounded-lg p-3">
                      {content.template}
                    </pre>
                  )}

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="space-y-4 mt-2">
                      {/* Full template */}
                      <div>
                        <p className="text-xs font-medium text-[hsl(var(--mn-muted))] mb-1">Šablona:</p>
                        <pre className="text-sm whitespace-pre-wrap font-mono bg-[hsl(var(--mn-surface-2))] rounded-lg p-4 border border-[hsl(var(--mn-border))]">
                          {content.template}
                        </pre>
                      </div>

                      {/* Good example */}
                      {content.good_example && (
                        <div>
                          <p className="text-xs font-medium text-green-500 mb-1">Dobrý příklad:</p>
                          <pre className="text-xs whitespace-pre-wrap font-mono bg-green-500/5 rounded-lg p-3 border border-green-500/20">
                            {content.good_example}
                          </pre>
                        </div>
                      )}

                      {/* Bad example */}
                      {content.bad_example && (
                        <div>
                          <p className="text-xs font-medium text-red-500 mb-1">Špatný příklad:</p>
                          <pre className="text-xs whitespace-pre-wrap font-mono bg-red-500/5 rounded-lg p-3 border border-red-500/20">
                            {content.bad_example}
                          </pre>
                        </div>
                      )}

                      {/* Try in sandbox CTA */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(
                            createPageUrl('AcademySandbox') +
                              `?prompt=${encodeURIComponent(content.template || '')}`
                          );
                        }}
                      >
                        Vyzkoušet v Sandboxu
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
