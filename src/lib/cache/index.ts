// src/lib/cache/index.ts
import { createHash } from 'crypto';
import { supabase } from '../supabase';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 7 days)
  skipCache?: boolean;
}

export interface CachedResponse {
  response: any;
  metadata: {
    cached: boolean;
    cacheHit?: boolean;
    cacheAge?: number; // seconds
    totalHits?: number;
  };
}

/**
 * Generate cache key from mode and context
 */
export function generateCacheKey(mode: string, context: any): string {
  const normalized = JSON.stringify({
    mode,
    context: sortObject(context) // Normalize object order
  });
  
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Normalize object keys for consistent hashing
 */
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

/**
 * Get cached response
 */
export async function getCached(
  mode: string,
  context: any
): Promise<CachedResponse | null> {
  try {
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

/**
 * Save to cache
 */
export async function setCache(
  mode: string,
  context: any,
  response: any,
  options: CacheOptions = {}
): Promise<void> {
  try {
    const cacheKey = generateCacheKey(mode, context);
    const ttl = options.ttl || 7 * 24 * 60 * 60; // 7 days default
    
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

/**
 * Clear cache by mode or all
 */
export async function clearCache(mode?: string): Promise<number> {
  try {
    let query = supabase.from('ai_generation_cache').delete();
    
    if (mode) {
      query = query.eq('mode', mode);
    } else {
      query = query.neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    }
    
    const { error, count } = await query;
    
    if (error) throw error;
    
    console.log(`[Cache] Cleared ${count || 0} entries`);
    return count || 0;
  } catch (error) {
    console.error('[Cache] Clear error:', error);
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    const { data, error } = await supabase.rpc('get_cache_stats');
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('[Cache] Stats error:', error);
    return null;
  }
}
