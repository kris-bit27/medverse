import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const CacheManagement = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_cache_stats');
      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Cache stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async (mode) => {
    if (!confirm(`Clear ${mode ? mode + ' ' : 'all '}cache?`)) return;
    
    try {
      let query = supabase.from('ai_generation_cache').delete();
      if (mode) {
        query = query.eq('mode', mode);
      } else {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      }
      
      await query;
      toast.success(`Cache cleared!`);
      fetchStats();
    } catch (error) {
      toast.error('Error clearing cache');
    }
  };

  if (loading || !stats) {
    return <div>Loading stats...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>⚡ Cache Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold">{stats.total_entries}</div>
              <div className="text-sm text-muted-foreground">Total Entries</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total_hits}</div>
              <div className="text-sm text-muted-foreground">Total Hits</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[hsl(var(--mn-success))]">
                ${parseFloat(stats.total_cost_saved || 0).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Cost Saved</div>
            </div>
          </div>
          
          <div className="mt-4">
            <Badge variant="secondary">
              Hit Rate: {stats.hit_rate}%
            </Badge>
          </div>

          <div className="mt-4">
            <Button 
              onClick={() => clearCache()} 
              variant="destructive" 
              size="sm"
            >
              Clear All Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.by_mode && Object.entries(stats.by_mode).map(([mode, data]) => (
              <div key={mode} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium">{mode}</div>
                  <div className="text-sm text-muted-foreground">
                    {data.count} entries • {data.hits} hits • ${parseFloat(data.cost_saved || 0).toFixed(2)} saved
                  </div>
                </div>
                <Button 
                  onClick={() => clearCache(mode)} 
                  variant="outline" 
                  size="sm"
                >
                  Clear
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
