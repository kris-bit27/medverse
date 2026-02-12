import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Highlighter, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function HighlightableText({ 
  content, 
  topicId, 
  context, 
  user,
  onNoteCreated 
}) {
  const [selection, setSelection] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleTextSelection = useCallback(() => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText.length > 0) {
      setSelection(selectedText);
      setNoteText('');
      setPopoverOpen(true);
    }
  }, []);

  const handleSaveNote = async () => {
    if (!selection) return;

    setIsSaving(true);
    try {
      const { data: note } = await supabase.from('user_notes').insert({
        user_id: user.id,
        entity_type: 'topic',
        entity_id: topicId,
        highlighted_text: selection,
        content: noteText || `Označeno: "${selection.slice(0, 100)}..."`,
        context,
        is_shared: false
      });

      toast.success('Poznámka uložena');
      setPopoverOpen(false);
      setSelection(null);
      setNoteText('');
      onNoteCreated?.();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Chyba při ukládání poznámky');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div className="hidden" />
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Highlighter className="w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-slate-900 dark:text-white mb-1">
                  Označený text:
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                  {selection?.slice(0, 150)}
                  {selection?.length > 150 && '...'}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Vaše poznámka (volitelné)
              </label>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Přidat vlastní poznámku k tomuto označení..."
                className="text-sm"
                rows={3}
              />
            </div>

            <Button
              onClick={handleSaveNote}
              disabled={isSaving}
              className="w-full"
              size="sm"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Uložit poznámku
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <div 
        onMouseUp={handleTextSelection}
        className="prose prose-slate dark:prose-invert max-w-none select-text cursor-text"
      >
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}