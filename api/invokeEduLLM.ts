import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

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

const buildModeInstructions = (mode: string) => {
  if (!mode) return '';
  if (mode.includes('high_yield')) {
    return 'Return concise high-yield bullet points (max 10).';
  }
  if (mode.includes('deep_dive')) {
    return 'Provide advanced, in-depth content with clear headings.';
  }
  if (mode.includes('exam')) {
    return 'Structure the answer: definice, etiologie/klasifikace, diagnostika, léčba, komplikace, perličky.';
  }
  if (mode.includes('copilot')) {
    return 'Keep it short and practical. If page context is provided, use it. Answer in Czech. Be concise but accurate.';
  }
  return '';
};

export default async function handler(req: any, res: any) {
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
    const { mode, userPrompt, entityContext, allowWeb, pageContext } = req.body || {};

    if (!userPrompt) {
      return res.status(400).json({ error: 'Missing userPrompt' });
    }

    const systemPrompt = `Jsi AI asistent pro medicínskou edukaci. Odpovídej česky, strukturovaně a bezpečně.\n` +
      `Nikdy neuváděj klinické rozhodování pro konkrétního pacienta.\n` +
      `Return ONLY valid JSON with fields: text, citations, confidence.\n` +
      `citations: { internal: [], external: [] }\n` +
      `confidence: { level: "low|medium|high", reason: "" }\n` +
      `${buildModeInstructions(mode)}`;

    const contextBlock = entityContext ? `\n\nCONTEXT:\n${JSON.stringify(entityContext)}` : '';
    const pageBlock = pageContext ? `\n\nPAGE_CONTEXT:\n${JSON.stringify(pageContext)}` : '';
    const webBlock = allowWeb ? '\n\nYou may mention if web search would help, but do not browse.' : '';

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `${userPrompt}${contextBlock}${pageBlock}${webBlock}`
      }]
    });

    const text = extractText(response);
    const parsed = tryParseJson(text);

    if (parsed) {
      return res.status(200).json({
        mode,
        ...parsed
      });
    }

    return res.status(200).json({
      mode,
      text,
      citations: { internal: [], external: [] },
      confidence: { level: 'low', reason: 'Model nevrátil validní JSON.' }
    });
  } catch (error: any) {
    console.error('[invokeEduLLM] error:', error);
    return res.status(500).json({ error: error.message || 'LLM call failed' });
  }
}
