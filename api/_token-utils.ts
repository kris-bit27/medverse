/**
 * Token management utilities for AI usage
 * 
 * Token costs per operation:
 *   copilot_question    → 5 tokens
 *   med_search_answer   → 10 tokens  
 *   study_set_generate  → 15 tokens
 *   weekly_report       → 3 tokens
 *   study_insights      → 3 tokens
 *   med_search_pubmed   → 0 tokens (free, no AI)
 */

import { createClient } from '@supabase/supabase-js';

const TOKEN_COSTS: Record<string, number> = {
  copilot_question: 5,
  med_search_answer: 10,
  med_search_pubmed: 0,
  study_set_summary: 15,
  study_set_quiz: 15,
  study_set_plan: 15,
  weekly_report: 3,
  study_insights: 3,
  content_feedback: 2,
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
    // Initialize tokens for new user
    const { data: newTokens } = await supabase
      .from('user_tokens')
      .insert({ user_id: userId, current_tokens: 1000, monthly_limit: 1000 })
      .select('current_tokens, monthly_limit')
      .single();
    
    return {
      allowed: (newTokens?.current_tokens || 1000) >= cost,
      remaining: newTokens?.current_tokens || 1000,
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
