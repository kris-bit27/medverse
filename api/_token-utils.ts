/**
 * Token management utilities for AI usage
 *
 * Token costs per operation:
 *   copilot_question    → 5 tokens  (AI Copilot)
 *   ddx_analysis        → 8 tokens  (AI Konzultant — DDx)
 *   treatment_plan      → 8 tokens  (AI Konzultant — Léčba)
 *   drug_interactions   → 5 tokens  (AI Konzultant — Interakce)
 *   med_search_answer   → 6 tokens  (Med Search AI odpověď)
 *   med_search_pubmed   → 0 tokens  (free, no AI call)
 *   study_set_summary   → 10 tokens (Study set generace)
 *   study_set_quiz      → 10 tokens (Study set kvíz)
 *   study_set_plan      → 10 tokens (Study set plán)
 *   weekly_report       → 0 tokens  (free)
 *   study_insights      → 0 tokens  (free)
 *   content_feedback    → 0 tokens  (free)
 *
 * Plan tiers:
 *   free    → 50 tokens/month
 *   premium → 2 000 tokens/month
 *   pro     → 8 000 tokens/month
 */

import { createClient } from '@supabase/supabase-js';

const TOKEN_COSTS: Record<string, number> = {
  // AI Copilot
  copilot_question: 5,

  // AI Konzultant (3 modes)
  ddx_analysis: 8,
  treatment_plan: 8,
  drug_interactions: 5,

  // Med Search
  med_search_answer: 6,
  med_search_pubmed: 0, // free, no AI call

  // Study sets
  study_set_summary: 10,
  study_set_quiz: 10,
  study_set_plan: 10,

  // Free operations (no token cost)
  weekly_report: 0,
  study_insights: 0,
  content_feedback: 0,
};

export function getTokenCost(operation: string): number {
  return TOKEN_COSTS[operation] ?? 5;
}

/**
 * Check if user has enough tokens for an operation.
 * Returns { allowed, remaining, cost } 
 */
export async function checkTokens(
  supabase: any,
  userId: string,
  operation: string
): Promise<{ allowed: boolean; remaining: number; cost: number }> {
  const cost = getTokenCost(operation);
  if (cost === 0) return { allowed: true, remaining: -1, cost: 0 };

  const { data: tokens } = await supabase
    .from('user_tokens')
    .select('current_tokens, monthly_limit')
    .eq('user_id', userId)
    .single();

  if (!tokens) {
    // Initialize tokens for new user (free tier: 50 tokens)
    const { data: newTokens } = await supabase
      .from('user_tokens')
      .insert({ user_id: userId, current_tokens: 50, monthly_limit: 50, plan_tier: 'free' })
      .select('current_tokens, monthly_limit')
      .single();

    return {
      allowed: (newTokens?.current_tokens || 50) >= cost,
      remaining: newTokens?.current_tokens || 50,
      cost,
    };
  }

  return {
    allowed: tokens.current_tokens >= cost,
    remaining: tokens.current_tokens,
    cost,
  };
}

/**
 * Atomically deduct tokens using PostgreSQL RPC (SELECT ... FOR UPDATE).
 * Falls back to non-atomic deduction if RPC is not yet deployed.
 */
export async function deductTokens(
  supabase: any,
  userId: string,
  operation: string,
  description?: string,
  _metadata?: Record<string, any>
): Promise<{ remaining: number; cost: number }> {
  const cost = getTokenCost(operation);
  if (cost === 0) return { remaining: -1, cost: 0 };

  // Try atomic RPC first (requires 001_atomic_token_deduction.sql migration)
  try {
    const { data, error } = await supabase.rpc('deduct_tokens_atomic', {
      p_user_id: userId,
      p_cost: cost,
      p_operation: operation,
      p_description: description || operation,
    });

    if (!error && data && data.length > 0) {
      const row = data[0];
      if (!row.allowed) {
        throw new Error(`Nedostatek tokenu. Potreba: ${cost}, zbyva: ${row.remaining}`);
      }
      return { remaining: row.remaining, cost };
    }

    // If RPC doesn't exist yet, fall through to legacy path
    if (error?.code === '42883') {
      // function does not exist — use legacy fallback
    } else if (error) {
      throw error;
    }
  } catch (rpcErr: any) {
    if (rpcErr.message?.includes('Nedostatek')) throw rpcErr;
    // Fall through to legacy path for other errors
  }

  // Legacy fallback (non-atomic — remove after running migration)
  const { data: tokens, error: fetchErr } = await supabase
    .from('user_tokens')
    .select('current_tokens, total_tokens_used')
    .eq('user_id', userId)
    .single();

  if (fetchErr || !tokens) {
    throw new Error('Token balance not found');
  }

  if (tokens.current_tokens < cost) {
    throw new Error(`Nedostatek tokenu. Potreba: ${cost}, zbyva: ${tokens.current_tokens}`);
  }

  const newBalance = tokens.current_tokens - cost;

  const { error: updateErr } = await supabase
    .from('user_tokens')
    .update({
      current_tokens: newBalance,
      total_tokens_used: (tokens.total_tokens_used || 0) + cost,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (updateErr) throw updateErr;

  try {
    await supabase.from('token_transactions').insert({
      user_id: userId,
      amount: -cost,
      type: 'usage',
      description: description || operation,
      related_entity_type: operation,
    });
  } catch (_) {
    // Non-critical
  }

  return { remaining: newBalance, cost };
}
