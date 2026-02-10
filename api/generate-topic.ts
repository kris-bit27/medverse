import Anthropic from '@anthropic-ai/sdk';
import { getCached, setCache } from './cache.js';
import { z } from 'zod';

// Input validation schema
const GenerateTopicSchema = z.object({
  mode: z.enum([
    'topic_generate_fulltext_v2',
    'topic_generate_high_yield',
    'topic_generate_deep_dive'
  ]),
  context: z.object({
    specialty: z.string().min(1, "Specialty is required").max(100, "Specialty too long"),
    okruh: z.string().min(1, "Okruh is required").max(200, "Okruh too long"),
    title: z.string().min(1, "Title is required").max(300, "Title too long"),
    full_text: z.string().max(50000, "Content too large").optional()
  })
});

const GEMINI_MODELS = {
  high_yield: process.env.GEMINI_HIGH_YIELD_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash'
};

const getGeminiApiKey = () =>
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY ||
  '';

function getAnthropicClient() {
  const apiKey =
    process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY');
  }

  return new Anthropic({ apiKey });
}

export default async function handler(req: any, res: any) {
  // CORS headers - whitelist only allowed origins
  const ALLOWED_ORIGINS = [
    'https://medverse-gilt.vercel.app',
    'https://medverse.com',
    'https://www.medverse.com',
    ...(process.env.NODE_ENV === 'development' ? [
      'http://localhost:3000',
      'http://localhost:5173'
    ] : [])
  ];
  
  const origin = req.headers.origin;
  
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate input
    const validationResult = GenerateTopicSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validationResult.error.errors
      });
    }
    
    const { mode, context } = validationResult.data;

    console.log('[API] Mode:', mode);
    console.log('[API] Context:', context);

    // Check cache
    console.log('[API] Checking cache...');
    const cached = await getCached(mode, context);
    
    if (cached) {
      console.log('[API] ✅ Cache HIT!');
      return res.status(200).json({
        ...cached.response,
        _cache: cached.metadata
      });
    }
    
    console.log('[API] ❌ Cache MISS - Calling Claude...');
    
    // System prompts
    const systemPrompts: Record<string, string> = {
      'topic_generate_fulltext_v2': `🚨🚨🚨 ABSOLUTNÍ PRIORITA: KOMPLETNÍ TEXT 🚨🚨🚨

KRITICKÁ INSTRUKCE - VŠECH 7 SEKCÍ MUSÍ BÝT PŘÍTOMNÝCH:
1. Úvod a definice ✓
2. Etiopatogeneze ✓
3. Klinický obraz ✓
4. Diagnostika ✓
5. Léčba ✓
6. Prognóza a prevence ✓
7. Klinické perly ✓

🚨 NIKDY NEKONČIT BEZ ZÁVĚREČNÝCH SEKCÍ! 🚨

⚡ COMPLETION GUARANTEE: Musíš dokončit CELOU odpověď s VŠEMI sekcemi. Pokud by došlo k přerušení, označ jasně kde jsi skončil a pokračuj v následující odpovědi.

Jsi senior klinický lékař specializující se na ${context.specialty || 'medicínu'}.

PRAVIDLA:
- Cituj zdroje: (Autor, Rok)
- Pokud nejsi jistý, označ jako "přibližně"
- Vrať JSON: {"full_text": "markdown 3000-5000 slov", "confidence": 0.85, "sources": [], "warnings": []}

STRUKTURA:
# Téma
## 1. Úvod a definice
## 2. Epidemiologie  
## 3. Patofyziologie
## 4. Diagnostika
## 5. Terapie
## 6. Prognóza`,
      
      'topic_generate_high_yield': `HIGH-YIELD shrnutí (max 15 bodů).
Formát: 🔴 KRITICKÉ / ⚡ HIGH-YIELD / ⚠️ POZOR
JSON: {"high_yield": "markdown", "key_points": []}`,
      
      'topic_generate_deep_dive': `DEEP DIVE s pokročilými znalostmi.
Molekulární mechanismy, kontroverze, výzkum.
JSON: {"deep_dive": "markdown", "research_areas": []}`
    };

    const userPrompts: Record<string, string> = {
      'topic_generate_fulltext_v2': `Vytvoř fulltext pro:
Obor: ${context.specialty}
Okruh: ${context.okruh}
Téma: ${context.title}`,
      
      'topic_generate_high_yield': `Extrahuj HIGH-YIELD z: ${context.full_text?.substring(0, 500)}...`,
      
      'topic_generate_deep_dive': `Deep dive: ${context.title}
Ref: ${context.full_text?.substring(0, 500)}...`
    };

    const systemPrompt = systemPrompts[mode] || systemPrompts['topic_generate_fulltext_v2'];
    const userPrompt = userPrompts[mode] || userPrompts['topic_generate_fulltext_v2'];

    const normalizeText = (value?: string | null) => {
      if (!value || typeof value !== 'string') return value;
      return value.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    };

    const tryParseJson = (raw: string) => {
      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
      try {
        return JSON.parse(cleaned);
      } catch {
        const first = cleaned.indexOf('{');
        const last = cleaned.lastIndexOf('}');
        if (first !== -1 && last !== -1 && last > first) {
          try {
            return JSON.parse(cleaned.slice(first, last + 1));
          } catch {
            return null;
          }
        }
        return null;
      }
    };

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
      textContent = parts.map((p: any) => p?.text || '').join('');

      let result = tryParseJson(textContent);
      if (!result) {
        result = { text: textContent };
      }

      if (result?.full_text) result.full_text = normalizeText(result.full_text);
      if (result?.high_yield) result.high_yield = normalizeText(result.high_yield);
      if (result?.deep_dive) result.deep_dive = normalizeText(result.deep_dive);

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
      // Claude API call
      const anthropic = getAnthropicClient();
      const isFulltext = mode === 'topic_generate_fulltext_v2';
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-20250514',
        max_tokens: 8192,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userPrompt
        }]
      });

      // Extract text
      for (const block of response.content) {
        if (block.type === 'text') {
          textContent += block.text;
        }
      }

      // Parse JSON
      let result = tryParseJson(textContent);
      if (!result) {
        result = { text: textContent };
      }

      if (result?.full_text) result.full_text = normalizeText(result.full_text);
      if (result?.high_yield) result.high_yield = normalizeText(result.high_yield);
      if (result?.deep_dive) result.deep_dive = normalizeText(result.deep_dive);

      // Add metadata with sources and warnings
      output = {
        ...result,
        sources: result?.sources || [],
        warnings: result?.warnings || [],
        metadata: {
          provider: 'anthropic',
          model: 'claude-opus-4',
          tokensUsed: response.usage,
          cost: {
            input: ((response.usage.input_tokens / 1_000_000) * 15).toFixed(4),
            output: ((response.usage.output_tokens / 1_000_000) * 75).toFixed(4),
            total: (
              (response.usage.input_tokens / 1_000_000) * 15 +
              (response.usage.output_tokens / 1_000_000) * 75
            ).toFixed(4)
          },
          generatedAt: new Date().toISOString(),
          fallback: shouldUseGemini && !geminiKey
        }
      };
    }

    // Save to cache
    console.log('[API] Saving to cache...');
    await setCache(mode, context, output);
    console.log('[API] ✅ Done');

    return res.status(200).json(output);

  } catch (error: any) {
    const errorId = Math.random().toString(36).substring(7);
    
    // Log pro debugging (server-side only)
    console.error(`[API Error ${errorId}]`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Generic message pro klienta (bezpečné)
    return res.status(500).json({
      error: 'Internal server error',
      errorId: errorId,
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'An error occurred. Please contact support with error ID.'
    });
  }
}
