import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  FileText,
  Search,
  Calendar,
  ExternalLink,
  BookOpen,
  Tag
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ClinicalGuidelines() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGuideline, setSelectedGuideline] = useState(null);

  // Fetch all guidelines
  const { data: guidelines = [], isLoading } = useQuery({
    queryKey: ['clinicalGuidelines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinical_guidelines')
        .select('*')
        .order('publication_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const filteredGuidelines = guidelines.filter(guideline => {
    const matchesCategory = selectedCategory === 'all' || guideline.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      guideline.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guideline.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guideline.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categories = [...new Set(guidelines.map(g => g.category).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Klinické Postupy</h1>
        <p className="text-muted-foreground">
          Evidence-based guidelines pro klinickou praxi
        </p>
      </div>

      {/* Search & Filter */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hledat v postupech..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Všechny kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny kategorie</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Guidelines List */}
        <div className="md:col-span-1 space-y-3">
          <h3 className="font-semibold">Postupy ({filteredGuidelines.length})</h3>
          
          <div className="space-y-2 max-h-[700px] overflow-y-auto">
            {filteredGuidelines.map((guideline) => {
              const isSelected = selectedGuideline?.id === guideline.id;

              return (
                <Card
                  key={guideline.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                  onClick={() => setSelectedGuideline(guideline)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{guideline.title}</p>
                        {guideline.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {guideline.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {guideline.category}
                          </Badge>
                          {guideline.source && (
                            <span className="text-xs text-muted-foreground truncate">
                              {guideline.source}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredGuidelines.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Žádné postupy nenalezeny
            </p>
          )}
        </div>

        {/* Guideline Detail */}
        <div className="md:col-span-2">
          {selectedGuideline ? (
            <div className="space-y-6">
              {/* Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <Badge>{selectedGuideline.category}</Badge>
                    {selectedGuideline.subcategory && (
                      <Badge variant="outline">{selectedGuideline.subcategory}</Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl">{selectedGuideline.title}</CardTitle>
                  {selectedGuideline.summary && (
                    <p className="text-muted-foreground mt-2">
                      {selectedGuideline.summary}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {selectedGuideline.source && (
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{selectedGuideline.source}</span>
                      </div>
                    )}
                    
                    {selectedGuideline.publication_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(selectedGuideline.publication_date).toLocaleDateString('cs-CZ')}</span>
                      </div>
                    )}

                    {selectedGuideline.view_count > 0 && (
                      <span>{selectedGuideline.view_count} zobrazení</span>
                    )}
                  </div>

                  {/* Keywords */}
                  {selectedGuideline.keywords && selectedGuideline.keywords.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      {selectedGuideline.keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Source Link */}
                  {selectedGuideline.source_url && (
                    <a
                      href={selectedGuideline.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-purple-600 hover:underline text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Původní zdroj
                    </a>
                  )}
                </CardContent>
              </Card>

              {/* Content */}
              <Card>
                <CardContent className="p-6">
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown>{selectedGuideline.content}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">Vyberte postup</h3>
                <p className="text-muted-foreground">
                  Klikněte na postup vlevo pro zobrazení obsahu
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
