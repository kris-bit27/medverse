import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { callApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp,
  Brain, Clock, BarChart3, Lightbulb
} from 'lucide-react';

export default function GeminiWeeklyDigest() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState('weekly_digest');

  const generateMutation = useMutation({
    mutationFn: async (reportMode) => {
      const res = await callApi('test', { user_id: user.id, mode: reportMode });
      return res;
    },
  });

  const handleGenerate = (reportMode = 'weekly_digest') => {
    setMode(reportMode);
    setExpanded(true);
    generateMutation.mutate(reportMode);
  };

  const report = generateMutation.data;
  const isLoading = generateMutation.isPending;

  return (
    <div className="p-6 rounded-xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))]" style={{ boxShadow: "var(--mn-shadow-1)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--mn-accent))]" />
          <span className="mn-ui-font text-[13px] font-semibold">AI Studijní Report</span>
          <span className="mn-ui-font text-[9px] px-2 py-0.5 rounded-full border border-[hsl(var(--mn-border))] text-[hsl(var(--mn-muted))] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--mn-success))] inline-block" /> Gemini Flash
          </span>
        </div>
        {report && (
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-[hsl(var(--mn-surface-2))] transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4 text-[hsl(var(--mn-muted))]" /> : <ChevronDown className="w-4 h-4 text-[hsl(var(--mn-muted))]" />}
          </button>
        )}
      </div>

      {!report && !isLoading && (
        <div className="space-y-3">
          <p className="mn-ui-font text-xs text-[hsl(var(--mn-muted))]">
            AI analyzuje tvůj studijní progres a vytvoří personalizovaný report s doporučeními.
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 gap-1.5 bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)] text-white" onClick={() => handleGenerate('weekly_digest')}>
              <Brain className="w-3.5 h-3.5" /> Týdenní report
            </Button>
            <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => handleGenerate('study_insights')}>
              <Lightbulb className="w-3.5 h-3.5" /> Studijní insighty
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-3 py-4">
          <Loader2 className="w-5 h-5 text-[hsl(var(--mn-accent))] animate-spin" />
          <div>
            <p className="mn-ui-font text-sm font-medium">{mode === 'weekly_digest' ? 'Generuji týdenní report…' : 'Analyzuji studijní vzory…'}</p>
            <p className="mn-ui-font text-[10px] text-[hsl(var(--mn-muted))]">Gemini Flash analyzuje tvá data</p>
          </div>
        </div>
      )}

      {generateMutation.isError && (
        <div className="py-2">
          <p className="mn-ui-font text-xs text-[hsl(var(--mn-danger))] mb-2">{generateMutation.error?.message || 'Chyba při generování reportu'}</p>
          <Button size="sm" variant="outline" onClick={() => handleGenerate(mode)}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Zkusit znovu
          </Button>
        </div>
      )}

      {report && (
        <>
          <div className="flex items-center gap-3 mn-mono-font text-[10px] text-[hsl(var(--mn-muted))] mb-2">
            <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {report.data_summary?.topics_tracked || 0} témat</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {report.data_summary?.weekly_minutes || 0} min</span>
            <span className="ml-auto">${report.cost_usd?.toFixed(4)}</span>
          </div>
          {expanded && (
            <div className="prose prose-sm dark:prose-invert max-w-none [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 first:[&_h3]:mt-0 [&_p]:text-xs [&_p]:leading-relaxed [&_p]:text-[hsl(var(--mn-muted))] [&_li]:text-xs [&_li]:text-[hsl(var(--mn-muted))] [&_strong]:text-[hsl(var(--mn-text))] [&_ul]:my-1 [&_ul]:pl-4 border-t border-[hsl(var(--mn-border)/0.3)] pt-3 mt-1">
              <div dangerouslySetInnerHTML={{ __html: report.report }} />
            </div>
          )}
          {!expanded && (
            <button className="mn-ui-font w-full text-left text-xs text-[hsl(var(--mn-accent))] hover:underline mt-1" onClick={() => setExpanded(true)}>
              Zobrazit report →
            </button>
          )}
          {expanded && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-[hsl(var(--mn-border)/0.3)]">
              <Button size="sm" variant="outline" className="text-[11px] gap-1" onClick={() => handleGenerate('weekly_digest')} disabled={isLoading}>
                <RefreshCw className="w-3 h-3" /> Nový report
              </Button>
              <Button size="sm" variant="outline" className="text-[11px] gap-1" onClick={() => handleGenerate(mode === 'weekly_digest' ? 'study_insights' : 'weekly_digest')} disabled={isLoading}>
                <Lightbulb className="w-3 h-3" /> {mode === 'weekly_digest' ? 'Studijní insighty' : 'Týdenní report'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
