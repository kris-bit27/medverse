import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { config } from '@/config/env';
import { toast } from 'sonner';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Info
} from 'lucide-react';


export const ContentReview = ({ content, specialty, mode, onReviewComplete }) => {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);

  const runReview = async () => {
    setLoading(true);
    
    try {
      console.log('[Review] Starting direct OpenAI call...');
      console.log('[Review] Content length:', content?.length);

      if (!content || content.length < 100) {
        toast.error('Content too short for review');
        setLoading(false);
        return;
      }

      // Direct OpenAI API call (temporary solution)
      const openaiKey = config.openaiKey;
      
      if (!openaiKey) {
        toast.error('OpenAI key missing');
        setLoading(false);
        return;
      }

      const systemPrompt = `Jsi senior medicínský reviewer pro obor ${specialty || 'medicínu'}.

ÚKOL: Zkontroluj tento AI-generovaný medicínský text na:
1. FAKTICKÁ PŘESNOST - dávkování, diagnózy, protokoly
2. SAFETY - nebezpečné informace, kontraindikace
3. COMPLETENESS - chybí důležité sekce?
4. GUIDELINES COMPLIANCE - odpovídá současným guidelines?

Vrať JSON v tomto přesném formátu:
{
  "approved": true nebo false,
  "confidence": číslo 0-1,
  "safety_score": číslo 0-100,
  "completeness_score": číslo 0-100,
  "issues": [
    {
      "severity": "high" nebo "medium" nebo "low",
      "category": "dosage" nebo "contraindication" nebo "missing_info",
      "line": "citace textu",
      "description": "popis problému",
      "suggestion": "jak to opravit"
    }
  ],
  "strengths": ["seznam silných stránek"],
  "missing_sections": ["seznam chybějících sekcí"]
}`;

      console.log('[Review] Calling OpenAI...');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: `OBSAH K REVIEW (zkráceno na prvních 3000 znaků pro rychlost):\n\n${content.substring(0, 3000)}`
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Review] OpenAI error:', errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Review] OpenAI response:', data);

      const reviewText = data.choices[0].message.content;
      console.log('[Review] Review text:', reviewText);

      // Parse JSON
      let reviewData;
      try {
        reviewData = JSON.parse(reviewText);
      } catch (e) {
        console.error('[Review] Failed to parse JSON:', e);
        throw new Error('Failed to parse review response');
      }

      console.log('[Review] Parsed review:', reviewData);

      // Add metadata
      const fullReview = {
        ...reviewData,
        metadata: {
          model: 'gpt-4o',
          provider: 'openai',
          tokensUsed: data.usage,
          cost: {
            input: ((data.usage.prompt_tokens / 1_000_000) * 2.50).toFixed(4),
            output: ((data.usage.completion_tokens / 1_000_000) * 10).toFixed(4),
            total: (
              (data.usage.prompt_tokens / 1_000_000) * 2.50 +
              (data.usage.completion_tokens / 1_000_000) * 10
            ).toFixed(4)
          },
          reviewedAt: new Date().toISOString()
        }
      };

      setReview(fullReview);

      if (fullReview.approved) {
        toast.success('✅ Content approved by AI review!');
      } else {
        toast.warning(`⚠️ ${fullReview.issues?.length || 0} issues found`);
      }

      if (onReviewComplete) {
        onReviewComplete(fullReview);
      }

    } catch (error) {
      console.error('[Review] Full error object:', error);
      console.error('[Review] Error message:', error.message);
      console.error('[Review] Error stack:', error.stack);
      
      // Show detailed error to user
      if (error.message?.includes('API key')) {
        toast.error('OpenAI API key is not configured. Check .env.local');
      } else if (error.message?.includes('429')) {
        toast.error('Rate limit exceeded. Try again in a moment.');
      } else if (error.message?.includes('401')) {
        toast.error('Invalid API key. Check your OpenAI key in .env.local');
      } else {
        toast.error(`Review failed: ${error.message || 'Unknown error'}`);
      }
      
      // Set dummy review for testing UI
      setReview({
        approved: false,
        confidence: 0,
        safety_score: 0,
        completeness_score: 0,
        issues: [{
          severity: 'high',
          category: 'error',
          description: `Review failed: ${error.message}`,
          suggestion: 'Check console for details'
        }],
        strengths: [],
        missing_sections: []
      });
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
    const variants = {
      high: 'destructive',
      medium: 'warning',
      low: 'secondary'
    };
    return variants[severity] || 'secondary';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            🤖 AI Review (GPT-4o)
            {review && (
              review.approved ? (
                <Badge variant="default" className="bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approved
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Needs Revision
                </Badge>
              )
            )}
          </CardTitle>
          <Button
            onClick={runReview}
            disabled={loading || !content}
            size="sm"
            className={loading ? 'opacity-50' : ''}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Reviewing...
              </>
            ) : (
              <>
                🔍 Run Review
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {loading && (
        <div className="mt-4 flex items-center justify-center p-8 bg-blue-50 rounded">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <div>
            <p className="font-medium">Running AI Review...</p>
            <p className="text-sm text-muted-foreground">This may take 5-10 seconds</p>
          </div>
        </div>
      )}

      {review && (
        <CardContent className="space-y-4">
          {/* Scores */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-gray-50 text-slate-900 rounded">
              <div className="text-2xl font-bold">
                {(review.confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Confidence</div>
            </div>

            <div className="text-center p-3 bg-gray-50 text-slate-900 rounded">
              <div className="text-2xl font-bold">
                {review.safety_score || 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">Safety</div>
            </div>

            <div className="text-center p-3 bg-gray-50 text-slate-900 rounded">
              <div className="text-2xl font-bold">
                {review.completeness_score || 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>

          {/* Issues */}
          {review.issues && review.issues.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Issues Found ({review.issues.length})</h4>
              {review.issues.map((issue, i) => (
                <Alert
                  key={i}
                  variant={issue.severity === 'high' ? 'destructive' : 'default'}
                  className="relative"
                >
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getSeverityBadge(issue.severity)}>
                          {issue.severity}
                        </Badge>
                        <Badge variant="outline">{issue.category}</Badge>
                      </div>

                      <AlertDescription className="text-sm mb-2">
                        {issue.description}
                      </AlertDescription>

                      {issue.line && (
                        <div className="text-xs bg-white text-slate-900 p-2 rounded border mb-2">
                          <span className="text-slate-600">Context:</span> "{issue.line}"
                        </div>
                      )}

                      {issue.suggestion && (
                        <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                          💡 <strong>Suggestion:</strong> {issue.suggestion}
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Strengths */}
          {review.strengths && review.strengths.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-green-600" />
                Strengths
              </h4>
              <ul className="space-y-1">
                {review.strengths.map((strength, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Sections */}
          {review.missing_sections && review.missing_sections.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <ThumbsDown className="h-4 w-4 text-orange-600" />
                Missing Sections
              </h4>
              <ul className="space-y-1">
                {review.missing_sections.map((section, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-orange-600 mt-1 flex-shrink-0" />
                    {section}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Metadata */}
          {review.metadata && (
            <div className="text-xs text-muted-foreground pt-3 border-t">
              <div className="flex justify-between">
                <span>Model: {review.metadata.model}</span>
                <span>Cost: ${review.metadata.cost?.total || '0'}</span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
