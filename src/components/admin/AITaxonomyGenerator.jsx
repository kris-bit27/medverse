import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
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

  const handleGenerate = async () => {
    if (!selectedDiscipline) {
      toast.error('Vyberte klinický obor');
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const discipline = disciplines.find(d => d.id === selectedDiscipline);
      
      // Build prompt for AI
      const prompt = `Jsi expert na medicínské vzdělávání a vytváříš strukturovanou taxonomii pro atestační zkoušky v oboru ${discipline.name}.

${sourceUrl ? `Použij informace z tohoto zdroje: ${sourceUrl}` : 'Použij oficiální požadavky MZČR pro atestační zkoušky.'}

Vytvoř komplexní strukturu pro tento obor:

1. **Okruhy** (3-6 hlavních tematických celků) - např. "Základní diagnostika", "Terapeutické postupy", "Urgentní stavy"
2. **Témata** (pro každý okruh 5-10 konkrétních témat)
3. **Otázky** (pro každé téma 3-5 atestačních otázek s odpověďmi)

DŮLEŽITÉ:
- Otázky musí být v souladu s požadavky MZČR pro atestace
- Odpovědi musí být strukturované (Definice, Diagnostika, Léčba, Komplikace)
- Obtížnost 1-5 (1=základní, 5=pokročilé)
- Vše v češtině

Vrať JSON ve formátu:
{
  "okruhy": [
    {
      "title": "název okruhu",
      "description": "popis okruhu",
      "order": 1,
      "topics": [
        {
          "title": "název tématu",
          "order": 1,
          "learning_objectives": ["cíl 1", "cíl 2"],
          "questions": [
            {
              "title": "stručný název otázky",
              "question_text": "Podrobný text otázky",
              "answer_rich": "Detailní odpověď v markdown",
              "answer_structured": {
                "definice": "...",
                "diagnostika": "...",
                "lecba": "...",
                "komplikace": "...",
                "pearls": "..."
              },
              "difficulty": 3,
              "visibility": "members_only"
            }
          ]
        }
      ]
    }
  ]
}`;

      // Generate structure using InvokeLLM (fallback if OpenAI fails)
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
                order: { type: "number" },
                topics: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      order: { type: "number" },
                      learning_objectives: {
                        type: "array",
                        items: { type: "string" }
                      },
                      questions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            question_text: { type: "string" },
                            answer_rich: { type: "string" },
                            answer_structured: {
                              type: "object",
                              properties: {
                                definice: { type: "string" },
                                diagnostika: { type: "string" },
                                lecba: { type: "string" },
                                komplikace: { type: "string" },
                                pearls: { type: "string" }
                              }
                            },
                            difficulty: { type: "number" },
                            visibility: { type: "string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: !!sourceUrl,
        response_json_schema: jsonSchema
      });

      console.log('AI Response:', response);
      
      // Extract data from response (InvokeLLM returns data directly)
      const generatedData = response;
      
      if (!generatedData || !generatedData.okruhy) {
        throw new Error('AI neposkytla validní data. Zkuste to znovu.');
      }
      
      // Create all entities
      let createdOkruhy = 0;
      let createdTopics = 0;
      let createdQuestions = 0;

      for (const okruhData of generatedData.okruhy) {
        // Create Okruh
        const okruh = await base44.entities.Okruh.create({
          title: okruhData.title,
          description: okruhData.description,
          order: okruhData.order,
          clinical_discipline_id: selectedDiscipline
        });
        createdOkruhy++;

        for (const topicData of okruhData.topics) {
          // Create Topic
          const topic = await base44.entities.Topic.create({
            title: topicData.title,
            okruh_id: okruh.id,
            order: topicData.order,
            learning_objectives: topicData.learning_objectives,
            is_published: false,
            is_reviewed: false
          });
          createdTopics++;

          // Create Questions
          const questionsToCreate = topicData.questions.map(q => ({
            title: q.title,
            question_text: q.question_text,
            answer_rich: q.answer_rich,
            answer_structured: q.answer_structured,
            difficulty: q.difficulty,
            visibility: q.visibility || 'members_only',
            okruh_id: okruh.id,
            topic_id: topic.id
          }));

          if (questionsToCreate.length > 0) {
            await base44.entities.Question.bulkCreate(questionsToCreate);
            createdQuestions += questionsToCreate.length;
          }
        }
      }

      setResult({
        success: true,
        okruhy: createdOkruhy,
        topics: createdTopics,
        questions: createdQuestions
      });

      toast.success(`Vytvořeno: ${createdOkruhy} okruhů, ${createdTopics} témat, ${createdQuestions} otázek`);
      
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
          AI vygeneruje komplexní strukturu okruhů, témat a otázek na základě oficiálních požadavků MZČR.
          Proces může trvat 1-2 minuty.
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
              Generujem strukturu...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Vygenerovat okruhy, témata a otázky
            </>
          )}
        </Button>
      </div>

      {result && (
        <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {result.success ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <div className="font-medium mb-2">Úspěšně vygenerováno:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{result.okruhy} okruhů</li>
                  <li>{result.topics} témat</li>
                  <li>{result.questions} otázek</li>
                </ul>
              </AlertDescription>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-900">
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