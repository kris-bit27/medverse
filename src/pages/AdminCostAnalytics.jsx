import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, DollarSign, Settings } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { canAccessAdmin } from '@/components/utils/permissions';

// Import components directly inline to avoid circular dependency
import AdminCostAnalyticsComponent from '@/components/admin/AdminCostAnalytics';
import AdminBudgetSettingsComponent from '@/components/admin/AdminBudgetSettings';

export default function AdminCostAnalytics() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!canAccessAdmin(user)) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Přístup odepřen</h2>
        <p className="text-muted-foreground">
          Nemáte oprávnění pro přístup k cost analytics
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to={createPageUrl('Admin')}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Zpět na administraci
          </Button>
        </Link>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold">
            AI Cost Management
          </h1>
        </div>
        <p className="text-muted-foreground">
          Monitor AI usage, costs, and configure budgets
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Cost Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Budget Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <AdminCostAnalyticsComponent />
        </TabsContent>

        <TabsContent value="settings">
          <AdminBudgetSettingsComponent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
