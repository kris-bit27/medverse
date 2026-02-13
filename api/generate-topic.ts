/**
 * generate-topic.ts — Multi-model content generation pipeline
 * 
 * Model strategy:
 *   fulltext, deep_dive → Claude Opus 4.5 ($5/$25) — highest medical accuracy
 *   high_yield          → Claude Sonnet 4 ($3/$15) — extracts from existing fulltext
 *   flashcards          → Claude Haiku 4.5 ($1/$5) — simple Q&A generation
 *   mcq                 → Claude Sonnet 4 ($3/$15) — needs clinical reasoning for distractors
 *   review              → GPT-4o ($2.50/$10) — independent cross-model review
 */
import Anthropic from '@anthropic-ai/sdk';
import { getCached, setCache } from './cache.js';
import { supabaseAdmin } from './_supabaseAdmin.js';
import { z } from 'zod';

// ─── Model Configuration ────────────────────────────────────────
const MODELS = {
  opus:   { id: 'claude-opus-4-20250514',   provider: 'anthropic', inputPer1M: 5,    outputPer1M: 25   },
  sonnet: { id: 'claude-sonnet-4-20250514',  provider: 'anthropic', inputPer1M: 3,    outputPer1M: 15   },
  haiku:  { id: 'claude-haiku-4-5-20251001', provider: 'anthropic', inputPer1M: 1,    outputPer1M: 5    },
  gpt4o:  { id: 'gpt-4o',                    provider: 'openai',    inputPer1M: 2.50, outputPer1M: 10   },
} as const;

type ModelKey = keyof typeof MODELS;

const MODE_MODEL_MAP: Record<string, ModelKey> = {
  fulltext:   'opus',
  deep_dive:  'opus',
  high_yield: 'sonnet',
  flashcards: 'haiku',
  mcq:        'sonnet',
  review:     'gpt4o',
};

const MODE_MAX_TOKENS: Record<string, number> = {
  fulltext:   8192,
  deep_dive:  8192,
  high_yield: 2048,
  flashcards: 2048,
  mcq:        2048,
  review:     4096,
};

// ─── Input Validation ───────────────────────────────────────────
const InputSchema = z.object({
  mode: z.enum([
    'fulltext', 'deep_dive', 'high_yield', 'flashcards', 'mcq', 'review',
    // Legacy aliases
    'topic_generate_fulltext_v2', 'topic_generate_high_yield', 'topic_generate_deep_dive'
  ]),
  context: z.object({
    specialty: z.string().max(100).optional(),
    okruh:     z.string().max(200).optional(),
    title:     z.string().min(1).max(300),
    full_text: z.string().max(80000).optional(),
    description: z.string().max(1000).optional(),
  }),
  model_override: z.enum(['opus', 'sonnet', 'haiku', 'gpt4o']).optional(),
});

// ─── Normalize legacy mode names ────────────────────────────────
function normalizeMode(mode: string): string {
  const map: Record<string, string> = {
    'topic_generate_fulltext_v2': 'fulltext',
    'topic_generate_high_yield':  'high_yield',
    'topic_generate_deep_dive':   'deep_dive',
  };
  return map[mode] || mode;
}

