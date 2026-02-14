// Migrated from legacy Base44 agents API → now redirects to FloatingCopilot
import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function AICopilotChat() {
  return (
    <div className="flex flex-col items-center justify-center h-[300px] bg-slate-900/50 rounded-xl border border-slate-700 p-6 text-center">
      <MessageSquare className="w-10 h-10 mb-3 text-teal-400" />
      <p className="text-sm font-medium">AI Copilot</p>
      <p className="text-xs text-muted-foreground mt-1">
        Použijte plovoucí copilot tlačítko vpravo dole pro AI asistenci
      </p>
    </div>
  );
}
