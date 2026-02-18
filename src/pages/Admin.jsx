import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap,
  BookOpen,
  Stethoscope,
  BarChart3,
  Users,
  FolderTree,
  FileText,
  ChevronRight,
  Shield,
  Flag,
  Plus
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { canAccessAdmin, canManageUsers, canViewAudit } from '@/components/utils/permissions';

export default function Admin() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; }
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => supabase.from('questions').select('*').then(r => r.data || [])
  });

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => supabase.from('clinical_tools').select('*').then(r => r.data || [])
  });

  const { data: okruhy = [] } = useQuery({
    queryKey: ['okruhy'],
    queryFn: () => supabase.from('okruhy').select('*').then(r => r.data || [])
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => supabase.from('user_profiles').select('*').then(r => r.data || []),
    enabled: canManageUsers(user)
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
        <Shield className="w-12 h-12 mx-auto text-[hsl(var(--mn-muted))] mb-4" />
        <h2 className="text-xl font-semibold text-[hsl(var(--mn-text))] mb-2">
          Přístup odepřen
        </h2>
        <p className="text-[hsl(var(--mn-muted))]">
          Nemáte oprávnění pro přístup k administraci
        </p>
      </div>
    );
  }

  const hasUserManagement = canManageUsers(user);
  const hasAuditAccess = canViewAudit(user);

  const contentCards = [
    {
      title: 'Otázky',
      description: 'Správa otázek pro atestaci',
      count: questions.length,
      icon: GraduationCap,
      href: createPageUrl('AdminQuestions'),
      color: 'from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-accent-2))]'
    },
    {
      title: 'Nástroje',
      description: 'Rozhodovací algoritmy',
      count: tools.length,
      icon: Stethoscope,
      href: createPageUrl('AdminTools'),
      color: 'from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-accent-2))]'
    },
    {
      title: 'Taxonomie',
      description: 'Okruhy a témata',
      count: okruhy.length,
      icon: FolderTree,
      href: createPageUrl('AdminTaxonomy'),
      color: 'from-[hsl(var(--mn-warn))] to-[#ea580c]'
    },
    {
      title: 'Analytics',
      description: 'Uživatelé, engagement, AI náklady',
      count: null,
      icon: BarChart3,
      href: createPageUrl('AdminAnalytics'),
      color: 'from-[hsl(var(--mn-success))] to-[hsl(var(--mn-accent))]'
    },
    {
      title: 'Content Feedback',
      description: 'Nahlášené chyby v obsahu',
      count: null,
      icon: Flag,
      href: createPageUrl('AdminFeedback'),
      color: 'from-[hsl(var(--mn-warn))] to-[hsl(var(--mn-danger))]'
    },
    {
      title: 'Content Review',
      description: 'GPT-4o cross-model validace',
      count: null,
      icon: Shield,
      href: createPageUrl('AdminContentReview'),
      color: 'from-[#f97316] to-[hsl(var(--mn-danger))]'
    }
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--mn-elevated))] to-[hsl(var(--mn-surface))] flex items-center justify-center">
            <Shield className="w-5 h-5 text-[hsl(var(--mn-text))]" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[hsl(var(--mn-text))]">
            Administrace
          </h1>
        </div>
        <p className="text-[hsl(var(--mn-muted))]">
          Správa obsahu a nastavení aplikace
        </p>
      </div>

      {/* Content management cards */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-[hsl(var(--mn-text))] mb-4">
          Správa obsahu
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {contentCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} to={card.href}>
                <Card className="h-full hover:shadow-lg transition-all hover:border-[hsl(var(--mn-accent)/0.2)] dark:hover:border-[hsl(var(--mn-accent)/0.4)] group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-[hsl(var(--mn-text))]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-[hsl(var(--mn-text))] group-hover:text-[hsl(var(--mn-accent))] transition-colors">
                            {card.title}
                          </h3>
                          <ChevronRight className="w-5 h-5 text-[hsl(var(--mn-muted))] group-hover:text-[hsl(var(--mn-accent))] transition-colors" />
                        </div>
                        <p className="text-sm text-[hsl(var(--mn-muted))] mb-2">
                          {card.description}
                        </p>
                        {card.count !== null && (
                          <p className="text-2xl font-bold text-[hsl(var(--mn-text))]">
                            {card.count}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Admin only section */}
      {(hasUserManagement || hasAuditAccess) && (
        <div>
          <h2 className="text-lg font-semibold text-[hsl(var(--mn-text))] mb-4">
            Správa systému
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {hasUserManagement && (
              <Link to={createPageUrl('AdminUsers')}>
                <Card className="hover:shadow-lg transition-all hover:border-[hsl(var(--mn-accent)/0.2)] dark:hover:border-[hsl(var(--mn-accent)/0.4)] group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--mn-success))] to-[hsl(var(--mn-accent))] flex items-center justify-center flex-shrink-0">
                        <Users className="w-6 h-6 text-[hsl(var(--mn-text))]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-[hsl(var(--mn-text))] group-hover:text-[hsl(var(--mn-accent))] transition-colors">
                            Uživatelé
                          </h3>
                          <ChevronRight className="w-5 h-5 text-[hsl(var(--mn-muted))] group-hover:text-[hsl(var(--mn-accent))] transition-colors" />
                        </div>
                        <p className="text-sm text-[hsl(var(--mn-muted))] mb-2">
                          Správa uživatelů a rolí
                        </p>
                        <p className="text-2xl font-bold text-[hsl(var(--mn-text))]">
                          {users.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {hasAuditAccess && (
              <Link to={createPageUrl('AdminAudit')}>
                <Card className="hover:shadow-lg transition-all hover:border-[hsl(var(--mn-accent)/0.2)] dark:hover:border-[hsl(var(--mn-accent)/0.4)] group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--mn-muted))] to-[hsl(var(--mn-elevated))] flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-[hsl(var(--mn-text))]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-[hsl(var(--mn-text))] group-hover:text-[hsl(var(--mn-accent))] transition-colors">
                            Audit log
                          </h3>
                          <ChevronRight className="w-5 h-5 text-[hsl(var(--mn-muted))] group-hover:text-[hsl(var(--mn-accent))] transition-colors" />
                        </div>
                        <p className="text-sm text-[hsl(var(--mn-muted))]">
                          Historie změn obsahu
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
