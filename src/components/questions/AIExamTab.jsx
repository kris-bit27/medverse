import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, Save, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { canUseFeature, getRemainingAICredits, UPSELL_MESSAGES } from '@/components/utils/featureAccess';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function ConfidenceBadge({ confidence }) {
  if (!confidence?.level) return null;
  const level = String(confidence.level).toLowerCase();

  const label = level === 'high' ? 'High'
    : level === 'medium' ? 'Medium'
    : level === 'low' ? 'Low'
    : confidence.level;

  const cls =
    level === 'high'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
      : level === 'medium'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200';

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
        Confidence: {label}
      </span>
      {confidence?.reason ? (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {confidence.reason}
        </span>
      ) : null}
    </div>
  );
}

function SourcesBlock({ citations }) {
  const internal = citations?.internal || [];
  const external = citations?.external || [];

  if ((!internal || internal.length === 0) && (!external || external.length === 0)) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
        Zdroje
      </div>

      {internal?.length > 0 && (
        <div className="mb-2">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Interní
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {internal.map((c, idx) => (
              <li key={`i-${idx}`} className="text-xs text-slate-600 dark:text-slate-300">
                {c.title || c.name || c.id || 'Interní zdroj'}
                {c.section_hint ? <span className="text-slate-400"> — {c.section_hint}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {external?.length > 0 && (
        <div>
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Externí
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {external.map((c, idx) => (
              <li key={`e-${idx}`} className="text-xs text-slate-600 dark:text-slate-300">
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    {c.title || c.url}
                  </a>
                ) : (
                  <span>{c.title || 'Externí zdroj'}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AIExamTab({ question, user, topic, onNoteSaved }) {
  const [aiResponse, setAiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const featureCheck = canUseFeature(user, 'ai_answer');
  const remainingCredits = getRemainingAICredits(user);

  const generateExamAnswer = async () => {
    setIsLoading(true);
    try {
      const res = await base44.functions.invoke('invokeEduLLM', {
        mode: 'question_exam_answer',
        entityContext: {
          entityType: 'question',
          entityId: question.id,
          question,
          topic
        },
        userPrompt: `Vypracuj zkouškovou odpověď k této otázce: ${question.title}`,
        allowWeb: false
      });

      setAiResponse(res);

      // Increment usage
      if (user.role === 'student') {
        const today = new Date().toISOString().split('T')[0];
        const resetDate = user.ai_usage_reset_date?.split('T')[0];
        const shouldReset = resetDate !== today;

        await base44.auth.updateMe({
          ai_usage_today: shouldReset ? 1 : (user.ai_usage_today || 0) + 1,
          ai_usage_reset_date: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error('AI generation error:', e);
      setAiResponse({
        text: `⚠️ Chyba: ${e.message}`,
        confidence: { level: 'low', reason: 'Volání selhalo' },
        citations: { internal: [], external: [] }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveAsNote = async () => {
    if (!aiResponse?.text) return;

    setIsSaving(true);
    try {
      await base44.entities.UserNote.create({
        user_id: user.id,
        entity_type: 'question',
        entity_id: question.id,
        content: aiResponse.text,
        is_ai_generated: true
      });

      if (onNoteSaved) onNoteSaved();
    } finally {
      setIsSaving(false);
    }
  };

  if (!featureCheck.allowed) {
    const upsell = UPSELL_MESSAGES.ai_limit;
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-600" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {upsell.title}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-2 text-sm">
            {featureCheck.reason}
          </p>
          <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
            {upsell.description}
          </p>
          <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
            <Link to={createPageUrl('Pricing')}>
              {upsell.cta}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!aiResponse ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-teal-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Generovat zkouškovou odpověď
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
              AI vygeneruje strukturovanou odpověď na základě interních zdrojů a kurikula.
            </p>
            {user.plan === 'free' && remainingCredits !== Infinity && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Zbývá dnes: {remainingCredits} / {10} AI odpovědí
              </p>
            )}
            <Button
              onClick={generateExamAnswer}
              disabled={isLoading}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generovat odpověď
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-2 border-teal-200 dark:border-teal-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-600" />
                  <Badge className="bg-teal-600 hover:bg-teal-700">
                    AI zkouškově
                  </Badge>
                  {aiResponse.cache?.hit && (
                    <span className="text-xs text-slate-500">🔄 Cached</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveAsNote}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Uložit jako poznámku
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ConfidenceBadge confidence={aiResponse.confidence} />
              
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown>{aiResponse.text}</ReactMarkdown>
              </div>

              <SourcesBlock citations={aiResponse.citations} />
            </CardContent>
          </Card>

          <Alert>
            <AlertDescription className="text-xs text-slate-600 dark:text-slate-400">
              💡 Toto je AI-generovaná odpověď. Vždy zkontrolujte oficiální odpověď a zdroje.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}