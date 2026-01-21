import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Loader2, CheckCircle2, GraduationCap, Stethoscope } from 'lucide-react';

const educationLevels = [
  { value: 'student', label: 'Student medicíny', description: 'Příprava na státnice' },
  { value: 'resident', label: 'Rezident', description: 'Příprava na atestaci' },
  { value: 'attending', label: 'Atestovaný lékař', description: 'Kontinuální vzdělávání' },
  { value: 'clinic_admin', label: 'Vedoucí kliniky', description: 'Správa a vzdělávání' },
  { value: 'other', label: 'Jiné', description: 'Ostatní zdravotníci' }
];

export default function EducationSettings({ user }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [educationLevel, setEducationLevel] = useState(user?.education_level || '');
  const [selectedDisciplines, setSelectedDisciplines] = useState(user?.clinical_discipline_preferences || []);

  const { data: disciplines = [] } = useQuery({
    queryKey: ['clinicalDisciplines'],
    queryFn: () => base44.entities.ClinicalDiscipline.list()
  });

  useEffect(() => {
    if (user) {
      setEducationLevel(user.education_level || '');
      setSelectedDisciplines(user.clinical_discipline_preferences || []);
    }
  }, [user]);

  const handleDisciplineToggle = (disciplineId) => {
    setSelectedDisciplines(prev => 
      prev.includes(disciplineId)
        ? prev.filter(id => id !== disciplineId)
        : [...prev, disciplineId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      education_level: educationLevel,
      clinical_discipline_preferences: selectedDisciplines
    });
    queryClient.invalidateQueries(['currentUser']);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Vzdělání a specializace
        </CardTitle>
        <CardDescription>
          Nastavte svou úroveň vzdělání a preferované obory pro personalizovaný obsah
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Education level */}
        <div className="space-y-3">
          <Label>Úroveň vzdělání</Label>
          <Select value={educationLevel} onValueChange={setEducationLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Vyberte úroveň vzdělání" />
            </SelectTrigger>
            <SelectContent>
              {educationLevels.map(level => (
                <SelectItem key={level.value} value={level.value}>
                  <div className="flex flex-col">
                    <span>{level.label}</span>
                    <span className="text-xs text-slate-500">{level.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clinical disciplines */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            Preferované klinické obory
          </Label>
          {disciplines.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {disciplines.map(discipline => (
                <div 
                  key={discipline.id} 
                  className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Checkbox
                    id={discipline.id}
                    checked={selectedDisciplines.includes(discipline.id)}
                    onCheckedChange={() => handleDisciplineToggle(discipline.id)}
                  />
                  <label
                    htmlFor={discipline.id}
                    className="text-sm font-medium cursor-pointer flex-1"
                  >
                    {discipline.name}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Zatím nejsou definovány žádné klinické obory.</p>
          )}
        </div>

        {/* Selected disciplines badges */}
        {selectedDisciplines.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedDisciplines.map(id => {
              const discipline = disciplines.find(d => d.id === id);
              return discipline ? (
                <Badge key={id} variant="secondary">
                  {discipline.name}
                </Badge>
              ) : null;
            })}
          </div>
        )}

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-teal-600 hover:bg-teal-700"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saved ? 'Uloženo!' : 'Uložit nastavení'}
        </Button>
      </CardContent>
    </Card>
  );
}