import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, BookOpen, Microscope, Link as LinkIcon, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { canUseFeature, getRemainingAICredits, UPSELL_MESSAGES } from '../utils/featureAccess';

const ConfidenceBadge = ({ confidence }) => {
  if (!confidence) return null;
  
  const colors = {
    high: 'bg-green-100 text-green-700 border-green-300',
    medium: 'bg-amber-100 text-amber-700 border-amber-300',
    low: 'bg-red-100 text-red-700 border-red-300'
  };
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colors[confidence.level] || colors.medium}`}>
      <span className="text-xs font-semibold">Jistota: {confidence.level}</span>
      {confidence.reason && (
        <span className="text-xs">• {confidence.reason}</span>
      )}
    </div>
  );
};

const SourcesBlock = ({ citations }) => {
  if (!citations || (!citations.internal?.length && !citations.external?.length)) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Zdroje</h4>
      
      {citations.internal?.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Interní zdroje:</div>
          <div className="space-y-1">
            {citations.internal.map((ref, i) => (
              <div key={i} className="text-sm text-slate-600 dark:text-slate-400">
                • {ref.title} {ref.section_hint && `(${ref.section_hint})`}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {citations.external?.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Externí zdroje:</div>
          <div className="space-y-1">
            {citations.external.map((ref, i) => (
              <div key={i} className="text-sm text-slate-600 dark:text-slate-400">
                • <a href={ref.url} target="_blank" rel="noopener noreferrer" className="hover:text-teal-600">{ref.title}</a>
                {ref.publisher && ` (${ref.publisher})`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function TopicHippoAssistant({ topic, user }) {
  const [mode, setMode] = useState(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [hippoResponse, setHippoResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const featureCheck = canUseFeature(user, 'ai_answer');
  const remainingCredits = getRemainingAICredits(user);

  const handleHippoInteraction = async (interactionMode, customPrompt = null) => {
    setIsLoading(true);
    setMode(interactionMode);
    
    try {
      const prompts = {
        simplify: `Zjednoduš a vysvětli téma "${topic.title}" srozumitelně. Zaměř se na porozumění základním konceptům.`,
        deepen: `Vysvětli hlubší souvislosti a pokročilé koncepty k tématu "${topic.title}". Pomoz mi získat hlubší porozumění.`,
        relations: `Vysvětli souvislosti a vztahy mezi koncepty v tématu "${topic.title}". Jak se propojují s ostatními tématy medicíny?`,
        custom: customPrompt || customQuestion
      };

      const response = await base44.functions.invoke('invokeEduLLM', {
        mode: 'copilot_chat',
        entityContext: {
          topic: topic,
          entityType: 'topic',
          entityId: topic.id
        },
        userPrompt: prompts[interactionMode] || prompts.custom,
        allowWeb: interactionMode === 'deepen'
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Hippo interaction failed');
      }

      setHippoResponse(response.data);
      if (interactionMode === 'custom') {
        setCustomQuestion('');
      }
    } catch (error) {
      console.error('Hippo error:', error);
      setHippoResponse({
        text: `⚠️ Chyba: ${error.message}`,
        confidence: { level: 'low', reason: 'Volání selhalo' },
        citations: { internal: [], external: [] }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomQuestion = () => {
    if (customQuestion.trim()) {
      handleHippoInteraction('custom', customQuestion);
    }
  };

  if (!featureCheck.allowed) {
    const upsell = UPSELL_MESSAGES.ai_limit;
    return (
      <Card className="border-2 border-teal-200 dark:border-teal-800">
        <CardContent className="p-6 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-teal-300" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {upsell.title}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            {upsell.description}
          </p>
          <Button className="bg-teal-600 hover:bg-teal-700">
            {upsell.cta}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 border-teal-200 dark:border-teal-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Hippo vysvětluje
              </h3>
            </div>
            {user.plan === 'free' && remainingCredits !== Infinity && (
              <span className="text-xs text-slate-500">
                Zbývá: {remainingCredits} / 10
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Hippo je váš inteligentní průvodce. Pomůže vám porozumět souvislostem a strukturovat myšlení.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Quick actions */}
          <div className="grid gap-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleHippoInteraction('simplify')}
              disabled={isLoading}
            >
              {isLoading && mode === 'simplify' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BookOpen className="w-4 h-4 mr-2" />
              )}
              Zjednodušit a vysvětlit
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleHippoInteraction('deepen')}
              disabled={isLoading}
            >
              {isLoading && mode === 'deepen' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Microscope className="w-4 h-4 mr-2" />
              )}
              Prohloubit porozumění
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleHippoInteraction('relations')}
              disabled={isLoading}
            >
              {isLoading && mode === 'relations' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LinkIcon className="w-4 h-4 mr-2" />
              )}
              Vysvětlit souvislosti
            </Button>

            {/* Custom question toggle */}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowCustomInput(!showCustomInput)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Položit vlastní otázku
              {showCustomInput ? (
                <ChevronUp className="w-4 h-4 ml-auto" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-auto" />
              )}
            </Button>
          </div>

          {/* Custom question input */}
          {showCustomInput && (
            <div className="space-y-2 pt-2">
              <Textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Zeptej se Hippa na cokoliv k tomuto tématu..."
                className="min-h-[80px]"
                disabled={isLoading}
              />
              <Button
                onClick={handleCustomQuestion}
                disabled={!customQuestion.trim() || isLoading}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                {isLoading && mode === 'custom' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Zeptat se Hippa
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hippo Response */}
      {hippoResponse && (
        <>
          <Card className="border-2 border-teal-200 dark:border-teal-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-teal-600 hover:bg-teal-700">
                  Hippo odpovídá
                </Badge>
                {hippoResponse.cache?.hit && (
                  <span className="text-xs text-slate-500">🔄 Cached</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ConfidenceBadge confidence={hippoResponse.confidence} />
              
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown>{hippoResponse.text}</ReactMarkdown>
              </div>

              <SourcesBlock citations={hippoResponse.citations} />
            </CardContent>
          </Card>

          <Alert>
            <AlertDescription className="text-xs text-slate-600 dark:text-slate-400">
              💡 Hippo je vzdělávací průvodce. Vždy ověřte informace z oficiálních zdrojů.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}