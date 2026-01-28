import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const entryTypes = [
  { value: 'procedure', label: 'Výkon' },
  { value: 'internship', label: 'Stáž' },
  { value: 'course', label: 'Kurz' },
  { value: 'conference', label: 'Konference' },
  { value: 'publication', label: 'Publikace' },
  { value: 'other', label: 'Jiné' }
];

const roles = [
  { value: 'operator', label: 'Operatér' },
  { value: 'first_assistant', label: '1. asistent' },
  { value: 'second_assistant', label: '2. asistent' },
  { value: 'observer', label: 'Pozorovatel' }
];

export default function LogbookEntryForm({ entry, disciplines, userId, onClose }) {
  const queryClient = useQueryClient();
  const isEditing = !!entry;

  const [formData, setFormData] = useState({
    entry_type: entry?.entry_type || 'procedure',
    title: entry?.title || '',
    description: entry?.description || '',
    date: entry?.date || new Date().toISOString().split('T')[0],
    location: entry?.location || '',
    supervisor: entry?.supervisor || '',
    clinical_discipline_id: entry?.clinical_discipline_id || '',
    category: entry?.category || '',
    count: entry?.count || 1,
    role: entry?.role || '',
    notes: entry?.notes || '',
    verified: entry?.verified || false
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LogbookEntry.create({ ...data, user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['logbookEntries']);
      onClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.LogbookEntry.update(entry.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['logbookEntries']);
      onClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.LogbookEntry.delete(entry.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['logbookEntries']);
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validace
    if (!formData.title.trim()) {
      toast.error('Vyplňte název záznamu');
      return;
    }
    
    if (!formData.date) {
      toast.error('Vyplňte datum');
      return;
    }
    
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isProcedure = formData.entry_type === 'procedure';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Upravit záznam' : 'Nový záznam'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Entry type */}
          <div className="space-y-2">
            <Label>Typ záznamu *</Label>
            <Select 
              value={formData.entry_type} 
              onValueChange={(v) => setFormData(s => ({ ...s, entry_type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {entryTypes.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Název *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(s => ({ ...s, title: e.target.value }))}
              placeholder="Např. Appendektomie laparoskopická"
              required
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Datum *</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(s => ({ ...s, date: e.target.value }))}
              required
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Místo</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData(s => ({ ...s, location: e.target.value }))}
              placeholder="Např. FN Motol, Chirurgická klinika"
            />
          </div>

          {/* Supervisor */}
          <div className="space-y-2">
            <Label>Školitel / Supervizor</Label>
            <Input
              value={formData.supervisor}
              onChange={(e) => setFormData(s => ({ ...s, supervisor: e.target.value }))}
              placeholder="Např. MUDr. Jan Novák, Ph.D."
            />
          </div>

          {/* Clinical discipline */}
          <div className="space-y-2">
            <Label>Klinický obor</Label>
            <Select 
              value={formData.clinical_discipline_id} 
              onValueChange={(v) => setFormData(s => ({ ...s, clinical_discipline_id: v }))}
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

          {/* Procedure-specific fields */}
          {isProcedure && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Počet výkonů</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.count}
                    onChange={(e) => setFormData(s => ({ ...s, count: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(v) => setFormData(s => ({ ...s, role: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte roli" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Kategorie výkonu</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData(s => ({ ...s, category: e.target.value }))}
                  placeholder="Např. A1, B2 dle atestačních požadavků"
                />
              </div>
            </>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>Popis</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(s => ({ ...s, description: e.target.value }))}
              placeholder="Podrobný popis..."
              className="min-h-[80px]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Poznámky</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(s => ({ ...s, notes: e.target.value }))}
              placeholder="Vlastní poznámky..."
              className="min-h-[60px]"
            />
          </div>

          {/* Verified */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
            <Label htmlFor="verified" className="cursor-pointer">Ověřeno školitelem</Label>
            <Switch
              id="verified"
              checked={formData.verified}
              onCheckedChange={(v) => setFormData(s => ({ ...s, verified: v }))}
            />
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Zrušit
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-teal-600 hover:bg-teal-700">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Uložit' : 'Přidat'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}