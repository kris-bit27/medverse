import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Anthropic from 'npm:@anthropic-ai/sdk@0.34.0';

const CLAUDE_VERSION_TAG = "medverse_claude_sonnet_4_v1";

const MODEL_ID = 'claude-sonnet-4-20250514';
const DEFAULT_TEMP = 0.3;
const MAX_TOKENS = 4096;
const INPUT_COST_PER_1M = 3;
const OUTPUT_COST_PER_1M = 15;

const MODES = {
  topic_generate_fulltext_v2: {
    systemPrompt: `Jsi senior klinický lékař a akademický educator specializující se na {{specialty}}.

MANDATORNÍ PRAVIDLA:
1. POVINNĚ používej web search pro ověření všech číselných údajů, procent, dávkování
2. Cituj zdroje ve formátu (Autor et al., Rok) nebo (Guidelines XY, 2024)
3. Pokud si nejsi 100% jistý faktem, EXPLICITNĚ to označ jako "přibližně", "obvykle", "typicky"
4. Preferuj guidelines → systematic reviews → RCT → case series
5. NIKDY si nevymýšlej názvy studií nebo cifry

STRUKTURA VÝSTUPU:
Vrať JSON:
{
  "full_text": "# Téma\n\n## 1. Úvod a definice\n...",
  "confidence": 0.85,
  "sources": ["ESC Guidelines 2024", "NEJM 2023;389:123"],
  "warnings": ["Dávkování XY není v guidelines - based on expert opinion"]
}

OBSAH (Markdown):
## 1. Úvod a definice
## 2. Epidemiologie  
## 3. Patofyziologie
## 4. Klinika a diagnostika
## 5. Terapie
## 6. Prognóza a komplikace

ROZSAH: 3000-5000 slov
ÚROVEŇ: Rezident/specialista připravující se k atestaci
JAZYK: Čeština, odborný ale srozumitelný`,
    userPromptTemplate: `Vytvoř kompletní atestační text pro:

**Obor:** {{specialty}}
**Okruh:** {{okruh}}
**Téma:** {{title}}

PŘED PSANÍM:
1. Vyhledej aktuální guidelines pro {{specialty}} a {{title}}
2. Vyhledej systematic reviews z posledních 3 let
3. Ověř všechna specifická čísla (prevalence, mortalita, dávky)

ADAPTACE NA ČR/EU:
- Preferuj EMA/EU guidelines nad FDA kde relevantní
- Uveď rozdíly v dostupnosti léků (např. "V ČR registrováno jako...")
- Reálná klinická praxe v českých/evropských nemocnicích

OUTPUT: JSON podle struktury výše`,
    enableWebSearch: true
  },
  topic_generate_high_yield: {
    systemPrompt: `Jsi expert na vytváření high-yield learning materials.

PRAVIDLA:
- Maximálně 15 bodů
- Každý bod = actionable clinical pearl nebo red flag
- Formát: "🔴 KRITICKÉ: ..." nebo "⚡ HIGH-YIELD: ..." nebo "⚠️ POZOR: ..."
- ŽÁDNÉ opakování z fulltextu - pouze destilace nejdůležitějších bodů
- Preferuj: diferenciální diagnostika, management decision points, kdy zavolat specialistu

OUTPUT JSON:
{
  "high_yield": "markdown bullet list",
  "key_points": ["string array pro quick reference"]
}`,
    userPromptTemplate: `Z tohoto fulltextu extrahuj HIGH-YIELD body:

{{full_text}}

FOKUS NA:
- Red flags vyžadující okamžitou akci
- Klíčové diagnostické/terapeutické rozhodovací body
- Časté pitfalls
- "Pearls" které by student měl vědět nazpaměť`,
    enableWebSearch: false
  },
  topic_generate_deep_dive: {
    systemPrompt: `Jsi academic clinician a researcher specializující se na pokročilou medicínskou edukaci.

ZAMĚŘENÍ:
- Molekulární mechanismy a patofyziologie
- Aktuální výzkum a kontroverzní témata (POVINNÝ web search!)
- Klinické nuance a decision-making trade-offs
- Rozdíly mezi international guidelines
- Emerging therapies ve fázi II/III trials

ZAKÁZÁNO:
- Opakovat základní info z fulltextu
- Simplifikace - předpokládej expert audience
- Spekulace bez evidence

OUTPUT JSON:
{
  "deep_dive": "markdown content",
  "research_areas": ["topic 1", "topic 2"],
  "sources": ["PMID:12345", "ClinicalTrials.gov NCT123"]
}`,
    userPromptTemplate: `Vytvoř DEEP DIVE pro:

**Fulltext:** {{full_text}}
**Obor:** {{specialty}}

POVINNĚ VYHLEDEJ:
1. Nejnovější studie 2023-2025 k tématu
2. Ongoing clinical trials (ClinicalTrials.gov)
3. Kontroverzní aspekty v literatuře
4. Experimental/off-label terapie

STRUKTURA:
## Pokročilá patofyziologie
## Aktuální výzkum
## Kontroverzní témata
## Experimentální terapie
## Future directions

ROZSAH: 2000-3000 slov`,
    enableWebSearch: true
  },
  topic_summarize: {
    systemPrompt: 'Jsi odborný medicínský edukátor. Piš česky, extrakt pouze z textu.',
    userPromptTemplate: `SHRNUTÍ\nTASK:\nExtrahuj pouze klíčové body z plného textu.\n\nFULL TEXT:\n{{full_text}}\n\nOUTPUT:\nPouze odrážky v markdown.`,
    enableWebSearch: false
  },
  topic_reformat: {
    systemPrompt: 'Jsi editor studijního textu. Nepřidávej nové informace.',
    userPromptTemplate: `REFORMAT\nTASK:\nPřeformátuj text do přehledného markdownu. Neztrácej informace.\n\nTEXT:\n{{full_text}}\n\nOUTPUT:\nMarkdown.`,
    enableWebSearch: false
  }
};

