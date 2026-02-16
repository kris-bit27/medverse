import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Clock,
  Award,
  BarChart3,
  Activity
} from 'lucide-react';

export default function TeamAnalytics() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedOrg, setSelectedOrg] = useState(null);

  // Fetch user's organizations
  const { data: userOrgs = [] } = useQuery({
    queryKey: ['userOrganizations', user?.id],
    queryFn: async () => {
      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          organization:organization_id(*)
        `)
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin']); // Only admins can view analytics
      
      if (error) throw error;
      return memberships?.map(m => m.organization) || [];
    },
    enabled: !!user?.id
  });

  // Auto-select first org
  React.useEffect(() => {
    if (userOrgs.length > 0 && !selectedOrg) {
      setSelectedOrg(userOrgs[0].id);
    }
  }, [userOrgs, selectedOrg]);

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['teamAnalytics', selectedOrg, selectedPeriod],
    queryFn: async () => {
      if (!selectedOrg) return null;

      const daysAgo = parseInt(selectedPeriod);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Get organization members
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', selectedOrg);

      if (membersError) throw membersError;
      const memberIds = members.map(m => m.user_id);

      // Get test sessions
      const { data: tests, error: testsError } = await supabase
        .from('test_sessions')
        .select('user_id, score, correct_answers, total_questions, time_spent_seconds, created_at, status')
        .in('user_id', memberIds)
        .gte('created_at', startDate.toISOString());

      if (testsError) throw testsError;

      const completedTests = tests.filter(t => t.status === 'completed');

      // Calculate metrics
      const totalTests = completedTests.length;
      const avgScore = totalTests > 0
        ? completedTests.reduce((sum, t) => sum + (t.score || 0), 0) / totalTests
        : 0;

      const activeUsers = new Set(completedTests.map(t => t.user_id)).size;
      const totalStudyTime = completedTests.reduce((sum, t) => sum + (t.time_spent_seconds || 0), 0);

      // Calculate trend (compare to previous period)
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - daysAgo);

      const { data: previousTests } = await supabase
        .from('test_sessions')
        .select('score')
        .in('user_id', memberIds)
        .eq('status', 'completed')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      const previousAvgScore = previousTests && previousTests.length > 0
        ? previousTests.reduce((sum, t) => sum + (t.score || 0), 0) / previousTests.length
        : 0;

      const scoreTrend = avgScore - previousAvgScore;

      // Top performers
      const userScores = {};
      completedTests.forEach(test => {
        if (!userScores[test.user_id]) {
          userScores[test.user_id] = { total: 0, count: 0, tests: 0 };
        }
        userScores[test.user_id].total += test.score || 0;
        userScores[test.user_id].count++;
        userScores[test.user_id].tests++;
      });

      const topPerformers = Object.entries(userScores)
        .map(([userId, stats]) => ({
          userId,
          avgScore: stats.total / stats.count,
          testsCompleted: stats.tests
        }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 5);

      // Fetch user profiles for top performers
      if (topPerformers.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', topPerformers.map(p => p.userId));

        topPerformers.forEach(performer => {
          const profile = profiles?.find(p => p.user_id === performer.userId);
          performer.name = profile?.full_name || 'Uživatel';
        });
      }

      return {
        totalTests,
        avgScore,
        activeUsers,
        totalMembers: memberIds.length,
        totalStudyTime: Math.round(totalStudyTime / 60), // Convert to minutes
        scoreTrend,
        topPerformers
      };
    },
    enabled: !!selectedOrg
  });

  if (userOrgs.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">Není přístup k analytice</h3>
            <p className="text-muted-foreground">
              Pouze administrátoři organizací mají přístup k týmové analytice
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Týmová Analytika</h1>
          <p className="text-muted-foreground">
            Sledujte výkon a pokrok vašeho týmu
          </p>
        </div>

        <div className="flex gap-3">
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {userOrgs.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Posledních 7 dní</SelectItem>
              <SelectItem value="30">Posledních 30 dní</SelectItem>
              <SelectItem value="90">Posledních 90 dní</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <Badge variant={analytics.activeUsers / analytics.totalMembers > 0.5 ? 'default' : 'secondary'}>
                    {((analytics.activeUsers / analytics.totalMembers) * 100).toFixed(0)}% aktivních
                  </Badge>
                </div>
                <p className="text-2xl font-bold">{analytics.activeUsers}</p>
                <p className="text-sm text-muted-foreground">z {analytics.totalMembers} členů</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-5 h-5 text-muted-foreground" />
                  {analytics.scoreTrend !== 0 && (
                    <div className="flex items-center gap-1">
                      {analytics.scoreTrend > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-sm ${analytics.scoreTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analytics.scoreTrend > 0 ? '+' : ''}{analytics.scoreTrend.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold">{analytics.avgScore.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Průměrné skóre</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{analytics.totalTests}</p>
                <p className="text-sm text-muted-foreground">Dokončených testů</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{analytics.totalStudyTime}</p>
                <p className="text-sm text-muted-foreground">Minut studia</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Top Výkony
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.topPerformers.length > 0 ? (
                <div className="space-y-3">
                  {analytics.topPerformers.map((performer, idx) => (
                    <div
                      key={performer.userId}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{performer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {performer.testsCompleted} testů dokončeno
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xl font-bold">{performer.avgScore.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">Průměr</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Zatím žádná data
                </p>
              )}
            </CardContent>
          </Card>

          {/* Activity Overview */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Aktivní uživatelé</span>
                      <span className="text-sm font-semibold">
                        {((analytics.activeUsers / analytics.totalMembers) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-600"
                        style={{ width: `${(analytics.activeUsers / analytics.totalMembers) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Testů na člena</span>
                      <span className="text-sm font-semibold">
                        {(analytics.totalTests / analytics.totalMembers).toFixed(1)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-teal-600"
                        style={{ width: `${Math.min(100, (analytics.totalTests / analytics.totalMembers) * 10)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Klíčové Metriky</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--mn-surface))]">
                    <span className="text-sm">Celkový čas studia</span>
                    <span className="font-semibold">{analytics.totalStudyTime} min</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--mn-surface))]">
                    <span className="text-sm">Čas na test</span>
                    <span className="font-semibold">
                      {analytics.totalTests > 0 
                        ? Math.round(analytics.totalStudyTime / analytics.totalTests) 
                        : 0} min
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--mn-surface))]">
                    <span className="text-sm">Průměrné skóre</span>
                    <span className="font-semibold">{analytics.avgScore.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
