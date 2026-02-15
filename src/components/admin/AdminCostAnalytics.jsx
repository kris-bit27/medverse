import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  Zap,
  BarChart3,
  Loader2
} from 'lucide-react';

export default function AdminCostAnalytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-cost-stats'],
    queryFn: async () => {
      // Get costs from topics (where batch generation stores them)
      const { data: topics, error } = await supabase
        .from('topics')
        .select('ai_cost, ai_model, ai_generated_at')
        .not('ai_cost', 'is', null)
        .gt('ai_cost', 0);

      if (error) throw error;

      const totalCost = topics.reduce((sum, t) => sum + parseFloat(t.ai_cost || 0), 0);
      
      // Group by model
      const byModel = {};
      topics.forEach(t => {
        const model = t.ai_model || 'unknown';
        if (!byModel[model]) byModel[model] = { count: 0, cost: 0 };
        byModel[model].count++;
        byModel[model].cost += parseFloat(t.ai_cost || 0);
      });

      // Group by date
      const byDate = {};
      topics.forEach(t => {
        if (!t.ai_generated_at) return;
        const date = t.ai_generated_at.substring(0, 10);
        if (!byDate[date]) byDate[date] = { count: 0, cost: 0 };
        byDate[date].count++;
        byDate[date].cost += parseFloat(t.ai_cost || 0);
      });

      return {
        totalCost,
        totalTopics: topics.length,
        avgCost: topics.length > 0 ? totalCost / topics.length : 0,
        byModel,
        byDate: Object.entries(byDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => ({ date, ...data }))
      };
    },
    refetchInterval: 30000
  });

  // Get queue costs
  const { data: queueStats } = useQuery({
    queryKey: ['admin-queue-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batch_generation_queue')
        .select('status, result')
        .eq('status', 'completed');
      
      if (error) throw error;

      let totalQueueCost = 0;
      (data || []).forEach(item => {
        if (item.result) {
          Object.values(item.result).forEach(r => {
            totalQueueCost += parseFloat(r?.cost || 0);
          });
        }
      });

      return { totalQueueCost, completedItems: (data || []).length };
    }
  });

  // Remaining topics estimate
  const { data: remaining } = useQuery({
    queryKey: ['admin-remaining-estimate'],
    queryFn: async () => {
      const { count } = await supabase
        .from('topics')
        .select('id', { count: 'exact', head: true })
        .is('full_text_content', null);
      
      return count || 0;
    }
  });

  if (isLoading) {
    return <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  const s = stats || { totalCost: 0, totalTopics: 0, avgCost: 0, byModel: {}, byDate: [] };
  const q = queueStats || { totalQueueCost: 0, completedItems: 0 };
  const estRemaining = (remaining || 0) * s.avgCost;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Celkové náklady', value: `$${s.totalCost.toFixed(2)}`, icon: DollarSign, color: 'text-green-600' },
          { label: 'Topics generováno', value: s.totalTopics, icon: Zap, color: 'text-blue-600' },
          { label: 'Průměr/topic', value: `$${s.avgCost.toFixed(4)}`, icon: TrendingUp, color: 'text-purple-600' },
          { label: 'Odhad zbývajících', value: `$${estRemaining.toFixed(2)}`, icon: BarChart3, color: 'text-amber-600' },
        ].map((m, i) => (
          <Card key={i}><CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{m.label}</p>
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
              </div>
              <m.icon className="w-7 h-7 opacity-20" />
            </div>
          </CardContent></Card>
        ))}
      </div>

      {/* Remaining info */}
      {remaining > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <p className="text-sm">
              <span className="font-medium">{remaining} topics</span> bez obsahu × <span className="font-medium">${s.avgCost.toFixed(4)}</span> průměr = 
              <span className="font-bold text-amber-600"> ~${estRemaining.toFixed(2)}</span> odhadované zbývající náklady
            </p>
          </CardContent>
        </Card>
      )}

      {/* By model */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Náklady podle modelu</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(s.byModel).map(([model, data]) => {
              const shortName = model.replace('claude-', '').replace('-20250514', '');
              const pct = s.totalCost > 0 ? (data.cost / s.totalCost) * 100 : 0;
              return (
                <div key={model} className="flex items-center gap-3">
                  <Badge variant="outline" className="w-24 justify-center text-xs">{shortName}</Badge>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{data.count} topics</span>
                      <span className="font-medium">${data.cost.toFixed(4)}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div className={`h-2 rounded-full ${model.includes('opus') ? 'bg-purple-500' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 w-16 text-right">${(data.cost / data.count).toFixed(4)}/t</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* By date */}
      {s.byDate.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Náklady podle dne</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b text-xs text-slate-500">
                <tr><th className="text-left py-2">Datum</th><th className="text-center py-2">Topics</th><th className="text-right py-2">Náklady</th></tr>
              </thead>
              <tbody className="divide-y">
                {s.byDate.map(d => (
                  <tr key={d.date}>
                    <td className="py-2">{d.date}</td>
                    <td className="py-2 text-center">{d.count}</td>
                    <td className="py-2 text-right font-medium">${d.cost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
