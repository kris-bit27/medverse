import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AITaxonomyGenerator({ disciplines, onComplete }) {
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const isProbablyUrl = (value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleGenerate = async () => {
    if (!selectedDiscipline) {
      toast.error('Vyberte klinický obor');
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const discipline = disciplines.find(d => d.id === selectedDiscipline);
      const sourceIsUrl = sourceUrl && isProbablyUrl(sourceUrl);
      const sourceSnippet = sourceIsUrl ? '' : (sourceUrl || '').slice(0, 12000);

      // Build prompt for AI
      const prompt = `Jsi specialista na medicínské kurikulum. Tvým úkolem je vytvořit KOMPLETNÍ seznam okruhů a témat pro atestační obor ${discipline.name}.

NESMÍŠ nic vynechat. Pokud dokument obsahuje 50 témat, vypiš všech 50.

Generuj POUZE názvy okruhů a názvy témat. Negeneruj žádné otázky ani odpovědi.

VRAŤ POUZE VALIDNÍ JSON (bez komentářů, bez Markdownu).`;

      const promptWithSource = sourceIsUrl
        ? `${prompt}\n\nPrimární zdroj: ${sourceUrl}`
        : sourceSnippet
          ? `${prompt}\n\n=== ZDROJOVÁ DATA ===\n${sourceSnippet}\n=== KONEC ZDROJŮ ===`
          : prompt;

      // Generate structure using InvokeLLM
      const jsonSchema = {
        type: "object",
        properties: {
          okruhy: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                topics: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" }
                    },
                    required: ["title"]
                  }
                }
              },
              required: ["title", "description", "topics"]
            }
          }
        },
        required: ["okruhy"]
      };

      const invoke = (promptText, allowWeb) => callApi('invokeLLM', {
        prompt: promptText,
        add_context_from_internet: allowWeb,
        response_json_schema: jsonSchema,
        model: 'gemini-1.5-pro',
        temperature: 0.0,
        maxTokens: 4096
      });

      let response;
      try {
        response = await invoke(promptWithSource, sourceIsUrl);
      } catch (error) {
        // Retry once with shorter prompt and no web search to improve JSON compliance
        response = await invoke(prompt, false);
      }

      console.log('AI Response:', response);
      
      // Extract data from response (InvokeLLM returns data directly)
      const generatedData = response;
      
      if (!generatedData || !generatedData.okruhy) {
        throw new Error('AI neposkytla validní data. Zkuste to znovu.');
      }
      
      // Create all entities
      let createdOkruhy = 0;
      let createdTopics = 0;

      for (const okruhData of generatedData.okruhy) {
        // Create Okruh
        const { data: okruh } = await supabase.from('okruhy').insert({
          name: okruhData.title,
          description: okruhData.description,
          obor_id: selectedDiscipline
        }).select().single();
        createdOkruhy++;

        // Create Topics in bulk
        if (okruhData.topics && okruhData.topics.length > 0) {
          const topicsToCreate = okruhData.topics.map(topicData => ({
            title: topicData.title,
            okruh_id: okruh.id,
            status: 'draft',
            is_reviewed: false,
            generation_source: 'Gemini 1.5 Pro Taxonomy'
          }));

          await supabase.from('topics').insert(topicsToCreate).select().then(r => r.data);
          createdTopics += topicsToCreate.length;
        }
      }

      setResult({
        success: true,
        okruhy: createdOkruhy,
        topics: createdTopics
      });

      toast.success(`Vytvořeno: ${createdOkruhy} okruhů, ${createdTopics} témat`);
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Generation error:', error);
      setResult({
        success: false,
        error: error.message
      });
      toast.error('Chyba při generování: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Sparkles className="w-4 h-4" />
        <AlertDescription>
          AI vygeneruje kompletní osnovu okruhů a témat na základě oficiálních požadavků MZČR.
          Proces může trvat 30-60 sekund.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Klinický obor</Label>
          <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
            <SelectTrigger>
              <SelectValue placeholder="Vyberte obor pro generování" />
            </SelectTrigger>
            <SelectContent>
              {disciplines.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Zdroj (volitelné)</Label>
          <Textarea
            placeholder="URL odkaz na oficiální otázky MZČR nebo jiný zdroj (pokud prázdné, AI použije vlastní znalosti)"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            rows={3}
          />
        </div>

        <Button 
          onClick={handleGenerate}
          disabled={isGenerating || !selectedDiscipline}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generujem osnovu...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Vygenerovat osnovu okruhů a témat
            </>
          )}
        </Button>
      </div>

      {result && (
        <Alert className={result.success ? 'border-[hsl(var(--mn-success)/0.3)] bg-[hsl(var(--mn-success)/0.06)]' : 'border-[hsl(var(--mn-danger)/0.3)] bg-[hsl(var(--mn-danger)/0.06)]'}>
          {result.success ? (
            <>
              <CheckCircle className="w-4 h-4 text-[hsl(var(--mn-success))]" />
              <AlertDescription className="text-[hsl(var(--mn-success))]">
                <div className="font-medium mb-2">Úspěšně vygenerováno:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{result.okruhy} okruhů</li>
                  <li>{result.topics} témat</li>
                </ul>
              </AlertDescription>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-[hsl(var(--mn-danger))]" />
              <AlertDescription className="text-[hsl(var(--mn-danger))]">
                <div className="font-medium">Chyba:</div>
                <p className="text-sm mt-1">{result.error}</p>
              </AlertDescription>
            </>
          )}
        </Alert>
      )}
    </div>
  );
}
