import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users,
  Plus,
  Search,
  Lock,
  Globe,
  MessageSquare,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

export default function StudyGroups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_private: false,
    focus_areas: ''
  });

  // Fetch all groups
  const { data: allGroups = [], isLoading } = useQuery({
    queryKey: ['studyGroups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_groups')
        .select(`
          *,
          members:study_group_members(count),
          owner:owner_id(id, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch user's groups
  const { data: myGroups = [] } = useQuery({
    queryKey: ['myStudyGroups', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_group_members')
        .select(`
          *,
          group:group_id(*)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data?.map(m => m.group) || [];
    },
    enabled: !!user?.id
  });

  // Create group mutation
  const createGroup = useMutation({
    mutationFn: async (groupData) => {
      const focusAreas = groupData.focus_areas
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);

      const { data: group, error: groupError } = await supabase
        .from('study_groups')
        .insert({
          name: groupData.name,
          description: groupData.description,
          owner_id: user.id,
          is_private: groupData.is_private,
          focus_areas: focusAreas,
          invite_code: groupData.is_private ? Math.random().toString(36).substring(7) : null
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add owner as member
      const { error: memberError } = await supabase
        .from('study_group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      return group;
    },
    onSuccess: () => {
      toast.success('Skupina vytvořena!');
      queryClient.invalidateQueries(['studyGroups']);
      queryClient.invalidateQueries(['myStudyGroups']);
      setShowCreateForm(false);
      setFormData({ name: '', description: '', is_private: false, focus_areas: '' });
    },
    onError: () => {
      toast.error('Chyba při vytváření skupiny');
    }
  });

  // Join group mutation
  const joinGroup = useMutation({
    mutationFn: async (groupId) => {
      const { error } = await supabase
        .from('study_group_members')
        .insert({
          group_id: groupId,
          user_id: user.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Připojeno ke skupině!');
      queryClient.invalidateQueries(['studyGroups']);
      queryClient.invalidateQueries(['myStudyGroups']);
    },
    onError: () => {
      toast.error('Chyba při připojování');
    }
  });

  const filteredGroups = allGroups.filter(group => {
    if (!searchQuery) return true;
    return group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           group.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const myGroupIds = new Set(myGroups.map(g => g.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[hsl(var(--mn-accent))] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Studijní Skupiny</h1>
          <p className="text-muted-foreground">
            Spolupracujte a učte se společně s kolegy
          </p>
        </div>

        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Vytvořit skupinu
        </Button>
      </div>

      {/* My Groups */}
      {myGroups.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Moje skupiny ({myGroups.length})</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {myGroups.map((group) => (
              <Card key={group.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {group.is_private ? (
                        <Lock className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <Globe className="w-5 h-5 text-[hsl(var(--mn-success))]" />
                      )}
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {group.description}
                  </p>

                  {group.focus_areas && group.focus_areas.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {group.focus_areas.map((area, idx) => (
                        <Badge key={idx} variant="outline">{area}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{group.members?.[0]?.count || 0}</span>
                      </div>
                    </div>

                    <Link to={`${createPageUrl('StudyGroupDetail')}?id=${group.id}`}>
                      <Button size="sm">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Otevřít
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Vytvořit novou skupinu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Název skupiny *</Label>
              <Input
                placeholder="např. Interní Medicína 2026"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Popis</Label>
              <Textarea
                placeholder="O čem bude skupina..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Zaměření (oddělené čárkou)</Label>
              <Input
                placeholder="cardiology, nephrology, surgery"
                value={formData.focus_areas}
                onChange={(e) => setFormData({ ...formData, focus_areas: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="private"
                checked={formData.is_private}
                onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="private" className="cursor-pointer">
                Soukromá skupina (pouze na pozvánku)
              </Label>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="flex-1"
              >
                Zrušit
              </Button>
              <Button
                onClick={() => createGroup.mutate(formData)}
                className="flex-1"
                disabled={!formData.name || createGroup.isPending}
              >
                Vytvořit skupinu
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Groups */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Všechny skupiny</h2>
          
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Hledat skupiny..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => {
            const isMember = myGroupIds.has(group.id);

            return (
              <Card key={group.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      {group.is_private ? (
                        <Lock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                      ) : (
                        <Globe className="w-4 h-4 text-[hsl(var(--mn-success))] flex-shrink-0" />
                      )}
                      <CardTitle className="text-base line-clamp-1">{group.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {group.description || 'Bez popisu'}
                  </p>

                  {group.focus_areas && group.focus_areas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {group.focus_areas.slice(0, 3).map((area, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                      {group.focus_areas.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{group.focus_areas.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{group.members?.[0]?.count || 0}</span>
                    </div>

                    {isMember ? (
                      <Link to={`${createPageUrl('StudyGroupDetail')}?id=${group.id}`}>
                        <Button size="sm" variant="outline">
                          Otevřít
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => joinGroup.mutate(group.id)}
                        disabled={group.is_private || joinGroup.isPending}
                      >
                        {group.is_private ? 'Soukromá' : 'Připojit se'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredGroups.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">Žádné skupiny nenalezeny</h3>
              <p className="text-muted-foreground mb-6">
                Zkuste změnit vyhledávací dotaz
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
