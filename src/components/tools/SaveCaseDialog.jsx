import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X, Upload, File, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function SaveCaseDialog({ 
  open, 
  onOpenChange, 
  caseType, 
  initialQuery, 
  aiResponse, 
  defaultNotes,
  defaultTags = []
}) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState(defaultNotes || '');
  const [tags, setTags] = useState(defaultTags);
  const [newTag, setNewTag] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        // TODO: migrate to Supabase Storage when ready
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('case-files').upload(`${Date.now()}-${file.name}`, file);
        const file_url = uploadData?.path 
          ? supabase.storage.from('case-files').getPublicUrl(uploadData.path).data.publicUrl
          : null;
        setAttachments(prev => [...prev, {
          url: file_url,
          name: file.name,
          type: file.type,
          size: file.size
        }]);
      }
      toast.success('Soubory nahrány');
    } catch (error) {
      toast.error('Chyba při nahrávání souboru');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Vyplňte název případu');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('case_logs').insert({
        user_id: user.id,
        title: title.trim(),
        case_type: caseType,
        initial_query: initialQuery,
        ai_response: aiResponse,
        notes: notes.trim(),
        tags: tags,
        attachments: attachments,
        is_shared: isShared
      });

      toast.success('Případ uložen');
      onOpenChange(false);
      
      // Reset form
      setTitle('');
      setNotes(defaultNotes || '');
      setTags(defaultTags);
      setNewTag('');
      setAttachments([]);
      setIsShared(false);
    } catch (error) {
      toast.error('Chyba při ukládání');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Uložit případ</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <div className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Název případu *</Label>
              <Input
                id="title"
                placeholder="Např. Pacient s febriemi a bolestí hlavy"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tagy</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-[hsl(var(--mn-border))] dark:hover:bg-[hsl(var(--mn-elevated))] rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Přidat tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Poznámky (markdown)</Label>
              <Textarea
                id="notes"
                placeholder="Doplňující informace o případu, vaše úvahy, pozorování..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-[hsl(var(--mn-muted))]">
                Podporuje markdown formátování (nadpisy, seznamy, **tučný text**, *kurzíva*, atd.)
              </p>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Přílohy</Label>
              <div className="border-2 border-dashed border-[hsl(var(--mn-border))] rounded-lg p-4">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-[hsl(var(--mn-muted))] mb-2" />
                  <p className="text-sm text-[hsl(var(--mn-muted))]">
                    {uploading ? 'Nahrávám...' : 'Klikněte pro nahrání souborů'}
                  </p>
                  <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">
                    Obrázky, PDF, dokumenty
                  </p>
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2 mt-3">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-[hsl(var(--mn-surface-2))] rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <File className="w-5 h-5 text-[hsl(var(--mn-muted))] flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[hsl(var(--mn-text))] truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-[hsl(var(--mn-muted))]">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAttachment(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sharing */}
            <div className="flex items-center justify-between p-4 bg-[hsl(var(--mn-surface-2))] rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-[hsl(var(--mn-muted))]" />
                <div>
                  <Label htmlFor="share" className="cursor-pointer">
                    Sdílet s ostatními uživateli
                  </Label>
                  <p className="text-xs text-[hsl(var(--mn-muted))] mt-0.5">
                    Umožní ostatním uživatelům aplikace zobrazit tento případ
                  </p>
                </div>
              </div>
              <Switch
                id="share"
                checked={isShared}
                onCheckedChange={setIsShared}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading || !title.trim()}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Ukládám...
              </>
            ) : (
              'Uložit případ'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}