// ─── System Prompts ─────────────────────────────────────────────
function getSystemPrompt(mode: string, ctx: any): string {
  const spec = ctx.specialty || 'medicínu';

  switch (mode) {
    case 'fulltext':
      return `Jsi senior klinický lékař a akademický educator specializující se na ${spec}.

PRAVIDLA:
- Cituj zdroje: (Autor et al., Rok) nebo (Guidelines XY, 2024)
- Pokud si nejsi jistý faktem, označ jako "přibližně" nebo "typicky"
- Preferuj European/Czech guidelines (ESC, ČLS JEP) nad americkými kde relevantní
- NIKDY si nevymýšlej názvy studií nebo cifry

VÝSTUPNÍ FORMÁT — vrať POUZE validní JSON:
{
  "full_text": "# Téma\\n\\n## 1. Úvod a definice\\n...celý markdown text...",
  "confidence": 0.85,
  "sources": ["ESC Guidelines 2024", "Harrison's Principles 21st ed."],
  "warnings": ["Dávkování XY vyžaduje ověření"]
}

STRUKTURA MARKDOWN (všech 7 sekcí POVINNĚ):
## 1. Úvod a definice
## 2. Epidemiologie
## 3. Etiopatogeneze
## 4. Klinický obraz a diagnostika
## 5. Terapie
## 6. Prognóza a komplikace
## 7. Klinické perly (pearl points)

ROZSAH: 3000-5000 slov. JAZYK: Čeština, odborný ale srozumitelný.
ÚROVEŇ: Rezident/specialista připravující se k atestaci.`;

    case 'deep_dive':
      return `Jsi výzkumník a klinický specialista na ${spec}.

Vytvoř DEEP DIVE obsah s pokročilými znalostmi:
- Molekulární mechanismy a patofyziologie na úrovni receptorů
- Aktuální kontroverze a nedořešené otázky
- Nové výzkumné směry a experimentální terapie
- Porovnání evropských vs amerických guidelines
- Kazuistické příklady pro obtížné diferenciální diagnózy

VÝSTUPNÍ FORMÁT — vrať POUZE validní JSON:
{
  "deep_dive": "# Deep Dive: Téma\\n\\n## Pokročilá patofyziologie\\n...",
  "confidence": 0.80,
  "sources": [],
  "warnings": [],
  "research_areas": ["oblast 1", "oblast 2"]
}

ROZSAH: 3000-5000 slov. JAZYK: Čeština.`;

    case 'high_yield':
      return `Jsi medicínský educator. Extrahuj HIGH-YIELD shrnutí z poskytnutého fulltextu.

PRAVIDLA:
- Max 15 klíčových bodů
- Používej formátování: 🔴 KRITICKÉ / ⚡ HIGH-YIELD / 💊 TERAPIE / ⚠️ CAVE
- Každý bod max 2 věty
- Zaměř se na to co padá u zkoušek a atestací

VÝSTUPNÍ FORMÁT — vrať POUZE validní JSON:
{
  "high_yield": "# High-Yield: Téma\\n\\n🔴 **KRITICKÉ:** ...\\n⚡ **KEY FACT:** ...\\n...",
  "key_points": ["bod 1", "bod 2"],
  "confidence": 0.90
}`;

    case 'flashcards':
      return `Generuj flashcards (kartičky) z medicínského textu.

PRAVIDLA:
- Generuj 10 kartiček z poskytnutého obsahu
- Mix typů: definice, mechanismus, diagnostika, terapie, diferenciální diagnóza
- Otázky stručné a jasné, odpovědi max 3 věty
- Obtížnost 1-3 (1=základní, 2=pokročilý, 3=atestační)

VÝSTUPNÍ FORMÁT — vrať POUZE validní JSON:
{
  "flashcards": [
    {"question": "...", "answer": "...", "difficulty": 2, "tags": ["diagnostika"]},
    ...
  ],
  "confidence": 0.85
}`;

    case 'mcq':
      return `Generuj MCQ (multiple-choice questions) z medicínského textu.

PRAVIDLA:
- Generuj 5 otázek s 4-5 možnostmi (A-E)
- Jedna správná odpověď, ostatní jsou plausible distraktory
- Ke každé otázce vysvětlení proč je správná a proč ostatní ne
- Mix obtížností

VÝSTUPNÍ FORMÁT — vrať POUZE validní JSON:
{
  "questions": [
    {
      "question_text": "...",
      "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
      "correct_answer": "B",
      "explanation": "...",
      "difficulty": 2,
      "tags": ["diagnostika"]
    }
  ],
  "confidence": 0.85
}`;

    case 'review':
      return `You are an independent medical content reviewer. You are reviewing AI-generated educational content.

Analyze the provided content for:
1. SAFETY: incorrect dosages, dangerous advice, missing contraindications (score 0-100)
2. COMPLETENESS: missing standard sections for the topic (score 0-100)
3. ACCURACY: factual errors, outdated guidelines, unsupported claims (score 0-100)
4. EDUCATIONAL VALUE: clarity, structure, appropriate depth (score 0-100)

Return ONLY valid JSON:
{
  "approved": boolean,
  "confidence": number (0-1),
  "safety_score": number,
  "completeness_score": number,
  "accuracy_score": number,
  "educational_score": number,
  "overall_score": number,
  "issues": [{"severity": "high|medium|low", "category": "dosage|safety|accuracy|completeness|formatting", "description": "...", "suggestion": "..."}],
  "strengths": ["..."],
  "missing_sections": ["..."]
}

approved=true ONLY if safety_score >= 80 AND no high-severity issues.
Language: Czech for descriptions, but JSON keys in English.`;

    default:
      return `Jsi medicínský AI asistent. Odpovídej česky, strukturovaně.`;
  }
}

