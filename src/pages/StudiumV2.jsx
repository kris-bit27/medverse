import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BookOpen,
  Filter,
  Search,
  Sparkles,
  TrendingUp,
  Clock,
  Target,
  Zap
} from 'lucide-react';

export default function StudiumV2() {
  const { user } = useAuth();
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObor, setSelectedObor] = useState('all');
  const [selectedOkruh, setSelectedOkruh] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Fetch obory (medical fields)
  const { data: obory = [] } = useQuery({
    queryKey: ['obory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obory')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch okruhy (subject areas) - filtered by obor if selected
  const { data: okruhy = [] } = useQuery({
    queryKey: ['okruhy', selectedObor],
    queryFn: async () => {
      let query = supabase
        .from('okruhy')
        .select('*')
        .eq('is_active', true);
      
      if (selectedObor !== 'all') {
        query = query.eq('obor_id', selectedObor);
      }
      
      const { data, error } = await query.order('order_index', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch all topics with relations
  const { data: allTopics = [], isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select(`
          *,
          obory:obor_id(id, name, slug, color),
          okruhy:okruh_id(id, name, slug)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Filter topics based on all criteria
  const filteredTopics = useMemo(() => {
    let filtered = allTopics;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(topic =>
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Obor filter
    if (selectedObor !== 'all') {
      filtered = filtered.filter(topic => topic.obor_id === selectedObor);
    }

    // Okruh filter
    if (selectedOkruh !== 'all') {
      filtered = filtered.filter(topic => topic.okruh_id === selectedOkruh);
    }

    // AI Model filter
    if (selectedModel !== 'all') {
      filtered = filtered.filter(topic => topic.ai_model === selectedModel);
    }

    // Sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === 'alphabetical') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'confidence') {
      filtered.sort((a, b) => (b.ai_confidence || 0) - (a.ai_confidence || 0));
    }

    return filtered;
  }, [allTopics, searchQuery, selectedObor, selectedOkruh, selectedModel, sortBy]);

  // Stats
  const stats = useMemo(() => {
    return {
      totalTopics: allTopics.length,
      filteredTopics: filteredTopics.length,
      oboryCount: obory.length,
      okruhyCount: okruhy.length
    };
  }, [allTopics, filteredTopics, obory, okruhy]);

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Studium</h1>
          <p className="text-muted-foreground">
            Procházejte AI-generované studijní materiály
          </p>
        </div>

        <Button>
          <Sparkles className="w-4 h-4 mr-2" />
          Generovat nové téma
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Obory</p>
                <p className="text-2xl font-bold">{stats.oboryCount}</p>
              </div>
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Okruhy</p>
                <p className="text-2xl font-bold">{stats.okruhyCount}</p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Témata</p>
                <p className="text-2xl font-bold">{stats.totalTopics}</p>
              </div>
              <Zap className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Zobrazeno</p>
                <p className="text-2xl font-bold">{stats.filteredTopics}</p>
              </div>
              <Filter className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Hledat témata..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
          <div className="grid md:grid-cols-4 gap-4">
            {/* Obor Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Obor</label>
              <Select value={selectedObor} onValueChange={setSelectedObor}>
                <SelectTrigger>
                  <SelectValue placeholder="Všechny obory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny obory</SelectItem>
                  {obory.map((obor) => (
                    <SelectItem key={obor.id} value={obor.id}>
                      {obor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Okruh Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Okruh</label>
              <Select value={selectedOkruh} onValueChange={setSelectedOkruh}>
                <SelectTrigger>
                  <SelectValue placeholder="Všechny okruhy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny okruhy</SelectItem>
                  {okruhy.map((okruh) => (
                    <SelectItem key={okruh.id} value={okruh.id}>
                      {okruh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AI Model Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">AI Model</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Všechny modely" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny modely</SelectItem>
                  <SelectItem value="claude-opus-4">Claude Opus 4</SelectItem>
                  <SelectItem value="claude-sonnet-4">Claude Sonnet 4</SelectItem>
                  <SelectItem value="claude-haiku-4">Claude Haiku 4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Řazení</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Nejnovější</SelectItem>
                  <SelectItem value="oldest">Nejstarší</SelectItem>
                  <SelectItem value="alphabetical">Abecedně</SelectItem>
                  <SelectItem value="confidence">Nejvyšší confidence</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters */}
          {(searchQuery || selectedObor !== 'all' || selectedOkruh !== 'all' || selectedModel !== 'all') && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Aktivní filtry:</span>
              
              {searchQuery && (
                <Badge variant="secondary">
                  Hledání: "{searchQuery}"
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="ml-2 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {selectedObor !== 'all' && (
                <Badge variant="secondary">
                  Obor: {obory.find(o => o.id === selectedObor)?.name}
                  <button 
                    onClick={() => setSelectedObor('all')}
                    className="ml-2 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {selectedOkruh !== 'all' && (
                <Badge variant="secondary">
                  Okruh: {okruhy.find(o => o.id === selectedOkruh)?.name}
                  <button 
                    onClick={() => setSelectedOkruh('all')}
                    className="ml-2 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {selectedModel !== 'all' && (
                <Badge variant="secondary">
                  Model: {selectedModel}
                  <button 
                    onClick={() => setSelectedModel('all')}
                    className="ml-2 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}

              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedObor('all');
                  setSelectedOkruh('all');
                  setSelectedModel('all');
                }}
              >
                Vymazat vše
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Topics List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      ) : filteredTopics.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">Žádná témata nenalezena</h3>
            <p className="text-muted-foreground mb-6">
              Zkuste změnit filtry nebo vygenerovat nové téma
            </p>
            <Button>
              <Sparkles className="w-4 h-4 mr-2" />
              Generovat téma
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTopics.map((topic) => (
            <Link
              key={topic.id}
              to={`${createPageUrl('TopicDetailV2')}?id=${topic.id}`}
            >
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <Badge 
                      variant="outline"
                      style={{ 
                        borderColor: topic.obory?.color || '#666',
                        color: topic.obory?.color || '#666'
                      }}
                    >
                      {topic.obory?.name}
                    </Badge>
                    
                    {topic.ai_confidence && (
                      <Badge variant="secondary" className="text-xs">
                        {(topic.ai_confidence * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">
                    {topic.title}
                  </h3>

                  {/* Description */}
                  {topic.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {topic.description}
                    </p>
                  )}

                  {/* Okruh */}
                  <p className="text-xs text-muted-foreground mb-3">
                    {topic.okruhy?.name}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2">
                      {topic.ai_model && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Sparkles className="w-3 h-3" />
                          {topic.ai_model.includes('opus') ? 'Opus' : 
                           topic.ai_model.includes('sonnet') ? 'Sonnet' : 'Haiku'}
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {new Date(topic.created_at).toLocaleDateString('cs-CZ')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
