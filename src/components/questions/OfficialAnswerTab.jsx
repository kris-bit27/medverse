import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function OfficialAnswerTab({ question }) {
  // Zobrazujeme pouze published odpovědi
  const hasPublishedAnswer = question?.answer_rich && question?.status === 'published';

  if (!hasPublishedAnswer) {
    return (
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-600" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Oficiální odpověď zatím není k dispozici
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Odpověď na tuto otázku je v přípravě. Můžete využít AI asistenta pro okamžitou pomoc.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 border-teal-200 dark:border-teal-800 bg-gradient-to-br from-white to-teal-50/30 dark:from-slate-900 dark:to-teal-900/10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-600" />
            <Badge className="bg-teal-600 hover:bg-teal-700">
              Oficiální odpověď
            </Badge>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Prověřeno editorem
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown>{question.answer_rich}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {/* Structured answer sections */}
      {question.answer_structured && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Strukturovaná odpověď</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {question.answer_structured.definice && (
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Definice</h4>
                <p className="text-slate-700 dark:text-slate-300">{question.answer_structured.definice}</p>
              </div>
            )}
            {question.answer_structured.diagnostika && (
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Diagnostika</h4>
                <p className="text-slate-700 dark:text-slate-300">{question.answer_structured.diagnostika}</p>
              </div>
            )}
            {question.answer_structured.lecba && (
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Léčba</h4>
                <p className="text-slate-700 dark:text-slate-300">{question.answer_structured.lecba}</p>
              </div>
            )}
            {question.answer_structured.komplikace && (
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Komplikace</h4>
                <p className="text-slate-700 dark:text-slate-300">{question.answer_structured.komplikace}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}