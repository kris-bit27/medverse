import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  FileText,
  Loader2,
  Stethoscope,
  Upload,
  BookOpen,
  CheckCircle,
  Eye,
  EyeOff,
  Search,
  Heart,
  Brain,
  Bone,
  Syringe,
  Activity,
  Scale,
  Baby,
  Pill,
  Microscope,
  Radiation,
  Droplet,
  Eye as EyeIcon,
  Ear,
  Waves,
  Dna,
  Sparkles,
  CheckSquare,
  Square,
  X
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import QuestionImporter from '@/components/admin/QuestionImporter';
import TopicContentEditor from '@/components/admin/TopicContentEditor';
import DisciplineIcon from '@/components/admin/DisciplineIcon';
import AITaxonomyGenerator from '@/components/admin/AITaxonomyGenerator';
import { Checkbox } from '@/components/ui/checkbox';

export default function AdminTaxonomy() {
  const [disciplineDialogOpen, setDisciplineDialogOpen] = useState(false);
  const [okruhDialogOpen, setOkruhDialogOpen] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [contentEditorOpen, setContentEditorOpen] = useState(false);
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const [editingDiscipline, setEditingDiscipline] = useState(null);
  const [editingOkruh, setEditingOkruh] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);
  const [disciplineForm, setDisciplineForm] = useState({ name: '', description: '', icon: '' });
  const [okruhForm, setOkruhForm] = useState({ title: '', order: 0, description: '', clinical_discipline_id: '' });
  const [topicForm, setTopicForm] = useState({ title: '', okruh_id: '', order: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const queryClient = useQueryClient();

  const { data: disciplines = [] } = useQuery({
    queryKey: ['clinicalDisciplines'],
    queryFn: () => base44.entities.ClinicalDiscipline.list()
  });

  const { data: okruhy = [], isLoading } = useQuery({
    queryKey: ['okruhy'],
    queryFn: () => base44.entities.Okruh.list('order')
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list()
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list()
  });

  // Mutations
  const saveDisciplineMutation = useMutation({
    mutationFn: async (data) => {
      if (editingDiscipline) {
        return base44.entities.ClinicalDiscipline.update(editingDiscipline.id, data);
      }
      return base44.entities.ClinicalDiscipline.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clinicalDisciplines']);
      setDisciplineDialogOpen(false);
      setEditingDiscipline(null);
      setDisciplineForm({ name: '', description: '', icon: '' });
    }
  });

  const deleteDisciplineMutation = useMutation({
    mutationFn: (id) => base44.entities.ClinicalDiscipline.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['clinicalDisciplines'])
  });

  const saveOkruhMutation = useMutation({
    mutationFn: async (data) => {
      if (editingOkruh) {
        return base44.entities.Okruh.update(editingOkruh.id, data);
      }
      return base44.entities.Okruh.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['okruhy']);
      setOkruhDialogOpen(false);
      setEditingOkruh(null);
      setOkruhForm({ title: '', order: 0, description: '', clinical_discipline_id: '' });
    }
  });

  const deleteOkruhMutation = useMutation({
    mutationFn: (id) => base44.entities.Okruh.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['okruhy'])
  });

  const saveTopicMutation = useMutation({
    mutationFn: async (data) => {
      if (editingTopic) {
        return base44.entities.Topic.update(editingTopic.id, data);
      }
      return base44.entities.Topic.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['topics']);
      setTopicDialogOpen(false);
      setEditingTopic(null);
      setTopicForm({ title: '', okruh_id: '', order: 0 });
    }
  });

  const deleteTopicMutation = useMutation({
    mutationFn: (id) => base44.entities.Topic.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['topics'])
  });

  const updateTopicStatusMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.Topic.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['topics'])
  });

  const openEditDiscipline = (discipline) => {
    setEditingDiscipline(discipline);
    setDisciplineForm({ name: discipline.name, description: discipline.description || '', icon: discipline.icon || '' });
    setDisciplineDialogOpen(true);
  };

  const openEditOkruh = (okruh) => {
    setEditingOkruh(okruh);
    setOkruhForm({ title: okruh.title, order: okruh.order || 0, description: okruh.description || '', clinical_discipline_id: okruh.clinical_discipline_id || '' });
    setOkruhDialogOpen(true);
  };

  const openEditTopic = (topic) => {
    setEditingTopic(topic);
    setTopicForm({ title: topic.title, okruh_id: topic.okruh_id, order: topic.order || 0 });
    setTopicDialogOpen(true);
  };

  const handleToggleReviewed = async (topic) => {
    const user = await base44.auth.me();
    await updateTopicStatusMutation.mutateAsync({
      id: topic.id,
      data: {
        is_reviewed: !topic.is_reviewed,
        reviewed_by: !topic.is_reviewed ? user.id : null,
        reviewed_at: !topic.is_reviewed ? new Date().toISOString() : null
      }
    });
  };

  const handleTogglePublished = async (topic) => {
    await updateTopicStatusMutation.mutateAsync({
      id: topic.id,
      data: { is_published: !topic.is_published }
    });
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Opravdu smazat ${selectedTopics.length} vybraných témat?`)) return;
    
    for (const topicId of selectedTopics) {
      await deleteTopicMutation.mutateAsync(topicId);
    }
    setSelectedTopics([]);
  };

  const handleBulkPublish = async () => {
    for (const topicId of selectedTopics) {
      await updateTopicStatusMutation.mutateAsync({
        id: topicId,
        data: { is_published: true }
      });
    }
    setSelectedTopics([]);
  };

  const handleBulkUnpublish = async () => {
    for (const topicId of selectedTopics) {
      await updateTopicStatusMutation.mutateAsync({
        id: topicId,
        data: { is_published: false }
      });
    }
    setSelectedTopics([]);
  };

  const handleBulkReview = async () => {
    const user = await base44.auth.me();
    for (const topicId of selectedTopics) {
      await updateTopicStatusMutation.mutateAsync({
        id: topicId,
        data: {
          is_reviewed: true,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        }
      });
    }
    setSelectedTopics([]);
  };

  const toggleSelectAll = () => {
    if (selectedTopics.length === filteredTopics.length) {
      setSelectedTopics([]);
    } else {
      setSelectedTopics(filteredTopics.map(t => t.id));
    }
  };

  const toggleSelectTopic = (topicId) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const filteredTopics = topics.filter(t => 
    !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" asChild>
          <Link to={createPageUrl('Admin')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Zpět
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Taxonomie
        </h1>
        <div className="flex gap-2">
          <Button onClick={() => setAiGeneratorOpen(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            <Sparkles className="w-4 h-4 mr-2" />
            AI generátor
          </Button>
          <Button onClick={() => setImportDialogOpen(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Importovat otázky
          </Button>
        </div>
      </div>

      {/* Clinical Disciplines */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Klinické obory ({disciplines.length})
          </CardTitle>
          <Dialog open={disciplineDialogOpen} onOpenChange={setDisciplineDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => {
                setEditingDiscipline(null);
                setDisciplineForm({ name: '', description: '', icon: '' });
              }}>
                <Plus className="w-4 h-4 mr-1" />
                Přidat
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDiscipline ? 'Upravit obor' : 'Nový obor'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Název</Label>
                  <Input
                    value={disciplineForm.name}
                    onChange={(e) => setDisciplineForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="např. Plastická chirurgie"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Popis</Label>
                  <Textarea
                    value={disciplineForm.description}
                    onChange={(e) => setDisciplineForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Stručný popis oboru"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ikona</Label>
                  <Select 
                    value={disciplineForm.icon} 
                    onValueChange={(v) => setDisciplineForm(f => ({ ...f, icon: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte ikonu" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="heart">
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4" />
                          <span>Srdce (Kardiologie)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="brain">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4" />
                          <span>Mozek (Neurologie)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="bone">
                        <div className="flex items-center gap-2">
                          <Bone className="w-4 h-4" />
                          <span>Kost (Ortopedie)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="syringe">
                        <div className="flex items-center gap-2">
                          <Syringe className="w-4 h-4" />
                          <span>Injekce (Anestezie)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="activity">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          <span>Aktivita (Chirurgie)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="scale">
                        <div className="flex items-center gap-2">
                          <Scale className="w-4 h-4" />
                          <span>Váha (Endokrinologie)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="baby">
                        <div className="flex items-center gap-2">
                          <Baby className="w-4 h-4" />
                          <span>Dítě (Pediatrie)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pill">
                        <div className="flex items-center gap-2">
                          <Pill className="w-4 h-4" />
                          <span>Pilulka (Farmakologie)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="microscope">
                        <div className="flex items-center gap-2">
                          <Microscope className="w-4 h-4" />
                          <span>Mikroskop (Patologie)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="radiation">
                        <div className="flex items-center gap-2">
                          <Radiation className="w-4 h-4" />
                          <span>Záření (Radiologie)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="droplet">
                        <div className="flex items-center gap-2">
                          <Droplet className="w-4 h-4" />
                          <span>Kapka (Dermatologie)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="eye">
                        <div className="flex items-center gap-2">
                          <EyeIcon className="w-4 h-4" />
                          <span>Oko (Oftalmologie)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ear">
                        <div className="flex items-center gap-2">
                          <Ear className="w-4 h-4" />
                          <span>Ucho (ORL)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="waves">
                        <div className="flex items-center gap-2">
                          <Waves className="w-4 h-4" />
                          <span>Vlny (Psychiatrie)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="dna">
                        <div className="flex items-center gap-2">
                          <Dna className="w-4 h-4" />
                          <span>DNA (Genetika)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="stethoscope">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4" />
                          <span>Stetoskop (Všeobecné)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => saveDisciplineMutation.mutate(disciplineForm)}
                  disabled={saveDisciplineMutation.isPending}
                  className="w-full"
                >
                  {saveDisciplineMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Uložit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {disciplines.map((discipline) => {
              const disciplineOkruhy = okruhy.filter(o => o.clinical_discipline_id === discipline.id);
              return (
                <div 
                  key={discipline.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                      <DisciplineIcon icon={discipline.icon} className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white text-sm">{discipline.name}</p>
                      <p className="text-xs text-slate-500">{disciplineOkruhy.length} okruhů</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDiscipline(discipline)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => {
                        if (confirm('Opravdu smazat tento obor?')) {
                          deleteDisciplineMutation.mutate(discipline.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {disciplines.length === 0 && (
              <p className="col-span-full text-center py-8 text-slate-500">Žádné obory</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Okruhy */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="w-5 h-5" />
              Okruhy ({okruhy.length})
            </CardTitle>
            <Dialog open={okruhDialogOpen} onOpenChange={setOkruhDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => {
                  setEditingOkruh(null);
                  setOkruhForm({ title: '', order: okruhy.length + 1, description: '' });
                }}>
                  <Plus className="w-4 h-4 mr-1" />
                  Přidat
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingOkruh ? 'Upravit okruh' : 'Nový okruh'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Název</Label>
                    <Input
                      value={okruhForm.title}
                      onChange={(e) => setOkruhForm(f => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Klinický obor</Label>
                    <Select 
                      value={okruhForm.clinical_discipline_id} 
                      onValueChange={(v) => setOkruhForm(f => ({ ...f, clinical_discipline_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte obor" />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplines.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pořadí</Label>
                    <Input
                      type="number"
                      value={okruhForm.order}
                      onChange={(e) => setOkruhForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Popis</Label>
                    <Textarea
                      value={okruhForm.description}
                      onChange={(e) => setOkruhForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <Button 
                    onClick={() => saveOkruhMutation.mutate(okruhForm)}
                    disabled={saveOkruhMutation.isPending}
                    className="w-full"
                  >
                    {saveOkruhMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Uložit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-2">
            {okruhy.map((okruh) => {
              const topicCount = topics.filter(t => t.okruh_id === okruh.id).length;
              const questionCount = questions.filter(q => q.okruh_id === okruh.id).length;
              
              return (
                <div 
                  key={okruh.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{okruh.title}</p>
                    <p className="text-xs text-slate-500">{topicCount} témat · {questionCount} otázek</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditOkruh(okruh)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-600"
                      onClick={() => {
                        if (confirm('Opravdu smazat tento okruh?')) {
                          deleteOkruhMutation.mutate(okruh.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {okruhy.length === 0 && (
              <p className="text-center py-8 text-slate-500">Žádné okruhy</p>
            )}
          </CardContent>
        </Card>

        {/* Topics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Témata ({filteredTopics.length}/{topics.length})
            </CardTitle>
            <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => {
                  setEditingTopic(null);
                  setTopicForm({ title: '', okruh_id: okruhy[0]?.id || '', order: 0 });
                }}>
                  <Plus className="w-4 h-4 mr-1" />
                  Přidat
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTopic ? 'Upravit téma' : 'Nové téma'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Název</Label>
                    <Input
                      value={topicForm.title}
                      onChange={(e) => setTopicForm(f => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Okruh</Label>
                    <Select 
                      value={topicForm.okruh_id} 
                      onValueChange={(v) => setTopicForm(f => ({ ...f, okruh_id: v }))}
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
                    <Label>Pořadí</Label>
                    <Input
                      type="number"
                      value={topicForm.order}
                      onChange={(e) => setTopicForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <Button 
                    onClick={() => saveTopicMutation.mutate(topicForm)}
                    disabled={saveTopicMutation.isPending}
                    className="w-full"
                  >
                    {saveTopicMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Uložit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Hledat témata..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {selectedTopics.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                <span className="text-sm font-medium text-teal-900 dark:text-teal-100">
                  Vybráno: {selectedTopics.length}
                </span>
                <div className="flex gap-1 ml-auto">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={handleBulkReview}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Zkontrolovat
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={handleBulkPublish}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Publikovat
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={handleBulkUnpublish}
                  >
                    <EyeOff className="w-3 h-3 mr-1" />
                    Skrýt
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs text-red-600 hover:text-red-700"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Smazat
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0"
                    onClick={() => setSelectedTopics([])}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {filteredTopics.length > 0 && (
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={toggleSelectAll}
                >
                  {selectedTopics.length === filteredTopics.length ? (
                    <CheckSquare className="w-4 h-4 mr-1" />
                  ) : (
                    <Square className="w-4 h-4 mr-1" />
                  )}
                  {selectedTopics.length === filteredTopics.length ? 'Zrušit výběr' : 'Vybrat vše'}
                </Button>
              </div>
            )}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredTopics.length === 0 && topics.length > 0 ? (
                <p className="text-center py-8 text-slate-500">Žádná témata neodpovídají hledání</p>
              ) : topics.length === 0 ? (
                <p className="text-center py-8 text-slate-500">Žádná témata</p>
              ) : (
                <>
                  {okruhy.map((okruh) => {
                    const okruhTopics = filteredTopics.filter(t => t.okruh_id === okruh.id);
                    if (okruhTopics.length === 0) return null;
                  
                  return (
                    <div key={okruh.id} className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">{okruh.title}</p>
                      <div className="space-y-1">
                        {okruhTopics.map((topic) => {
                            const questionCount = questions.filter(q => q.topic_id === topic.id).length;
                            return (
                              <div 
                                key={topic.id}
                                className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <Checkbox
                                    checked={selectedTopics.includes(topic.id)}
                                    onCheckedChange={() => toggleSelectTopic(topic.id)}
                                  />
                            <span className="text-sm text-slate-900 dark:text-white">{topic.title}</span>
                            <Badge variant="secondary" className="text-xs">{questionCount}</Badge>
                            {topic.is_reviewed && (
                              <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Zkontrolováno
                              </Badge>
                            )}
                            {topic.is_published && (
                              <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                <Eye className="w-3 h-3 mr-1" />
                                Publikováno
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => handleToggleReviewed(topic)}
                              title={topic.is_reviewed ? "Zrušit kontrolu" : "Označit jako zkontrolováno"}
                            >
                              <CheckCircle className={`w-3 h-3 ${topic.is_reviewed ? 'text-green-600' : 'text-slate-400'}`} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => handleTogglePublished(topic)}
                              title={topic.is_published ? "Skrýt" : "Publikovat"}
                            >
                              {topic.is_published ? (
                                <Eye className="w-3 h-3 text-blue-600" />
                              ) : (
                                <EyeOff className="w-3 h-3 text-slate-400" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingTopic(topic);
                                setContentEditorOpen(true);
                              }}
                              title="Upravit obsah"
                            >
                              <BookOpen className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTopic(topic)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600"
                              onClick={() => {
                                if (confirm('Opravdu smazat toto téma?')) {
                                  deleteTopicMutation.mutate(topic.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                      </div>
                    </div>
                  );
                })}
                {(() => {
                  const orphanedTopics = filteredTopics.filter(t => !t.okruh_id || !okruhy.find(o => o.id === t.okruh_id));
                  if (orphanedTopics.length > 0) {
                    return (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-red-500 uppercase mb-2">Témata bez okruhu ({orphanedTopics.length})</p>
                        <div className="space-y-1">
                          {orphanedTopics.map((topic) => {
                            const questionCount = questions.filter(q => q.topic_id === topic.id).length;
                            return (
                              <div 
                                key={topic.id}
                                className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <Checkbox
                                    checked={selectedTopics.includes(topic.id)}
                                    onCheckedChange={() => toggleSelectTopic(topic.id)}
                                  />
                                  <span className="text-sm text-slate-900 dark:text-white">{topic.title}</span>
                                  <Badge variant="secondary" className="text-xs">{questionCount}</Badge>
                                  {topic.is_reviewed && (
                                    <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Zkontrolováno
                                    </Badge>
                                  )}
                                  {topic.is_published && (
                                    <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                      <Eye className="w-3 h-3 mr-1" />
                                      Publikováno
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => handleToggleReviewed(topic)}
                                    title={topic.is_reviewed ? "Zrušit kontrolu" : "Označit jako zkontrolováno"}
                                  >
                                    <CheckCircle className={`w-3 h-3 ${topic.is_reviewed ? 'text-green-600' : 'text-slate-400'}`} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => handleTogglePublished(topic)}
                                    title={topic.is_published ? "Skrýt" : "Publikovat"}
                                  >
                                    {topic.is_published ? (
                                      <Eye className="w-3 h-3 text-blue-600" />
                                    ) : (
                                      <EyeOff className="w-3 h-3 text-slate-400" />
                                    )}
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setEditingTopic(topic);
                                      setContentEditorOpen(true);
                                    }}
                                    title="Upravit obsah"
                                  >
                                    <BookOpen className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTopic(topic)}>
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-7 w-7 text-red-500 hover:text-red-600"
                                    onClick={() => {
                                      if (confirm('Opravdu smazat toto téma?')) {
                                        deleteTopicMutation.mutate(topic.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importovat otázky</DialogTitle>
          </DialogHeader>
          <QuestionImporter 
            okruhy={okruhy} 
            topics={topics}
            disciplines={disciplines}
            onComplete={() => {
              setImportDialogOpen(false);
              queryClient.invalidateQueries(['questions']);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Content Editor Dialog */}
      <Dialog open={contentEditorOpen} onOpenChange={setContentEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upravit studijní obsah</DialogTitle>
          </DialogHeader>
          {editingTopic && (
            <TopicContentEditor 
              topic={editingTopic}
              onSave={() => {
                setContentEditorOpen(false);
                setEditingTopic(null);
                queryClient.invalidateQueries(['topics']);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* AI Taxonomy Generator Dialog */}
      <Dialog open={aiGeneratorOpen} onOpenChange={setAiGeneratorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI generátor taxonomie</DialogTitle>
          </DialogHeader>
          <AITaxonomyGenerator 
            disciplines={disciplines}
            onComplete={() => {
              setAiGeneratorOpen(false);
              queryClient.invalidateQueries(['okruhy']);
              queryClient.invalidateQueries(['topics']);
              queryClient.invalidateQueries(['questions']);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}