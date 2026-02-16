import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Trophy,
  TrendingUp,
  Medal,
  Crown,
  Zap,
  Target,
  Award
} from 'lucide-react';

export default function Leaderboards() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('global');

  // Fetch leaderboard data
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ['leaderboard', selectedPeriod],
    queryFn: async () => {
      // For now, generate mock data from user stats
      // In production, this would query leaderboard_entries table
      
      const { data: sessions, error } = await supabase
        .from('test_sessions')
        .select(`
          user_id,
          score,
          correct_answers,
          completed_at
        `)
        .eq('status', 'completed')
        .not('user_id', 'is', null);

      if (error) throw error;

      // Aggregate by user
      const userStats = {};
      sessions.forEach(session => {
        if (!userStats[session.user_id]) {
          userStats[session.user_id] = {
            user_id: session.user_id,
            total_points: 0,
            tests_completed: 0,
            avg_score: 0,
            total_score: 0
          };
        }
        
        userStats[session.user_id].tests_completed++;
        userStats[session.user_id].total_score += session.score || 0;
        userStats[session.user_id].total_points += Math.floor((session.score || 0) * 10);
      });

      // Calculate averages and sort
      const rankings = Object.values(userStats).map(stat => ({
        ...stat,
        avg_score: stat.total_score / stat.tests_completed
      })).sort((a, b) => b.total_points - a.total_points);

      // Fetch user profiles
      const userIds = rankings.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      // Merge profiles
      return rankings.map((rank, idx) => ({
        ...rank,
        rank: idx + 1,
        profile: profiles?.find(p => p.user_id === rank.user_id)
      }));
    }
  });

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-[hsl(var(--mn-muted))]" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-600" />;
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return { label: '1st Place', variant: 'default', className: 'bg-yellow-500' };
    if (rank === 2) return { label: '2nd Place', variant: 'secondary' };
    if (rank === 3) return { label: '3rd Place', variant: 'outline' };
    return null;
  };

  const myRank = leaderboard.find(entry => entry.user_id === user?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Žebříčky</h1>
          <p className="text-muted-foreground">
            Soutěžte s ostatními a sledujte svůj pokrok
          </p>
        </div>

        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Celkově</SelectItem>
            <SelectItem value="monthly">Měsíční</SelectItem>
            <SelectItem value="weekly">Týdenní</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* My Rank */}
      {myRank && (
        <Card className="border-teal-200 bg-teal-50 dark:bg-teal-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-lg">
                  #{myRank.rank}
                </div>
                <div>
                  <p className="font-semibold">Vaše pozice</p>
                  <p className="text-sm text-muted-foreground">
                    {myRank.total_points.toLocaleString()} bodů
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-2 justify-end mb-1">
                  <Target className="w-4 h-4" />
                  <span className="text-sm">Dokončených testů: {myRank.tests_completed}</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Průměr: {myRank.avg_score.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 3 */}
      {leaderboard.length >= 3 && (
        <div className="grid md:grid-cols-3 gap-4">
          {/* 2nd Place */}
          <Card className="md:mt-8">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <Medal className="w-12 h-12 text-[hsl(var(--mn-muted))]" />
              </div>
              <Avatar className="w-16 h-16 mx-auto mb-3">
                <AvatarFallback>
                  {leaderboard[1].profile?.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <p className="font-bold mb-1">
                {leaderboard[1].profile?.full_name || 'Uživatel'}
              </p>
              <p className="text-2xl font-bold text-[hsl(var(--mn-muted))] mb-2">
                {leaderboard[1].total_points.toLocaleString()}
              </p>
              <Badge variant="secondary">2nd Place</Badge>
            </CardContent>
          </Card>

          {/* 1st Place */}
          <Card className="border-yellow-500 border-2">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <Crown className="w-16 h-16 text-yellow-500" />
              </div>
              <Avatar className="w-20 h-20 mx-auto mb-3 border-4 border-yellow-500">
                <AvatarFallback className="text-xl">
                  {leaderboard[0].profile?.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <p className="font-bold text-lg mb-1">
                {leaderboard[0].profile?.full_name || 'Uživatel'}
              </p>
              <p className="text-3xl font-bold text-yellow-600 mb-2">
                {leaderboard[0].total_points.toLocaleString()}
              </p>
              <Badge className="bg-yellow-500">🏆 Champion</Badge>
            </CardContent>
          </Card>

          {/* 3rd Place */}
          <Card className="md:mt-8">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <Medal className="w-12 h-12 text-orange-600" />
              </div>
              <Avatar className="w-16 h-16 mx-auto mb-3">
                <AvatarFallback>
                  {leaderboard[2].profile?.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <p className="font-bold mb-1">
                {leaderboard[2].profile?.full_name || 'Uživatel'}
              </p>
              <p className="text-2xl font-bold text-orange-600 mb-2">
                {leaderboard[2].total_points.toLocaleString()}
              </p>
              <Badge variant="outline">3rd Place</Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Kompletní žebříček</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboard.map((entry) => {
              const isMe = entry.user_id === user?.id;
              const badge = getRankBadge(entry.rank);

              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    isMe ? 'bg-teal-50 dark:bg-teal-950/20 border-teal-200' : 'hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 flex justify-center">
                      {getRankIcon(entry.rank)}
                    </div>

                    <Avatar>
                      <AvatarFallback>
                        {entry.profile?.full_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {entry.profile?.full_name || 'Uživatel'}
                        </p>
                        {isMe && <Badge variant="outline">You</Badge>}
                        {badge && <Badge variant={badge.variant} className={badge.className}>{badge.label}</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{entry.tests_completed} testů</span>
                        <span>Průměr: {entry.avg_score.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {entry.total_points.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">bodů</p>
                  </div>
                </div>
              );
            })}
          </div>

          {leaderboard.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Žebříček je prázdný. Buďte první!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
