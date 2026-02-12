import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Info,
  ShieldCheck,
} from 'lucide-react';

export const ContentReview = ({ content, specialty, mode, onReviewComplete }) => {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);

  const runReview = async () => {
    setLoading(true);

    try {
      if (!content || content.length < 100) {
        toast.error('Obsah je příliš krátký pro review (min. 100 znaků)');
        setLoading(false);
        return;
      }

      const result = await base44.functions.invoke('invokeEduLLM', {
        mode: 'review',
        entityContext: {
          specialty: specialty || 'Medicína',
          contentMode: mode || 'fulltext',
        },
        userPrompt: `Proveď důkladnou recenzi následujícího medicínského obsahu.
Obor: ${specialty || 'Medicína'}
Typ obsahu: ${mode || 'fulltext'}

=== OBSAH K RECENZI ===
${content.substring(0, 12000)}
=== KONEC OBSAHU ===

Zkontroluj bezpečnost (dávkování, kontraindikace), úplnost (chybějící sekce), přesnost (faktické chyby, zastaralé guidelines).`,
        allowWeb: false,
      });

      // Parse the review result
      const reviewData = result.approved !== undefined ? result : {
        approved: false,
        confidence: result.confidence?.level === 'high' ? 0.9 : result.confidence?.level === 'medium' ? 0.7 : 0.5,
        safety_score: 70,
        completeness_score: 70,
        issues: [],
        strengths: [],
        missing_sections: [],
        ...(typeof result.text === 'string' ? (() => {
          try { return JSON.parse(result.text.replace(/```json\n?|```/g, '').trim()); } catch { return {}; }
        })() : {}),
      };

      // Ensure numeric scores
      reviewData.confidence = typeof reviewData.confidence === 'number' ? reviewData.confidence : 0.7;
      reviewData.safety_score = reviewData.safety_score || 70;
      reviewData.completeness_score = reviewData.completeness_score || 70;
      reviewData.issues = reviewData.issues || [];
      reviewData.strengths = reviewData.strengths || [];
      reviewData.missing_sections = reviewData.missing_sections || [];

      reviewData.metadata = {
        model: 'claude-sonnet-4',
        provider: 'anthropic',
        cost: result.metadata?.cost || { total: 'N/A' },
        reviewedAt: new Date().toISOString(),
      };

      setReview(reviewData);

      if (reviewData.approved) {
        toast.success('✅ Obsah schválen AI review');
      } else {
        toast.warning(`⚠️ Nalezeno ${reviewData.issues.length} problémů`);
      }

      if (onReviewComplete) {
        onReviewComplete(reviewData);
      }
    } catch (error) {
      console.error('[Review] Error:', error);
      toast.error(`Review selhal: ${error.message || 'Neznámá chyba'}`);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityBadge = (severity) => {
    const variants = { high: 'destructive', medium: 'warning', low: 'secondary' };
    return variants[severity] || 'secondary';
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            AI Content Review
            {review && (
              review.approved ? (
                <Badge variant="default" className="bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Schváleno
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Vyžaduje revizi
                </Badge>
              )
            )}
          </CardTitle>
          <Button
            onClick={runReview}
            disabled={loading || !content}
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Analyzuji...
              </>
            ) : (
              '🔍 Spustit review'
            )}
          </Button>
        </div>
      </CardHeader>

      {loading && (
        <CardContent>
          <div className="flex items-center justify-center p-8 bg-blue-50 rounded">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
            <div>
              <p className="font-medium">AI analyzuje obsah...</p>
              <p className="text-sm text-muted-foreground">Claude kontroluje bezpečnost, úplnost a přesnost</p>
            </div>
          </div>
        </CardContent>
      )}

      {review && !loading && (
        <CardContent className="space-y-4">
          {/* Scores */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className={`text-2xl font-bold ${getScoreColor(review.confidence * 100)}`}>
                {(review.confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Confidence</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className={`text-2xl font-bold ${getScoreColor(review.safety_score)}`}>
                {review.safety_score}
              </div>
              <div className="text-xs text-muted-foreground">Safety</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className={`text-2xl font-bold ${getScoreColor(review.completeness_score)}`}>
                {review.completeness_score}
              </div>
              <div className="text-xs text-muted-foreground">Kompletnost</div>
            </div>
          </div>

          {/* Issues */}
          {review.issues.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Problémy ({review.issues.length})</h4>
              {review.issues.map((issue, i) => (
                <Alert key={i} variant={issue.severity === 'high' ? 'destructive' : 'default'}>
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getSeverityBadge(issue.severity)}>{issue.severity}</Badge>
                        {issue.category && <Badge variant="outline">{issue.category}</Badge>}
                      </div>
                      <AlertDescription className="text-sm mb-2">{issue.description}</AlertDescription>
                      {issue.line && (
                        <div className="text-xs bg-white p-2 rounded border mb-2">
                          <span className="text-slate-500">Kontext:</span> „{issue.line}"
                        </div>
                      )}
                      {issue.suggestion && (
                        <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                          💡 <strong>Návrh:</strong> {issue.suggestion}
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Strengths */}
          {review.strengths.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-green-600" />
                Silné stránky
              </h4>
              <ul className="space-y-1">
                {review.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing */}
          {review.missing_sections.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <ThumbsDown className="h-4 w-4 text-orange-600" />
                Chybějící sekce
              </h4>
              <ul className="space-y-1">
                {review.missing_sections.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-orange-600 mt-1 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground pt-3 border-t flex justify-between">
            <span>Model: {review.metadata?.model}</span>
            <span>{new Date(review.metadata?.reviewedAt).toLocaleString('cs-CZ')}</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