function getUserPrompt(mode: string, ctx: any): string {
  switch (mode) {
    case 'fulltext':
      return `Vytvoř kompletní atestační fulltext pro:
**Obor:** ${ctx.specialty || 'Medicína'}
**Okruh:** ${ctx.okruh || ''}
**Téma:** ${ctx.title}
${ctx.description ? `**Popis:** ${ctx.description}` : ''}

Adaptuj na ČR/EU kontext. Preferuj EMA/ESC guidelines.`;

    case 'deep_dive':
      return `Vytvoř Deep Dive pro:
**Téma:** ${ctx.title}
**Obor:** ${ctx.specialty || ''}
${ctx.full_text ? `\n**Referenční fulltext (zkrácený):**\n${ctx.full_text.substring(0, 3000)}...` : ''}`;

    case 'high_yield':
      if (!ctx.full_text) return `Vytvoř high-yield shrnutí pro: ${ctx.title}`;
      return `Extrahuj HIGH-YIELD body z tohoto fulltextu:

**Téma:** ${ctx.title}

**FULLTEXT:**
${ctx.full_text.substring(0, 15000)}`;

    case 'flashcards':
      return `Vygeneruj 10 flashcards z:
**Téma:** ${ctx.title}
${ctx.full_text ? `\n**OBSAH:**\n${ctx.full_text.substring(0, 10000)}` : ''}`;

    case 'mcq':
      return `Vygeneruj 5 MCQ otázek z:
**Téma:** ${ctx.title}
${ctx.full_text ? `\n**OBSAH:**\n${ctx.full_text.substring(0, 10000)}` : ''}`;

    case 'review':
      return `Review this medical educational content:
**Topic:** ${ctx.title}
**Specialty:** ${ctx.specialty || 'General'}

**CONTENT TO REVIEW:**
${ctx.full_text || 'No content provided'}`;

    default:
      return ctx.title;
  }
}

// ─── API Clients ────────────────────────────────────────────────
function getAnthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!key) throw new Error('Missing ANTHROPIC_API_KEY');
  return new Anthropic({ apiKey: key });
}

async function callAnthropic(modelKey: ModelKey, system: string, user: string, maxTokens: number) {
  const model = MODELS[modelKey];
  const client = getAnthropicClient();
  
  const response = await client.messages.create({
    model: model.id,
    max_tokens: maxTokens,
    temperature: 0.3,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const text = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  const usage = response.usage || { input_tokens: 0, output_tokens: 0 };
  const cost = {
    input:  (usage.input_tokens  / 1_000_000) * model.inputPer1M,
    output: (usage.output_tokens / 1_000_000) * model.outputPer1M,
    total:  0,
  };
  cost.total = cost.input + cost.output;

  return { text, usage, cost, provider: 'anthropic', modelId: model.id };
}

async function callOpenAI(system: string, user: string, maxTokens: number) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Missing OPENAI_API_KEY — needed for cross-model review');

  const model = MODELS.gpt4o;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };
  
  const cost = {
    input:  (usage.prompt_tokens     / 1_000_000) * model.inputPer1M,
    output: (usage.completion_tokens  / 1_000_000) * model.outputPer1M,
    total:  0,
  };
  cost.total = cost.input + cost.output;

  return { 
    text, 
    usage: { input_tokens: usage.prompt_tokens, output_tokens: usage.completion_tokens },
    cost, 
    provider: 'openai', 
    modelId: model.id 
  };
}

