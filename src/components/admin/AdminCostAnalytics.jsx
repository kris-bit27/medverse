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
      // Primary source: batch_generation_queue results (most complete)
      const { data: queue } = await supabase
        .from('batch_generation_queue')
        .select('result, completed_at, topics!inner(ai_model)')
        .eq('status', 'completed')
        .not('result', 'is', null);

      let totalCost = 0;
      const byModel = {};
      const byDate = {};

      (queue || []).forEach(item => {
        if (!item.result) return;
        const model = item.topics?.ai_model || 'unknown';
        const shortModel = model.replace('claude-', '').replace('-20250514', '');
        
        let itemCost = 0;
        Object.values(item.result).forEach(r => {
          itemCost += parseFloat(r?.cost || 0);
        });
        
        totalCost += itemCost;
        
        if (!byModel[shortModel]) byModel[shortModel] = { count: 0, cost: 0, fullModel: model };
        byModel[shortModel].count++;
        byModel[shortModel].cost += itemCost;

        if (item.completed_at) {
          const date = item.completed_at.substring(0, 10);
          if (!byDate[date]) byDate[date] = { count: 0, cost: 0 };
          byDate[date].count++;
          byDate[date].cost += itemCost;
        }
      });

      return {
        totalCost,
        totalTopics: (queue || []).length,
        avgCost: (queue || []).length > 0 ? totalCost / (queue || []).length : 0,
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
          { label: 'Celkové náklady', value: `$${s.totalCost.toFixed(2)}`, icon: DollarSign, color: 'text-[hsl(var(--mn-success))]' },
          { label: 'Topics generováno', value: s.totalTopics, icon: Zap, color: 'text-[hsl(var(--mn-accent-2))]' },
          { label: 'Průměr/topic', value: `$${s.avgCost.toFixed(4)}`, icon: TrendingUp, color: 'text-[hsl(var(--mn-info))]' },
          { label: 'Odhad zbývajících', value: `$${estRemaining.toFixed(2)}`, icon: BarChart3, color: 'text-[hsl(var(--mn-warn))]' },
        ].map((m, i) => (
          <Card key={i}><CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--mn-muted))]">{m.label}</p>
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
              </div>
              <m.icon className="w-7 h-7 opacity-20" />
            </div>
          </CardContent></Card>
        ))}
      </div>

      {/* Remaining info */}
      {remaining > 0 && (
        <Card className="border-[hsl(var(--mn-warn)/0.2)]">
          <CardContent className="p-4">
            <p className="text-sm">
              <span className="font-medium">{remaining} topics</span> bez obsahu × <span className="font-medium">${s.avgCost.toFixed(4)}</span> průměr = 
              <span className="font-bold text-[hsl(var(--mn-warn))]"> ~${estRemaining.toFixed(2)}</span> odhadované zbývající náklady
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
              const pct = s.totalCost > 0 ? (data.cost / s.totalCost) * 100 : 0;
              return (
                <div key={model} className="flex items-center gap-3">
                  <Badge variant="outline" className="w-24 justify-center text-xs">{model}</Badge>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{data.count} topics</span>
                      <span className="font-medium">${data.cost.toFixed(4)}</span>
                    </div>
                    <div className="w-full bg-[hsl(var(--mn-border))] dark:bg-[hsl(var(--mn-elevated))] rounded-full h-2">
                      <div className={`h-2 rounded-full ${model.includes('opus') ? 'bg-[hsl(var(--mn-info))]' : 'bg-[hsl(var(--mn-accent-2))]'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-[hsl(var(--mn-muted))] w-16 text-right">${(data.cost / data.count).toFixed(4)}/t</span>
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
              <thead className="border-b text-xs text-[hsl(var(--mn-muted))]">
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
