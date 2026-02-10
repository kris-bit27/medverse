import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign,
  TrendingUp,
  Zap,
  Calendar,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function UserAIUsageDashboard({ user }) {
  // Fetch monthly usage
  const { data: usage, isLoading } = useQuery({
    queryKey: ['ai-usage', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase.rpc('get_user_monthly_usage', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      
      return data?.[0] || {
        total_cost: 0,
        total_tokens: 0,
        request_count: 0
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000 // Refresh every 30s
  });

  // Fetch recent history
  const { data: history } = useQuery({
    queryKey: ['ai-usage-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_ai_usage')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  if (!user) return null;

  // Budget configuration (from env or default)
  const monthlyBudget = 10; // $10/month default
  const usedCost = parseFloat(usage?.total_cost || 0);
  const remaining = Math.max(0, monthlyBudget - usedCost);
  const percentUsed = (usedCost / monthlyBudget) * 100;
  
  // Status determination
  const isNearLimit = percentUsed >= 75;
  const isOverBudget = percentUsed >= 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">AI Usage & Costs</h2>
        <p className="text-muted-foreground">
          Your AI usage for {new Date().toLocaleString('cs-CZ', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Alert if near/over budget */}
      {isOverBudget && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Budget exceeded!</strong> You've used ${usedCost.toFixed(2)} of your ${monthlyBudget} monthly budget.
            {' '}Budget resets on the 1st of next month.
          </AlertDescription>
        </Alert>
      )}

      {isNearLimit && !isOverBudget && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Approaching limit:</strong> You've used {percentUsed.toFixed(0)}% of your monthly budget.
          </AlertDescription>
        </Alert>
      )}

      {!isNearLimit && usedCost > 0 && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            You're on track! ${remaining.toFixed(2)} remaining this month.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${usedCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of ${monthlyBudget} budget
            </p>
            <Progress 
              value={Math.min(percentUsed, 100)} 
              className="mt-3"
            />
          </CardContent>
        </Card>

        {/* Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Requests</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage?.request_count || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              this month
            </p>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Avg: ${usedCost > 0 ? (usedCost / (usage?.request_count || 1)).toFixed(2) : '0.00'}/request
            </div>
          </CardContent>
        </Card>

        {/* Tokens */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(usage?.total_tokens || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              total tokens
            </p>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              ~{Math.round((usage?.total_tokens || 0) / (usage?.request_count || 1)).toLocaleString()} tokens/request
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Usage History */}
      {history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-900"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {item.model === 'claude-opus-4' ? '🧠 Opus' : 
                         item.model === 'claude-sonnet-4' ? '⚡ Sonnet' : 
                         '✨ Gemini'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {item.mode?.replace('topic_generate_', '').replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(item.created_at), { 
                        addSuffix: true,
                        locale: cs 
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      ${parseFloat(item.cost).toFixed(4)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.tokens_used?.toLocaleString()} tokens
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {(!history || history.length === 0) && (
        <Card>
          <CardContent className="p-8 text-center">
            <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">No AI usage yet</p>
            <p className="text-sm text-slate-400">
              Start generating content to see your usage statistics here
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
                How billing works
              </h4>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                You have a ${monthlyBudget}/month budget for AI-generated content. 
                Your usage resets on the 1st of each month. 
                Costs vary by model: Opus (~$0.60), Sonnet (~$0.15), Gemini (Free).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
