import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { studySetId, topicIds, title, mode = 'summary' } = req.body || {};

    if (!topicIds?.length) {
      return res.status(400).json({ error: 'No topics selected' });
    }
    if (topicIds.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 topics per set' });
    }

    // Fetch topic content (bullet_points_summary is cheaper to process)
    const { data: topics, error: topicError } = await supabase
      .from('topics')
      .select('id, title, bullet_points_summary, full_text_content, okruhy(name, obory(name))')
      .in('id', topicIds);

    if (topicError) throw topicError;
    if (!topics?.length) {
      return res.status(404).json({ error: 'No topics found' });
    }

    // Build context from topics (use summaries first, fall back to truncated full text)
    const topicContext = topics.map((t: any) => {
      const content = t.bullet_points_summary || (t.full_text_content?.substring(0, 3000) + '...') || '';
      const obor = t.okruhy?.obory?.name || '';
      return `## ${t.title}${obor ? ` (${obor})` : ''}\n${content}`;
    }).join('\n\n---\n\n');

    // Estimate tokens (rough: 1 token ≈ 4 chars for Czech)
    const inputChars = topicContext.length;
    const maxInput = 60000; // ~15k tokens
    const trimmedContext = inputChars > maxInput 
      ? topicContext.substring(0, maxInput) + '\n\n[...obsah zkrácen...]'
      : topicContext;

    let systemPrompt = '';
    let userPrompt = '';
    let maxTokens = 4096;

    if (mode === 'summary') {
      systemPrompt = `Jsi medicínský pedagog pro české atestace. Tvým úkolem je vytvořit konzistentní, 
přehledný souhrn z dodaných témat. Piš česky, akademicky ale srozumitelně.

FORMÁT VÝSTUPU:
- Nadpis: "Studijní souhrn: {název sady}"
- Pro každé téma vytvoř sekci s 3-5 klíčovými body
- Na konci přidej sekci "Propojení a souvislosti" — jak se témata vzájemně doplňují
- Na konci přidej "Nejčastější atestační otázky" — 5-8 otázek, které by mohly padnout

Piš v HTML formátu (h2, h3, ul/li, p, strong). Nepoužívej markdown.`;

      userPrompt = `Vytvoř studijní souhrn pro sadu "${title || 'Bez názvu'}" z následujících ${topics.length} témat:\n\n${trimmedContext}`;
      maxTokens = 4096;

    } else if (mode === 'study_plan') {
      systemPrompt = `Jsi medicínský pedagog. Vytvoř optimální studijní plán pro daná témata.

FORMÁT: Vrať JSON:
{
  "days": [
    {
      "day": 1,
      "focus": "Název zaměření dne",
      "topics": ["topic_title_1", "topic_title_2"],
      "duration_minutes": 90,
      "activities": ["Přečíst souhrn", "Flashcards", "MCQ test"],
      "tip": "Zaměř se na diferenciální diagnostiku"
    }
  ],
  "total_days": number,
  "total_hours": number,
  "strategy_note": "Stručná poznámka ke strategii studia"
}

Rozděl témata do logických bloků po 2-4 denně. Začni jednoduššími, postupuj ke složitějším.
Na závěr vždy zařaď opakování.`;

      userPrompt = `Vytvoř studijní plán pro ${topics.length} témat:\n${topics.map((t: any) => `- ${t.title}`).join('\n')}`;
      maxTokens = 2048;

    } else if (mode === 'quiz') {
      systemPrompt = `Jsi medicínský pedagog pro české atestace. Vytvoř kvíz z dodaných témat.

FORMÁT: Vrať JSON pole:
[
  {
    "question": "Otázka česky",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct": 0,
    "explanation": "Krátké vysvětlení správné odpovědi",
    "topic_title": "Z jakého tématu otázka je"
  }
]

Vytvoř ${Math.min(topics.length * 2, 15)} otázek. Rovnoměrně z každého tématu.
Otázky by měly testovat klinické uvažování, ne jen memorování faktů.`;

      userPrompt = `Vytvoř atestační kvíz z těchto témat:\n\n${trimmedContext}`;
      maxTokens = 3072;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const text = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');

    // Parse result
    let result: any = { raw: text };

    if (mode === 'summary') {
      result = { summary_html: text };
    } else {
      // Try parse JSON
      const clean = text.replace(/```json\n?|```/g, '').trim();
      try {
        result = JSON.parse(clean);
      } catch {
        result = { raw: text };
      }
    }

    // Calculate cost
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const costUsd = (inputTokens * 3 / 1_000_000) + (outputTokens * 15 / 1_000_000);

    // Update study set in DB if studySetId provided
    if (studySetId) {
      const updateData: any = { updated_at: new Date().toISOString(), status: 'ready' };
      if (mode === 'summary') updateData.ai_summary = result.summary_html;
      if (mode === 'study_plan') updateData.ai_study_plan = result;
      if (mode === 'quiz') updateData.ai_quiz = Array.isArray(result) ? result : result.raw ? null : result;

      await supabase.from('study_sets').update(updateData).eq('id', studySetId);
    }

    // Log cost
    await supabase.from('api_call_log').insert({
      endpoint: `study-set-generate/${mode}`,
      model: 'claude-sonnet-4-20250514',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
      metadata: { study_set_id: studySetId, topic_count: topicIds.length }
    }).then(() => {}).catch(() => {});

    return res.status(200).json({
      mode,
      ...result,
      cost_usd: costUsd,
      tokens: { input: inputTokens, output: outputTokens }
    });

  } catch (error: any) {
    console.error('[study-set-generate] error:', error);
    return res.status(500).json({ error: error.message || 'Generation failed' });
  }
}
