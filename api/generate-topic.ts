/**
 * generate-topic.ts — Multi-model content generation pipeline with prompt caching
 * 
 * Prompt caching architecture (Anthropic):
 *   Layer 1: BASE_SYSTEM (~800 tokens) — static, cached across ALL requests
 *   Layer 2: SPECIALTY_CONTEXT (~300 tokens) — cached per obor
 *   Layer 3: MODE_INSTRUCTIONS (~400 tokens) — cached per mode+obor combo
 *   → After first request per specialty+mode: ~90% cache hit, costs drop to 10%
 */
import Anthropic from '@anthropic-ai/sdk';
import { getCached, setCache } from './_cache.js';
import { supabaseAdmin } from './_supabaseAdmin.js';
import { z } from 'zod';
import {
  BASE_SYSTEM, SPECIALTY_CONTEXTS, DEFAULT_SPECIALTY_CONTEXT, MODE_INSTRUCTIONS
} from './prompts.js';

// ─── Model Configuration ────────────────────────────────────────
const MODELS = {
  opus:   { id: 'claude-opus-4-20250514',   provider: 'anthropic', inputPer1M: 5,    outputPer1M: 25   },
  sonnet: { id: 'claude-sonnet-4-20250514',  provider: 'anthropic', inputPer1M: 3,    outputPer1M: 15   },
  haiku:  { id: 'claude-haiku-4-5-20251001', provider: 'anthropic', inputPer1M: 1,    outputPer1M: 5    },
  gpt4o:  { id: 'gpt-4o',                    provider: 'openai',    inputPer1M: 2.50, outputPer1M: 10   },
} as const;

type ModelKey = keyof typeof MODELS;

const MODE_MODEL_MAP: Record<string, ModelKey> = {
  fulltext: 'sonnet', deep_dive: 'sonnet', high_yield: 'sonnet',
  flashcards: 'haiku', mcq: 'sonnet', review: 'gpt4o',
};

const MODE_MAX_TOKENS: Record<string, number> = {
  fulltext: 12000, deep_dive: 10000, high_yield: 2048,
  flashcards: 2048, mcq: 2048, review: 4096,
};

// ─── Input Validation ───────────────────────────────────────────
const InputSchema = z.object({
  mode: z.enum([
    'fulltext', 'deep_dive', 'high_yield', 'flashcards', 'mcq', 'review',
    'topic_generate_fulltext_v2', 'topic_generate_high_yield', 'topic_generate_deep_dive'
  ]),
  context: z.object({
    specialty: z.string().max(100).optional(),
    okruh: z.string().max(200).optional(),
    title: z.string().min(1).max(300),
    full_text: z.string().max(80000).optional(),
    description: z.string().max(1000).optional(),
  }),
  model_override: z.enum(['opus', 'sonnet', 'haiku', 'gpt4o']).optional(),
});

function normalizeMode(mode: string): string {
  const map: Record<string, string> = {
    'topic_generate_fulltext_v2': 'fulltext',
    'topic_generate_high_yield': 'high_yield',
    'topic_generate_deep_dive': 'deep_dive',
  };
  return map[mode] || mode;
}

// ─── Prompt Caching: Layered System Blocks ──────────────────────
function buildSystemBlocks(mode: string, ctx: any) {
  const specialty = ctx.specialty || '';
  const specialtyCtx = SPECIALTY_CONTEXTS[specialty] || DEFAULT_SPECIALTY_CONTEXT;
  const modeInstr = MODE_INSTRUCTIONS[mode] || '';

  const blocks: any[] = [
    { type: 'text', text: BASE_SYSTEM },
    { type: 'text', text: specialtyCtx, cache_control: { type: 'ephemeral' } },
  ];

  if (modeInstr) {
    blocks.push({ type: 'text', text: modeInstr, cache_control: { type: 'ephemeral' } });
  }

  return blocks;
}

function getFlatSystemPrompt(mode: string, ctx: any): string {
  const specialty = ctx.specialty || '';
  const specialtyCtx = SPECIALTY_CONTEXTS[specialty] || DEFAULT_SPECIALTY_CONTEXT;
  const modeInstr = MODE_INSTRUCTIONS[mode] || '';
  return [BASE_SYSTEM, specialtyCtx, modeInstr].filter(Boolean).join('\n\n');
}