function fillTemplate(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value || ''),
    template
  );
}

function calculateCost(usage: { input_tokens?: number; output_tokens?: number }) {
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const inputCost = (input / 1_000_000) * INPUT_COST_PER_1M;
  const outputCost = (output / 1_000_000) * OUTPUT_COST_PER_1M;
  return {
    input: Number(inputCost.toFixed(6)),
    output: Number(outputCost.toFixed(6)),
    total: Number((inputCost + outputCost).toFixed(6))
  };
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  let payload: any = null;

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    payload = await req.json();
    const {
      mode,
      entityContext = {},
      userPrompt
    } = payload || {};

    if (!mode || !MODES[mode]) {
      return Response.json({ error: 'Invalid mode', validModes: Object.keys(MODES) }, { status: 400 });
    }

    const modeConfig = MODES[mode];
    const templateVars = {
      specialty: entityContext?.specialty || '',
      okruh: entityContext?.okruh || '',
      tema: entityContext?.tema || '',
      title: entityContext?.title || entityContext?.topic?.title || '',
      full_text: entityContext?.full_text || entityContext?.full_text_content || ''
    };

    const finalUserPrompt = userPrompt && typeof userPrompt === 'string'
      ? userPrompt
      : fillTemplate(modeConfig.userPromptTemplate, templateVars);

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY') || ''
    });

    const tools = modeConfig.enableWebSearch
      ? [{ type: 'web_search_20250305' }]
      : [];

    const response = await anthropic.messages.create({
      model: MODEL_ID,
      temperature: DEFAULT_TEMP,
      max_tokens: MAX_TOKENS,
      system: modeConfig.systemPrompt,
      messages: [{ role: 'user', content: finalUserPrompt }],
      tools
    });

    const textBlocks = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('\n')
      .trim();

    const usage = response.usage || {};
    const cost = calculateCost(usage);

    return Response.json({
      text: textBlocks || undefined,
      full_text: mode === 'topic_generate_fulltext_v2' ? textBlocks || undefined : undefined,
      high_yield: mode === 'topic_generate_high_yield' || mode === 'topic_summarize' ? textBlocks || undefined : undefined,
      deep_dive: mode === 'topic_generate_deep_dive' ? textBlocks || undefined : undefined,
      confidence: 0.6,
      sources: response.content.filter((b) => b.type === 'tool_result').map(() => 'web_search'),
      warnings: [],
      metadata: {
        model: MODEL_ID,
        tokensUsed: usage,
        cost,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[CLAUDE-AI]', error);
    try {
      const base44 = createClientFromRequest(req);
      const fallback = await base44.functions.invoke('invokeEduLLM', payload);
      return Response.json(fallback?.data || fallback);
    } catch (fallbackError) {
      console.error('[CLAUDE-AI] fallback failed', fallbackError);
      return Response.json({
        error: error.message,
        aiVersion: CLAUDE_VERSION_TAG,
        confidence: 0,
        warnings: ['Claude generation failed and fallback failed'],
        metadata: {
          model: MODEL_ID,
          tokensUsed: {},
          cost: { input: 0, output: 0, total: 0 },
          generatedAt: new Date().toISOString()
        }
      }, { status: 500 });
    }
  } finally {
    const elapsed = Date.now() - startTime;
    if (elapsed > 20000) {
      console.log('[CLAUDE-AI] slow response', { ms: elapsed });
    }
  }
});
