/**
 * Shared authentication utilities for API routes.
 *
 * Usage:
 *   const userId = await getUserId(req, res);        // returns null + 401 if unauthenticated
 *   const userId = await requireAdmin(req, res);     // returns null + 403 if not admin/editor
 *   const userId = await getOptionalUserId(req);     // returns userId or null (no error response)
 */
import { supabaseAdmin } from './_supabaseAdmin.js';

/**
 * Extract authenticated user ID from Bearer token.
 * Returns userId or null (sends 401 response if unauthenticated).
 */
export async function getUserId(req: any, res: any): Promise<string | null> {
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized — missing Bearer token' });
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ error: 'Unauthorized — invalid token' });
      return null;
    }
    return data.user.id;
  } catch {
    res.status(401).json({ error: 'Unauthorized — token verification failed' });
    return null;
  }
}

/**
 * Extract user ID from Bearer token without sending error response.
 * Returns userId or null.
 */
export async function getOptionalUserId(req: any): Promise<string | null> {
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '');
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

/**
 * Require admin or editor role. Returns userId or null (sends 403 if not admin).
 */
export async function requireAdmin(req: any, res: any): Promise<string | null> {
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized — missing Bearer token' });
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ error: 'Unauthorized — invalid token' });
      return null;
    }

    const role = data.user.app_metadata?.role;
    if (role !== 'admin' && role !== 'editor') {
      res.status(403).json({ error: 'Forbidden — admin access required' });
      return null;
    }

    return data.user.id;
  } catch {
    res.status(401).json({ error: 'Unauthorized — token verification failed' });
    return null;
  }
}
