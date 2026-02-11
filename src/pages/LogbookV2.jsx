import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  ClipboardList,
  Plus,
  CheckCircle,
  AlertCircle,
  Calendar,
  Award,
  TrendingUp,
  Users,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

export default function LogbookV2() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [formData, setFormData] = useState({
    procedure_category_id: '',
    procedure_name: '',
    date: new Date().toISOString().split('T')[0],
    patient_age: '',
    patient_gender: '',
    description: '',
    difficulty_level: 'beginner',
    complications: '',
    learning_points: '',
    was_supervised: false
  });

  // Fetch procedure categories
  const { data: categories = [] } = useQuery({
    queryKey: ['procedureCategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procedure_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch logbook entries
  const { data: entries = [] } = useQuery({
    queryKey: ['logbookEntries', user?.id, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('logbook_entries')
        .select(`
          *,
          procedure_categories (
            id,
            name,
            slug,
            color,
            icon
          )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('procedure_category_id', selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch certification progress
  const { data: certProgress = [] } = useQuery({
    queryKey: ['certificationProgress', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_certification_progress')
        .select(`
          *,
          certification_requirements (
            *,
            procedure_categories (
              name,
              icon,
              color
            )
          )
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Add entry mutation
  const addEntry = useMutation({
    mutationFn: async (entryData) => {
      const { data, error } = await supabase
        .from('logbook_entries')
        .insert({
          user_id: user.id,
          ...entryData
        })
        .select()
        .single();

      if (error) throw error;

      // Update certification progress
      await updateCertificationProgress(entryData.procedure_category_id);

      return data;
    },
    onSuccess: () => {
      toast.success('Výkon zaznamenán!');
      queryClient.invalidateQueries(['logbookEntries']);
      queryClient.invalidateQueries(['certificationProgress']);
      setShowAddDialog(false);
      setFormData({
        procedure_category_id: '',
        procedure_name: '',
        date: new Date().toISOString().split('T')[0],
        patient_age: '',
        patient_gender: '',
        description: '',
        difficulty_level: 'beginner',
        complications: '',
        learning_points: '',
        was_supervised: false
      });
    },
    onError: () => {
      toast.error('Chyba při ukládání');
    }
  });

  const updateCertificationProgress = async (categoryId) => {
    // Get requirements for this category
    const { data: requirements } = await supabase
      .from('certification_requirements')
      .select('id, required_count, required_supervised')
      .eq('procedure_category_id', categoryId);

    if (!requirements) return;

    for (const req of requirements) {
      // Count user's procedures
      const { count: totalCount } = await supabase
        .from('logbook_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('procedure_category_id', categoryId);

      const { count: supervisedCount } = await supabase
        .from('logbook_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('procedure_category_id', categoryId)
        .eq('was_supervised', true);

      // Upsert progress
      await supabase
        .from('user_certification_progress')
        .upsert({
          user_id: user.id,
          requirement_id: req.id,
          completed_count: totalCount || 0,
          supervised_count: supervisedCount || 0,
          is_completed: (totalCount >= req.required_count) && (supervisedCount >= req.required_supervised)
        });
    }
  };

  const handleSubmit = () => {
    if (!formData.procedure_category_id || !formData.procedure_name) {
      toast.error('Vyplňte povinná pole');
      return;
    }

    addEntry.mutate(formData);
  };

  // Statistics
  const stats = {
    total: entries.length,
    thisMonth: entries.filter(e => {
      const entryDate = new Date(e.date);
      const now = new Date();
      return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
    }).length,
    verified: entries.filter(e => e.mentor_verified).length,
    supervised: entries.filter(e => e.was_supervised).length
  };

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Klinický Deník</h1>
          <p className="text-muted-foreground">
            Sledujte své výkony a pokrok k certifikaci
          </p>
        </div>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Přidat výkon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Zaznamenat výkon</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategorie výkonu *</Label>
                  <Select
                    value={formData.procedure_category_id}
                    onValueChange={(value) => setFormData({ ...formData, procedure_category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte kategorii" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Název výkonu *</Label>
                  <Input
                    value={formData.procedure_name}
                    onChange={(e) => setFormData({ ...formData, procedure_name: e.target.value })}
                    placeholder="např. Venepunkce v. cubitalis"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Věk pacienta</Label>
                  <Input
                    type="number"
                    value={formData.patient_age}
                    onChange={(e) => setFormData({ ...formData, patient_age: e.target.value })}
                    placeholder="věk"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pohlaví</Label>
                  <Select
                    value={formData.patient_gender}
                    onValueChange={(value) => setFormData({ ...formData, patient_gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Muž</SelectItem>
                      <SelectItem value="female">Žena</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Popis výkonu</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Stručný popis průběhu výkonu..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Obtížnost</Label>
                <Select
                  value={formData.difficulty_level}
                  onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Začátečník</SelectItem>
                    <SelectItem value="intermediate">Středně pokročilý</SelectItem>
                    <SelectItem value="advanced">Pokročilý</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Komplikace</Label>
                <Textarea
                  value={formData.complications}
                  onChange={(e) => setFormData({ ...formData, complications: e.target.value })}
                  placeholder="Zaznamenejte případné komplikace..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Co jsem se naučil</Label>
                <Textarea
                  value={formData.learning_points}
                  onChange={(e) => setFormData({ ...formData, learning_points: e.target.value })}
                  placeholder="Poznatky, které si odnáším..."
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="supervised"
                  checked={formData.was_supervised}
                  onChange={(e) => setFormData({ ...formData, was_supervised: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="supervised" className="cursor-pointer">
                  Výkon byl pod dohledem (supervised)
                </Label>
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={addEntry.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Uložit výkon
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Celkem výkonů</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <ClipboardList className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tento měsíc</p>
                <p className="text-2xl font-bold">{stats.thisMonth}</p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pod dohledem</p>
                <p className="text-2xl font-bold">{stats.supervised}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ověřeno</p>
                <p className="text-2xl font-bold">{stats.verified}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Certification Progress */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Pokrok k certifikaci
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {certProgress.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Začněte zaznamenávat výkony
                </p>
              ) : (
                certProgress.map((progress) => {
                  const requirement = progress.certification_requirements;
                  const percentage = Math.min(100, (progress.completed_count / requirement.required_count) * 100);

                  return (
                    <div key={progress.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{requirement.procedure_categories?.icon}</span>
                          <span className="text-sm font-medium">
                            {requirement.procedure_categories?.name}
                          </span>
                        </div>
                        {progress.is_completed && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      
                      <Progress value={percentage} className="h-2" />
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {progress.completed_count}/{requirement.required_count} výkonů
                        </span>
                        <span>
                          {progress.supervised_count}/{requirement.required_supervised} supervised
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Entries List */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Zaznamenané výkony</CardTitle>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Všechny kategorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny kategorie</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Zatím žádné výkony
                  </p>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Přidat první výkon
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{entry.procedure_categories?.icon}</span>
                          <div>
                            <p className="font-medium">{entry.procedure_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.procedure_categories?.name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {entry.was_supervised && (
                            <Badge variant="outline">
                              <Users className="w-3 h-3 mr-1" />
                              Supervised
                            </Badge>
                          )}
                          {entry.mentor_verified && (
                            <Badge variant="default">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ověřeno
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-2 text-sm text-muted-foreground mb-2">
                        <div>📅 {new Date(entry.date).toLocaleDateString('cs-CZ')}</div>
                        {entry.patient_age && <div>👤 {entry.patient_age} let</div>}
                        <div>📊 {entry.difficulty_level}</div>
                      </div>

                      {entry.description && (
                        <p className="text-sm mt-2">{entry.description}</p>
                      )}

                      {entry.learning_points && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-sm">
                          <p className="font-medium text-blue-900 dark:text-blue-100">💡 Poznatky:</p>
                          <p className="text-blue-800 dark:text-blue-200">{entry.learning_points}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
