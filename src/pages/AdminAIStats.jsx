import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminAIStats() {
  const { data: topics } = useQuery({
    queryKey: ['ai-stats'],
    queryFn: async () => {
      const { data: allTopics } = await supabase.from('topics').select('*');
      return allTopics.filter(t => t.ai_generated_at);
    }
  });

  const stats = React.useMemo(() => {
    if (!topics) return null;
    
    const claudeTopics = topics.filter(t => t.ai_model?.includes('claude'));
    const geminiTopics = topics.filter(t => t.ai_model?.includes('gemini'));
    
    return {
      total: topics.length,
      claude: claudeTopics.length,
      gemini: geminiTopics.length,
      avgConfidence: (topics.reduce((sum, t) => sum + (t.ai_confidence || 0), 0) / topics.length).toFixed(2),
      totalCost: topics.reduce((sum, t) => sum + (t.ai_cost || 0), 0).toFixed(2),
      avgCost: (topics.reduce((sum, t) => sum + (t.ai_cost || 0), 0) / topics.length).toFixed(4),
      withWarnings: topics.filter(t => t.ai_warnings?.length > 0).length
    };
  }, [topics]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">AI Generation Statistics</h1>
      
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Celkem vygenerováno</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Claude / Gemini</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.claude} / {stats.gemini}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Průměrná confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{(stats.avgConfidence * 100).toFixed(0)}%</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Celkové náklady</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats.totalCost}</div>
              <div className="text-sm text-muted-foreground">Avg: ${stats.avgCost}/topic</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Topics vyžadující review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl">
            {stats?.withWarnings || 0} topics mají warnings
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
