import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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
        <p className="text-[hsl(var(--mn-muted))]">
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
        <Alert className="bg-[hsl(var(--mn-warn)/0.06)] border-[hsl(var(--mn-warn)/0.2)]">
          <AlertTriangle className="h-4 w-4 text-[hsl(var(--mn-warn))]" />
          <AlertDescription className="text-[hsl(var(--mn-warn))]">
            <strong>Approaching limit:</strong> You've used {percentUsed.toFixed(0)}% of your monthly budget.
          </AlertDescription>
        </Alert>
      )}

      {!isNearLimit && usedCost > 0 && (
        <Alert className="bg-[hsl(var(--mn-success)/0.06)] border-[hsl(var(--mn-success)/0.3)]">
          <CheckCircle className="h-4 w-4 text-[hsl(var(--mn-success))]" />
          <AlertDescription className="text-[hsl(var(--mn-success))]">
            You're on track! ${remaining.toFixed(2)} remaining this month.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Cost */}
        <div className="mn-card">
          <div className="flex items-center justify-between p-5 pb-2">
            <h3 className="mn-ui-font text-sm font-medium">Total Cost</h3>
            <DollarSign className="h-4 w-4 text-[hsl(var(--mn-muted))]" />
          </div>
          <div className="px-5 pb-5">
            <div className="text-2xl font-bold">
              ${usedCost.toFixed(2)}
            </div>
            <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">
              of ${monthlyBudget} budget
            </p>
            <Progress
              value={Math.min(percentUsed, 100)}
              className="mt-3"
            />
          </div>
        </div>

        {/* Requests */}
        <div className="mn-card">
          <div className="flex items-center justify-between p-5 pb-2">
            <h3 className="mn-ui-font text-sm font-medium">AI Requests</h3>
            <Zap className="h-4 w-4 text-[hsl(var(--mn-muted))]" />
          </div>
          <div className="px-5 pb-5">
            <div className="text-2xl font-bold">
              {usage?.request_count || 0}
            </div>
            <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">
              this month
            </p>
            <div className="flex items-center gap-2 mt-3 text-xs text-[hsl(var(--mn-muted))]">
              <TrendingUp className="h-3 w-3" />
              Avg: ${usedCost > 0 ? (usedCost / (usage?.request_count || 1)).toFixed(2) : '0.00'}/request
            </div>
          </div>
        </div>

        {/* Tokens */}
        <div className="mn-card">
          <div className="flex items-center justify-between p-5 pb-2">
            <h3 className="mn-ui-font text-sm font-medium">Tokens Used</h3>
            <Calendar className="h-4 w-4 text-[hsl(var(--mn-muted))]" />
          </div>
          <div className="px-5 pb-5">
            <div className="text-2xl font-bold">
              {(usage?.total_tokens || 0).toLocaleString()}
            </div>
            <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">
              total tokens
            </p>
            <div className="flex items-center gap-2 mt-3 text-xs text-[hsl(var(--mn-muted))]">
              ~{Math.round((usage?.total_tokens || 0) / (usage?.request_count || 1)).toLocaleString()} tokens/request
            </div>
          </div>
        </div>
      </div>

      {/* Recent Usage History */}
      {history && history.length > 0 && (
        <div className="mn-card">
          <div className="p-5 pb-0">
            <h3 className="mn-ui-font font-semibold text-lg">Recent Activity</h3>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-[hsl(var(--mn-surface))]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {item.model === 'claude-opus-4' ? '🧠 Opus' :
                         item.model === 'claude-sonnet-4' ? '⚡ Sonnet' :
                         '✨ Gemini'}
                      </Badge>
                      <span className="text-sm text-[hsl(var(--mn-muted))]">
                        {item.mode?.replace('topic_generate_', '').replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">
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
                    <p className="text-xs text-[hsl(var(--mn-muted))]">
                      {item.tokens_used?.toLocaleString()} tokens
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!history || history.length === 0) && (
        <div className="mn-card">
          <div className="p-8 text-center">
            <Zap className="w-12 h-12 text-[hsl(var(--mn-muted))] mx-auto mb-3" />
            <p className="text-[hsl(var(--mn-muted))] mb-2">No AI usage yet</p>
            <p className="text-sm text-[hsl(var(--mn-muted))]">
              Start generating content to see your usage statistics here
            </p>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="rounded-2xl" style={{ background: 'hsl(var(--mn-accent-2) / 0.06)', border: '1px solid hsl(var(--mn-accent-2) / 0.3)' }}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[hsl(var(--mn-accent-2)/0.12)] rounded-lg">
              <DollarSign className="h-4 w-4 text-[hsl(var(--mn-accent-2))]" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-[hsl(var(--mn-accent-2))] mb-1">
                How billing works
              </h4>
              <p className="text-xs text-[hsl(var(--mn-accent-2)/0.8)]">
                You have a ${monthlyBudget}/month budget for AI-generated content.
                Your usage resets on the 1st of each month.
                Costs vary by model: Opus (~$0.60), Sonnet (~$0.15), Gemini (Free).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
