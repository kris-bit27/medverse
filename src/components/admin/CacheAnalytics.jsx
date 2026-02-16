import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  TrendingUp,
  DollarSign,
  Zap,
  Brain,
  Rocket,
  RefreshCw
} from 'lucide-react';

export const CacheAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Get cache stats
      const { data: cacheData, error } = await supabase
        .from('ai_generation_cache')
        .select('*');

      if (error) throw error;

      // Calculate statistics
      const totalEntries = cacheData.length;
      const totalHits = cacheData.reduce((sum, entry) => sum + entry.hits, 0);
      const totalRequests = totalHits; // Total hits = total requests served
      const cacheRequests = totalHits - totalEntries; // Requests served from cache
      const apiCalls = totalEntries; // New generations = API calls

      const hitRate = totalRequests > 0
        ? ((cacheRequests / totalRequests) * 100).toFixed(1)
        : 0;

      const totalCost = cacheData.reduce((sum, entry) =>
        sum + parseFloat(entry.cost || 0), 0
      );

      const costSaved = cacheData.reduce((sum, entry) =>
        (entry.hits - 1) * parseFloat(entry.cost || 0) + sum, 0
      );

      // By mode
      const byMode = cacheData.reduce((acc, entry) => {
        const mode = entry.mode;
        if (!acc[mode]) {
          acc[mode] = {
            count: 0,
            hits: 0,
            cost: 0,
            saved: 0,
            model: entry.model
          };
        }
        acc[mode].count++;
        acc[mode].hits += entry.hits;
        acc[mode].cost += parseFloat(entry.cost || 0);
        acc[mode].saved += (entry.hits - 1) * parseFloat(entry.cost || 0);
        return acc;
      }, {});

      // By model
      const byModel = cacheData.reduce((acc, entry) => {
        const model = entry.model || 'unknown';
        if (!acc[model]) {
          acc[model] = { count: 0, cost: 0, hits: 0 };
        }
        acc[model].count++;
        acc[model].cost += parseFloat(entry.cost || 0);
        acc[model].hits += entry.hits;
        return acc;
      }, {});

      setStats({
        totalEntries,
        totalHits,
        hitRate,
        totalCost,
        costSaved,
        byMode,
        byModel,
        apiCalls,
        cacheRequests
      });

    } catch (error) {
      console.error('Analytics error:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async (mode = null) => {
    if (!confirm(`Clear ${mode || 'all'} cache?`)) return;

    try {
      let query = supabase.from('ai_generation_cache').delete();

      if (mode) {
        query = query.eq('mode', mode);
      } else {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      }

      await query;
      toast.success('Cache cleared!');
      fetchStats();
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin h-8 w-8 text-gray-400" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cache Hit Rate */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Cache Hit Rate
                </p>
                <p className="text-3xl font-bold mt-2">{stats.hitRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.cacheRequests} / {stats.totalHits} requests
                </p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        {/* Total Cost */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Spent
                </p>
                <p className="text-3xl font-bold mt-2">
                  ${stats.totalCost.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.apiCalls} API calls
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Cost Saved */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Cost Saved
                </p>
                <p className="text-3xl font-bold mt-2 text-green-600">
                  ${stats.costSaved.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  via caching
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Cache Entries */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Cache Entries
                </p>
                <p className="text-3xl font-bold mt-2">{stats.totalEntries}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  unique generations
                </p>
              </div>
              <Brain className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Model */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>By Model</CardTitle>
          <Button onClick={() => fetchStats()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.byModel).map(([model, data]) => (
              <div
                key={model}
                className="flex items-center justify-between p-3 bg-[hsl(var(--mn-bg))] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {model.includes('haiku') ? (
                    <Rocket className="h-5 w-5 text-green-600" />
                  ) : (
                    <Brain className="h-5 w-5 text-blue-600" />
                  )}
                  <div>
                    <p className="font-medium">
                      {model.includes('haiku') ? 'Claude Haiku 4' : 'Claude Sonnet 4'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {data.count} generations • {data.hits} total hits
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  ${data.cost.toFixed(3)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* By Mode */}
      <Card>
        <CardHeader>
          <CardTitle>By Generation Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.byMode).map(([mode, data]) => (
              <div
                key={mode}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">
                      {mode === 'topic_generate_fulltext_v2' && '📄 Fulltext'}
                      {mode === 'topic_generate_high_yield' && '⚡ High-Yield'}
                      {mode === 'topic_generate_deep_dive' && '🔬 Deep Dive'}
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {data.count} generations
                      </Badge>
                      <Badge variant="secondary">
                        ${data.cost.toFixed(3)} spent
                      </Badge>
                      <Badge variant="default" className="bg-green-100 text-green-700">
                        ${data.saved.toFixed(3)} saved
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{data.hits} total hits</span>
                    <Button
                      onClick={() => clearCache(mode)}
                      variant="ghost"
                      size="sm"
                      className="h-7"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => clearCache()}
            variant="destructive"
          >
            Clear All Cache
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            This will remove all cached generations. Next requests will call Claude API.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
