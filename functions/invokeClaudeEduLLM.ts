import { getUserFromRequest, handleCors, corsHeaders } from './_shared/supabaseAdmin.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.34.0';

const CLAUDE_VERSION_TAG = "medverse_claude_sonnet_4_v1";
const MODEL_ID = 'claude-sonnet-4-20250514';
const DEFAULT_TEMP = 0.3;
const MAX_TOKENS = 4096;
const INPUT_COST_PER_1M = 3;
const OUTPUT_COST_PER_1M = 15;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(userId);
  if (!bucket || now >= bucket.resetAt) {
    rateLimitBuckets.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

const MODE_MAPPING: Record<string, string> = {
  topic_generate_fulltext_v2: 'fulltext',
  topic_generate_high_yield: 'high_yield',
  topic_generate_deep_dive: 'deep_dive',
  fulltext: 'fulltext',
  high_yield: 'high_yield',
  deep_dive: 'deep_dive',
};

const MODES: Record<string, { systemPrompt: string; userPromptTemplate: string; enableWebSearch: boolean }> = {
  fulltext: {
    systemPrompt: `Jsi senior klinický lékař a akademický educator specializující se na {{specialty}}.

MANDATORNÍ PRAVIDLA:
1. POVINNĚ cituj zdroje ve formátu (Autor et al., Rok) nebo (Guidelines XY, 2024)
2. Pokud si nejsi 100% jistý, označ jako "přibližně", "obvykle", "typicky"
3. NIKDY si nevymýšlej názvy studií nebo cifry

STRUKTURA VÝSTUPU (JSON):
{ "full_text": "# Téma\\n\\n## 1. Úvod a definice\\n...", "confidence": 0.85, "sources": [], "warnings": [] }

ROZSAH: 3000-5000 slov | JAZYK: Čeština`,
    userPromptTemplate: `Vytvoř kompletní atestační text pro:\n**Obor:** {{specialty}}\n**Okruh:** {{okruh}}\n**Téma:** {{title}}\n\nOUTPUT: JSON`,
    enableWebSearch: true,
  },
  high_yield: {
    systemPrompt: `HIGH-YIELD expert. Max 15 bodů. Formát: 🔴 KRITICKÉ / ⚡ HIGH-YIELD / ⚠️ POZOR\nOUTPUT JSON: { "high_yield": "markdown", "key_points": [] }`,
    userPromptTemplate: `Extrahuj HIGH-YIELD z:\n{{full_text}}`,
    enableWebSearch: false,
  },
  deep_dive: {
    systemPrompt: `Academic clinician a researcher. Molekulární mechanismy, aktuální výzkum, kontroverzní témata.\nOUTPUT JSON: { "deep_dive": "markdown", "research_areas": [], "sources": [] }`,
    userPromptTemplate: `Deep dive pro:\n**Fulltext:** {{full_text}}\n**Obor:** {{specialty}}`,
    enableWebSearch: true,
  },
};

function fillTemplate(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((acc, [key, val]) => acc.replaceAll(`{{${key}}}`, val || ''), template);
}

function calculateCost(usage: { input_tokens?: number; output_tokens?: number }) {
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  return {
    input: Number(((input / 1_000_000) * INPUT_COST_PER_1M).toFixed(6)),
    output: Number(((output / 1_000_000) * OUTPUT_COST_PER_1M).toFixed(6)),
    total: Number(((input / 1_000_000) * INPUT_COST_PER_1M + (output / 1_000_000) * OUTPUT_COST_PER_1M).toFixed(6)),
  };
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const startTime = Date.now();

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
    }
    if (!['admin', 'editor'].includes(user.role || '')) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders() });
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY') || '';
    if (!apiKey) {
      return Response.json({ error: 'Anthropic API key missing' }, { status: 500, headers: corsHeaders() });
    }

    const payload = await req.json();
    const { mode, context = {}, entityContext = {}, userPrompt, maxTokens = MAX_TOKENS, userId } = payload || {};

    const internalMode = MODE_MAPPING[mode] || mode;
    if (!internalMode || !MODES[internalMode]) {
      return Response.json(
        { error: `Neznámý mód: ${mode}. Podporované: ${Object.keys(MODE_MAPPING).join(', ')}` },
        { status: 400, headers: corsHeaders() },
      );
    }

    const rate = checkRateLimit(userId || user.id);
    if (!rate.allowed) {
      return Response.json(
        { error: 'Rate limit exceeded', retryAfter: Math.ceil(rate.retryAfterMs / 1000) },
        { status: 429, headers: { ...corsHeaders(), 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
      );
    }

    const modeConfig = MODES[internalMode];
    const effectiveContext = {
      specialty: context?.specialty ?? entityContext?.specialty ?? '',
      okruh: context?.okruh ?? entityContext?.okruh ?? '',
      title: context?.title ?? entityContext?.title ?? entityContext?.topic?.title ?? '',
      full_text: context?.full_text ?? entityContext?.full_text ?? entityContext?.full_text_content ?? '',
    };

    const templateVars = {
      specialty: effectiveContext.specialty || 'Medicína',
      okruh: effectiveContext.okruh || '',
      title: effectiveContext.title || '',
      full_text: effectiveContext.full_text || '',
    };

    const finalSystemPrompt = fillTemplate(modeConfig.systemPrompt, { specialty: effectiveContext.specialty || 'Medicína' });
    const finalUserPrompt = (userPrompt && typeof userPrompt === 'string')
      ? userPrompt
      : fillTemplate(modeConfig.userPromptTemplate, templateVars);

    const anthropic = new Anthropic({ apiKey });
    const tools: any[] = modeConfig.enableWebSearch ? [{ type: 'web_search_20250305' as any }] : [];

    const response = await anthropic.messages.create({
      model: MODEL_ID,
      temperature: DEFAULT_TEMP,
      max_tokens: maxTokens,
      system: finalSystemPrompt,
      messages: [{ role: 'user', content: finalUserPrompt }],
      ...(tools.length > 0 ? { tools } : {}),
    });

    const textBlocks = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text || '')
      .join('\n')
      .trim();

    const usage = response.usage || {};
    const cost = calculateCost(usage as any);

    return Response.json(
      {
        text: textBlocks || undefined,
        full_text: internalMode === 'fulltext' ? textBlocks : undefined,
        high_yield: internalMode === 'high_yield' ? textBlocks : undefined,
        deep_dive: internalMode === 'deep_dive' ? textBlocks : undefined,
        confidence: 0.6,
        sources: [],
        warnings: [],
        metadata: { model: MODEL_ID, tokensUsed: usage, cost, generatedAt: new Date().toISOString() },
      },
      { headers: corsHeaders() },
    );
  } catch (error: any) {
    console.error('[CLAUDE-AI]', error);
    return Response.json(
      {
        error: error.message,
        aiVersion: CLAUDE_VERSION_TAG,
        confidence: 0,
        warnings: ['Claude generation failed'],
        metadata: { model: MODEL_ID, tokensUsed: {}, cost: { input: 0, output: 0, total: 0 }, generatedAt: new Date().toISOString() },
      },
      { status: 500, headers: corsHeaders() },
    );
  } finally {
    const elapsed = Date.now() - startTime;
    if (elapsed > 20000) console.log('[CLAUDE-AI] slow response', { ms: elapsed });
  }
});
