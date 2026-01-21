import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  FileDown, 
  Scissors, 
  GraduationCap, 
  BookOpen, 
  Users, 
  FileText,
  MoreHorizontal,
  Calendar,
  MapPin,
  User,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import LogbookEntryForm from '@/components/logbook/LogbookEntryForm';
import LogbookStats from '@/components/logbook/LogbookStats';
import jsPDF from 'jspdf';

const entryTypeConfig = {
  procedure: { label: 'Výkon', icon: Scissors, color: 'bg-blue-100 text-blue-800' },
  internship: { label: 'Stáž', icon: GraduationCap, color: 'bg-purple-100 text-purple-800' },
  course: { label: 'Kurz', icon: BookOpen, color: 'bg-green-100 text-green-800' },
  conference: { label: 'Konference', icon: Users, color: 'bg-amber-100 text-amber-800' },
  publication: { label: 'Publikace', icon: FileText, color: 'bg-pink-100 text-pink-800' },
  other: { label: 'Jiné', icon: MoreHorizontal, color: 'bg-slate-100 text-slate-800' }
};

const roleLabels = {
  operator: 'Operatér',
  first_assistant: '1. asistent',
  second_assistant: '2. asistent',
  observer: 'Pozorovatel'
};

export default function Logbook() {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['logbookEntries', user?.id],
    queryFn: () => base44.entities.LogbookEntry.filter({ user_id: user.id }, '-date'),
    enabled: !!user?.id
  });

  const { data: disciplines = [] } = useQuery({
    queryKey: ['clinicalDisciplines'],
    queryFn: () => base44.entities.ClinicalDiscipline.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LogbookEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['logbookEntries'])
  });

  const filteredEntries = activeTab === 'all' 
    ? entries 
    : entries.filter(e => e.entry_type === activeTab);

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Logbook - Prehled vykonu', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${user?.full_name || 'Rezident'} | Exportovano: ${format(new Date(), 'd.M.yyyy')}`, margin, yPos);
    yPos += 15;

    Object.keys(entryTypeConfig).forEach(type => {
      const typeEntries = entries.filter(e => e.entry_type === type);
      if (typeEntries.length === 0) return;

      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(entryTypeConfig[type].label + ` (${typeEntries.length})`, margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      typeEntries.forEach(entry => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        const dateStr = entry.date ? format(new Date(entry.date), 'd.M.yyyy') : '';
        const line = `${dateStr} - ${entry.title}${entry.location ? ` (${entry.location})` : ''}${entry.count > 1 ? ` x${entry.count}` : ''}`;
        doc.text(line, margin + 5, yPos);
        yPos += 6;
      });

      yPos += 5;
    });

    doc.save(`logbook_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Logbook</h1>
          <p className="text-slate-500 mt-1">Zaznamenávejte výkony, stáže a další požadavky k atestaci</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToPDF}>
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" />
            Nový záznam
          </Button>
        </div>
      </div>

      {/* Stats */}
      <LogbookStats entries={entries} />

      {/* Entry form dialog */}
      {showForm && (
        <LogbookEntryForm
          entry={editingEntry}
          disciplines={disciplines}
          userId={user?.id}
          onClose={handleCloseForm}
        />
      )}

      {/* Tabs and entries */}
      <Card className="mt-6">
        <CardHeader className="pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">Vše ({entries.length})</TabsTrigger>
              {Object.entries(entryTypeConfig).map(([key, config]) => {
                const count = entries.filter(e => e.entry_type === key).length;
                if (count === 0) return null;
                return (
                  <TabsTrigger key={key} value={key}>
                    {config.label} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-6">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Zatím nemáte žádné záznamy</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Přidat první záznam
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map(entry => {
                const typeConfig = entryTypeConfig[entry.entry_type] || entryTypeConfig.other;
                const TypeIcon = typeConfig.icon;
                const discipline = disciplines.find(d => d.id === entry.clinical_discipline_id);

                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => handleEdit(entry)}
                  >
                    <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {entry.title}
                            {entry.count > 1 && (
                              <span className="ml-2 text-teal-600">×{entry.count}</span>
                            )}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {entry.date ? format(new Date(entry.date), 'd. MMMM yyyy', { locale: cs }) : '-'}
                            </span>
                            {entry.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {entry.location}
                              </span>
                            )}
                            {entry.supervisor && (
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5" />
                                {entry.supervisor}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.verified ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Ověřeno
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500">
                              <Clock className="w-3 h-3 mr-1" />
                              Čeká
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                        {entry.role && (
                          <Badge variant="outline">{roleLabels[entry.role]}</Badge>
                        )}
                        {discipline && (
                          <Badge variant="secondary">{discipline.name}</Badge>
                        )}
                        {entry.category && (
                          <Badge variant="outline">{entry.category}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}