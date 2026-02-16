import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Plus, Search, Pin, Lock, Eye, Users } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import CreateThreadDialog from '@/components/forum/CreateThreadDialog';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function Forum() {
  const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.items)) return value.items;
    return [];
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const { user } = useAuth();

  const { data: threadsRaw, isLoading } = useQuery({
    queryKey: ['forumThreads'],
    queryFn: async () => {
      const { data } = await supabase.from('forum_threads').select('*').order('created_at', { ascending: false }).limit(100);
      return data || [];
    }
  });
  const threads = asArray(threadsRaw);

  const { data: disciplinesRaw } = useQuery({
    queryKey: ['disciplines'],
    queryFn: async () => {
      const { data } = await supabase.from('obory').select('*').order('order_index');
      return data || [];
    }
  });
  const disciplines = asArray(disciplinesRaw);

  const filteredThreads = threads.filter(thread => {
    const matchesSearch = thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         thread.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeTab === 'all') return true;
    if (activeTab === 'my') return thread.created_by === user?.email;
    if (activeTab === 'public') return thread.visibility === 'public';
    
    return true;
  });

  const getVisibilityInfo = (thread) => {
    if (thread.visibility === 'public') {
      return { icon: Users, label: 'Veřejné', color: 'text-green-600' };
    }
    if (thread.visibility === 'discipline_specific') {
      const discipline = disciplines.find(d => d.id === thread.clinical_discipline_id);
      return { icon: Users, label: discipline?.name || 'Obor', color: 'text-blue-600' };
    }
    return { icon: Lock, label: 'Soukromé', color: 'text-[hsl(var(--mn-muted))]' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Načítám forum..." />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <CreateThreadDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        disciplines={disciplines}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[hsl(var(--mn-text))]">Forum</h1>
          <p className="text-[hsl(var(--mn-muted))] mt-1">
            Diskutujte s kolegy o klinických případech a tématech
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nové vlákno
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--mn-muted))]" />
        <Input
          placeholder="Hledat v diskusích..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">Všechny</TabsTrigger>
          <TabsTrigger value="public">Veřejné</TabsTrigger>
          <TabsTrigger value="my">Moje vlákna</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Thread List */}
      <div className="space-y-3">
        {filteredThreads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-[hsl(var(--mn-muted))] mx-auto mb-4" />
              <p className="text-[hsl(var(--mn-muted))]">
                {searchQuery ? 'Žádné výsledky nenalezeny' : 'Zatím zde nejsou žádné diskuse'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredThreads.map(thread => {
            const visibilityInfo = getVisibilityInfo(thread);
            const VisibilityIcon = visibilityInfo.icon;

            return (
              <Link key={thread.id} to={createPageUrl('ForumThread') + `?id=${thread.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-2">
                          {thread.is_pinned && (
                            <Pin className="w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[hsl(var(--mn-text))] mb-1 flex items-center gap-2">
                              {thread.title}
                              {thread.is_locked && (
                                <Lock className="w-4 h-4 text-[hsl(var(--mn-muted))]" />
                              )}
                            </h3>
                            {thread.description && (
                              <p className="text-sm text-[hsl(var(--mn-muted))] line-clamp-2 mb-2">
                                {thread.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <div className={`flex items-center gap-1 text-xs ${visibilityInfo.color}`}>
                                <VisibilityIcon className="w-3 h-3" />
                                {visibilityInfo.label}
                              </div>
                              {thread.tags?.map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              <span className="text-xs text-[hsl(var(--mn-muted))]">
                                {thread.created_by?.split('@')[0]} •{' '}
                                {formatDistanceToNow(new Date(thread.created_date), {
                                  addSuffix: true,
                                  locale: cs
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 text-sm text-[hsl(var(--mn-muted))]">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          <span className="font-medium">{thread.posts_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{thread.views_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
