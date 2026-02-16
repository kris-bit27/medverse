import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Users, MessageSquare, Plus, Crown, ArrowLeft, Pin, ChevronUp, Send,
  BookOpen, Copy, Check, Share2, UserMinus, Settings, Hash
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import LoadingSpinner from '@/components/common/LoadingSpinner';

function timeAgo(d) {
  try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: cs }); } catch { return ''; }
}

const POST_TYPES = [
  { value: 'diskuze', label: 'Diskuze' },
  { value: 'kazuistika', label: 'Kazuistika' },
  { value: 'material', label: 'Sdílení materiálu' },
  { value: 'otazka', label: 'Otázka' },
];

export default function StudyGroup() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('id');
  const [activeTab, setActiveTab] = useState('prispevky');
  const [newPost, setNewPost] = useState({ title: '', content: '', post_type: 'diskuze' });
  const [showPostForm, setShowPostForm] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const { data: group, isLoading } = useQuery({
    queryKey: ['studyGroup', groupId],
    queryFn: async () => {
      const { data } = await supabase.from('study_groups')
        .select('*, obory:obor_id(name)')
        .eq('id', groupId).single();
      return data;
    },
    enabled: !!groupId
  });

  const { data: members = [] } = useQuery({
    queryKey: ['groupMembers', groupId],
    queryFn: async () => {
      const { data } = await supabase.from('study_group_members')
        .select('*, user_profiles:user_id(display_name)')
        .eq('group_id', groupId)
        .order('joined_at');
      return data || [];
    },
    enabled: !!groupId
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['groupPosts', groupId],
    queryFn: async () => {
      const { data } = await supabase.from('study_group_posts')
        .select('*, study_group_comments(count)')
        .eq('group_id', groupId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!groupId
  });

  const isMember = members.some(m => m.user_id === user?.id);
  const isAdmin = members.some(m => m.user_id === user?.id && m.role === 'admin');
  const isOwner = group?.owner_id === user?.id;

  const createPostMutation = useMutation({
    mutationFn: async (p) => {
      const profile = await supabase.from('user_profiles').select('display_name').eq('user_id', user.id).maybeSingle();
      const authorName = profile.data?.display_name || user.email?.split('@')[0] || 'Anonym';
      const { error } = await supabase.from('study_group_posts').insert({
        group_id: groupId, author_id: user.id, author_name: authorName,
        title: p.title, content: p.content, post_type: p.post_type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groupPosts', groupId] });
      setNewPost({ title: '', content: '', post_type: 'diskuze' });
      setShowPostForm(false);
      toast.success('Příspěvek publikován!');
    }
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('study_group_members')
        .delete().eq('group_id', groupId).eq('user_id', user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groupMembers'] });
      toast.success('Opustil jsi skupinu');
    }
  });

  const copyInviteCode = () => {
    if (group?.invite_code) {
      navigator.clipboard.writeText(group.invite_code);
      setCodeCopied(true);
      toast.success('Kód zkopírován!');
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (!group) return (
    <div className="container max-w-4xl mx-auto px-4 py-12 text-center">
      <p className="text-muted-foreground">Skupina nenalezena</p>
      <Link to={createPageUrl('Community')}><Button className="mt-4" variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Zpět na komunitu</Button></Link>
    </div>
  );

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to={createPageUrl('Community')} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />Zpět na komunitu
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {group.name}
            {group.is_private && <Badge variant="outline" className="text-xs">Soukromá</Badge>}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {group.obory?.name && <span>{group.obory.name}</span>}
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{members.length} členů</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {group.invite_code && isMember && (
            <Button variant="outline" size="sm" onClick={copyInviteCode}>
              {codeCopied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Share2 className="w-3.5 h-3.5 mr-1" />}
              {codeCopied ? 'Zkopírováno' : group.invite_code}
            </Button>
          )}
          {isMember && !isOwner && (
            <Button variant="ghost" size="sm" onClick={() => leaveMutation.mutate()} className="text-red-500 hover:text-red-600">
              <UserMinus className="w-3.5 h-3.5 mr-1" />Opustit
            </Button>
          )}
        </div>
      </div>

      {group.description && (
        <p className="text-muted-foreground">{group.description}</p>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="prispevky" className="gap-2">
            <MessageSquare className="w-4 h-4" />Příspěvky ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="clenove" className="gap-2">
            <Users className="w-4 h-4" />Členové ({members.length})
          </TabsTrigger>
        </TabsList>

        {/* Posts Tab */}
        <TabsContent value="prispevky" className="space-y-4 mt-4">
          {isMember && (
            <>
              {!showPostForm ? (
                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setShowPostForm(true)}>
                  <CardContent className="p-4 flex items-center gap-3 text-muted-foreground">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">{user?.email?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">Napiš příspěvek, sdílej kazuistiku, nebo polož otázku...</span>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex gap-3">
                      <Select value={newPost.post_type} onValueChange={v => setNewPost(p => ({...p, post_type: v}))}>
                        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {POST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input className="flex-1" value={newPost.title}
                        onChange={e => setNewPost(p => ({...p, title: e.target.value}))}
                        placeholder="Nadpis příspěvku" />
                    </div>
                    <Textarea value={newPost.content} onChange={e => setNewPost(p => ({...p, content: e.target.value}))}
                      placeholder="Obsah příspěvku..." rows={4} />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setShowPostForm(false)}>Zrušit</Button>
                      <Button onClick={() => createPostMutation.mutate(newPost)}
                        disabled={!newPost.title || !newPost.content || createPostMutation.isPending}>
                        <Send className="w-4 h-4 mr-2" />Publikovat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Zatím žádné příspěvky</p>
              </CardContent>
            </Card>
          ) : (
            posts.map(post => (
              <Card key={post.id} className={post.is_pinned ? 'border-amber-500/30' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 mt-1">
                      <AvatarFallback className="text-xs">
                        {(post.author_name || '?')[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {post.is_pinned && <Pin className="w-3 h-3 text-amber-500" />}
                        <span className="font-medium text-sm">{post.author_name || 'Anonym'}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {POST_TYPES.find(t => t.value === post.post_type)?.label || post.post_type}
                        </Badge>
                      </div>
                      <h3 className="font-semibold mt-1">{post.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{post.content}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                          <ChevronUp className="w-3.5 h-3.5" />{post.upvotes || 0}
                        </button>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {post.study_group_comments?.[0]?.count || 0} komentářů
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="clenove" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {members.map(member => {
                  const name = member.user_profiles?.display_name || member.user_id?.slice(0, 8);
                  const memberIsOwner = member.user_id === group.owner_id;
                  return (
                    <div key={member.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{(name || '?')[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{name || 'Anonym'}</p>
                          <p className="text-xs text-muted-foreground">Členem {timeAgo(member.joined_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {memberIsOwner && (
                          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                            <Crown className="w-3 h-3 mr-1" />Zakladatel
                          </Badge>
                        )}
                        {member.role === 'admin' && !memberIsOwner && (
                          <Badge variant="outline">Admin</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
