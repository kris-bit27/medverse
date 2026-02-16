import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft,
  Bookmark,
  BookmarkCheck,
  GitBranch
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import VisibilityBadge from '@/components/common/VisibilityBadge';
import FlowchartViewer from '@/components/tools/FlowchartViewer';
import { canAccessContent } from '@/components/utils/permissions';

export default function ToolDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const toolId = urlParams.get('id');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; }
  });

  const { data: tool, isLoading } = useQuery({
    queryKey: ['tool', toolId],
    queryFn: async () => {
      const tools = await supabase.from('clinical_tools').select('*').eq('id', toolId ).then(r => r.data || []);
      return tools[0];
    },
    enabled: !!toolId
  });

  const { data: topic } = useQuery({
    queryKey: ['topic', tool?.topic_id],
    queryFn: async () => {
      const topics = await supabase.from('topics').select('*').eq('id', tool.topic_id ).then(r => r.data || []);
      return topics[0];
    },
    enabled: !!tool?.topic_id
  });

  const { data: bookmark } = useQuery({
    queryKey: ['bookmark', user?.id, toolId],
    queryFn: async () => {
      const { data: results } = await supabase.from('bookmarks').select('*')
        .eq('user_id', user.id)
        .eq('entity_type', 'tool')
        .eq('entity_id', toolId);
      return results?.[0];
    },
    enabled: !!user?.id && !!toolId
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (bookmark) {
        return supabase.from('bookmarks').delete().eq('id', bookmark.id);
      } else {
        return supabase.from('bookmarks').insert({
          user_id: user.id,
          entity_type: 'tool',
          entity_id: toolId
        }).select().single().then(r => r.data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bookmark', user?.id, toolId]);
      queryClient.invalidateQueries(['bookmarks', user?.id]);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="p-6 text-center">
        <p className="text-[hsl(var(--mn-muted))]">Nástroj nenalezen</p>
      </div>
    );
  }

  const hasAccess = canAccessContent(user, tool.visibility);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[hsl(var(--mn-muted))] mb-6">
        <Link to={createPageUrl('Tools')} className="hover:text-teal-600 transition-colors flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          Nástroje
        </Link>
      </div>

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <GitBranch className="w-7 h-7 text-teal-600" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {topic && <Badge variant="outline">{topic.title}</Badge>}
                <VisibilityBadge visibility={tool.visibility} />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[hsl(var(--mn-text))]">
                {tool.title}
              </h1>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => bookmarkMutation.mutate()}
            className={bookmark ? 'text-amber-500' : 'text-[hsl(var(--mn-muted))]'}
          >
            {bookmark ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          </Button>
        </div>

        {tool.description && (
          <p className="text-lg text-[hsl(var(--mn-muted))] leading-relaxed">
            {tool.description}
          </p>
        )}
      </header>

      {hasAccess ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Interaktivní algoritmus</CardTitle>
          </CardHeader>
          <CardContent>
            <FlowchartViewer 
              nodes={tool.nodes || []}
              edges={tool.edges || []}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="p-8 text-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
          <h3 className="text-lg font-semibold text-[hsl(var(--mn-text))] mb-2">
            Premium obsah
          </h3>
          <p className="text-[hsl(var(--mn-muted))] mb-4">
            Tento nástroj je dostupný pouze pro Premium uživatele
          </p>
          <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
            <Link to={createPageUrl('Pricing')}>
              Upgradovat na Premium
            </Link>
          </Button>
        </Card>
      )}

      {/* Back */}
      <div className="mt-8">
        <Button variant="ghost" asChild>
          <Link to={createPageUrl('Tools')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Zpět na nástroje
          </Link>
        </Button>
      </div>
    </div>
  );
}