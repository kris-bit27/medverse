import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export default async function handler(req, res) {
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

    console.log('[Claude API] Mode:', mode);
    console.log('[Claude API] Context:', context);

    // System prompt podle módu
    const systemPrompts = {
      'topic_generate_fulltext_v2': `Jsi senior klinický lékař specializující se na ${context.specialty || 'medicínu'}.

PRAVIDLA:
- Používej web search pro ověření faktů
- Cituj zdroje: (Autor, Rok) nebo (Guidelines XY, 2024)
- Pokud nejsi jistý, označ jako "přibližně", "typicky"
- Vrať JSON formát

STRUKTURA:
{
  "full_text": "markdown text 3000-5000 slov",
  "confidence": 0.85,
  "sources": ["zdroj1", "zdroj2"],
  "warnings": ["varování pokud něco není 100% ověřeno"]
}`,
      
      'topic_generate_high_yield': `Vytvoř HIGH-YIELD shrnutí (max 15 bodů).
Formát: 🔴 KRITICKÉ / ⚡ HIGH-YIELD / ⚠️ POZOR
Vrať JSON: {"high_yield": "markdown", "key_points": []}`,
      
      'topic_generate_deep_dive': `Vytvoř DEEP DIVE s pokročilými znalostmi.
Zaměř se na: molekulární mechanismy, kontroverze, aktuální výzkum.
Povinně vyhledej nejnovější studie.
Vrať JSON: {"deep_dive": "markdown", "research_areas": []}`
    };

    const systemPrompt = systemPrompts[mode] || systemPrompts['topic_generate_fulltext_v2'];

    // User prompt
    const userPrompts = {
      'topic_generate_fulltext_v2': `Vytvoř fulltext pro:
Obor: ${context.specialty}
Okruh: ${context.okruh}
Téma: ${context.title}

Struktura: Úvod → Epidemiologie → Patofyziologie → Diagnostika → Terapie → Prognóza`,
      
      'topic_generate_high_yield': `Extrahuj HIGH-YIELD body z: ${context.full_text?.substring(0, 500)}...`,
      
      'topic_generate_deep_dive': `Vytvoř deep dive pro: ${context.title}
Fulltext reference: ${context.full_text?.substring(0, 500)}...`
    };

    const userPrompt = userPrompts[mode] || userPrompts['topic_generate_fulltext_v2'];

    // Claude API call
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.3,
      system: systemPrompt,
      tools: mode.includes('deep_dive') ? [{
        type: 'web_search_20250305',
        name: 'web_search'
      }] : undefined,
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

    // Try parse JSON
    let result;
    try {
      const clean = textContent.replace(/```json\n?|\n?```/g, '');
      result = JSON.parse(clean);
    } catch {
      result = { text: textContent };
    }

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

    return res.status(200).json(output);

  } catch (error) {
    console.error('[Claude API] Error:', error);
    return res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
}
