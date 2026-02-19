import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function callGPT(prompt: string, options: { system?: string; maxTokens?: number; temperature?: number; model?: string } = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const model = options.model || 'gpt-4o';
  const messages: any[] = [];
  if (options.system) messages.push({ role: 'system', content: options.system });
  messages.push({ role: 'user', content: prompt });

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: options.maxTokens || 2048, temperature: options.temperature ?? 0.2 }),
  });
  if (!r.ok) throw new Error(`OpenAI error ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const text = data.choices?.[0]?.message?.content || '';
  const usage = data.usage || {};
  const inTok = usage.prompt_tokens || 0;
  const outTok = usage.completion_tokens || 0;
  return { text, model, input_tokens: inTok, output_tokens: outTok, cost_usd: (inTok * 2.5 + outTok * 10) / 1_000_000 };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Admin-only endpoint — requires valid Bearer token with admin/editor role
  const { requireAdmin } = await import('./_auth.js');
  const adminId = await requireAdmin(req, res);
  if (!adminId) return; // 401/403 already sent

  try {
    const { topic_id, content_type = 'fulltext' } = req.body || {};
    if (!topic_id) return res.status(400).json({ error: 'Missing topic_id' });

    // Fetch topic content
    const { data: topic, error: topicErr } = await supabase
      .from('topics')
      .select('id, title, full_text_content, bullet_points_summary')
      .eq('id', topic_id)
      .single();

    if (topicErr || !topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const content = content_type === 'summary'
      ? topic.bullet_points_summary
      : topic.full_text_content;

    if (!content) {
      return res.status(400).json({ error: `No ${content_type} content for this topic` });
    }

    // Truncate to ~6000 chars to keep GPT-4o cost reasonable
    const truncatedContent = content.substring(0, 6000);

    const systemPrompt = `Jsi lékařský recenzent s expertízou na české atestační vzdělávání.
Tvým úkolem je zkontrolovat AI-generovaný medicínský obsah a identifikovat:

1. FAKTICKÉ CHYBY — nesprávná tvrzení, špatná čísla, zastaralé informace
2. NEPŘESNOSTI — zavádějící formulace, chybějící nuance, oversimplifikace
3. CHYBĚJÍCÍ KLÍČOVÉ INFORMACE — důležité body pro atestaci, které chybí
4. QUALITY SCORE — celkové hodnocení kvality 1-10

Odpověz POUZE validním JSON objektem (bez markdown, bez backticks), s touto strukturou:
{
  "score": 8,
  "verdict": "pass|warn|fail",
  "issues": [
    {
      "type": "factual_error|inaccuracy|missing_info|outdated|formatting",
      "severity": "critical|major|minor",
      "text": "Citovaná pasáž s chybou",
      "correction": "Jak by to mělo správně být",
      "explanation": "Proč je to chybné"
    }
  ],
  "strengths": ["Co je dobře zpracované"],
  "summary": "Krátké celkové hodnocení česky (2-3 věty)"
}

PRAVIDLA:
- Buď přísný ale férový — medicínský obsah musí být přesný
- score 8+ a 0 critical issues = "pass"
- score 5-7 nebo critical issues = "warn" 
- score <5 = "fail"
- Pokud obsah je v pořádku, issues pole může být prázdné
- Odpovídej ČESKY`;

    const userPrompt = `TÉMA: ${topic.title}
TYP OBSAHU: ${content_type === 'summary' ? 'High-yield shrnutí' : 'Plný text'}

OBSAH K RECENZI:
${truncatedContent}

Zkontroluj tento obsah a vrať JSON s hodnocením.`;

    const result = await callGPT(userPrompt, {
      system: systemPrompt,
      maxTokens: 2048,
      temperature: 0.1,
      model: 'gpt-4o',
    });

    // Parse JSON response
    let review;
    try {
      const cleanText = result.text.replace(/```json\s*|```/g, '').trim();
      review = JSON.parse(cleanText);
    } catch (parseErr) {
      review = {
        score: null,
        verdict: 'error',
        issues: [],
        strengths: [],
        summary: `GPT-4o vrátil nevalidní JSON. Raw odpověď: ${result.text.substring(0, 500)}`,
        raw_response: result.text,
      };
    }

    // Log cost
    try {
      await supabase.from('api_call_log').insert({
        source: 'content-review',
        mode: content_type,
        model: result.model,
        topic_id,
        topic_title: topic.title,
        input_tokens: result.input_tokens,
        output_tokens: result.output_tokens,
        cost_usd: result.cost_usd,
        success: review.verdict !== 'error',
      });
    } catch (_) {}

    return res.status(200).json({
      topic_id,
      topic_title: topic.title,
      content_type,
      review,
      model: result.model,
      cost_usd: result.cost_usd,
      tokens: { input: result.input_tokens, output: result.output_tokens },
    });

  } catch (error: any) {
    console.error('[content-review] error:', error);
    return res.status(500).json({ error: error.message || 'Review failed' });
  }
}
