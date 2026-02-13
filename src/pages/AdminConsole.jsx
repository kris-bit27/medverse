import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard,
  Users,
  Building2,
  BarChart3,
  Settings,
  Database,
  FileText,
  Shield,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { canAccessAdmin } from '@/components/utils/permissions';
import OrganizationManagement from './OrganizationManagement';
import TeamAnalytics from './TeamAnalytics';
import BatchGenerationPanel from '@/components/admin/BatchGenerationPanel';

const ADMIN_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'organizations', label: 'Organizace', icon: Building2 },
  { id: 'analytics', label: 'Analytika', icon: BarChart3 },
  { id: 'users', label: 'Uživatelé', icon: Users },
  { id: 'content', label: 'Obsah', icon: FileText },
  { id: 'system', label: 'Systém', icon: Settings },
];

function AdminDashboardTab() {
  // Fetch system stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Active users (logged in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_sign_in_at', thirtyDaysAgo.toISOString());

      // Total tests
      const { count: totalTests } = await supabase
        .from('test_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Total organizations
      const { count: totalOrgs } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });

      // Total topics
      const { count: totalTopics } = await supabase
        .from('topics')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

      // Total questions
      const { count: totalQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

      // Recent activity (last 24h)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { count: recentTests } = await supabase
        .from('test_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      return {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalTests: totalTests || 0,
        totalOrgs: totalOrgs || 0,
        totalTopics: totalTopics || 0,
        totalQuestions: totalQuestions || 0,
        recentTests: recentTests || 0
      };
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <Badge variant="outline">
                {stats.activeUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% aktivních
              </Badge>
            </div>
            <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Celkem uživatelů</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{stats.totalOrgs.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Organizací</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-muted-foreground" />
              <Badge variant="secondary">{stats.recentTests} za 24h</Badge>
            </div>
            <p className="text-2xl font-bold">{stats.totalTests.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Dokončených testů</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{stats.totalTopics.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Témat publikováno</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Stats */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Obsah platformy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Témata</span>
                </div>
                <span className="font-semibold">{stats.totalTopics.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Otázky</span>
                </div>
                <span className="font-semibold">{stats.totalQuestions.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Dokončené testy</span>
                </div>
                <span className="font-semibold">{stats.totalTests.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktivita uživatelů</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Aktivní uživatelé (30 dní)</span>
                  <span className="text-sm font-semibold">{stats.activeUsers}</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-600"
                    style={{ width: `${(stats.activeUsers / stats.totalUsers) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Testů za 24h</span>
                  <span className="text-sm font-semibold">{stats.recentTests}</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-600"
                    style={{ width: `${Math.min(100, (stats.recentTests / 100) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Rychlé akce</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Link to={createPageUrl('AdminQuestions')}>
              <Button variant="outline" className="w-full justify-start">
                <Database className="w-4 h-4 mr-2" />
                Spravovat otázky
              </Button>
            </Link>

            <Link to={createPageUrl('AdminUsers')}>
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Spravovat uživatele
              </Button>
            </Link>

            <Link to={createPageUrl('AdminAnalytics')}>
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="w-4 h-4 mr-2" />
                Zobrazit analytiku
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminUsersTab() {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-bold mb-2">Správa uživatelů</h3>
        <p className="text-muted-foreground mb-6">
          Zde můžete spravovat všechny uživatele systému
        </p>
        <Link to={createPageUrl('AdminUsers')}>
          <Button>Otevřít správu uživatelů</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function AdminContentTab() {
  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Link to={createPageUrl('AdminTaxonomy')}>
          <Button variant="outline">📋 Taxonomie</Button>
        </Link>
        <Link to={createPageUrl('AdminQuestions')}>
          <Button variant="outline">❓ Otázky</Button>
        </Link>
        <Link to={createPageUrl('AdminArticles')}>
          <Button variant="outline">📰 Články</Button>
        </Link>
      </div>
      <BatchGenerationPanel />
    </div>
  );
}

function AdminSystemTab() {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Settings className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-bold mb-2">Systémová nastavení</h3>
        <p className="text-muted-foreground">
          Konfigurace systému a pokročilá nastavení
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminConsole() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const hasAccess = canAccessAdmin(user);

  if (!hasAccess) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-xl font-bold mb-2">Přístup odepřen</h3>
            <p className="text-muted-foreground">
              Nemáte oprávnění k přístupu do administrace
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardTab />;
      case 'organizations':
        return <OrganizationManagement />;
      case 'analytics':
        return <TeamAnalytics />;
      case 'users':
        return <AdminUsersTab />;
      case 'content':
        return <AdminContentTab />;
      case 'system':
        return <AdminSystemTab />;
      default:
        return <AdminDashboardTab />;
    }
  };

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Administrace
          </h1>
          <p className="text-muted-foreground">
            Centrální správa MedVerse platformy
          </p>
        </div>

        <Badge variant="outline" className="gap-1">
          <CheckCircle className="w-3 h-3" />
          Admin přístup
        </Badge>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="p-2">
          <div className="flex flex-wrap gap-2">
            {ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <Button
                  key={tab.id}
                  variant={isActive ? 'default' : 'ghost'}
                  onClick={() => setActiveTab(tab.id)}
                  className="gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}
