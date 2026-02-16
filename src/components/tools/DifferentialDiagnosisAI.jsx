import React, { useState } from 'react';
import { callApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import SaveCaseDialog from './SaveCaseDialog';

export default function DifferentialDiagnosisAI() {
  const [symptoms, setSymptoms] = useState('');
  const [patientInfo, setPatientInfo] = useState({ age: '', sex: '', history: '', performed_tests: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const handleAnalyze = async () => {
    if (!symptoms.trim()) {
      toast.error('Zadejte prosím symptomy');
      return;
    }

    setLoading(true);
    try {
      const MAX_INPUT_CHARS = 2000;
      const safeSymptoms = symptoms.slice(0, MAX_INPUT_CHARS);
      const safeHistory = (patientInfo.history || '').slice(0, MAX_INPUT_CHARS);
      const safeTests = (patientInfo.performed_tests || '').slice(0, MAX_INPUT_CHARS);
      const response = await callApi('invokeLLM', {
        prompt: `Jsi zkušený klinický lékař. Na základě následujících informací vytvoř diferenciální diagnózu:

SYMPTOMY: ${safeSymptoms}

INFORMACE O PACIENTOVI:
- Věk: ${patientInfo.age || 'neuvedeno'}
- Pohlaví: ${patientInfo.sex || 'neuvedeno'}
- Anamnéza: ${safeHistory || 'neuvedeno'}
- Provedená vyšetření: ${safeTests || 'žádná'}

Poskytni:
1. Seznam nejpravděpodobnějších diagnóz seřazených podle pravděpodobnosti
2. Pro každou diagnózu uveď klíčové rozlišující příznaky
3. Doporučené vyšetřovací postupy pro potvrzení/vyloučení jednotlivých diagnóz
4. Důležitá upozornění (red flags)

Odpověď piš česky, strukturovaně a prakticky využitelně pro klinickou praxi.`,
        add_context_from_internet: false,
        model: 'gemini-1.5-pro',
        maxTokens: 1024,
        response_json_schema: {
          type: "object",
          properties: {
            differential_diagnoses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  diagnosis: { type: "string" },
                  probability: { type: "string" },
                  key_features: { type: "array", items: { type: "string" } },
                  distinguishing_factors: { type: "string" }
                }
              }
            },
            recommended_workup: { type: "string" },
            red_flags: { type: "array", items: { type: "string" } },
            summary: { type: "string" }
          }
        }
      });

      if (!response || !response.differential_diagnoses) {
        throw new Error('AI nevrátila validní výstup');
      }
      setResult(response);
    } catch (error) {
      toast.error('Chyba při analýze');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };



  return (
    <>
      <SaveCaseDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        caseType="ai_differential"
        initialQuery={symptoms}
        aiResponse={JSON.stringify(result)}
        defaultNotes={`**Informace o pacientovi:**\n- Věk: ${patientInfo.age || 'neuvedeno'}\n- Pohlaví: ${patientInfo.sex || 'neuvedeno'}\n- Anamnéza: ${patientInfo.history || 'neuvedeno'}\n- Provedená vyšetření: ${patientInfo.performed_tests || 'žádná'}`}
        defaultTags={['diferenciální diagnóza', 'AI asistent']}
      />

      <div className="space-y-6">
      {/* Disclaimer */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-900 dark:text-amber-100">
              <p className="font-semibold mb-1">Upozornění – Decision Support Tool</p>
              <p>
                Tento nástroj slouží pouze jako podpora klinického rozhodování a nenahrazuje lékařské vyšetření 
                ani individuální posouzení lékaře. Diferenciální diagnóza je informativní a vyžaduje potvrzení 
                pomocí klinického vyšetření a diagnostických testů.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informace o pacientovi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Věk"
              value={patientInfo.age}
              onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
            />
            <Input
              placeholder="Pohlaví"
              value={patientInfo.sex}
              onChange={(e) => setPatientInfo({ ...patientInfo, sex: e.target.value })}
            />
            <Input
              placeholder="Významná anamnéza"
              value={patientInfo.history}
              onChange={(e) => setPatientInfo({ ...patientInfo, history: e.target.value })}
            />
          </div>

          <Textarea
            placeholder="Provedená vyšetření a jejich výsledky (RTG, lab. testy, EKG, atd.)"
            value={patientInfo.performed_tests}
            onChange={(e) => setPatientInfo({ ...patientInfo, performed_tests: e.target.value })}
            rows={3}
          />

          <div>
            <label className="block text-sm font-medium mb-2 text-[hsl(var(--mn-muted))]">
              Symptomy a klinický nález
            </label>
            <Textarea
              placeholder="Popište symptomy pacienta, jejich trvání, intenzitu a další relevantní klinické nálezy..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={loading || !symptoms.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Analyzuji...
              </>
            ) : (
              'Vytvořit diferenciální diagnózu'
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Diferenciální diagnóza</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            {result.summary && (
              <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                <p className="text-sm text-teal-900 dark:text-teal-100">{result.summary}</p>
              </div>
            )}

            {/* Differential diagnoses */}
            {result.differential_diagnoses && result.differential_diagnoses.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[hsl(var(--mn-text))]">
                  Možné diagnózy
                </h3>
                <div className="space-y-4">
                  {result.differential_diagnoses.map((dx, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-[hsl(var(--mn-text))]">
                            {idx + 1}. {dx.diagnosis}
                          </h4>
                          <Badge variant="outline">{dx.probability}</Badge>
                        </div>
                        {dx.key_features && dx.key_features.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-[hsl(var(--mn-muted))] mb-2">
                              Klíčové příznaky:
                            </p>
                            <ul className="space-y-1">
                              {dx.key_features.map((feature, i) => (
                                <li key={i} className="text-sm text-[hsl(var(--mn-muted))] flex items-start gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {dx.distinguishing_factors && (
                          <p className="text-sm text-[hsl(var(--mn-muted))]">
                            <strong>Rozlišující faktory:</strong> {dx.distinguishing_factors}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended workup */}
            {result.recommended_workup && (
              <div>
                <h3 className="font-semibold text-lg mb-3 text-[hsl(var(--mn-text))]">
                  Doporučené vyšetření
                </h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{result.recommended_workup}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Red flags */}
            {result.red_flags && result.red_flags.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                      Varovné příznaky (Red Flags)
                    </h3>
                    <ul className="space-y-1">
                      {result.red_flags.map((flag, i) => (
                        <li key={i} className="text-sm text-red-800 dark:text-red-200">
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Save case */}
            <div className="pt-6 border-t border-[hsl(var(--mn-border))]">
              <Button
                onClick={() => setSaveDialogOpen(true)}
                variant="outline"
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Uložit případ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
