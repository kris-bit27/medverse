// functions/_shared/supabaseAdmin.ts
// Shared helper replacing @base44/sdk for all edge functions

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/**
 * Returns a Supabase client with service_role privileges.
 * Use for server-side operations that bypass RLS.
 */
export function getSupabaseAdmin(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Extract the authenticated user from the request's Authorization header.
 * Returns null if no valid token is found.
 */
export async function getUserFromRequest(
  req: Request,
): Promise<{ id: string; email?: string; role?: string; [key: string]: any } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  // Fetch role from user metadata or user_profiles
  const role = user.user_metadata?.role || 'student';

  return {
    id: user.id,
    email: user.email,
    role,
    ...user.user_metadata,
  };
}

/**
 * Standard CORS headers for edge functions
 */
export function corsHeaders(origin?: string): Record<string, string> {
  const ALLOWED_ORIGINS = ['https://medverse-gilt.vercel.app', 'https://medverse.cz', 'https://www.medverse.cz', 'http://localhost:3000', 'http://localhost:5173'];
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : 'https://medverse.cz';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-client-info, apikey',
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }
  return null;
}
