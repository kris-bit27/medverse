import Anthropic from '@anthropic-ai/sdk';
import { getCached, setCache } from './cache.js';

function getAnthropicClient() {
  const apiKey =
    process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY');
  }

  return new Anthropic({ apiKey });
}

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
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
      'topic_generate_fulltext_v2': `Jsi senior klinický lékař specializující se na ${context.specialty || 'medicínu'}.

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

    // Claude API call
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    });

    // Extract text
    let textContent = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      }
    }

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

    // Parse JSON
    let result = tryParseJson(textContent);
    if (!result) {
      result = { text: textContent };
    }

    if (result?.full_text) result.full_text = normalizeText(result.full_text);
    if (result?.high_yield) result.high_yield = normalizeText(result.high_yield);
    if (result?.deep_dive) result.deep_dive = normalizeText(result.deep_dive);

    // Add metadata
    const output = {
      ...result,
      metadata: {
        model: 'claude-sonnet-4',
        tokensUsed: response.usage,
        cost: {
          input: ((response.usage.input_tokens / 1_000_000) * 3).toFixed(4),
          output: ((response.usage.output_tokens / 1_000_000) * 15).toFixed(4),
          total: (
            (response.usage.input_tokens / 1_000_000) * 3 +
            (response.usage.output_tokens / 1_000_000) * 15
          ).toFixed(4)
        },
        generatedAt: new Date().toISOString()
      }
    };

    // Save to cache
    console.log('[API] Saving to cache...');
    await setCache(mode, context, output);
    console.log('[API] ✅ Done');

    return res.status(200).json(output);

  } catch (error: any) {
    console.error('[API] Error:', error);
    return res.status(500).json({
      error: error?.message || 'Unknown server error'
    });
  }
}
