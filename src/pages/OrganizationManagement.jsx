import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2,
  Users,
  TrendingUp,
  Settings,
  Plus,
  Crown,
  Shield,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function OrganizationManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedOrg, setSelectedOrg] = useState(null);

  // Fetch user's organizations
  const { data: userOrgs = [], isLoading } = useQuery({
    queryKey: ['userOrganizations', user?.id],
    queryFn: async () => {
      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          organization:organization_id(*)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return memberships?.map(m => ({ ...m.organization, user_role: m.role })) || [];
    },
    enabled: !!user?.id
  });

  // Fetch organization members
  const { data: orgMembers = [] } = useQuery({
    queryKey: ['orgMembers', selectedOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          user:user_id(id, email)
        `)
        .eq('organization_id', selectedOrg.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedOrg?.id
  });

  // Fetch org stats
  const { data: orgStats } = useQuery({
    queryKey: ['orgStats', selectedOrg?.id],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get total tests completed by org members
      const memberIds = orgMembers.map(m => m.user_id);
      
      const { data: tests, error: testsError } = await supabase
        .from('test_sessions')
        .select('score, created_at')
        .in('user_id', memberIds)
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (testsError) throw testsError;

      const avgScore = tests.length > 0 
        ? tests.reduce((sum, t) => sum + (t.score || 0), 0) / tests.length
        : 0;

      return {
        totalTests: tests.length,
        avgScore: avgScore,
        activeUsers: new Set(tests.map(t => t.user_id)).size
      };
    },
    enabled: !!selectedOrg?.id && orgMembers.length > 0
  });

  const getPlanBadge = (planType) => {
    const badges = {
      free: { label: 'Free', variant: 'outline' },
      pro: { label: 'Pro', variant: 'default' },
      team: { label: 'Team', variant: 'secondary' },
      enterprise: { label: 'Enterprise', variant: 'default', className: 'bg-teal-600' }
    };
    return badges[planType] || badges.free;
  };

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
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">Správa Organizací</h1>
        <p className="text-muted-foreground">
          Centrální řízení pro týmy a instituce
        </p>
      </div>

      {userOrgs.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">Nejste členem žádné organizace</h3>
            <p className="text-muted-foreground mb-6">
              Kontaktujte svého správce nebo vytvořte novou organizaci
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Vytvořit organizaci
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Organizations List */}
        <div className="space-y-3">
          <h3 className="font-semibold">Vaše organizace ({userOrgs.length})</h3>
          
          {userOrgs.map((org) => {
            const planBadge = getPlanBadge(org.plan_type);
            const isSelected = selectedOrg?.id === org.id;

            return (
              <Card
                key={org.id}
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/20' : 'hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-slate-900'
                }`}
                onClick={() => setSelectedOrg(org)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{org.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={planBadge.variant} className={planBadge.className}>
                          {planBadge.label}
                        </Badge>
                        <Badge variant="outline">
                          {org.user_role === 'owner' ? <Crown className="w-3 h-3 mr-1" /> : null}
                          {org.user_role}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Organization Detail */}
        <div className="md:col-span-2">
          {selectedOrg ? (
            <div className="space-y-6">
              {/* Overview Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl mb-2">{selectedOrg.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={getPlanBadge(selectedOrg.plan_type).variant}>
                          {getPlanBadge(selectedOrg.plan_type).label}
                        </Badge>
                        <Badge variant="outline">
                          {selectedOrg.subscription_status}
                        </Badge>
                      </div>
                    </div>
                    {(selectedOrg.user_role === 'owner' || selectedOrg.user_role === 'admin') && (
                      <Button size="sm" variant="outline">
                        <Settings className="w-4 h-4 mr-2" />
                        Nastavení
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-[hsl(var(--mn-surface))]">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Členové</span>
                      </div>
                      <p className="text-2xl font-bold">{orgMembers.length}</p>
                      <p className="text-xs text-muted-foreground">z {selectedOrg.max_users} max</p>
                    </div>

                    {orgStats && (
                      <>
                        <div className="p-4 rounded-lg bg-[hsl(var(--mn-surface))]">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Průměrné skóre</span>
                          </div>
                          <p className="text-2xl font-bold">{orgStats.avgScore.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">za posledních 30 dní</p>
                        </div>

                        <div className="p-4 rounded-lg bg-[hsl(var(--mn-surface))]">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Testů dokončeno</span>
                          </div>
                          <p className="text-2xl font-bold">{orgStats.totalTests}</p>
                          <p className="text-xs text-muted-foreground">za posledních 30 dní</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Members List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Členové týmu</CardTitle>
                    {(selectedOrg.user_role === 'owner' || selectedOrg.user_role === 'admin') && (
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Přidat člena
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {orgMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-slate-900"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
                            <Users className="w-5 h-5 text-teal-600" />
                          </div>
                          <div>
                            <p className="font-medium">{member.user?.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Připojen {new Date(member.joined_at).toLocaleDateString('cs-CZ')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {member.role === 'owner' && <Crown className="w-3 h-3 mr-1" />}
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {orgMembers.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Žádní členové
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              {orgStats && (
                <Card>
                  <CardHeader>
                    <CardTitle>Rychlé statistiky (30 dní)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Aktivní uživatelé</span>
                        <span className="font-semibold">{orgStats.activeUsers}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Dokončených testů</span>
                        <span className="font-semibold">{orgStats.totalTests}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Průměrné skóre</span>
                        <span className="font-semibold">{orgStats.avgScore.toFixed(1)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">Vyberte organizaci</h3>
                <p className="text-muted-foreground">
                  Klikněte na organizaci vlevo pro zobrazení detailů
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
