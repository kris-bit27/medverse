import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardTitle } from '@/components/ui/card';

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex flex-col space-y-1.5 p-6 ${className || ''}`}
    {...props} />
));
CardHeader.displayName = "CardHeader";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Sparkles, 
  Scale, 
  Stethoscope, 
  GraduationCap,
  MessageSquare,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function TopicContentReviewPanel({ topic, aiResponse, onContentImproved }) {
  const [isImproving, setIsImproving] = useState(false);
  const [improvementMode, setImprovementMode] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [improvedContent, setImprovedContent] = useState(null);

  // Zobraz pouze pokud je confidence LOW nebo existují missing_topics
  const shouldShow = 
    aiResponse?.confidence?.level === 'low' || 
    (aiResponse?.missing_topics && aiResponse.missing_topics.length > 0);

  if (!shouldShow) return null;

  const handleImprovement = async (mode, customMessage = null) => {
    setIsImproving(true);
    setImprovementMode(mode);

    try {
      const prompts = {
        improve_missing: `Doplň chybějící témata: ${aiResponse.missing_topics?.join(', ')}`,
        legal_deepen: 'Zpřesni právní rámec tématu podle českého práva',
        clinical_examples: 'Přidej konkrétní klinické příklady z chirurgie',
        exam_refinement: 'Uprav text na atestační úroveň',
        custom: customMessage || customPrompt
      };

      const modeMapping = {
        improve_missing: 'topic_improve_missing',
        legal_deepen: 'topic_legal_deepen',
        clinical_examples: 'topic_clinical_examples',
        exam_refinement: 'topic_exam_refinement',
        custom: 'copilot_chat'
      };

      const response = await base44.functions.invoke('invokeEduLLM', {
        mode: modeMapping[mode] || modeMapping.custom,
        entityContext: {
          topic: topic,
          entityType: 'topic',
          entityId: topic.id
        },
        userPrompt: prompts[mode] || prompts.custom,
        allowWeb: mode === 'legal_deepen'
      });

      const result = response.data || response;
      setImprovedContent(result);
      
      if (onContentImproved) {
        onContentImproved(result);
      }
    } catch (error) {
      console.error('Content improvement failed:', error);
      setImprovedContent({
        text: `⚠️ Chyba při zlepšování obsahu: ${error.message}`,
        confidence: { level: 'low', reason: 'Volání selhalo' }
      });
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <CardTitle className="text-lg">Hippo identifikoval slabiny tohoto textu</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Důvod nízké confidence */}
          {aiResponse.confidence?.level === 'low' && (
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Důvod nízké jistoty:</strong> {aiResponse.confidence.reason}
              </AlertDescription>
            </Alert>
          )}

          {/* Chybějící témata */}
          {aiResponse.missing_topics && aiResponse.missing_topics.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Chybějící témata:
              </p>
              <div className="flex flex-wrap gap-2">
                {aiResponse.missing_topics.map((topic, idx) => (
                  <Badge key={idx} variant="outline" className="bg-white dark:bg-slate-800">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Akce pro zlepšení */}
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Hippo může pomoci zlepšit text:
            </p>
            <div className="grid gap-2">
              {aiResponse.missing_topics && aiResponse.missing_topics.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleImprovement('improve_missing')}
                  disabled={isImproving}
                >
                  {isImproving && improvementMode === 'improve_missing' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Doplnit chybějící části
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleImprovement('legal_deepen')}
                disabled={isImproving}
              >
                {isImproving && improvementMode === 'legal_deepen' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Scale className="w-4 h-4 mr-2" />
                )}
                Zpřesnit právní rámec
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleImprovement('clinical_examples')}
                disabled={isImproving}
              >
                {isImproving && improvementMode === 'clinical_examples' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Stethoscope className="w-4 h-4 mr-2" />
                )}
                Přidat klinické příklady
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleImprovement('exam_refinement')}
                disabled={isImproving}
              >
                {isImproving && improvementMode === 'exam_refinement' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <GraduationCap className="w-4 h-4 mr-2" />
                )}
                Upravit na atestační úroveň
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowCustomInput(!showCustomInput)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Diskutovat s Hippem
                {showCustomInput ? (
                  <ChevronUp className="w-4 h-4 ml-auto" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-auto" />
                )}
              </Button>
            </div>

            {/* Custom input */}
            {showCustomInput && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Co by Hippo měl zlepšit nebo doplnit?"
                  className="min-h-[80px]"
                  disabled={isImproving}
                />
                <Button
                  onClick={() => handleImprovement('custom')}
                  disabled={!customPrompt.trim() || isImproving}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  {isImproving && improvementMode === 'custom' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Zlepšit podle pokynů
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Improved content display */}
      {improvedContent && (
        <Card className="border-2 border-green-200 dark:border-green-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <CardTitle className="text-lg">Hippo vylepšil obsah</CardTitle>
              {improvedContent.confidence && (
                <Badge 
                  className={
                    improvedContent.confidence.level === 'high' 
                      ? 'bg-green-100 text-green-700 border-green-300' 
                      : improvedContent.confidence.level === 'medium'
                      ? 'bg-amber-100 text-amber-700 border-amber-300'
                      : 'bg-red-100 text-red-700 border-red-300'
                  }
                >
                  Jistota: {improvedContent.confidence.level}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {improvedContent.confidence?.reason && (
              <Alert>
                <AlertDescription className="text-sm">
                  {improvedContent.confidence.reason}
                </AlertDescription>
              </Alert>
            )}

            <div className="prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown>{improvedContent.text}</ReactMarkdown>
            </div>

            {improvedContent.missing_topics && improvedContent.missing_topics.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Stále chybí:
                </p>
                <div className="flex flex-wrap gap-2">
                  {improvedContent.missing_topics.map((topic, idx) => (
                    <Badge key={idx} variant="outline">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Alert>
              <AlertDescription className="text-xs text-slate-600 dark:text-slate-400">
                💡 Zkopírujte vylepšený obsah do editoru a případně ho dále upravte ručně.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}