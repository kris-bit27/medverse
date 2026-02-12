import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft,
  Bookmark,
  BookmarkCheck,
  Clock,
  ExternalLink,
  AlertCircle,
  Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import VisibilityBadge from '@/components/common/VisibilityBadge';
import { canAccessContent } from '@/components/utils/permissions';

// Render content block based on type
function ContentBlock({ block }) {
  if (!block || !block.type) return null;

  switch (block.type) {
    case 'heading':
      return (
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">
          {block.data?.text}
        </h2>
      );
    
    case 'text':
      return (
        <div className="prose prose-slate dark:prose-invert max-w-none mb-4">
          <ReactMarkdown>{block.data?.text}</ReactMarkdown>
        </div>
      );
    
    case 'list':
      return (
        <ul className="list-disc pl-6 space-y-2 mb-4">
          {block.data?.items?.map((item, i) => (
            <li key={i} className="text-slate-700 dark:text-slate-300">{item}</li>
          ))}
        </ul>
      );
    
    case 'callout':
      const variant = block.data?.type || 'info';
      const colors = {
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
        warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
        tip: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
      };
      const icons = {
        info: Info,
        warning: AlertCircle,
        tip: Info
      };
      const Icon = icons[variant] || Info;
      
      return (
        <div className={`p-4 rounded-lg border mb-4 ${colors[variant]}`}>
          <div className="flex gap-3">
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{block.data?.text}</ReactMarkdown>
            </div>
          </div>
        </div>
      );
    
    case 'image':
      return (
        <figure className="my-6">
          <img 
            src={block.data?.url} 
            alt={block.data?.caption || ''} 
            className="rounded-lg w-full"
          />
          {block.data?.caption && (
            <figcaption className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
              {block.data.caption}
            </figcaption>
          )}
        </figure>
      );
    
    default:
      return null;
  }
}

export default function ArticleDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; }
  });

  const { data: article, isLoading } = useQuery({
    queryKey: ['article', articleId],
    queryFn: async () => {
      const articles = await supabase.from('articles').select('*').eq('id', articleId ).then(r => r.data || []);
      return articles[0];
    },
    enabled: !!articleId
  });

  const { data: topic } = useQuery({
    queryKey: ['topic', article?.topic_id],
    queryFn: async () => {
      const topics = await supabase.from('topics').select('*').eq('id', article.topic_id ).then(r => r.data || []);
      return topics[0];
    },
    enabled: !!article?.topic_id
  });

  const { data: bookmark } = useQuery({
    queryKey: ['bookmark', user?.id, articleId],
    queryFn: async () => {
      const results = await base44.entities.Bookmark.filter({ 
        user_id: user.id, 
        entity_type: 'article',
        entity_id: articleId 
      });
      return results[0];
    },
    enabled: !!user?.id && !!articleId
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (bookmark) {
        return supabase.from('bookmarks').delete().eq('id', bookmark.id);
      } else {
        return base44.entities.Bookmark.create({
          user_id: user.id,
          entity_type: 'article',
          entity_id: articleId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bookmark', user?.id, articleId]);
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

  if (!article) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Článek nenalezen</p>
      </div>
    );
  }

  const hasAccess = canAccessContent(user, article.visibility);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
        <Link to={createPageUrl('Articles')} className="hover:text-teal-600 transition-colors flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          Články
        </Link>
      </div>

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {topic && <Badge variant="outline">{topic.title}</Badge>}
              {article.read_time_minutes && (
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {article.read_time_minutes} min čtení
                </span>
              )}
              <VisibilityBadge visibility={article.visibility} />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
              {article.title}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => bookmarkMutation.mutate()}
            className={bookmark ? 'text-amber-500' : 'text-slate-400'}
          >
            {bookmark ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          </Button>
        </div>

        {article.summary && (
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            {article.summary}
          </p>
        )}
      </header>

      {hasAccess ? (
        <>
          {/* Content */}
          <article className="mb-8">
            {article.content_blocks?.map((block, i) => (
              <ContentBlock key={i} block={block} />
            ))}
          </article>

          {/* Images */}
          {article.images && article.images.length > 0 && (
            <div className="mb-8">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Obrázky</h3>
              <div className="grid grid-cols-2 gap-4">
                {article.images.map((img, i) => (
                  <figure key={i}>
                    <img 
                      src={img.url} 
                      alt={img.caption || `Obrázek ${i + 1}`}
                      className="rounded-lg w-full"
                    />
                    {img.caption && (
                      <figcaption className="text-sm text-slate-500 mt-1 text-center">
                        {img.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </div>
          )}

          {/* References */}
          {article.refs && article.refs.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Reference</h3>
                <ul className="space-y-2">
                  {article.refs.map((ref, i) => (
                    <li key={i}>
                      <a 
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-2"
                      >
                        {ref.label || ref.url}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-8 text-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Premium obsah
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Tento článek je dostupný pouze pro Premium uživatele
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
          <Link to={createPageUrl('Articles')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Zpět na články
          </Link>
        </Button>
      </div>
    </div>
  );
}