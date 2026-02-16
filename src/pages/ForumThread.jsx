import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, MessageSquare, ThumbsUp, CheckCircle2, Send, Loader2 } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ForumThread() {
  const urlParams = new URLSearchParams(window.location.search);
  const threadId = urlParams.get('id');
  const [newPost, setNewPost] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  const queryClient = useQueryClient();

  const { user } = useAuth();

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ['forumThread', threadId],
    queryFn: async () => {
      const { data } = await supabase.from('forum_threads').select('*').eq('id', threadId).single();
      if (data) {
        // Increment view count
        await supabase.from('forum_threads').update({ views: (data.views || 0) + 1 }).eq('id', threadId);
      }
      return data;
    },
    enabled: !!threadId
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['forumPosts', threadId],
    queryFn: async () => {
      const { data } = await supabase.from('forum_posts').select('*').eq('thread_id', threadId).order('created_at');
      return data || [];
    },
    enabled: !!threadId
  });

  const createPostMutation = useMutation({
    mutationFn: async (data) => {
      const { data: post } = await supabase.from('forum_posts').insert(data).select().single();
      await supabase.from('forum_threads').update({
        replies_count: (thread?.replies_count || 0) + 1,
        last_reply_at: new Date().toISOString()
      }).eq('id', threadId);
      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forumPosts', threadId] });
      queryClient.invalidateQueries({ queryKey: ['forumThread', threadId] });
      setNewPost('');
      setReplyingTo(null);
      toast.success('Příspěvek odeslán');
    }
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async (postId) => {
      const post = posts.find(p => p.id === postId);
      const currentLikes = post?.likes || 0;
      // Simple increment/decrement (no per-user tracking for now)
      await supabase.from('forum_posts').update({ likes: currentLikes + 1 }).eq('id', postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forumPosts', threadId] });
    }
  });

  const handleSubmitPost = () => {
    if (!newPost.trim()) return;

    createPostMutation.mutate({
      thread_id: threadId,
      content: newPost.trim(),
      parent_post_id: replyingTo?.id || null
    });
  };

  if (threadLoading || postsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Načítám diskusi..." />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <p className="text-[hsl(var(--mn-muted))]">Vlákno nenalezeno</p>
        <Link to={createPageUrl('Forum')}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zpět na forum
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Link to={createPageUrl('Forum')}>
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zpět na forum
        </Button>
      </Link>

      {/* Thread header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-bold text-[hsl(var(--mn-text))] mb-3">
            {thread.title}
          </h1>
          {thread.description && (
            <p className="text-[hsl(var(--mn-muted))] mb-4">
              {thread.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {thread.tags?.map((tag, idx) => (
              <Badge key={idx} variant="secondary">
                {tag}
              </Badge>
            ))}
            <span className="text-sm text-[hsl(var(--mn-muted))]">
              Vytvořil {thread.created_by?.split('@')[0]} •{' '}
              {formatDistanceToNow(new Date(thread.created_date), {
                addSuffix: true,
                locale: cs
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Posts */}
      <div className="space-y-4 mb-6">
        {posts.map(post => {
          const isAuthor = post.created_by === user?.email;
          const isThreadAuthor = post.created_by === thread.created_by;
          const hasLiked = post.likes?.includes(user?.id);

          return (
            <Card key={post.id}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300">
                      {post.created_by?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-[hsl(var(--mn-text))]">
                        {post.created_by?.split('@')[0]}
                      </span>
                      {isThreadAuthor && (
                        <Badge variant="outline" className="text-xs">
                          Autor
                        </Badge>
                      )}
                      {post.is_solution && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Řešení
                        </Badge>
                      )}
                      <span className="text-sm text-[hsl(var(--mn-muted))]">
                        {formatDistanceToNow(new Date(post.created_date), {
                          addSuffix: true,
                          locale: cs
                        })}
                      </span>
                    </div>

                    <div className="prose prose-sm dark:prose-invert max-w-none mb-3">
                      <ReactMarkdown>{post.content}</ReactMarkdown>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLikeMutation.mutate(post.id)}
                        className={hasLiked ? 'text-teal-600' : ''}
                      >
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        {post.likes?.length || 0}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyingTo(post)}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Odpovědět
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reply form */}
      {!thread.is_locked && (
        <Card>
          <CardContent className="pt-6">
            {replyingTo && (
              <div className="mb-3 p-3 bg-[hsl(var(--mn-surface-2))] rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[hsl(var(--mn-muted))]">
                    Odpověď na příspěvek od {replyingTo.created_by?.split('@')[0]}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(null)}
                  >
                    Zrušit
                  </Button>
                </div>
              </div>
            )}

            <Textarea
              placeholder="Napište svůj příspěvek (podporuje markdown)..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              rows={4}
              className="mb-3"
            />
            
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitPost}
                disabled={!newPost.trim() || createPostMutation.isPending}
              >
                {createPostMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Odeslat
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {thread.is_locked && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Toto vlákno je uzamčeno a nelze do něj přidávat nové příspěvky
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}