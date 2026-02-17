import { callGemini } from './lib/ai-models';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { user_id, mode = 'weekly_digest' } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    // Gather user study data
    const [
      { data: mastery },
      { data: sessions },
      { data: tests },
      { data: profile },
    ] = await Promise.all([
      supabase.from('user_topic_mastery')
        .select('topic_id, mastery_score, times_opened, total_study_seconds, flashcards_correct, flashcards_reviewed, questions_correct, questions_answered, last_studied_at')
        .eq('user_id', user_id)
        .order('last_studied_at', { ascending: false })
        .limit(50),
      supabase.from('study_sessions')
        .select('topic_id, session_type, duration_seconds, items_reviewed, created_at')
        .eq('user_id', user_id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }),
      supabase.from('test_sessions')
        .select('score, correct_answers, total_questions, time_spent_seconds, created_at')
        .eq('user_id', user_id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('user_profiles')
        .select('display_name, current_specialization')
        .eq('user_id', user_id)
        .single(),
    ]);

    // Get topic titles for context
    const topicIds = [...new Set([
      ...(mastery || []).map(m => m.topic_id),
      ...(sessions || []).map(s => s.topic_id),
    ].filter(Boolean))];

    let topicNames: Record<string, string> = {};
    if (topicIds.length > 0) {
      const { data: topics } = await supabase
        .from('topics')
        .select('id, title')
        .in('id', topicIds.slice(0, 30));
      topicNames = Object.fromEntries((topics || []).map(t => [t.id, t.title]));
    }

    // Build data summary for Gemini
    const dataContext = {
      user: profile?.display_name || 'Student',
      specialization: profile?.current_specialization || 'Neznámá',
      mastery_summary: (mastery || []).slice(0, 20).map(m => ({
        topic: topicNames[m.topic_id] || m.topic_id,
        score: m.mastery_score,
        study_minutes: Math.round((m.total_study_seconds || 0) / 60),
        fc_accuracy: m.flashcards_reviewed ? Math.round((m.flashcards_correct / m.flashcards_reviewed) * 100) : null,
        mcq_accuracy: m.questions_answered ? Math.round((m.questions_correct / m.questions_answered) * 100) : null,
      })),
      weekly_sessions: (sessions || []).length,
      weekly_study_minutes: Math.round((sessions || []).reduce((s, r) => s + (r.duration_seconds || 0), 0) / 60),
      test_scores: (tests || []).map(t => ({
        score: t.score,
        correct: t.correct_answers,
        total: t.total_questions,
        date: t.created_at?.substring(0, 10),
      })),
    };

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === 'weekly_digest') {
      systemPrompt = `Jsi studijní mentor pro české lékařské atestace. Generuješ personalizované týdenní reporty.
Odpovídej ČESKY. Buď motivující ale realistický. Formátuj jako HTML (h3, p, ul/li, strong).`;
      
      userPrompt = `Vytvoř týdenní studijní report pro studenta na základě těchto dat:

${JSON.stringify(dataContext, null, 2)}

Report by měl obsahovat:
1. Souhrn aktivity tohoto týdne (sessions, čas, témata)
2. Silné stránky — témata s vysokým mastery a přesností
3. Slabá místa — témata k zopakování (nízké mastery nebo přesnost)
4. Doporučení na příští týden (konkrétní témata a aktivity)
5. Motivační závěr

Pokud nemá data, napiš že ještě nemáš dostatek dat pro analýzu.`;
    } else if (mode === 'study_insights') {
      systemPrompt = `Jsi analytik vzdělávacích dat. Identifikuješ vzory a insighty ze studijních dat.
Odpovídej ČESKY. Formátuj jako HTML.`;
      
      userPrompt = `Analyzuj studijní data a vytvoř insighty:

${JSON.stringify(dataContext, null, 2)}

Vrať:
1. Vzory v učení (kdy studuje nejčastěji, jak dlouho)
2. Efektivita — které metody fungují nejlépe (FC vs MCQ vs čtení)
3. Předpověď — při současném tempu, kdy bude ready na atestaci
4. Optimalizace — co konkrétně zlepšit`;
    } else {
      return res.status(400).json({ error: `Unknown mode: ${mode}` });
    }

    const result = await callGemini(userPrompt, {
      system: systemPrompt,
      maxTokens: 2048,
      temperature: 0.4,
    });

    // Log cost
    try {
      await supabase.from('api_call_log').insert({
        source: 'gemini-analytics',
        mode,
        model: result.model,
        input_tokens: result.input_tokens,
        output_tokens: result.output_tokens,
        cost_usd: result.cost_usd,
        success: true,
      });
    } catch (_) {}

    return res.status(200).json({
      report: result.text,
      mode,
      model: result.model,
      cost_usd: result.cost_usd,
      data_summary: {
        topics_tracked: (mastery || []).length,
        weekly_sessions: dataContext.weekly_sessions,
        weekly_study_minutes: dataContext.weekly_study_minutes,
        tests_taken: (tests || []).length,
      },
    });

  } catch (error: any) {
    console.error('[ai-analytics] error:', error);
    return res.status(500).json({ error: error.message || 'Analytics failed' });
  }
}
