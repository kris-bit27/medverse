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
              AI Copilot
            </h1>
          </div>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Váš osobní AI asistent pro studium medicíny
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
            AI Copilot vám pomůže s výkladem otázek, vytvořením poznámek, shrnutím článků, 
            přípravou na testy nebo vysvětlením složitých konceptů
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
              <li>• "Vysvětli mi patofyziologii infarktu myokardu"</li>
              <li>• "Vytvoř mi přehled k tématu diabetes mellitus"</li>
              <li>• "Jaký je rozdíl mezi systolickým a diastolickým selháním?"</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-2">
              🎯 Co umí Copilot
            </h3>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <li>• Vysvětlení složitých medicínských konceptů</li>
              <li>• Tvorba studijních poznámek a shrnutí</li>
              <li>• Pomoc s přípravou na atestace a zkoušky</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}