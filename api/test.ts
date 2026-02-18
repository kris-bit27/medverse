import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: any, res: any) {
  // GET = health check (backwards compatible)
  if (req.method === 'GET') {
    return res.json({
      message: 'API works!',
      env: {
        hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
        hasSupabase: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
        hasGemini: !!process.env.GEMINI_API_KEY,
        hasOpenAI: !!process.env.OPENAI_API_KEY,
      }
    });
  }

  // POST = generate user weekly report via Gemini Flash
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { mode = 'weekly_digest' } = req.body || {};

    // Authenticate user from JWT — never trust user_id from request body
    const { getUserId } = await import('./_auth.js');
    const userId = await getUserId(req, res);
    if (!userId) return; // 401 already sent

    // Token check
    try {
      const { checkTokens, deductTokens } = await import('./_token-utils');
      const operation = mode === 'weekly_digest' ? 'weekly_report' : 'study_insights';
      const check = await checkTokens(supabase, userId, operation);
      if (!check.allowed) {
        return res.status(402).json({
          error: `Nedostatek AI kreditů. Potřeba: ${check.cost}, zbývá: ${check.remaining}`,
          tokens_remaining: check.remaining,
          tokens_needed: check.cost,
        });
      }
      await deductTokens(supabase, userId, operation, `AI Report: ${mode}`);
    } catch (tokenErr: any) {
      console.warn('[user-report] token deduction failed:', tokenErr.message);
    }

    // Gather user data
    const [masteryRes, sessionsRes, testsRes, profileRes] = await Promise.all([
      supabase.from('user_topic_mastery')
        .select('topic_id, mastery_score, total_study_seconds, flashcards_correct, flashcards_reviewed, questions_correct, questions_answered, last_studied_at')
        .eq('user_id', userId)
        .order('last_studied_at', { ascending: false })
        .limit(50),
      supabase.from('study_sessions')
        .select('topic_id, session_type, duration_seconds, items_reviewed, created_at')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .order('created_at', { ascending: false }),
      supabase.from('test_sessions')
        .select('score, correct_answers, total_questions, time_spent_seconds, created_at')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('user_profiles')
        .select('display_name, current_specialization')
        .eq('user_id', userId)
        .single(),
    ]);

    const mastery = masteryRes.data || [];
    const sessions = sessionsRes.data || [];
    const tests = testsRes.data || [];
    const profile = profileRes.data;

    // Get topic names
    const topicIds = [...new Set([...mastery.map(m => m.topic_id), ...sessions.map(s => s.topic_id)].filter(Boolean))];
    let topicNames: Record<string, string> = {};
    if (topicIds.length > 0) {
      const { data: topics } = await supabase.from('topics').select('id, title').in('id', topicIds.slice(0, 30));
      topicNames = Object.fromEntries((topics || []).map(t => [t.id, t.title]));
    }

    const dataContext = {
      user: profile?.display_name || 'Student',
      specialization: profile?.current_specialization || 'Neznámá',
      mastery_summary: mastery.slice(0, 20).map(m => ({
        topic: topicNames[m.topic_id] || 'Téma',
        score: m.mastery_score,
        study_min: Math.round((m.total_study_seconds || 0) / 60),
        fc_pct: m.flashcards_reviewed ? Math.round((m.flashcards_correct / m.flashcards_reviewed) * 100) : null,
        mcq_pct: m.questions_answered ? Math.round((m.questions_correct / m.questions_answered) * 100) : null,
      })),
      weekly_sessions: sessions.length,
      weekly_minutes: Math.round(sessions.reduce((s, r) => s + (r.duration_seconds || 0), 0) / 60),
      tests: tests.map(t => ({ score: t.score, correct: t.correct_answers, total: t.total_questions, date: t.created_at?.substring(0, 10) })),
    };

    const PROMPTS: Record<string, { system: string; user: string }> = {
      weekly_digest: {
        system: `Jsi studijní mentor pro české lékařské atestace. Generuješ personalizované týdenní reporty. Odpovídej ČESKY. Buď motivující ale realistický. Formátuj jako čisté HTML (h3, p, ul/li, strong). NEPOUŽÍVEJ markdown backticks ani \`\`\`html bloky.`,
        user: `Vytvoř týdenní studijní report:\n\n${JSON.stringify(dataContext, null, 2)}\n\nObsahuj: 1) Souhrn aktivity 2) Silné stránky 3) Slabá místa 4) Doporučení na příští týden 5) Motivační závěr. Pokud nemá data, napiš že ještě není dostatek dat.`,
      },
      study_insights: {
        system: `Jsi analytik vzdělávacích dat pro české atestace. Odpovídej ČESKY. Formátuj jako čisté HTML. NEPOUŽÍVEJ markdown.`,
        user: `Analyzuj studijní data:\n\n${JSON.stringify(dataContext, null, 2)}\n\nVrať: 1) Vzory v učení 2) Efektivita metod (FC vs MCQ vs čtení) 3) Předpověď readiness 4) Optimalizační tipy`,
      },
    };

    if (!PROMPTS[mode]) return res.status(400).json({ error: `Unknown mode: ${mode}` });
    const { system, user: userPrompt } = PROMPTS[mode];

    // Call Gemini Flash
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: system }] },
          generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini ${geminiRes.status}: ${errText.substring(0, 200)}`);
    }

    const geminiData = await geminiRes.json();
    let report = geminiData.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
    // Strip markdown code fences if present
    report = report.replace(/```html\s*\n?|```\s*$/g, '').trim();

    const usage = geminiData.usageMetadata || {};
    const inputTokens = usage.promptTokenCount || 0;
    const outputTokens = usage.candidatesTokenCount || 0;
    const costUsd = (inputTokens * 0.15 / 1_000_000) + (outputTokens * 0.60 / 1_000_000);

    // Log cost
    try {
      await supabase.from('api_call_log').insert({
        source: 'gemini-report',
        mode,
        model: 'gemini-2.5-flash',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
        success: true,
      });
    } catch (_) {}

    return res.json({
      report,
      mode,
      model: 'gemini-2.5-flash',
      cost_usd: costUsd,
      data_summary: {
        topics_tracked: mastery.length,
        weekly_sessions: dataContext.weekly_sessions,
        weekly_minutes: dataContext.weekly_minutes,
        tests_taken: tests.length,
      },
    });

  } catch (error: any) {
    console.error('[user-report] error:', error);
    return res.status(500).json({ error: error.message || 'Report failed' });
  }
}
