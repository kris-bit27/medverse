import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Stethoscope,
  GraduationCap,
  BookOpen,
  ArrowRight,
  ChevronRight,
  Play,
  Eye,
  EyeOff
} from 'lucide-react';
import DifficultyIndicator from '@/components/ui/DifficultyIndicator';

// Sample demo data
const demoQuestions = [
  {
    id: 'demo-1',
    title: 'Rekonstrukční žebřík - základní principy',
    difficulty: 2,
    question_text: 'Popište koncept rekonstrukčního žebříku a jeho základní stupně. Kdy preferujeme jednotlivé úrovně?',
    answer_structured: {
      definice: 'Rekonstrukční žebřík (Reconstructive Ladder) je koncept hierarchického přístupu k uzávěru ran, od nejjednodušších po nejsložitější techniky.',
      diagnostika: 'Volba metody závisí na: velikosti defektu, lokalizaci, dostupnosti tkání, celkovém stavu pacienta, požadované funkci a estetice.',
      lecba: '**Stupně žebříku (od nejjednoduššího):**\n1. Sekundární hojení\n2. Primární sutura\n3. Kožní štěp (parciální/plný)\n4. Lokální lalok\n5. Regionální lalok\n6. Vzdálený lalok\n7. Volný lalok',
      komplikace: 'Základní komplikace zahrnují dehiscenci rány, infekci, nekrózu laloku a selhání štěpu.',
      pearls: '💡 Moderní přístup preferuje "rekonstrukční výtah" - volba optimální metody přímo, ne nutně postupně.'
    }
  },
  {
    id: 'demo-2',
    title: 'DIEP lalok - anatomie a indikace',
    difficulty: 4,
    question_text: 'Jaké jsou hlavní anatomické principy DIEP laloku? Uveďte indikace a kontraindikace.',
    answer_structured: {
      definice: 'DIEP (Deep Inferior Epigastric Perforator) lalok je volný perforátorový lalok využívající kůži a podkoží břicha zásobený perforátory z a. epigastrica inferior profunda.',
      diagnostika: 'Předoperační vyšetření: CT angiografie břicha pro mapování perforátorů, hodnocení kvality tkání, anamnéza předchozích operací břicha.',
      lecba: '**Indikace:**\n- Rekonstrukce prsu po mastektomii\n- Autologní rekonstrukce u pacientek s dostatkem břišní tkáně\n\n**Kontraindikace:**\n- Předchozí abdominoplastika\n- Významné jizvy v oblasti laloku\n- Kuřáctví (relativní)\n- BMI > 35 (relativní)',
      komplikace: 'Částečná nekróza laloku, žilní kongesce, hernie/vyklenutí břišní stěny, serom.',
      pearls: '💡 Vždy zachovat alespoň jeden Hesselbach perforátor pro optimální perfuzi.'
    }
  }
];

const demoArticle = {
  title: 'Základy hojení ran',
  summary: 'Přehled fází hojení ran a faktorů ovlivňujících tento proces',
  read_time: 8,
  content: `
## Fáze hojení ran

Hojení ran probíhá ve čtyřech překrývajících se fázích:

### 1. Hemostáza (minuty)
- Vazokonstrikce
- Agregace trombocytů
- Aktivace koagulační kaskády

### 2. Zánětlivá fáze (1-3 dny)
- Migrace neutrofilů a makrofágů
- Odstraňování nekrotické tkáně
- Uvolňování růstových faktorů

### 3. Proliferační fáze (3-21 dní)
- Angiogeneze
- Tvorba granulační tkáně
- Epitelizace

### 4. Remodelační fáze (týdny-roky)
- Zrání kolagenu
- Kontrakce jizvy
- Finální pevnost 80% původní tkáně
  `
};

const demoAlgorithm = {
  title: 'Volba krytí defektu',
  description: 'Rozhodovací algoritmus pro volbu optimálního krytí kožního defektu',
  nodes: [
    { id: '1', type: 'start', title: 'Hodnocení defektu', text: 'Zhodnoťte velikost, hloubku a lokalizaci' },
    { id: '2', type: 'decision', title: 'Je možná primární sutura?', text: 'Bez napětí, dobré prokrvení' },
    { id: '3', type: 'step', title: 'Primární sutura', text: 'Jednoduchý uzávěr' },
    { id: '4', type: 'decision', title: 'Je dostupná lokální tkáň?', text: 'Dostatečná laxita okolí' },
    { id: '5', type: 'step', title: 'Lokální lalok', text: 'Rotační, posuvný, transpozicní' },
    { id: '6', type: 'decision', title: 'Je defekt povrchový?', text: 'Zachované spodní vrstvy' },
    { id: '7', type: 'step', title: 'Kožní štěp', text: 'Parciální nebo plný' },
    { id: '8', type: 'end', title: 'Vzdálený/volný lalok', text: 'Mikrochirurgická rekonstrukce' }
  ],
  edges: [
    { from: '1', to: '2', label: '' },
    { from: '2', to: '3', label: 'Ano' },
    { from: '2', to: '4', label: 'Ne' },
    { from: '4', to: '5', label: 'Ano' },
    { from: '4', to: '6', label: 'Ne' },
    { from: '6', to: '7', label: 'Ano' },
    { from: '6', to: '8', label: 'Ne' }
  ]
};