// ─── User Prompts (variable, never cached) ──────────────────────
function getUserPrompt(mode: string, ctx: any): string {
  switch (mode) {
    case 'fulltext':
      return `Vytvoř kompletní atestační fulltext pro:\n\n**Obor:** ${ctx.specialty || 'Medicína'}\n**Okruh:** ${ctx.okruh || ''}\n**Téma:** ${ctx.title}\n${ctx.description ? `**Popis:** ${ctx.description}\n` : ''}\nPOKYNY:\n- Adaptuj na ČR/EU kontext, preferuj české a evropské guidelines\n- Uveď ICD-10 kódy kde relevantní\n- Cituj reálné zdroje\n- Vrať kompletní JSON: { full_text, learning_objectives, sources, warnings, confidence }`;

    case 'deep_dive':
      return `Vytvoř Deep Dive pro:\n\n**Obor:** ${ctx.specialty || ''}\n**Téma:** ${ctx.title}\n${ctx.full_text ? `\n**Referenční fulltext (pro kontext):**\n${ctx.full_text.substring(0, 4000)}...\n\nNavazuj na fulltext, přidej POKROČILÉ informace nad jeho rámec.` : ''}\n\nVrať JSON: { deep_dive, research_areas, sources, warnings, confidence }`;

    case 'high_yield':
      if (!ctx.full_text) return `Vytvoř high-yield shrnutí pro: ${ctx.title}\nVrať JSON: { high_yield, key_points }`;
      return `Extrahuj HIGH-YIELD body z následujícího fulltextu.\nEXTRAHUJ pouze z textu, NEPŘIDÁVEJ informace mimo text.\n\n**Téma:** ${ctx.title}\n\n**FULLTEXT:**\n${ctx.full_text.substring(0, 20000)}\n\nVrať JSON: { high_yield (markdown s ikonami), key_points (array) }`;

    case 'flashcards':
      return `Vygeneruj 10 flashcards:\n\n**Obor:** ${ctx.specialty || ''} | **Téma:** ${ctx.title}\n${ctx.full_text ? `\n**ZDROJOVÝ OBSAH:**\n${ctx.full_text.substring(0, 12000)}` : ''}\n\nKartičky testující POCHOPENÍ, ne memorování.\nVrať JSON: { flashcards: [{question, answer, difficulty, tags, category}] }`;

    case 'mcq':
      return `Vygeneruj 5 MCQ atestačních otázek:\n\n**Obor:** ${ctx.specialty || ''} | **Téma:** ${ctx.title}\n${ctx.full_text ? `\n**ZDROJOVÝ OBSAH:**\n${ctx.full_text.substring(0, 12000)}` : ''}\n\nKlinický vignette styl.\nVrať JSON: { questions: [{question_text, options, correct_answer, explanation, difficulty, tags}] }`;

    case 'review':
      return `Review this medical educational content:\n\n**Topic:** ${ctx.title}\n**Specialty:** ${ctx.specialty || 'General'}\n**Target:** Czech physicians preparing for board certification\n\n**CONTENT TO REVIEW:**\n${ctx.full_text || 'No content provided'}`;

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

async function callAnthropic(modelKey: ModelKey, mode: string, ctx: any, userPrompt: string, maxTokens: number) {
  const model = MODELS[modelKey];
  const client = getAnthropicClient();
  const systemBlocks = buildSystemBlocks(mode, ctx);

  // Enable web search for fulltext and deep_dive to verify facts and guidelines
  const useWebSearch = mode === 'fulltext' || mode === 'deep_dive';

  const requestParams: any = {
    model: model.id,
    max_tokens: maxTokens,
    temperature: 0.3,
    system: systemBlocks,
    messages: [{ role: 'user', content: userPrompt }],
  };

  if (useWebSearch) {
    requestParams.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  }

  const response = await client.messages.create(requestParams);

  const text = response.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  const usage: any = response.usage || {};
  const cacheRead = usage.cache_read_input_tokens || 0;
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  const uncachedInput = (usage.input_tokens || 0) - cacheRead;

  const cost = {
    input: (uncachedInput / 1_000_000) * model.inputPer1M,
    cacheRead: (cacheRead / 1_000_000) * model.inputPer1M * 0.1,
    cacheWrite: (cacheWrite / 1_000_000) * model.inputPer1M * 1.25,
    output: ((usage.output_tokens || 0) / 1_000_000) * model.outputPer1M,
    total: 0,
  };
  cost.total = cost.input + cost.cacheRead + cost.cacheWrite + cost.output;

  console.log(`[anthropic] ${modelKey} in=${usage.input_tokens} out=${usage.output_tokens} cacheR=${cacheRead} cacheW=${cacheWrite} cost=$${cost.total.toFixed(4)}`);

  return { text, usage: { input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0, cache_read: cacheRead, cache_write: cacheWrite }, cost, provider: 'anthropic', modelId: model.id };
}

async function callOpenAI(mode: string, ctx: any, userPrompt: string, maxTokens: number) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Missing OPENAI_API_KEY');
  const model = MODELS.gpt4o;
  const systemPrompt = getFlatSystemPrompt(mode, ctx);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: model.id, max_tokens: maxTokens, temperature: 0.3,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) { const err = await response.text(); throw new Error(`OpenAI error (${response.status}): ${err.substring(0, 200)}`); }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };
  const cost = {
    input: (usage.prompt_tokens / 1_000_000) * model.inputPer1M,
    output: (usage.completion_tokens / 1_000_000) * model.outputPer1M,
    total: 0,
  };
  cost.total = cost.input + cost.output;

  return { text, usage: { input_tokens: usage.prompt_tokens, output_tokens: usage.completion_tokens }, cost, provider: 'openai', modelId: model.id };
}

