import { supabase } from '@/lib/supabase';

/**
 * Call a Vercel serverless API function.
 * Replaces callApi() — same auth, same endpoint pattern.
 */
export async function callApi(name, payload) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`/api/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API ${name} failed (${res.status})`);
  }
  return res.json();
}
