import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  TrendingUp,
  Users,
  Zap,
  BarChart3,
  AlertTriangle
} from 'lucide-react';

export default function AdminCostAnalytics() {
  const [timeRange, setTimeRange] = useState('30d');

  // Overall stats
  const { data: stats } = useQuery({
    queryKey: ['admin-cost-stats', timeRange],
    queryFn: async () => {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('user_ai_usage')
        .select('cost, tokens_used, user_id')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const totalCost = data.reduce((sum, item) => sum + parseFloat(item.cost), 0);
      const totalTokens = data.reduce((sum, item) => sum + item.tokens_used, 0);
      const uniqueUsers = new Set(data.map(item => item.user_id)).size;
      const requestCount = data.length;

      return {
        totalCost,
        totalTokens,
        uniqueUsers,
        requestCount,
        avgCostPerRequest: requestCount > 0 ? totalCost / requestCount : 0,
        avgCostPerUser: uniqueUsers > 0 ? totalCost / uniqueUsers : 0
      };
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Top users by cost
  const { data: topUsers } = useQuery({
    queryKey: ['admin-top-users', timeRange],
    queryFn: async () => {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .rpc('get_top_users_by_cost', {
          days: daysAgo,
          limit_count: 10
        });

      if (error) {
        // Fallback if RPC doesn't exist
        const { data: usageData, error: err2 } = await supabase
          .from('user_ai_usage')
          .select('user_id, cost')
          .gte('created_at', startDate.toISOString());

        if (err2) throw err2;

        // Group by user
        const userCosts = {};
        usageData.forEach(item => {
          if (!userCosts[item.user_id]) {
            userCosts[item.user_id] = { total: 0, count: 0 };
          }
          userCosts[item.user_id].total += parseFloat(item.cost);
          userCosts[item.user_id].count += 1;
        });

        // Convert to array and sort
        return Object.entries(userCosts)
          .map(([user_id, data]) => ({
            user_id,
            total_cost: data.total,
            request_count: data.count
          }))
          .sort((a, b) => b.total_cost - a.total_cost)
          .slice(0, 10);
      }

      return data || [];
    }
  });

  // Cost by model
  const { data: modelStats } = useQuery({
    queryKey: ['admin-model-stats', timeRange],
    queryFn: async () => {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('user_ai_usage')
        .select('model, cost, tokens_used')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Group by model
      const models = {};
      data.forEach(item => {
        if (!models[item.model]) {
          models[item.model] = { cost: 0, tokens: 0, count: 0 };
        }
        models[item.model].cost += parseFloat(item.cost);
        models[item.model].tokens += item.tokens_used;
        models[item.model].count += 1;
      });

      return Object.entries(models).map(([model, stats]) => ({
        model,
        ...stats,
        avgCost: stats.count > 0 ? stats.cost / stats.count : 0
      })).sort((a, b) => b.cost - a.cost);
    }
  });

  // Cost by mode
  const { data: modeStats } = useQuery({
    queryKey: ['admin-mode-stats', timeRange],
    queryFn: async () => {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('user_ai_usage')
        .select('mode, cost')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Group by mode
      const modes = {};
      data.forEach(item => {
        const mode = item.mode || 'unknown';
        if (!modes[mode]) {
          modes[mode] = { cost: 0, count: 0 };
        }
        modes[mode].cost += parseFloat(item.cost);
        modes[mode].count += 1;
      });

      return Object.entries(modes).map(([mode, stats]) => ({
        mode,
        ...stats,
        avgCost: stats.count > 0 ? stats.cost / stats.count : 0
      })).sort((a, b) => b.cost - a.cost);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Cost Analytics</h2>
          <p className="text-muted-foreground">
            Platform-wide AI usage and cost monitoring
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.totalCost?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg ${stats?.avgCostPerRequest?.toFixed(2) || '0.00'}/request
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Requests</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.requestCount?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              AI generations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.uniqueUsers || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg ${stats?.avgCostPerUser?.toFixed(2) || '0.00'}/user
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tokens</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((stats?.totalTokens || 0) / 1000000).toFixed(2)}M
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              total tokens
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Top Users</TabsTrigger>
          <TabsTrigger value="models">By Model</TabsTrigger>
          <TabsTrigger value="modes">By Mode</TabsTrigger>
        </TabsList>

        {/* Top Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top 10 Users by Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topUsers?.map((user, index) => (
                  <div 
                    key={user.user_id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        #{index + 1}
                      </Badge>
                      <div>
                        <div className="font-mono text-sm">
                          {user.user_id.slice(0, 8)}...
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.request_count} requests
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        ${parseFloat(user.total_cost).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ${(parseFloat(user.total_cost) / user.request_count).toFixed(2)}/req
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cost by AI Model</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {modelStats?.map((model) => (
                  <div 
                    key={model.model}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="font-semibold">
                        {model.model === 'claude-opus-4' ? '🧠 Claude Opus 4' :
                         model.model === 'claude-sonnet-4' ? '⚡ Claude Sonnet 4' :
                         model.model === 'gemini-1.5-flash' ? '✨ Gemini Flash' :
                         model.model}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {model.count} requests · {(model.tokens / 1000000).toFixed(2)}M tokens
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        ${model.cost.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Avg ${model.avgCost.toFixed(3)}/req
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modes Tab */}
        <TabsContent value="modes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cost by Generation Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {modeStats?.map((mode) => (
                  <div 
                    key={mode.mode}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="font-semibold capitalize">
                        {mode.mode?.replace('topic_generate_', '').replace(/_/g, ' ') || 'Unknown'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {mode.count} requests
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        ${mode.cost.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Avg ${mode.avgCost.toFixed(3)}/req
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alerts */}
      {stats && stats.totalCost > 100 && (
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                  High cost alert
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  Total AI costs for this period: ${stats.totalCost.toFixed(2)}. 
                  Consider reviewing usage patterns and implementing stricter budgets.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
