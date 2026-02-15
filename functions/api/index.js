import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GEMINI_MODELS = {
  high_yield: process.env.GEMINI_HIGH_YIELD_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash'
};

const getGeminiApiKey = () =>
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY ||
  '';

// Cache utilities
function generateCacheKey(mode, context) {
  const modelHint =
    mode === 'topic_generate_high_yield'
      ? `google:${GEMINI_MODELS.high_yield}`
      : 'anthropic:claude-sonnet-4';
  const normalized = JSON.stringify({ mode, modelHint, context });
  return createHash('sha256').update(normalized).digest('hex');
}

async function getCached(mode, context) {
  try {
    const cacheKey = generateCacheKey(mode, context);
    const { data, error } = await supabase
      .from('ai_generation_cache')
      .select('*')
      .eq('prompt_hash', cacheKey)
      .single();
    
    if (error || !data) return null;
    
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      await supabase.from('ai_generation_cache').delete().eq('id', data.id);
      return null;
    }
    
    await supabase
      .from('ai_generation_cache')
      .update({ hits: data.hits + 1, last_accessed_at: new Date().toISOString() })
      .eq('id', data.id);
    
    const cacheAge = Math.floor((Date.now() - new Date(data.created_at).getTime()) / 1000);
    
    return {
      response: data.response,
      metadata: { cached: true, cacheHit: true, cacheAge, totalHits: data.hits + 1 }
    };
  } catch (error) {
    console.error('[Cache] Error:', error);
    return null;
  }
}

async function setCache(mode, context, response) {
  try {
    const cacheKey = generateCacheKey(mode, context);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    await supabase.from('ai_generation_cache').upsert({
      prompt_hash: cacheKey,
      mode,
      context,
      response,
      model: response.metadata?.model,
      tokens_used: response.metadata?.tokensUsed,
      cost: parseFloat(response.metadata?.cost?.total || 0),
      expires_at: expiresAt,
      last_accessed_at: new Date().toISOString()
    }, { onConflict: 'prompt_hash' });
  } catch (error) {
    console.error('[Cache] Error:', error);
  }
}

export default async function handler(req, res) {
  // CORS
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
    const { mode, context } = req.body;

    // Check cache
    const cached = await getCached(mode, context);
    if (cached) {
      return res.status(200).json({ ...cached.response, _cache: cached.metadata });
    }
    
    // System prompts
    const systemPrompts = {
      'topic_generate_fulltext_v2': `Jsi senior klinický lékař.
PRAVIDLA: Cituj zdroje. Vrať JSON: {"full_text": "markdown 3000-5000 slov", "confidence": 0.85, "sources": [], "warnings": []}`,
      'topic_generate_high_yield': `HIGH-YIELD (max 15 bodů). JSON: {"high_yield": "markdown", "key_points": []}`,
      'topic_generate_deep_dive': `DEEP DIVE. JSON: {"deep_dive": "markdown", "research_areas": []}`
    };

    const userPrompts = {
      'topic_generate_fulltext_v2': `Vytvoř fulltext:\nObor: ${context.specialty}\nOkruh: ${context.okruh}\nTéma: ${context.title}`,
      'topic_generate_high_yield': `HIGH-YIELD z: ${context.full_text?.substring(0, 500)}...`,
      'topic_generate_deep_dive': `Deep dive: ${context.title}`
    };

    const systemPrompt = systemPrompts[mode] || systemPrompts['topic_generate_fulltext_v2'];
    const userPrompt = userPrompts[mode] || userPrompts['topic_generate_fulltext_v2'];
    const shouldUseGemini = mode === 'topic_generate_high_yield';
    const geminiKey = shouldUseGemini ? getGeminiApiKey() : '';

    let textContent = '';
    let output = null;

    if (shouldUseGemini && geminiKey) {
      const geminiModel = GEMINI_MODELS.high_yield;
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024
            }
          })
        }
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        throw new Error(errText || `Gemini API failed (${geminiRes.status})`);
      }

      const geminiJson = await geminiRes.json();
      const parts = geminiJson?.candidates?.[0]?.content?.parts || [];
      textContent = parts.map((p) => p?.text || '').join('');

      let result;
      try {
        result = JSON.parse(textContent.replace(/```json\n?|\n?```/g, ''));
      } catch {
        result = { text: textContent };
      }

      output = {
        ...result,
        metadata: {
          provider: 'google',
          model: geminiModel,
          tokensUsed: geminiJson?.usageMetadata || null,
          cost: { total: '0' },
          generatedAt: new Date().toISOString()
        }
      };
    } else {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      });

      for (const block of response.content) {
        if (block.type === 'text') textContent += block.text;
      }

      let result;
      try {
        result = JSON.parse(textContent.replace(/```json\n?|\n?```/g, ''));
      } catch {
        result = { text: textContent };
      }

      output = {
        ...result,
        metadata: {
          provider: 'anthropic',
          model: 'claude-sonnet-4',
          tokensUsed: response.usage,
          cost: {
            input: ((response.usage.input_tokens / 1_000_000) * 3).toFixed(4),
            output: ((response.usage.output_tokens / 1_000_000) * 15).toFixed(4),
            total: ((response.usage.input_tokens / 1_000_000) * 3 + (response.usage.output_tokens / 1_000_000) * 15).toFixed(4)
          },
          generatedAt: new Date().toISOString(),
          fallback: shouldUseGemini && !geminiKey
        }
      };
    }

    await setCache(mode, context, output);
    return res.status(200).json(output);

  } catch (error) {
    console.error('[API] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
