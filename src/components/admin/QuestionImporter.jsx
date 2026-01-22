import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Loader2, CheckCircle, AlertCircle, FileJson, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

export default function QuestionImporter({ okruhy, topics, disciplines, onComplete }) {
  const [importMode, setImportMode] = useState('json');
  const [inputData, setInputData] = useState('');
  const [selectedOkruh, setSelectedOkruh] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState(null);

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

      await base44.entities.Question.bulkCreate(questionsWithIds);

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
          <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-x-auto">
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
        disabled={isImporting || !selectedOkruh || !selectedTopic}
        className="w-full"
      >
        {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Importovat otázky
      </Button>
    </div>
  );
}