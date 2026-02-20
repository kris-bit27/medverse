import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';

const scoreLabels = {
  prompt_clarity: 'Jasnost promptu',
  clinical_relevance: 'Klinická relevance',
  safety_awareness: 'Bezpečnostní povědomí',
  output_quality: 'Kvalita výstupu',
};

function ScoreCircle({ score }) {
  const color =
    score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500';
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-2xl font-bold ${color}`}
        style={{ borderColor: 'currentColor' }}
      >
        {score}
      </div>
      <span className="text-xs text-[hsl(var(--mn-muted))]">Celkové skóre</span>
    </div>
  );
}

export default function EvaluationPanel({ evaluation }) {
  if (!evaluation) return null;

  const scores = evaluation.scores || {};
  const overallScore =
    evaluation.overall_score ??
    Math.round(
      Object.values(scores).reduce((a, b) => a + b, 0) /
        Math.max(Object.values(scores).length, 1)
    );

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Hodnocení</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-6">
          <ScoreCircle score={overallScore} />
          <div className="flex-1 space-y-3">
            {Object.entries(scoreLabels).map(([key, label]) => {
              const val = scores[key];
              if (val === undefined || val === null) return null;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(var(--mn-muted))]">{label}</span>
                    <span className="font-medium">{val}%</span>
                  </div>
                  <Progress value={val} className="h-2" />
                </div>
              );
            })}
          </div>
        </div>

        {evaluation.feedback && (
          <p className="text-sm text-[hsl(var(--mn-text))]">{evaluation.feedback}</p>
        )}

        {evaluation.strengths?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {evaluation.strengths.map((s, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="bg-green-500/10 text-green-600 dark:text-green-400 border-0"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {s}
              </Badge>
            ))}
          </div>
        )}

        {evaluation.improvements?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {evaluation.improvements.map((s, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-0"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                {s}
              </Badge>
            ))}
          </div>
        )}

        {evaluation.tips?.length > 0 && (
          <div className="space-y-1">
            {evaluation.tips.map((tip, i) => (
              <p key={i} className="text-sm text-teal-600 dark:text-teal-400 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                {tip}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
