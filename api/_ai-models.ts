/**
 * Multi-model AI utility for MedVerse
 * 
 * Models:
 *   gemini-flash  → Gemini 2.5 Flash (analytics, reports, cheap ops)
 *   gpt-4o        → GPT-4o (content review, cross-model validation)
 *   claude-sonnet → Claude Sonnet 4 (content, copilot, MedSearch)
 *   claude-opus   → Claude Opus (admin content generation)
 * 
 * All use raw REST APIs — no SDK dependencies for Gemini/OpenAI.
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const OPENAI_BASE = 'https://api.openai.com/v1';

export interface AIResponse {
  text: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

// Cost per 1M tokens (input/output)
const PRICING: Record<string, [number, number]> = {
  'gemini-2.5-flash': [0.15, 0.60],
  'gpt-4o': [2.50, 10.00],
  'claude-sonnet-4-20250514': [3.00, 15.00],
  'claude-opus-4-20250514': [15.00, 75.00],
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const [inPrice, outPrice] = PRICING[model] || [0, 0];
  return (inputTokens * inPrice / 1_000_000) + (outputTokens * outPrice / 1_000_000);
}

/**
 * Call Gemini Flash via REST API
 */
export async function callGemini(
  prompt: string,
  options: { system?: string; maxTokens?: number; temperature?: number; model?: string } = {}
): Promise<AIResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const model = options.model || 'gemini-2.5-flash';
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`;

  const contents: any[] = [];
  
  // Gemini uses systemInstruction for system prompts
  const body: any = {
    contents: [
      { role: 'user', parts: [{ text: prompt }] }
    ],
    generationConfig: {
      maxOutputTokens: options.maxTokens || 2048,
      temperature: options.temperature ?? 0.3,
    },
  };

  if (options.system) {
    body.systemInstruction = {
      parts: [{ text: options.system }]
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
  const usage = data.usageMetadata || {};
  const inputTokens = usage.promptTokenCount || 0;
  const outputTokens = usage.candidatesTokenCount || 0;

  return {
    text,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: estimateCost(model, inputTokens, outputTokens),
  };
}

/**
 * Call GPT-4o via OpenAI REST API
 */
export async function callGPT(
  prompt: string,
  options: { system?: string; maxTokens?: number; temperature?: number; model?: string } = {}
): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const model = options.model || 'gpt-4o';
  const messages: any[] = [];

  if (options.system) {
    messages.push({ role: 'system', content: options.system });
  }
  messages.push({ role: 'user', content: prompt });

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature ?? 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const usage = data.usage || {};
  const inputTokens = usage.prompt_tokens || 0;
  const outputTokens = usage.completion_tokens || 0;

  return {
    text,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: estimateCost(model, inputTokens, outputTokens),
  };
}

/**
 * Call Claude (Sonnet or Opus) via Anthropic API
 */
export async function callClaude(
  prompt: string,
  options: { system?: string; maxTokens?: number; temperature?: number; model?: string } = {}
): Promise<AIResponse> {
  // Uses the existing Anthropic SDK already in the project
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const model = options.model || 'claude-sonnet-4-20250514';

  const response = await anthropic.messages.create({
    model,
    max_tokens: options.maxTokens || 2048,
    temperature: options.temperature ?? 0.3,
    ...(options.system ? { system: options.system } : {}),
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  const inputTokens = response.usage?.input_tokens || 0;
  const outputTokens = response.usage?.output_tokens || 0;

  return {
    text,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: estimateCost(model, inputTokens, outputTokens),
  };
}
