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
  if (mode.includes('review')) {
    return `You are a medical content reviewer. Analyze the provided content for:
1. SAFETY: incorrect dosages, dangerous advice, missing contraindications (score 0-100)
2. COMPLETENESS: missing standard sections for the topic (score 0-100)  
3. ACCURACY: factual errors, outdated guidelines, unsupported claims

Return JSON:
{
  "approved": boolean,
  "confidence": number (0-1),
  "safety_score": number (0-100),
  "completeness_score": number (0-100),
  "issues": [{ "severity": "high|medium|low", "category": "dosage|safety|missing_info|accuracy|formatting", "description": "...", "line": "quoted context or null", "suggestion": "..." }],
  "strengths": ["..."],
  "missing_sections": ["..."]
}
approved=true only if safety_score >= 80 AND no high-severity issues.`;
  }
  if (mode.includes('copilot')) {
    return `You are a study copilot helping a medical student. Rules:
- Answer in Czech, concisely (max 300 words)
- Use the PAGE_CONTEXT to ground your answers in the current topic
- If the student asks something outside the topic context, briefly answer but redirect
- Format: short paragraphs, use bold for key terms
- Never give patient-specific clinical advice`;
  }
  return '';
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

    const maxTokens = mode?.includes('review') ? 4096 : mode?.includes('copilot') ? 1024 : 2048;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
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