export default function Demo() {
  const [selectedQuestion, setSelectedQuestion] = useState(demoQuestions[0]);
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Landing')} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900 dark:text-white">MedVerse</span>
            </Link>

            <div className="flex items-center gap-3">
              <Button 
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                onClick={() => { window.location.href = `/login?redirectTo=${encodeURIComponent(createPageUrl('Dashboard'))}`; }}
              >
                Začít zdarma
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-24 pb-8 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
            <Play className="w-4 h-4" />
            Demo obsah
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Vyzkoušejte MedVerse
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Ukázka obsahu a funkcí platformy
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="questions" className="space-y-6">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
              <TabsTrigger value="questions" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Otázky
              </TabsTrigger>
              <TabsTrigger value="articles" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Články
              </TabsTrigger>
              <TabsTrigger value="algorithms" className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                Algoritmy
              </TabsTrigger>
            </TabsList>

            {/* Questions Tab */}
            <TabsContent value="questions">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Question list */}
                <div className="space-y-3">
                  {demoQuestions.map((q) => (
                    <Card 
                      key={q.id}
                      className={`cursor-pointer transition-all ${
                        selectedQuestion.id === q.id 
                          ? 'ring-2 ring-teal-500 dark:ring-teal-400' 
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => { setSelectedQuestion(q); setShowAnswer(false); }}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-medium text-slate-900 dark:text-white mb-2">
                          {q.title}
                        </h3>
                        <DifficultyIndicator level={q.difficulty} />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Question detail */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="secondary" className="mb-2">Demo otázka</Badge>
                          <CardTitle className="text-xl">{selectedQuestion.title}</CardTitle>
                        </div>
                        <DifficultyIndicator level={selectedQuestion.difficulty} showLabel={false} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-slate-700 dark:text-slate-300">
                          {selectedQuestion.question_text}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setShowAnswer(!showAnswer)}
                        className="w-full"
                      >
                        {showAnswer ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                        {showAnswer ? 'Skrýt odpověď' : 'Zobrazit odpověď'}
                      </Button>

                      {showAnswer && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          {Object.entries(selectedQuestion.answer_structured).map(([key, value]) => (
                            <div key={key} className="p-4 border rounded-lg dark:border-slate-700">
                              <h4 className="font-semibold text-slate-900 dark:text-white capitalize mb-2">
                                {key === 'pearls' ? '💡 Klinické perly' : key}
                              </h4>
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{value}</ReactMarkdown>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Articles Tab */}
            <TabsContent value="articles">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Demo článek</Badge>
                    <Badge variant="outline">{demoArticle.read_time} min čtení</Badge>
                  </div>
                  <CardTitle className="text-2xl">{demoArticle.title}</CardTitle>
                  <p className="text-slate-600 dark:text-slate-400">{demoArticle.summary}</p>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown>{demoArticle.content}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Algorithms Tab */}
            <TabsContent value="algorithms">
              <Card>
                <CardHeader>
                  <Badge variant="secondary" className="w-fit mb-2">Demo algoritmus</Badge>
                  <CardTitle className="text-2xl">{demoAlgorithm.title}</CardTitle>
                  <p className="text-slate-600 dark:text-slate-400">{demoAlgorithm.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {demoAlgorithm.nodes.map((node, i) => {
                      const nodeEdges = demoAlgorithm.edges.filter(e => e.from === node.id);
                      return (
                        <div key={node.id} className="relative">
                          <div className={`p-4 rounded-lg border-2 ${
                            node.type === 'start' ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-300 dark:border-teal-700' :
                            node.type === 'decision' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 rounded-xl' :
                            node.type === 'end' ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600' :
                            'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                          }`}>
                            <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                              {node.title}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {node.text}
                            </p>
                          </div>
                          {nodeEdges.length > 0 && (
                            <div className="flex justify-center gap-8 py-2">
                              {nodeEdges.map((edge, j) => (
                                <div key={j} className="flex flex-col items-center text-sm text-slate-500">
                                  <ChevronRight className="w-4 h-4 rotate-90" />
                                  {edge.label && <span className="text-xs font-medium">{edge.label}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* CTA */}
          <Card className="mt-12 p-8 bg-gradient-to-br from-teal-600 to-cyan-700 border-0 text-center text-white">
            <h2 className="text-2xl font-bold mb-4">
              Líbí se vám ukázka?
            </h2>
            <p className="text-teal-100 mb-6 max-w-lg mx-auto">
              Zaregistrujte se zdarma a získejte přístup k úplnému obsahu
            </p>
            <Button 
              size="lg"
              className="bg-white text-teal-700 hover:bg-teal-50"
              onClick={() => { window.location.href = `/login?redirectTo=${encodeURIComponent(createPageUrl('Dashboard'))}`; }}
            >
              Začít zdarma
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
}
