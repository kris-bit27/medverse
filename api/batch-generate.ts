/**
 * batch-generate.ts — Admin batch content generation
 * 
 * Processes topics from batch_generation_queue sequentially:
 *   1. fulltext (Opus) → 2. high_yield (Sonnet, from fulltext) → 
 *   3. flashcards (Haiku) → 4. review (GPT-4o)
 * 
 * Supports prompt caching for same-specialty topics.
 */
import { supabaseAdmin } from './_supabaseAdmin.js';

const GENERATE_TOPIC_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}/api/generate-topic`
  : 'http://localhost:3000/api/generate-topic';

interface QueueItem {
  id: string;
  topic_id: string;
  modes: string[];
  status: string;
  topics: {
    id: string;
    title: string;
    description: string | null;
    full_text_content: string | null;
    obory: { name: string } | null;
    okruhy: { name: string } | null;
  };
}

// Pipeline: each mode depends on previous
const PIPELINE_ORDER = ['fulltext', 'high_yield', 'flashcards'];

async function callGenerateTopic(mode: string, context: any, authHeader?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;

  const res = await fetch(GENERATE_TOPIC_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ mode, context }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`generate-topic ${mode} failed (${res.status}): ${text.substring(0, 200)}`);
  }

  return res.json();
}

async function processQueueItem(item: QueueItem, authHeader?: string) {
  const topic = item.topics;
  const results: Record<string, any> = {};
  let fullText = topic.full_text_content || '';

  // Mark as processing
  await supabaseAdmin.from('batch_generation_queue')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', item.id);

  const modes = item.modes.length > 0 ? item.modes : PIPELINE_ORDER;

  for (const mode of modes) {
    // Skip high_yield/flashcards if no fulltext yet and not generating it
    if ((mode === 'high_yield' || mode === 'flashcards') && !fullText && !modes.includes('fulltext')) {
      results[mode] = { skipped: true, reason: 'No fulltext available' };
      continue;
    }

    const context: any = {
      specialty: topic.obory?.name || '',
      okruh: topic.okruhy?.name || '',
      title: topic.title,
      description: topic.description || '',
    };

    // For high_yield and flashcards, pass the fulltext
    if (mode === 'high_yield' || mode === 'flashcards' || mode === 'mcq') {
      context.full_text = fullText;
    }

    console.log(`[batch] Processing ${topic.title} — mode=${mode}`);

    const result = await callGenerateTopic(mode, context, authHeader);
    results[mode] = result;

    // If we just generated fulltext, save it and use for subsequent modes
    if (mode === 'fulltext' && result.full_text) {
      fullText = result.full_text;

      await supabaseAdmin.from('topics').update({
        full_text_content: result.full_text,
        ai_model: result.metadata?.model,
        ai_confidence: result.confidence || 0.8,
        ai_generated_at: new Date().toISOString(),
        ai_cost: parseFloat(result.metadata?.cost?.total || '0'),
        last_ai_model_used: result.metadata?.model,
        last_ai_cost: parseFloat(result.metadata?.cost?.total || '0'),
        sources: result.sources ? JSON.stringify(result.sources) : '[]',
        warnings: result.warnings ? JSON.stringify(result.warnings) : '[]',
        status: 'draft',
      }).eq('id', topic.id);
    }

    if (mode === 'high_yield' && result.high_yield) {
      await supabaseAdmin.from('topics').update({
        bullet_points_summary: result.high_yield,
      }).eq('id', topic.id);
    }

    if (mode === 'deep_dive' && result.deep_dive) {
      await supabaseAdmin.from('topics').update({
        deep_dive_content: result.deep_dive,
      }).eq('id', topic.id);
    }

    if (mode === 'flashcards' && result.flashcards) {
      // Insert flashcards into DB
      const cards = result.flashcards.map((card: any) => ({
        topic_id: topic.id,
        question: card.question,
        answer: card.answer,
        difficulty: card.difficulty || 2,
        tags: card.tags || [],
        ai_generated: true,
        ai_model: result.metadata?.model || 'claude-haiku-4-5',
        ai_confidence: result.confidence || 0.85,
      }));

      if (cards.length > 0) {
        await supabaseAdmin.from('flashcards').insert(cards);
      }
    }

    if (mode === 'mcq' && result.questions) {
      const questions = result.questions.map((q: any) => ({
        topic_id: topic.id,
        question_text: q.question_text,
        question_type: 'multiple_choice',
        correct_answer: JSON.stringify({
          answer: q.correct_answer,
          options: q.options,
        }),
        explanation: q.explanation,
        difficulty: q.difficulty || 2,
        tags: q.tags || [],
      }));

      if (questions.length > 0) {
        await supabaseAdmin.from('questions').insert(questions);
      }
    }
  }

  return results;
}

export default async function handler(req: any, res: any) {
  // CORS
  const ALLOWED_ORIGINS = ['https://medverse-gilt.vercel.app', 'https://medverse.cz', 'https://www.medverse.cz', 'http://localhost:3000', 'http://localhost:5173'];
  const origin = req.headers?.origin;
  if (ALLOWED_ORIGINS.includes(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Access-Control-Allow-Credentials', 'true'); }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  const { action, topic_ids, modes } = req.body || {};

  try {
    // ─── Action: enqueue ───
    if (action === 'enqueue') {
      if (!topic_ids || !Array.isArray(topic_ids) || topic_ids.length === 0) {
        return res.status(400).json({ error: 'topic_ids required (array)' });
      }

      if (topic_ids.length > 50) {
        return res.status(400).json({ error: 'Max 50 topics per batch' });
      }

      // Get user from auth
      let userId: string | null = null;
      if (authHeader?.startsWith('Bearer ')) {
        const { data } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = data?.user?.id || null;
      }

      const queueItems = topic_ids.map((tid: string, i: number) => ({
        topic_id: tid,
        modes: modes || PIPELINE_ORDER,
        status: 'pending',
        priority: topic_ids.length - i, // First topics get higher priority
        created_by: userId,
      }));

      const { data, error } = await supabaseAdmin
        .from('batch_generation_queue')
        .insert(queueItems)
        .select('id, topic_id, modes, status');

      if (error) throw error;

      return res.status(200).json({
        queued: data?.length || 0,
        items: data,
        message: `${data?.length} topics queued for generation`,
      });
    }

    // ─── Action: process (run next pending items) ───
    if (action === 'process') {
      const limit = Math.min(req.body.limit || 5, 10);

      // Get pending items with topic details
      const { data: items, error } = await supabaseAdmin
        .from('batch_generation_queue')
        .select(`
          id, topic_id, modes, status,
          topics:topic_id (
            id, title, description, full_text_content,
            obory:obor_id (name),
            okruhy:okruh_id (name)
          )
        `)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      if (!items || items.length === 0) {
        return res.status(200).json({ processed: 0, message: 'Queue empty' });
      }

      const results = [];

      for (const item of items as any[]) {
        try {
          const result = await processQueueItem(item, authHeader);

          await supabaseAdmin.from('batch_generation_queue').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result,
          }).eq('id', item.id);

          results.push({ topic_id: item.topic_id, status: 'completed', title: item.topics?.title });
        } catch (err: any) {
          console.error(`[batch] Failed: ${item.topics?.title}`, err.message);

          await supabaseAdmin.from('batch_generation_queue').update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: err.message?.substring(0, 500),
          }).eq('id', item.id);

          results.push({ topic_id: item.topic_id, status: 'failed', error: err.message?.substring(0, 200) });
        }
      }

      return res.status(200).json({ processed: results.length, results });
    }

    // ─── Action: status ───
    if (action === 'status') {
      const { data } = await supabaseAdmin
        .from('batch_generation_queue')
        .select('status, count:id')
        .then(({ data }) => {
          // Manual grouping
          const counts: Record<string, number> = {};
          (data || []).forEach((r: any) => {
            counts[r.status] = (counts[r.status] || 0) + 1;
          });
          return { data: counts };
        });

      const { data: recent } = await supabaseAdmin
        .from('batch_generation_queue')
        .select(`
          id, topic_id, modes, status, error_message, created_at, completed_at,
          topics:topic_id (title)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      return res.status(200).json({ counts: data, recent });
    }

    return res.status(400).json({ error: 'Unknown action. Use: enqueue, process, or status' });

  } catch (error: any) {
    console.error('[batch-generate]', error);
    return res.status(500).json({ error: error.message });
  }
}
