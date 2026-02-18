import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const supabaseAdmin = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const extractText = (response: any) => {
  if (!response?.content) return '';
  return response.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('');
};

const tryParseJson = (text: string) => {
  if (!text) return null;
  const clean = text.replace(/```json\n?|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    return null;
  }
};

export default async function handler(req: any, res: any) {
  const ALLOWED_ORIGINS = ['https://medverse-gilt.vercel.app', 'https://medverse.cz', 'https://www.medverse.cz', 'http://localhost:3000', 'http://localhost:5173'];
  const origin = req.headers?.origin;
  if (ALLOWED_ORIGINS.includes(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Access-Control-Allow-Credentials', 'true'); }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, model, temperature, maxTokens, response_json_schema } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // Authenticate user from JWT — never trust user_id from request body
    const { getOptionalUserId } = await import('./_auth.js');
    const userId = await getOptionalUserId(req);

    // Token check (only for authenticated users)
    if (userId) {
      try {
        const { checkTokens, deductTokens } = await import('./_token-utils');
        const check = await checkTokens(supabaseAdmin, userId, 'copilot_question');
        if (!check.allowed) {
          return res.status(402).json({
            error: `Nedostatek AI kreditů. Potřeba: ${check.cost}, zbývá: ${check.remaining}`,
            tokens_remaining: check.remaining,
          });
        }
        await deductTokens(supabaseAdmin, userId, 'copilot_question', `LLM: ${prompt.substring(0, 40)}`);
      } catch (tokenErr: any) {
        console.warn('[invokeLLM] token deduction failed:', tokenErr.message);
      }
    }

    const schemaHint = response_json_schema
      ? `\n\nReturn ONLY valid JSON that matches this schema:\n${JSON.stringify(response_json_schema)}`
      : '';

    const response = await anthropic.messages.create({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: typeof maxTokens === 'number' ? maxTokens : 2048,
      temperature: typeof temperature === 'number' ? temperature : 0.2,
      messages: [{
        role: 'user',
        content: `${prompt}${schemaHint}`
      }]
    });

    const text = extractText(response);
    const parsed = tryParseJson(text);

    if (parsed) {
      return res.status(200).json(parsed);
    }

    return res.status(200).json({ text });
  } catch (error: any) {
    console.error('[invokeLLM] error:', error);
    return res.status(500).json({ error: error.message || 'LLM call failed' });
  }
}