// ─── JSON Parser ────────────────────────────────────────────────
function tryParseJson(raw: string): any {
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  // Try extracting JSON block
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return JSON.parse(cleaned.slice(first, last + 1)); } catch {}
  }
  return null;
}

function normalizeNewlines(val?: string | null): string | undefined {
  if (!val || typeof val !== 'string') return undefined;
  return val.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
}

// ─── Track AI Usage ─────────────────────────────────────────────
async function trackUsage(userId: string | null, model: string, tokens: number, cost: number, mode: string) {
  try {
    if (!userId) return;
    await supabaseAdmin.from('user_ai_usage').insert({
      user_id: userId,
      model,
      tokens_used: tokens,
      cost,
      mode: `topic_generate_${mode}`,
    });
  } catch (e) {
    console.error('[Usage tracking error]', e);
  }
}

// ─── CORS ───────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://medverse-gilt.vercel.app',
  'https://medverse.com',
  'https://www.medverse.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

// ─── Main Handler ───────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  // CORS
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const startTime = Date.now();

  try {
    // Validate
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    }

    const mode = normalizeMode(parsed.data.mode);
    const ctx = parsed.data.context;
    const modelOverride = parsed.data.model_override;

    // Resolve model
    const modelKey: ModelKey = modelOverride || MODE_MODEL_MAP[mode] || 'sonnet';
    const modelCfg = MODELS[modelKey];

    console.log(`[generate-topic] mode=${mode} model=${modelKey} (${modelCfg.id}) title="${ctx.title}"`);

    // Check cache
    const cacheContext = { ...ctx, _model: modelKey };
    const cached = await getCached(mode, cacheContext);
    if (cached) {
      console.log('[generate-topic] Cache HIT');
      return res.status(200).json({ ...cached.response, _cache: cached.metadata });
    }

    // Build prompts
    const systemPrompt = getSystemPrompt(mode, ctx);
    const userPrompt = getUserPrompt(mode, ctx);
    const maxTokens = MODE_MAX_TOKENS[mode] || 4096;

    // Call appropriate provider
    let result;
    if (modelCfg.provider === 'openai') {
      result = await callOpenAI(systemPrompt, userPrompt, maxTokens);
    } else {
      result = await callAnthropic(modelKey, systemPrompt, userPrompt, maxTokens);
    }

    // Parse response
    let output = tryParseJson(result.text);
    if (!output) {
      output = { text: result.text };
    }

    // Normalize markdown newlines
    for (const key of ['full_text', 'high_yield', 'deep_dive']) {
      if (output[key]) output[key] = normalizeNewlines(output[key]);
    }

    // Attach metadata
    output.sources = output.sources || [];
    output.warnings = output.warnings || [];
    output.metadata = {
      provider: result.provider,
      model: result.modelId,
      modelKey,
      tokensUsed: result.usage,
      cost: {
        input:  result.cost.input.toFixed(4),
        output: result.cost.output.toFixed(4),
        total:  result.cost.total.toFixed(4),
      },
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };

    // Track usage
    const authHeader = req.headers.authorization;
    let userId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { data } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = data?.user?.id || null;
      } catch {}
    }
    
    const totalTokens = (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0);
    await trackUsage(userId, result.modelId, totalTokens, result.cost.total, mode);

    // Cache
    await setCache(mode, cacheContext, output);

    console.log(`[generate-topic] ✅ ${mode} done in ${Date.now() - startTime}ms, cost=$${result.cost.total.toFixed(4)}`);

    return res.status(200).json(output);

  } catch (error: any) {
    const errorId = Math.random().toString(36).substring(7);
    console.error(`[generate-topic ERROR ${errorId}]`, error.message, error.stack?.substring(0, 300));

    return res.status(500).json({
      error: 'Generation failed',
      errorId,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Please try again or contact support.',
    });
  }
}