// ─── Helpers ────────────────────────────────────────────────────
function tryParseJson(raw: string): any {
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last > first) { try { return JSON.parse(cleaned.slice(first, last + 1)); } catch {} }
  return null;
}

function normalizeNewlines(val?: string | null): string | undefined {
  if (!val || typeof val !== 'string') return undefined;
  return val.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
}

async function trackUsage(userId: string | null, model: string, tokens: number, cost: number, mode: string) {
  try { if (!userId) return; await supabaseAdmin.from('user_ai_usage').insert({ user_id: userId, model, tokens_used: tokens, cost, mode: `topic_generate_${mode}` }); } catch (e) { console.error('[Usage tracking]', e); }
}

const ALLOWED_ORIGINS = ['https://medverse-gilt.vercel.app', 'https://medverse.cz', 'https://www.medverse.cz', 'http://localhost:3000', 'http://localhost:5173'];

// ─── Main Handler ───────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Access-Control-Allow-Credentials', 'true'); }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const startTime = Date.now();

  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });

    const mode = normalizeMode(parsed.data.mode);
    const ctx = parsed.data.context;
    const modelKey: ModelKey = parsed.data.model_override || MODE_MODEL_MAP[mode] || 'sonnet';
    const modelCfg = MODELS[modelKey];

    console.log(`[generate-topic] mode=${mode} model=${modelKey} (${modelCfg.id}) title="${ctx.title}"`);

    // Check response cache
    const cacheContext = { ...ctx, _model: modelKey };
    const cached = await getCached(mode, cacheContext);
    if (cached) { console.log('[generate-topic] Cache HIT'); return res.status(200).json({ ...cached.response, _cache: cached.metadata }); }

    const userPrompt = getUserPrompt(mode, ctx);
    const maxTokens = MODE_MAX_TOKENS[mode] || 4096;

    // Call provider
    let result;
    if (modelCfg.provider === 'openai') {
      result = await callOpenAI(mode, ctx, userPrompt, maxTokens);
    } else {
      result = await callAnthropic(modelKey, mode, ctx, userPrompt, maxTokens);
    }

    // Parse
    let output = tryParseJson(result.text);
    if (!output) output = { text: result.text };

    for (const key of ['full_text', 'high_yield', 'deep_dive']) {
      if (output[key]) output[key] = normalizeNewlines(output[key]);
    }

    output.sources = output.sources || [];
    output.warnings = output.warnings || [];
    output.metadata = {
      provider: result.provider, model: result.modelId, modelKey,
      tokensUsed: result.usage,
      cost: { input: (result.cost.input || 0).toFixed(4), output: (result.cost.output || 0).toFixed(4), cacheRead: ((result.cost as any).cacheRead || 0).toFixed(4), cacheWrite: ((result.cost as any).cacheWrite || 0).toFixed(4), total: result.cost.total.toFixed(4) },
      generatedAt: new Date().toISOString(), durationMs: Date.now() - startTime,
    };

    // Track
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) { try { const { data } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', '')); userId = data?.user?.id || null; } catch {} }
    await trackUsage(userId, result.modelId, (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0), result.cost.total, mode);

    // Log to api_call_log for centralized cost tracking
    try {
      await supabaseAdmin.from('api_call_log').insert({
        source: 'vercel-api',
        model: result.modelId,
        mode,
        topic_title: ctx.title,
        input_tokens: result.usage.input_tokens || 0,
        output_tokens: result.usage.output_tokens || 0,
        cache_read_tokens: result.usage.cache_read || 0,
        cache_write_tokens: result.usage.cache_write || 0,
        cost_usd: result.cost.total,
        success: true,
        elapsed_ms: Date.now() - startTime,
        usage_type: 'message'
      });
    } catch (e) { console.error('[api_call_log]', e); }

    await setCache(mode, cacheContext, output);

    console.log(`[generate-topic] ✅ ${mode} done in ${Date.now() - startTime}ms cost=$${result.cost.total.toFixed(4)}`);
    return res.status(200).json(output);

  } catch (error: any) {
    const errorId = Math.random().toString(36).substring(7);
    console.error(`[generate-topic ERROR ${errorId}]`, error.message, error.stack?.substring(0, 300));
    // Log failed call
    try {
      const mode = req.body?.mode ? normalizeMode(req.body.mode) : 'unknown';
      const modelKey = req.body?.model_override || MODE_MODEL_MAP[mode] || 'sonnet';
      await supabaseAdmin.from('api_call_log').insert({
        source: 'vercel-api', model: MODELS[modelKey as ModelKey]?.id || 'unknown', mode,
        topic_title: req.body?.context?.title,
        input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0,
        cost_usd: 0, success: false,
        error_message: error.message?.substring(0, 500),
        elapsed_ms: Date.now() - startTime, usage_type: 'message'
      });
    } catch {}
    return res.status(500).json({ error: 'Generation failed', errorId, message: process.env.NODE_ENV === 'development' ? error.message : 'Please try again.' });
  }
}
