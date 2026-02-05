// @ts-nocheck
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
  const rawDisciplines = user.user_metadata?.clinical_disciplines || user.app_metadata?.clinical_disciplines;
  const clinical_disciplines = Array.isArray(rawDisciplines)
    ? rawDisciplines
    : rawDisciplines
      ? [rawDisciplines].flat().filter(Boolean)
      : [];
  return {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
    role: user.app_metadata?.role || user.user_metadata?.role || 'student',
    settings: user.user_metadata?.settings || null,
    clinical_disciplines,
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

const DATA_BACKEND = import.meta.env.VITE_DATA_BACKEND || 'supabase';
const USE_SUPABASE = DATA_BACKEND !== 'base44';

const ENTITY_TABLES = {
  Question: 'questions',
  Okruh: 'okruhy',
  Topic: 'topics',
  ClinicalDiscipline: 'clinical_disciplines',
  Article: 'articles',
  Tool: 'tools',
  UserProgress: 'user_progress',
  Bookmark: 'bookmarks',
  StudyPlan: 'study_plans',
  StudyTask: 'study_tasks',
  StudyPackage: 'study_packages',
  StudyPack: 'study_packs',
  StudyPackOutput: 'study_pack_outputs',
  StudyPackFile: 'study_pack_files',
  ForumThread: 'forum_threads',
  LogbookEntry: 'logbook_entries',
  CaseLog: 'case_logs'
};

const toSnakeCase = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();

const getTableName = (entityName) => ENTITY_TABLES[entityName] || toSnakeCase(entityName);

const parseOrder = (order) => {
  if (!order || typeof order !== 'string') return null;
  const desc = order.startsWith('-');
  return { column: desc ? order.slice(1) : order, ascending: !desc };
};

const applyFilters = (query, filters = {}) => {
  if (!filters || typeof filters !== 'object') return query;
  Object.entries(filters).forEach(([key, value]) => {
    if (value && typeof value === 'object' && '$in' in value) {
      query = query.in(key, value.$in);
      return;
    }
    if (value === null) {
      query = query.is(key, null);
      return;
    }
    query = query.eq(key, value);
  });
  return query;
};

const supabaseList = async (entityName, { order, limit } = {}) => {
  if (!USE_SUPABASE) return null;
  const table = getTableName(entityName);
  let query = supabase.from(table).select('*');
  const orderConfig = parseOrder(order);
  if (orderConfig) {
    query = query.order(orderConfig.column, { ascending: orderConfig.ascending });
  }
  if (typeof limit === 'number') {
    query = query.limit(limit);
  }
  const { data, error } = await query;
  if (error) throw error;
  return normalizeArray(data);
};

const supabaseFilter = async (entityName, filters, { order, limit } = {}) => {
  if (!USE_SUPABASE) return null;
  const table = getTableName(entityName);
  let query = supabase.from(table).select('*');
  query = applyFilters(query, filters);
  const orderConfig = parseOrder(order);
  if (orderConfig) {
    query = query.order(orderConfig.column, { ascending: orderConfig.ascending });
  }
  if (typeof limit === 'number') {
    query = query.limit(limit);
  }
  const { data, error } = await query;
  if (error) throw error;
  return normalizeArray(data);
};

const supabaseCreate = async (entityName, payload) => {
  if (!USE_SUPABASE) return null;
  const table = getTableName(entityName);
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw error;
  return data;
};

const supabaseUpdate = async (entityName, id, payload) => {
  if (!USE_SUPABASE) return null;
  const table = getTableName(entityName);
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

const supabaseDelete = async (entityName, id) => {
  if (!USE_SUPABASE) return null;
  const table = getTableName(entityName);
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
};

const withFallback = async (primaryFn, fallbackFn, label) => {
  try {
    const result = await primaryFn();
    if (result !== null && result !== undefined) return result;
  } catch (error) {
    console.warn(`[Data] ${label} failed, falling back to Base44`, error);
  }
  if (fallbackFn) {
    try {
      return await fallbackFn();
    } catch (error) {
      console.warn(`[Data] Base44 ${label} failed`, error);
      return [];
    }
  }
  return [];
};

if (base44Client?.entities) {
  Object.entries(base44Client.entities).forEach(([entityName, entity]) => {
    if (!entity) return;
    if (typeof entity.list === 'function') {
      const base44List = entity.list.bind(entity);
      entity.list = async (...args) => {
        const [order, limit] = args;
        return withFallback(
          () => supabaseList(entityName, { order, limit }),
          () => base44List(...args),
          `${entityName}.list`
        );
      };
    }
    if (typeof entity.filter === 'function') {
      const base44Filter = entity.filter.bind(entity);
      entity.filter = async (...args) => {
        const [filters, order, limit] = args;
        return withFallback(
          () => supabaseFilter(entityName, filters, { order, limit }),
          () => base44Filter(...args),
          `${entityName}.filter`
        );
      };
    }
    if (typeof entity.create === 'function') {
      const base44Create = entity.create.bind(entity);
      entity.create = async (payload) => withFallback(
        () => supabaseCreate(entityName, payload),
        () => base44Create(payload),
        `${entityName}.create`
      );
    }
    if (typeof entity.update === 'function') {
      const base44Update = entity.update.bind(entity);
      entity.update = async (id, payload) => withFallback(
        () => supabaseUpdate(entityName, id, payload),
        () => base44Update(id, payload),
        `${entityName}.update`
      );
    }
    if (typeof entity.delete === 'function') {
      const base44Delete = entity.delete.bind(entity);
      entity.delete = async (id) => withFallback(
        () => supabaseDelete(entityName, id),
        () => base44Delete(id),
        `${entityName}.delete`
      );
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
