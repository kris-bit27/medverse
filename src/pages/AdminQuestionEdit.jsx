import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft,
  Save,
  Loader2
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function AdminQuestionEdit() {
  const urlParams = new URLSearchParams(window.location.search);
  const questionId = urlParams.get('id');
  const isEdit = !!questionId;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    question_text: '',
    answer_rich: '',
    answer_structured: {
      definice: '',
      diagnostika: '',
      lecba: '',
      komplikace: '',
      pearls: ''
    },
    okruh_id: '',
    topic_id: '',
    difficulty: 3,
    visibility: 'members_only'
  });

  const { data: question, isLoading: questionLoading } = useQuery({
    queryKey: ['question', questionId],
    queryFn: async () => {
      const questions = await supabase.from('questions').select('*').eq('id', questionId ).then(r => r.data || []);
      return questions[0];
    },
    enabled: isEdit
  });

  const { data: okruhy = [] } = useQuery({
    queryKey: ['okruhy'],
    queryFn: () => supabase.from('okruhy').select('*').order('order_index').then(r => r.data || [])
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => supabase.from('topics').select('*').then(r => r.data || [])
  });

  // Load question data
  useEffect(() => {
    if (question) {
      setFormData({
        title: question.title || '',
        question_text: question.question_text || '',
        answer_rich: question.answer_rich || '',
        answer_structured: question.answer_structured || {
          definice: '',
          diagnostika: '',
          lecba: '',
          komplikace: '',
          pearls: ''
        },
        okruh_id: question.okruh_id || '',
        topic_id: question.topic_id || '',
        difficulty: question.difficulty || 3,
        visibility: question.visibility || 'members_only'
      });
    }
  }, [question]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEdit) {
        return supabase.from('questions').update(data).eq('id', questionId).select().single().then(r => r.data);
      } else {
        return supabase.from('questions').insert(data).select().single().then(r => r.data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['questions']);
      window.location.href = createPageUrl('AdminQuestions');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const filteredTopics = topics.filter(t => t.okruh_id === formData.okruh_id);

  if (isEdit && questionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" asChild>
          <Link to={createPageUrl('AdminQuestions')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Zpět
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold text-[hsl(var(--mn-text))] mb-8">
        {isEdit ? 'Upravit otázku' : 'Nová otázka'}
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle>Základní informace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Název otázky *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Okruh *</Label>
                  <Select 
                    value={formData.okruh_id} 
                    onValueChange={(v) => setFormData(f => ({ ...f, okruh_id: v, topic_id: '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte okruh" />
                    </SelectTrigger>
                    <SelectContent>
                      {okruhy.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Téma *</Label>
                  <Select 
                    value={formData.topic_id} 
                    onValueChange={(v) => setFormData(f => ({ ...f, topic_id: v }))}
                    disabled={!formData.okruh_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte téma" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTopics.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Label>Obtížnost</Label>
                    <span className="text-sm font-medium">{formData.difficulty}</span>
                  </div>
                  <Slider
                    value={[formData.difficulty]}
                    onValueChange={([v]) => setFormData(f => ({ ...f, difficulty: v }))}
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Viditelnost</Label>
                  <Select 
                    value={formData.visibility} 
                    onValueChange={(v) => setFormData(f => ({ ...f, visibility: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Veřejné</SelectItem>
                      <SelectItem value="members_only">Pro členy</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Question text */}
          <Card>
            <CardHeader>
              <CardTitle>Text otázky</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.question_text}
                onChange={(e) => setFormData(f => ({ ...f, question_text: e.target.value }))}
                placeholder="Zadejte text otázky..."
                className="min-h-[150px]"
              />
            </CardContent>
          </Card>

          {/* Answer */}
          <Card>
            <CardHeader>
              <CardTitle>Odpověď</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="structured">
                <TabsList className="mb-4">
                  <TabsTrigger value="structured">Strukturovaná</TabsTrigger>
                  <TabsTrigger value="rich">Plný text</TabsTrigger>
                </TabsList>

                <TabsContent value="structured" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Definice</Label>
                    <Textarea
                      value={formData.answer_structured.definice}
                      onChange={(e) => setFormData(f => ({ 
                        ...f, 
                        answer_structured: { ...f.answer_structured, definice: e.target.value }
                      }))}
                      placeholder="Definice pojmu..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Diagnostika</Label>
                    <Textarea
                      value={formData.answer_structured.diagnostika}
                      onChange={(e) => setFormData(f => ({ 
                        ...f, 
                        answer_structured: { ...f.answer_structured, diagnostika: e.target.value }
                      }))}
                      placeholder="Diagnostické postupy..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Léčba</Label>
                    <Textarea
                      value={formData.answer_structured.lecba}
                      onChange={(e) => setFormData(f => ({ 
                        ...f, 
                        answer_structured: { ...f.answer_structured, lecba: e.target.value }
                      }))}
                      placeholder="Terapeutické možnosti..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Komplikace</Label>
                    <Textarea
                      value={formData.answer_structured.komplikace}
                      onChange={(e) => setFormData(f => ({ 
                        ...f, 
                        answer_structured: { ...f.answer_structured, komplikace: e.target.value }
                      }))}
                      placeholder="Možné komplikace..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Klinické perly</Label>
                    <Textarea
                      value={formData.answer_structured.pearls}
                      onChange={(e) => setFormData(f => ({ 
                        ...f, 
                        answer_structured: { ...f.answer_structured, pearls: e.target.value }
                      }))}
                      placeholder="Praktické tipy..."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="rich">
                  <Textarea
                    value={formData.answer_rich}
                    onChange={(e) => setFormData(f => ({ ...f, answer_rich: e.target.value }))}
                    placeholder="Plný text odpovědi (podporuje Markdown)..."
                    className="min-h-[300px]"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" asChild>
              <Link to={createPageUrl('AdminQuestions')}>Zrušit</Link>
            </Button>
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEdit ? 'Uložit změny' : 'Vytvořit otázku'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}