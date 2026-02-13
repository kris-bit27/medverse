import React, { useState } from 'react';
import { callApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Pill, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import SaveCaseDialog from './SaveCaseDialog';

export default function TreatmentPlannerAI() {
  const [diagnosis, setDiagnosis] = useState('');
  const [patientInfo, setPatientInfo] = useState({ 
    age: '', 
    sex: '', 
    comorbidities: '',
    allergies: '',
    current_medications: '',
    performed_tests: ''
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const handleGeneratePlan = async () => {
    if (!diagnosis.trim()) {
      toast.error('Zadejte prosím diagnózu');
      return;
    }

    setLoading(true);
    try {
      const MAX_INPUT_CHARS = 2000;
      const safeDiagnosis = diagnosis.slice(0, MAX_INPUT_CHARS);
      const safeComorbidities = (patientInfo.comorbidities || '').slice(0, MAX_INPUT_CHARS);
      const safeAllergies = (patientInfo.allergies || '').slice(0, MAX_INPUT_CHARS);
      const safeMeds = (patientInfo.current_medications || '').slice(0, MAX_INPUT_CHARS);
      const safeTests = (patientInfo.performed_tests || '').slice(0, MAX_INPUT_CHARS);
      const response = await callApi('invokeLLM', {
        prompt: `Jsi zkušený klinický lékař. Vytvoř léčebný plán na základě následujících informací:

DIAGNÓZA: ${safeDiagnosis}

INFORMACE O PACIENTOVI:
- Věk: ${patientInfo.age || 'neuvedeno'}
- Pohlaví: ${patientInfo.sex || 'neuvedeno'}
- Komorbidity: ${safeComorbidities || 'žádné'}
- Alergie: ${safeAllergies || 'žádné'}
- Současná medikace: ${safeMeds || 'žádná'}
- Provedená vyšetření: ${safeTests || 'žádná'}

Vytvoř komplexní léčebný plán dle současných klinických doporučení, který zahrnuje:
1. Farmakologickou léčbu (konkrétní léky, dávkování, délka léčby)
2. Nefarmakologická opatření a režimová doporučení
3. Monitoring a kontroly
4. Kritéria pro úpravu léčby
5. Kontraindikace a upozornění specifická pro daného pacienta
6. Prognózu a očekávané výsledky

Odpověď piš česky, strukturovaně a s ohledem na individuální parametry pacienta.`,
        add_context_from_internet: true,
        model: 'gemini-1.5-pro',
        maxTokens: 2048,
        response_json_schema: {
          type: "object",
          properties: {
            pharmacological_treatment: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  drug: { type: "string" },
                  dosage: { type: "string" },
                  duration: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            },
            non_pharmacological: { type: "string" },
            monitoring: { type: "string" },
            adjustment_criteria: { type: "string" },
            contraindications: { type: "array", items: { type: "string" } },
            prognosis: { type: "string" }
          }
        }
      });

      if (!response || !response.pharmacological_treatment) {
        throw new Error('AI nevrátila validní výstup');
      }
      setResult(response);
    } catch (error) {
      toast.error('Chyba při generování plánu');
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
        caseType="ai_treatment"
        initialQuery={diagnosis}
        aiResponse={JSON.stringify(result)}
        defaultNotes={`**Informace o pacientovi:**\n- Věk: ${patientInfo.age || 'neuvedeno'}\n- Pohlaví: ${patientInfo.sex || 'neuvedeno'}\n- Komorbidity: ${patientInfo.comorbidities || 'žádné'}\n- Alergie: ${patientInfo.allergies || 'žádné'}\n- Současná medikace: ${patientInfo.current_medications || 'žádná'}\n- Provedená vyšetření: ${patientInfo.performed_tests || 'žádná'}`}
        defaultTags={['léčebný plán', 'AI asistent']}
      />

      <div className="space-y-6">
      {/* Disclaimer */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-900 dark:text-amber-100">
              <p className="font-semibold mb-1">Upozornění – Decision Support Tool</p>
              <p>
                Tento nástroj slouží pouze jako podpora klinického rozhodování a nenahrazuje oficiální klinická doporučení 
                ani individuální posouzení lékaře. Vždy konzultujte aktuální guidelines a přizpůsobte léčbu specifickým 
                potřebám pacienta. Nástroj neposkytuje lékařskou radu a není určen pro přímé využití v klinické praxi bez 
                ověření odborným lékařem.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informace pro léčebný plán</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
              Diagnóza
            </label>
            <Input
              placeholder="Např. Hypertenze (ESH/ESC stupeň 2)"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <Textarea
            placeholder="Komorbidity (např. diabetes mellitus 2. typu, ICHS)"
            value={patientInfo.comorbidities}
            onChange={(e) => setPatientInfo({ ...patientInfo, comorbidities: e.target.value })}
            rows={2}
          />

          <Textarea
            placeholder="Alergie"
            value={patientInfo.allergies}
            onChange={(e) => setPatientInfo({ ...patientInfo, allergies: e.target.value })}
            rows={2}
          />

          <Textarea
            placeholder="Současná medikace"
            value={patientInfo.current_medications}
            onChange={(e) => setPatientInfo({ ...patientInfo, current_medications: e.target.value })}
            rows={2}
          />

          <Textarea
            placeholder="Provedená vyšetření a jejich výsledky"
            value={patientInfo.performed_tests}
            onChange={(e) => setPatientInfo({ ...patientInfo, performed_tests: e.target.value })}
            rows={2}
          />

          <Button
            onClick={handleGeneratePlan}
            disabled={loading || !diagnosis.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Generuji plán...
              </>
            ) : (
              'Vytvořit léčebný plán'
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Léčebný plán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pharmacological treatment */}
            {result.pharmacological_treatment && result.pharmacological_treatment.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Pill className="w-5 h-5 text-teal-600" />
                  Farmakologická léčba
                </h3>
                <div className="space-y-3">
                  {result.pharmacological_treatment.map((med, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-slate-900 dark:text-white">{med.drug}</h4>
                          <Badge>{med.dosage}</Badge>
                        </div>
                        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                          <p><strong>Délka léčby:</strong> {med.duration}</p>
                          <p><strong>Odůvodnění:</strong> {med.rationale}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Non-pharmacological */}
            {result.non_pharmacological && (
              <div>
                <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white">
                  Nefarmakologická opatření
                </h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{result.non_pharmacological}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Monitoring */}
            {result.monitoring && (
              <div>
                <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white">
                  Monitoring a kontroly
                </h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{result.monitoring}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Adjustment criteria */}
            {result.adjustment_criteria && (
              <div>
                <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white">
                  Kritéria pro úpravu léčby
                </h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{result.adjustment_criteria}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Contraindications */}
            {result.contraindications && result.contraindications.length > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      Upozornění a kontraindikace
                    </h3>
                    <ul className="space-y-1">
                      {result.contraindications.map((item, i) => (
                        <li key={i} className="text-sm text-amber-800 dark:text-amber-200">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Prognosis */}
            {result.prognosis && (
              <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                <h3 className="font-semibold text-teal-900 dark:text-teal-100 mb-2">
                  Prognóza
                </h3>
                <p className="text-sm text-teal-800 dark:text-teal-200">{result.prognosis}</p>
              </div>
            )}

            {/* Save case */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
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
