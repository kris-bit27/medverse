import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Users, MessageSquare, Plus, Search, Pin, Lock, Eye, ChevronUp, ChevronDown,
  UserPlus, Crown, Calendar, Hash, Flame, ArrowUpRight, Globe, Shield,
  BookOpen, Microscope, Stethoscope, GraduationCap, MessageCircle, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const GROUP_TYPES = [
  { value: 'atestace', label: 'Příprava na atestaci', icon: GraduationCap, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { value: 'kmen', label: 'Základní kmen', icon: BookOpen, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'vyzkum', label: 'Výzkumná skupina', icon: Microscope, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'kazuistiky', label: 'Kazuistiky', icon: Stethoscope, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'general', label: 'Obecná', icon: Users, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
];

const THREAD_CATEGORIES = [
  { value: 'otazka', label: 'Otázka', color: 'bg-blue-500/10 text-blue-400' },
  { value: 'diskuze', label: 'Diskuze', color: 'bg-emerald-500/10 text-emerald-400' },
  { value: 'kazuistika', label: 'Kazuistika', color: 'bg-amber-500/10 text-amber-400' },
  { value: 'tip', label: 'Tip & trik', color: 'bg-purple-500/10 text-purple-400' },
  { value: 'zdroj', label: 'Sdílení zdroje', color: 'bg-pink-500/10 text-pink-400' },
];

function timeAgo(date) {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: cs });
  } catch { return ''; }
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ============ STUDY GROUPS TAB ============
function StudyGroupsTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', group_type: 'atestace', is_private: false, obor_id: '' });

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['studyGroups'],
    queryFn: async () => {
      const { data } = await supabase
        .from('study_groups')
        .select('*, obory:obor_id(name)')
        .order('member_count', { ascending: false });
      return data || [];
    }
  });

  const { data: myMemberships = [] } = useQuery({
    queryKey: ['myGroupMemberships', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('study_group_members')
        .select('group_id, role')
        .eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id
  });

  const { data: obory = [] } = useQuery({
    queryKey: ['oboryList'],
    queryFn: async () => {
      const { data } = await supabase.from('obory').select('id, name').eq('status', 'published').order('name');
      return data || [];
    }
  });

  const myGroupIds = new Set(myMemberships.map(m => m.group_id));

  const createMutation = useMutation({
    mutationFn: async (g) => {
      const { data: group, error } = await supabase.from('study_groups').insert({
        name: g.name,
        description: g.description,
        group_type: g.group_type,
        is_private: g.is_private,
        obor_id: g.obor_id || null,
        owner_id: user.id,
        invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      }).select().single();
      if (error) throw error;
      // Add creator as admin member
      await supabase.from('study_group_members').insert({ group_id: group.id, user_id: user.id, role: 'admin' });
      return group;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studyGroups'] });
      qc.invalidateQueries({ queryKey: ['myGroupMemberships'] });
      setCreateOpen(false);
      setNewGroup({ name: '', description: '', group_type: 'atestace', is_private: false, obor_id: '' });
      toast.success('Skupina vytvořena!');
    },
    onError: (e) => toast.error('Chyba: ' + e.message)
  });

  const joinMutation = useMutation({
    mutationFn: async (groupId) => {
      const { error } = await supabase.from('study_group_members').insert({ group_id: groupId, user_id: user.id, role: 'member' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studyGroups'] });
      qc.invalidateQueries({ queryKey: ['myGroupMemberships'] });
      toast.success('Připojil ses ke skupině!');
    }
  });

  const filtered = useMemo(() => {
    return groups.filter(g => {
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType === 'my') return myGroupIds.has(g.id);
      if (filterType !== 'all' && g.group_type !== filterType) return false;
      return true;
    });
  }, [groups, search, filterType, myGroupIds]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Hledat skupiny..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny skupiny</SelectItem>
            <SelectItem value="my">Moje skupiny</SelectItem>
            {GROUP_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nová skupina</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Vytvořit studijní skupinu</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Název skupiny</label>
                <Input value={newGroup.name} onChange={e => setNewGroup(p => ({...p, name: e.target.value}))}
                  placeholder="např. Atestace z vnitřního lékařství 2026" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Popis</label>
                <Textarea value={newGroup.description} onChange={e => setNewGroup(p => ({...p, description: e.target.value}))}
                  placeholder="O čem je vaše skupina..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Typ skupiny</label>
                  <Select value={newGroup.group_type} onValueChange={v => setNewGroup(p => ({...p, group_type: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GROUP_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Obor</label>
                  <Select value={newGroup.obor_id} onValueChange={v => setNewGroup(p => ({...p, obor_id: v}))}>
                    <SelectTrigger><SelectValue placeholder="Volitelné" /></SelectTrigger>
                    <SelectContent>
                      {obory.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={newGroup.is_private}
                  onChange={e => setNewGroup(p => ({...p, is_private: e.target.checked}))}
                  className="rounded" />
                <Lock className="w-4 h-4" />
                Soukromá skupina (pouze na pozvánku)
              </label>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost">Zrušit</Button></DialogClose>
              <Button onClick={() => createMutation.mutate(newGroup)} disabled={!newGroup.name || createMutation.isPending}>
                {createMutation.isPending ? 'Vytvářím...' : 'Vytvořit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups Grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {filterType === 'my' ? 'Zatím nejsi členem žádné skupiny' : 'Žádné skupiny nenalezeny'}
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Vytvoř první skupinu
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(group => {
            const typeInfo = GROUP_TYPES.find(t => t.value === group.group_type) || GROUP_TYPES[4];
            const TypeIcon = typeInfo.icon;
            const isMember = myGroupIds.has(group.id);
            const isOwner = group.owner_id === user?.id;
            return (
              <Card key={group.id} className="group hover:shadow-md transition-all relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${typeInfo.color.includes('purple') ? 'bg-purple-500' : typeInfo.color.includes('blue') ? 'bg-blue-500' : typeInfo.color.includes('emerald') ? 'bg-emerald-500' : typeInfo.color.includes('amber') ? 'bg-amber-500' : 'bg-slate-500'}`} />
                <CardContent className="p-5 pt-6">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2.5 rounded-xl border ${typeInfo.color}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{group.name}</h3>
                        {group.is_private && <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                      </div>
                      {group.obory?.name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{group.obory.name}</p>
                      )}
                    </div>
                  </div>

                  {group.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{group.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {group.member_count || 0}
                      </span>
                      <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>
                        {typeInfo.label}
                      </Badge>
                    </div>
                    {isMember ? (
                      <Link to={createPageUrl('StudyGroup') + `?id=${group.id}`}>
                        <Button size="sm" variant="outline" className="text-xs">
                          {isOwner && <Crown className="w-3 h-3 mr-1 text-amber-500" />}
                          Otevřít
                          <ArrowUpRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" onClick={() => joinMutation.mutate(group.id)}
                        disabled={group.is_private || joinMutation.isPending} className="text-xs">
                        <UserPlus className="w-3 h-3 mr-1" />Připojit se
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ DISCUSSIONS TAB ============
function DiscussionsTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterObor, setFilterObor] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [newThread, setNewThread] = useState({ title: '', content: '', category: 'otazka', discipline_id: '', tags: '' });

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['forumThreads'],
    queryFn: async () => {
      const { data } = await supabase
        .from('forum_threads')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('last_reply_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    }
  });

  const { data: obory = [] } = useQuery({
    queryKey: ['oboryList'],
    queryFn: async () => {
      const { data } = await supabase.from('obory').select('id, name').eq('status', 'published').order('name');
      return data || [];
    }
  });

  const { data: myVotes = [] } = useQuery({
    queryKey: ['myVotes', user?.id, 'thread'],
    queryFn: async () => {
      const { data } = await supabase
        .from('community_votes')
        .select('target_id, vote_value')
        .eq('user_id', user.id)
        .eq('target_type', 'thread');
      return data || [];
    },
    enabled: !!user?.id
  });
  const votesMap = Object.fromEntries(myVotes.map(v => [v.target_id, v.vote_value]));

  const createMutation = useMutation({
    mutationFn: async (t) => {
      const profile = await supabase.from('user_profiles').select('display_name').eq('user_id', user.id).maybeSingle();
      const authorName = profile.data?.display_name || user.email?.split('@')[0] || 'Anonym';
      const { error } = await supabase.from('forum_threads').insert({
        title: t.title,
        content: t.content,
        category: t.category,
        discipline_id: t.discipline_id || null,
        tags: t.tags ? t.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        author_id: user.id,
        author_name: authorName,
        upvotes: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forumThreads'] });
      setCreateOpen(false);
      setNewThread({ title: '', content: '', category: 'otazka', discipline_id: '', tags: '' });
      toast.success('Vlákno vytvořeno!');
    }
  });

  const voteMutation = useMutation({
    mutationFn: async ({ threadId, value }) => {
      const existing = votesMap[threadId];
      if (existing === value) {
        // Remove vote
        await supabase.from('community_votes')
          .delete().eq('user_id', user.id).eq('target_type', 'thread').eq('target_id', threadId);
        await supabase.from('forum_threads')
          .update({ upvotes: (threads.find(t => t.id === threadId)?.upvotes || 0) - value })
          .eq('id', threadId);
      } else {
        // Upsert vote
        await supabase.from('community_votes')
          .upsert({ user_id: user.id, target_type: 'thread', target_id: threadId, vote_value: value },
            { onConflict: 'user_id,target_type,target_id' });
        const delta = existing ? value - existing : value;
        await supabase.from('forum_threads')
          .update({ upvotes: (threads.find(t => t.id === threadId)?.upvotes || 0) + delta })
          .eq('id', threadId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forumThreads'] });
      qc.invalidateQueries({ queryKey: ['myVotes'] });
    }
  });

  const filtered = useMemo(() => {
    return threads.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (filterObor !== 'all' && t.discipline_id !== filterObor) return false;
      return true;
    });
  }, [threads, search, filterCategory, filterObor]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Hledat v diskuzích..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vše</SelectItem>
            {THREAD_CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterObor} onValueChange={setFilterObor}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Obor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny obory</SelectItem>
            {obory.map(o => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nové vlákno</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Nové diskuzní vlákno</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <Input value={newThread.title} onChange={e => setNewThread(p => ({...p, title: e.target.value}))}
                placeholder="Název vlákna..." />
              <Textarea value={newThread.content} onChange={e => setNewThread(p => ({...p, content: e.target.value}))}
                placeholder="Obsah — popište problém, kazuistiku, nebo sdílejte tip..." rows={5} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={newThread.category} onValueChange={v => setNewThread(p => ({...p, category: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {THREAD_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newThread.discipline_id} onValueChange={v => setNewThread(p => ({...p, discipline_id: v}))}>
                  <SelectTrigger><SelectValue placeholder="Obor (volitelné)" /></SelectTrigger>
                  <SelectContent>
                    {obory.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input value={newThread.tags} onChange={e => setNewThread(p => ({...p, tags: e.target.value}))}
                placeholder="Tagy (oddělené čárkou)" />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost">Zrušit</Button></DialogClose>
              <Button onClick={() => createMutation.mutate(newThread)} disabled={!newThread.title || !newThread.content}>
                Publikovat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Threads List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Zatím žádné diskuze</p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Zahájit diskuzi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(thread => {
            const catInfo = THREAD_CATEGORIES.find(c => c.value === thread.category);
            const myVote = votesMap[thread.id] || 0;
            return (
              <Card key={thread.id} className={`transition-all hover:shadow-sm ${thread.is_pinned ? 'border-amber-500/30 bg-amber-50/5' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {/* Vote column */}
                    <div className="flex flex-col items-center gap-0.5 min-w-[40px]">
                      <button onClick={() => voteMutation.mutate({ threadId: thread.id, value: 1 })}
                        className={`p-1 rounded hover:bg-accent ${myVote === 1 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                        <ChevronUp className="w-5 h-5" />
                      </button>
                      <span className={`text-sm font-semibold ${(thread.upvotes || 0) > 0 ? 'text-emerald-500' : (thread.upvotes || 0) < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {thread.upvotes || 0}
                      </span>
                      <button onClick={() => voteMutation.mutate({ threadId: thread.id, value: -1 })}
                        className={`p-1 rounded hover:bg-accent ${myVote === -1 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {thread.is_pinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
                        {thread.is_locked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                        {catInfo && <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${catInfo.color}`}>{catInfo.label}</Badge>}
                        {thread.tags?.map(tag => (
                          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                            <Hash className="w-2.5 h-2.5 mr-0.5" />{tag}
                          </Badge>
                        ))}
                      </div>

                      <Link to={createPageUrl('ForumThread') + `?id=${thread.id}`}
                        className="font-semibold hover:underline line-clamp-1 block">
                        {thread.title}
                      </Link>

                      {thread.content && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{thread.content}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Avatar className="w-4 h-4">
                            <AvatarFallback className="text-[8px]">{getInitials(thread.author_name)}</AvatarFallback>
                          </Avatar>
                          {thread.author_name || 'Anonym'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{timeAgo(thread.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />{thread.replies_count || 0} odpovědí
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />{thread.views || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ MAIN COMMUNITY PAGE ============
export default function Community() {
  const [activeTab, setActiveTab] = useState('skupiny');

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Komunita</h1>
        <p className="text-muted-foreground">Studijní skupiny, diskuze a spolupráce</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="skupiny" className="gap-2">
            <Users className="w-4 h-4" />Studijní skupiny
          </TabsTrigger>
          <TabsTrigger value="diskuze" className="gap-2">
            <MessageSquare className="w-4 h-4" />Diskuze
          </TabsTrigger>
        </TabsList>

        <TabsContent value="skupiny">
          <StudyGroupsTab />
        </TabsContent>

        <TabsContent value="diskuze">
          <DiscussionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
