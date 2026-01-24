import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Brain, Sparkles } from 'lucide-react';
import AICopilotChat from '@/components/ai/AICopilotChat';

export default function AICopilot() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Hippo
            </h1>
          </div>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Inteligentní průvodce porozuměním medicíně
        </p>
      </div>

      {/* Main Chat Card */}
      <Card className="border-2 border-teal-200 dark:border-teal-800">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            Zeptejte se na cokoliv
          </CardTitle>
          <CardDescription>
            Hippo pomáhá porozumět souvislostem, vysvětluje koncepty a strukturuje myšlení. 
            Nikdy nenahrazuje klinické rozhodování.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AICopilotChat agentName="copilot" />
        </CardContent>
      </Card>

      {/* Tips */}
      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        <Card className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-2">
              💡 Příklady otázek
            </h3>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <li>• "Pomoz mi pochopit patofyziologii infarktu myokardu"</li>
              <li>• "Vysvětli mi vztah mezi hypertenzí a srdečním selháním"</li>
              <li>• "Jak souvisí diabetes s komplikacemi ledvin?"</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-2">
              🎯 Co Hippo umí
            </h3>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <li>• Vysvětlit souvislosti a vztahy mezi koncepty</li>
              <li>• Pomoci strukturovat myšlení k tématu</li>
              <li>• Odpovědět na otázky a prohloubit porozumění</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}