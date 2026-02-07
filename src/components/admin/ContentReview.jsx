import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
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

// TODO: Replace mock review with real OpenAI/Edge Function when rate limits resolved
// Current: Using randomized mock data for development
// See: https://platform.openai.com/settings/organization/billing to upgrade tier

export const ContentReview = ({ content, specialty, mode, onReviewComplete }) => {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);

  const runReview = async () => {
    setLoading(true);
    
    try {
      console.log('[Review] Running MOCK review (OpenAI rate limited)');
      console.log('[Review] Content length:', content?.length);

      if (!content || content.length < 100) {
        toast.error('Content too short for review');
        setLoading(false);
        return;
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate randomized mock review
      const isApproved = Math.random() > 0.4; // 60% chance approved
      const hasHighIssue = Math.random() > 0.7;
      const hasMediumIssue = Math.random() > 0.5;
      
      const mockIssues = [];
      
      if (hasHighIssue) {
        mockIssues.push({
          severity: 'high',
          category: 'dosage',
          line: 'Dávka 500mg denně',
          description: 'Příliš vysoká dávka pro běžného pacienta',
          suggestion: 'Změnit na 325mg podle guidelines'
        });
      }
      
      if (hasMediumIssue) {
        mockIssues.push({
          severity: 'medium',
          category: 'missing_info',
          description: 'Chybí sekce o kontraindikacích',
          suggestion: 'Přidat seznam kontraindikací'
        });
      }
      
      if (Math.random() > 0.6) {
        mockIssues.push({
          severity: 'low',
          category: 'formatting',
          description: 'Některé sekce by mohly být lépe strukturované',
          suggestion: 'Použít podnadpisy pro lepší čitelnost'
        });
      }

      const mockReview = {
        approved: isApproved,
        confidence: 0.70 + Math.random() * 0.25,
        safety_score: 75 + Math.floor(Math.random() * 20),
        completeness_score: 70 + Math.floor(Math.random() * 25),
        issues: mockIssues,
        strengths: [
          'Dobře strukturovaný text',
          'Správné použití medicínské terminologie',
          'Relevantní klinické informace'
        ].slice(0, Math.floor(Math.random() * 2) + 1),
        missing_sections: isApproved ? [] : [
          'Prognóza',
          'Diferenciální diagnostika'
        ].slice(0, Math.floor(Math.random() * 2)),
        metadata: {
          model: 'mock-gpt-4o',
          provider: 'mock',
          cost: {
            input: '0.0000',
            output: '0.0000',
            total: '0.0000'
          },
          reviewedAt: new Date().toISOString()
        }
      };

      setReview(mockReview);

      if (mockReview.approved) {
        toast.success('✅ Content approved (MOCK review)');
      } else {
        toast.warning(`⚠️ ${mockReview.issues.length} issues found (MOCK review)`);
      }

      if (onReviewComplete) {
        onReviewComplete(mockReview);
      }

    } catch (error) {
      console.error('[Review] Full error:', error);
      toast.error(`Review failed: ${error.message || 'Unknown error'}`);
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
