import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { supabase } from '@/lib/supabase';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
const base44Client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

const mapSupabaseUser = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
    role: user.app_metadata?.role || user.user_metadata?.role || 'student',
    settings: user.user_metadata?.settings || null,
    ...user.user_metadata,
    _supabase: user
  };
};

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const wrapListLike = (fn) => async (...args) => {
  const result = await fn(...args);
  return normalizeArray(result);
};

if (base44Client?.entities) {
  Object.values(base44Client.entities).forEach((entity) => {
    if (!entity) return;
    if (typeof entity.list === 'function') {
      entity.list = wrapListLike(entity.list.bind(entity));
    }
    if (typeof entity.filter === 'function') {
      entity.filter = wrapListLike(entity.filter.bind(entity));
    }
  });
}

base44Client.auth = {
  me: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      const err = error || new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    return mapSupabaseUser(data.user);
  },
  updateMe: async (updates = {}) => {
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    });
    if (error) {
      throw error;
    }
    return mapSupabaseUser(data.user);
  },
  logout: async (redirectTo) => {
    await supabase.auth.signOut();
    if (redirectTo) {
      window.location.href = redirectTo;
    }
  },
  redirectToLogin: (returnTo) => {
    const target = returnTo || window.location.href;
    window.location.href = `/login?redirectTo=${encodeURIComponent(target)}`;
  }
};

export const base44 = base44Client;
