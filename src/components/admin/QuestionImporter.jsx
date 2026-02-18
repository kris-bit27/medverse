import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Loader2, CheckCircle, AlertCircle, FileJson, FileSpreadsheet, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function QuestionImporter({ okruhy, topics, disciplines, onComplete }) {
  const [importMode, setImportMode] = useState('json');
  const [inputData, setInputData] = useState('');
  const [selectedOkruh, setSelectedOkruh] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredOkruhy = selectedDiscipline 
    ? okruhy.filter(o => o.clinical_discipline_id === selectedDiscipline)
    : okruhy;

  const filteredTopics = selectedOkruh
    ? topics.filter(t => t.okruh_id === selectedOkruh)
    : topics;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setInputData(event.target.result);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csv) => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    return lines.slice(1).map(line => {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = values[i]?.replace(/^"|"$/g, '') || '';
      });
      return obj;
    });
  };

  const handleAIGenerate = async () => {
    if (!selectedOkruh || !selectedTopic) {
      toast.error('Vyberte okruh a téma');
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const topic = topics.find(t => t.id === selectedTopic);
      const okruh = okruhy.find(o => o.id === selectedOkruh);
      const discipline = disciplines.find(d => d.id === selectedDiscipline);

      const prompt = `Vygeneruj ${aiQuestionCount} medicínských otázek pro atestaci.

Klinický obor: ${discipline?.name || 'Neznámý'}
Okruh: ${okruh?.title || 'Neznámý'}
Téma: ${topic?.title || 'Neznámé'}

Pro každou otázku vytvořit:
- title: Stručný název otázky (max 100 znaků)
- question_text: Plné znění otázky
- answer_rich: Podrobnou odpověď ve formátu markdown, strukturovanou do sekcí: **Definice**, **Diagnostika**, **Léčba**, **Komplikace**, **Pearls** (důležité body)
- difficulty: Obtížnost 1-5 (3 = střední)

Otázky musí být relevantní pro české lékařské atestace a odpovídat běžným požadavkům atestační komise.`;

      const response = await callApi('invokeLLM', {
        prompt,
        model: 'gemini-1.5-pro',
        maxTokens: 4096,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  question_text: { type: "string" },
                  answer_rich: { type: "string" },
                  difficulty: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (!response?.questions || !Array.isArray(response.questions)) {
        throw new Error('AI nevrátila žádné otázky');
      }

      const generatedQuestions = response.questions.map(q => ({
        ...q,
        okruh_id: selectedOkruh,
        topic_id: selectedTopic,
        visibility: 'public'
      }));

      await supabase.from('questions').insert(generatedQuestions).select().then(r => r.data);

      setResult({
        success: true,
        count: generatedQuestions.length
      });
      
      toast.success(`AI vygenerovalo ${generatedQuestions.length} otázek`);
      
      setTimeout(() => {
        onComplete?.();
      }, 1500);

    } catch (error) {
      console.error('AI generation error:', error);
      setResult({
        success: false,
        error: error.message
      });
      toast.error('Chyba při AI generování');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImport = async () => {
    if (!inputData.trim()) {
      toast.error('Vložte data pro import');
      return;
    }

    if (!selectedOkruh || !selectedTopic) {
      toast.error('Vyberte okruh a téma');
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      let questions = [];
      
      if (importMode === 'json') {
        questions = JSON.parse(inputData);
        if (!Array.isArray(questions)) {
          questions = [questions];
        }
      } else {
        questions = parseCSV(inputData);
      }

      const questionsWithIds = questions.map(q => ({
        ...q,
        okruh_id: selectedOkruh,
        topic_id: selectedTopic,
        difficulty: q.difficulty ? parseInt(q.difficulty) : 3,
        visibility: q.visibility || 'public'
      }));

      await supabase.from('questions').insert(questionsWithIds).select().then(r => r.data);

      setResult({
        success: true,
        count: questionsWithIds.length
      });
      
      toast.success(`Úspěšně importováno ${questionsWithIds.length} otázek`);
      
      setTimeout(() => {
        onComplete?.();
      }, 1500);

    } catch (error) {
      console.error('Import error:', error);
      setResult({
        success: false,
        error: error.message
      });
      toast.error('Chyba při importu');
    } finally {
      setIsImporting(false);
    }
  };

  const jsonExample = `[
  {
    "title": "Název otázky",
    "question_text": "Text otázky",
    "answer_rich": "# Odpověď\\n\\nMarkdown text odpovědi",
    "difficulty": 3,
    "visibility": "public"
  }
]`;

  const csvExample = `title,question_text,answer_rich,difficulty,visibility
"Název otázky","Text otázky","Markdown odpověď",3,public`;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={importMode === 'json' ? 'default' : 'outline'}
          onClick={() => setImportMode('json')}
          className="flex-1"
        >
          <FileJson className="w-4 h-4 mr-2" />
          JSON
        </Button>
        <Button
          variant={importMode === 'csv' ? 'default' : 'outline'}
          onClick={() => setImportMode('csv')}
          className="flex-1"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          CSV
        </Button>
        <Button
          variant={importMode === 'ai' ? 'default' : 'outline'}
          onClick={() => setImportMode('ai')}
          className="flex-1"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          AI Generátor
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Klinický obor</Label>
          <Select value={selectedDiscipline} onValueChange={(v) => {
            setSelectedDiscipline(v);
            setSelectedOkruh('');
            setSelectedTopic('');
          }}>
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
          <Label>Okruh</Label>
          <Select value={selectedOkruh} onValueChange={(v) => {
            setSelectedOkruh(v);
            setSelectedTopic('');
          }} disabled={!selectedDiscipline}>
            <SelectTrigger>
              <SelectValue placeholder="Vyberte okruh" />
            </SelectTrigger>
            <SelectContent>
              {filteredOkruhy.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Téma</Label>
          <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedOkruh}>
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

      {importMode === 'ai' ? (
        <>
          <div className="space-y-2">
            <Label>Počet otázek k vygenerování</Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={aiQuestionCount}
              onChange={(e) => setAiQuestionCount(parseInt(e.target.value) || 5)}
              placeholder="5"
            />
          </div>

          <Alert className="bg-[hsl(var(--mn-accent)/0.08)] border-[hsl(var(--mn-accent)/0.2)] dark:border-[hsl(var(--mn-accent)/0.3)]">
            <Sparkles className="h-4 w-4 text-[hsl(var(--mn-accent))] dark:text-[hsl(var(--mn-accent))]" />
            <AlertDescription className="text-sm text-[hsl(var(--mn-accent))] dark:text-[hsl(var(--mn-accent))]">
              AI vygeneruje medicínské otázky s podrobnými odpověďmi na základě vybraného tématu, okruhu a klinického oboru.
            </AlertDescription>
          </Alert>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {result.success
                  ? `Úspěšně vygenerováno ${result.count} otázek`
                  : `Chyba: ${result.error}`}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleAIGenerate}
            disabled={isGenerating || !selectedOkruh || !selectedTopic || !selectedDiscipline}
            className="w-full"
          >
            {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Sparkles className="w-4 h-4 mr-2" />
            Vygenerovat otázky pomocí AI
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Nahrát soubor</Label>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept={importMode === 'json' ? '.json' : '.csv'}
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <Button asChild variant="outline" className="w-full">
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Vybrat {importMode === 'json' ? 'JSON' : 'CSV'} soubor
            </label>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Nebo vložte data</Label>
        <Textarea
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder={importMode === 'json' ? jsonExample : csvExample}
          className="font-mono text-xs h-48"
        />
      </div>

      <Alert>
        <AlertDescription className="text-xs">
          <strong>Příklad {importMode === 'json' ? 'JSON' : 'CSV'}:</strong>
          <pre className="mt-2 p-2 bg-[hsl(var(--mn-surface-2))] rounded text-xs overflow-x-auto">
            {importMode === 'json' ? jsonExample : csvExample}
          </pre>
        </AlertDescription>
      </Alert>

      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          {result.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {result.success
              ? `Úspěšně importováno ${result.count} otázek`
              : `Chyba: ${result.error}`}
          </AlertDescription>
        </Alert>
      )}

          <Button
            onClick={handleImport}
            disabled={isImporting || !selectedOkruh || !selectedTopic || !selectedDiscipline}
            className="w-full"
          >
            {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Importovat otázky
          </Button>
        </>
      )}
    </div>
  );
}
