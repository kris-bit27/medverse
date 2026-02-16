import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Loader2, X, Sparkles } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import AICopilotChat from '@/components/ai/AICopilotChat';

export default function StudyPackageCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [disciplineId, setDisciplineId] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [targetAudience, setTargetAudience] = useState('all');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [selectedTools, setSelectedTools] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [showAI, setShowAI] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; }
  });

  const { data: disciplines = [] } = useQuery({
    queryKey: ['clinicalDisciplines'],
    queryFn: () => supabase.from('obory').select('*').order('order_index').then(r => r.data || [])
  });

  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['questions'],
    queryFn: () => supabase.from('questions').select('*').then(r => r.data || [])
  });

  const { data: articles = [], isLoading: loadingArticles } = useQuery({
    queryKey: ['articles'],
    queryFn: () => supabase.from('articles').select('*').then(r => r.data || [])
  });

  const { data: tools = [], isLoading: loadingTools } = useQuery({
    queryKey: ['tools'],
    queryFn: () => supabase.from('clinical_tools').select('*').then(r => r.data || [])
  });

  const createMutation = useMutation({
    mutationFn: (data) => supabase.from('study_packages').insert(data).select().single().then(r => r.data),
    onSuccess: (pkg) => {
      queryClient.invalidateQueries(['myStudyPackages']);
      navigate(createPageUrl('StudyPackageDetail') + `?id=${pkg.id}`);
    }
  });

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const packageData = {
      title,
      description,
      clinical_discipline_id: disciplineId || undefined,
      question_ids: selectedQuestions,
      article_ids: selectedArticles,
      tool_ids: selectedTools,
      is_public: isPublic,
      target_audience: targetAudience,
      estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      tags,
      is_ai_generated: false
    };

    createMutation.mutate(packageData);
  };

  const filteredQuestions = disciplineId 
    ? questions.filter(q => {
        // Filter by okruh's clinical_discipline_id
        return true; // Simplified for now
      })
    : questions;

  const filteredArticles = disciplineId
    ? articles.filter(a => {
        // Filter by topic's clinical_discipline_id
        return true; // Simplified for now
      })
    : articles;

  const filteredTools = disciplineId
    ? tools.filter(t => {
        // Filter by topic's clinical_discipline_id
        return true; // Simplified for now
      })
    : tools;

  if (loadingQuestions || loadingArticles || loadingTools) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[hsl(var(--mn-text))] mb-2">
          Vytvořit studijní balíček
        </h1>
        <p className="text-[hsl(var(--mn-muted))]">
          Sestavte personalizovanou kolekci studijních materiálů
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Základní informace</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Název balíčku *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="např. Příprava na atestaci z kardiologie"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Popis</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Stručný popis účelu a obsahu balíčku..."
                    rows={3}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Klinický obor</Label>
                    <Select value={disciplineId} onValueChange={setDisciplineId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte obor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Žádný obor</SelectItem>
                        {disciplines.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cílová skupina</Label>
                    <Select value={targetAudience} onValueChange={setTargetAudience}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Všichni</SelectItem>
                        <SelectItem value="student">Studenti</SelectItem>
                        <SelectItem value="resident">Rezidenti</SelectItem>
                        <SelectItem value="attending">Atestovaní lékaři</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hours">Odhadovaný čas studia (hodiny)</Label>
                  <Input
                    id="hours"
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="např. 20"
                    min="0"
                    step="0.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tagy</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      placeholder="Přidat tag..."
                    />
                    <Button type="button" onClick={handleAddTag}>Přidat</Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <X 
                            className="w-3 h-3 cursor-pointer hover:text-red-500" 
                            onClick={() => handleRemoveTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-[hsl(var(--mn-surface-2))] rounded-lg">
                  <div>
                    <Label htmlFor="public">Veřejný balíček</Label>
                    <p className="text-sm text-[hsl(var(--mn-muted))]">Sdílet s celou komunitou</p>
                  </div>
                  <Switch
                    id="public"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Výběr obsahu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Otázky ({selectedQuestions.length} vybráno)</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
                    {filteredQuestions.slice(0, 50).map(q => (
                      <div key={q.id} className="flex items-start gap-2">
                        <Checkbox
                          id={`q-${q.id}`}
                          checked={selectedQuestions.includes(q.id)}
                          onCheckedChange={(checked) => {
                            setSelectedQuestions(checked 
                              ? [...selectedQuestions, q.id]
                              : selectedQuestions.filter(id => id !== q.id)
                            );
                          }}
                        />
                        <label htmlFor={`q-${q.id}`} className="text-sm cursor-pointer flex-1">
                          {q.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Články ({selectedArticles.length} vybráno)</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
                    {filteredArticles.slice(0, 50).map(a => (
                      <div key={a.id} className="flex items-start gap-2">
                        <Checkbox
                          id={`a-${a.id}`}
                          checked={selectedArticles.includes(a.id)}
                          onCheckedChange={(checked) => {
                            setSelectedArticles(checked 
                              ? [...selectedArticles, a.id]
                              : selectedArticles.filter(id => id !== a.id)
                            );
                          }}
                        />
                        <label htmlFor={`a-${a.id}`} className="text-sm cursor-pointer flex-1">
                          {a.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Nástroje ({selectedTools.length} vybráno)</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
                    {filteredTools.slice(0, 50).map(t => (
                      <div key={t.id} className="flex items-start gap-2">
                        <Checkbox
                          id={`t-${t.id}`}
                          checked={selectedTools.includes(t.id)}
                          onCheckedChange={(checked) => {
                            setSelectedTools(checked 
                              ? [...selectedTools, t.id]
                              : selectedTools.filter(id => id !== t.id)
                            );
                          }}
                        />
                        <label htmlFor={`t-${t.id}`} className="text-sm cursor-pointer flex-1">
                          {t.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={createMutation.isPending || !title}
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Vytvořit balíček
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Zrušit
              </Button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-500" />
                AI Copilot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[hsl(var(--mn-muted))] mb-4">
                Požádejte AI Copilota o pomoc s vytvořením balíčku. Stačí popsat, co potřebujete!
              </p>
              <Button 
                onClick={() => setShowAI(!showAI)} 
                variant="outline" 
                className="w-full mb-4"
              >
                {showAI ? 'Skrýt AI' : 'Otevřít AI chat'}
              </Button>
              {showAI && <AICopilotChat agentName="copilot" />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}