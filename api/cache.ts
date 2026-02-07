// api/cache.ts
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

if (!supabase) {
  console.warn('[Cache] Disabled: missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY');
}

export interface CachedResponse {
  response: any;
  metadata: {
    cached: boolean;
    cacheHit?: boolean;
    cacheAge?: number;
    totalHits?: number;
  };
}

function sortObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObject);
  
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = sortObject(obj[key]);
      return acc;
    }, {} as any);
}

export function generateCacheKey(mode: string, context: any): string {
  const geminiModel =
    process.env.GEMINI_HIGH_YIELD_MODEL ||
    process.env.GEMINI_MODEL ||
    'gemini-1.5-flash';
  const modelHint =
    mode === 'topic_generate_high_yield'
      ? `google:${geminiModel}`
      : 'anthropic:claude-sonnet-4';
  const normalized = JSON.stringify({
    mode,
    modelHint,
    context: sortObject(context)
  });
  
  return createHash('sha256').update(normalized).digest('hex');
}

export async function getCached(
  mode: string,
  context: any
): Promise<CachedResponse | null> {
  try {
    if (!supabase) return null;
    const cacheKey = generateCacheKey(mode, context);
    
    console.log('[Cache] Looking up:', cacheKey.substring(0, 16) + '...');
    
    const { data, error } = await supabase
      .from('ai_generation_cache')
      .select('*')
      .eq('prompt_hash', cacheKey)
      .single();
    
    if (error || !data) {
      console.log('[Cache] MISS');
      return null;
    }
    
    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      console.log('[Cache] EXPIRED');
      await supabase
        .from('ai_generation_cache')
        .delete()
        .eq('id', data.id);
      return null;
    }
    
    // Update access time and hit count
    await supabase
      .from('ai_generation_cache')
      .update({
        hits: data.hits + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', data.id);
    
    const cacheAge = Math.floor(
      (Date.now() - new Date(data.created_at).getTime()) / 1000
    );
    
    console.log('[Cache] HIT! Age:', cacheAge, 'seconds, Total hits:', data.hits + 1);
    
    return {
      response: data.response,
      metadata: {
        cached: true,
        cacheHit: true,
        cacheAge,
        totalHits: data.hits + 1
      }
    };
  } catch (error) {
    console.error('[Cache] Error:', error);
    return null;
  }
}

export async function setCache(
  mode: string,
  context: any,
  response: any,
  ttl: number = 7 * 24 * 60 * 60
): Promise<void> {
  try {
    if (!supabase) return;
    const cacheKey = generateCacheKey(mode, context);
    
    console.log('[Cache] Saving:', cacheKey.substring(0, 16) + '...');
    
    const expiresAt = ttl > 0 
      ? new Date(Date.now() + ttl * 1000).toISOString()
      : null;
    
    const { error } = await supabase
      .from('ai_generation_cache')
      .upsert({
        prompt_hash: cacheKey,
        mode,
        context,
        response,
        model: response.metadata?.model,
        tokens_used: response.metadata?.tokensUsed,
        cost: parseFloat(response.metadata?.cost?.total || 0),
        expires_at: expiresAt,
        last_accessed_at: new Date().toISOString()
      }, {
        onConflict: 'prompt_hash'
      });
    
    if (error) {
      console.error('[Cache] Save error:', error);
    } else {
      console.log('[Cache] Saved successfully');
    }
  } catch (error) {
    console.error('[Cache] Error:', error);
  }
}
