// @ts-nocheck
import { supabase } from '@/lib/supabase';

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

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

const ENTITY_TABLES = {
  Question: 'questions',
  Okruh: 'okruhy',
  Topic: 'topics',
  ClinicalDiscipline: 'clinical_disciplines',
  Article: 'articles',
  Tool: 'tools',
  User: 'users',
  UserProgress: 'user_progress',
  UserNote: 'user_notes',
  Bookmark: 'bookmarks',
  StudyPlan: 'study_plans',
  StudyTask: 'study_tasks',
  StudyPackage: 'study_packages',
  StudyPack: 'study_packs',
  StudyPackOutput: 'study_pack_outputs',
  StudyPackFile: 'study_pack_files',
  StudyPackChunk: 'study_pack_chunks',
  ForumThread: 'forum_threads',
  ForumPost: 'forum_posts',
  LogbookEntry: 'logbook_entries',
  CaseLog: 'case_logs',
  AuditLog: 'audit_logs'
};

const toSnakeCase = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();

const ENTITY_CONFIG = {
  ClinicalDiscipline: {
    table: 'obory',
    fieldMap: {
      order: 'order_index'
    }
  },
  Okruh: {
    table: 'okruhy',
    fieldMap: {
      title: 'name',
      clinical_discipline_id: 'obor_id',
      order: 'order_index'
    },
    fromDb: (row) => ({
      ...row,
      title: row.title ?? row.name ?? '',
      clinical_discipline_id: row.clinical_discipline_id ?? row.obor_id ?? null
    })
  }
};

const getEntityConfig = (entityName) => ENTITY_CONFIG[entityName] || null;

const getTableName = (entityName) =>
  getEntityConfig(entityName)?.table || ENTITY_TABLES[entityName] || toSnakeCase(entityName);

const mapToDbFields = (entityName, payload) => {
  const config = getEntityConfig(entityName);
  if (!config?.fieldMap || !payload || typeof payload !== 'object') return payload;
  const out = { ...payload };
  Object.entries(config.fieldMap).forEach(([from, to]) => {
    if (from in out) {
      if (!(to in out)) out[to] = out[from];
      delete out[from];
    }
  });
  return out;
};

const mapFromDbFields = (entityName, row) => {
  const config = getEntityConfig(entityName);
  if (!config?.fromDb || !row) return row;
  return config.fromDb(row);
};

const mapFiltersToDb = (entityName, filters) => {
  if (!filters || typeof filters !== 'object') return filters;
  return mapToDbFields(entityName, filters);
};

const mapOrderColumn = (entityName, column) => {
  const config = getEntityConfig(entityName);
  if (config?.fieldMap && config.fieldMap[column]) {
    return config.fieldMap[column];
  }
  return column;
};

const parseOrder = (order, entityName) => {
  if (!order || typeof order !== 'string') return null;
  const desc = order.startsWith('-');
  const rawColumn = desc ? order.slice(1) : order;
  const column = mapOrderColumn(entityName, rawColumn);
  return { column, ascending: !desc };
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
  const table = getTableName(entityName);
  let query = supabase.from(table).select('*');
  const orderConfig = parseOrder(order, entityName);
  if (orderConfig) {
    query = query.order(orderConfig.column, { ascending: orderConfig.ascending });
  }
  if (typeof limit === 'number') {
    query = query.limit(limit);
  }
  const { data, error } = await query;
  if (error) throw error;
  return normalizeArray(data).map((row) => mapFromDbFields(entityName, row));
};

const supabaseFilter = async (entityName, filters, { order, limit } = {}) => {
  const table = getTableName(entityName);
  let query = supabase.from(table).select('*');
  query = applyFilters(query, mapFiltersToDb(entityName, filters));
  const orderConfig = parseOrder(order, entityName);
  if (orderConfig) {
    query = query.order(orderConfig.column, { ascending: orderConfig.ascending });
  }
  if (typeof limit === 'number') {
    query = query.limit(limit);
  }
  const { data, error } = await query;
  if (error) throw error;
  return normalizeArray(data).map((row) => mapFromDbFields(entityName, row));
};

const supabaseGet = async (entityName, id) => {
  const table = getTableName(entityName);
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return mapFromDbFields(entityName, data);
};

const supabaseCreate = async (entityName, payload) => {
  const table = getTableName(entityName);
  const { data, error } = await supabase.from(table).insert(mapToDbFields(entityName, payload)).select().single();
  if (error) throw error;
  return mapFromDbFields(entityName, data);
};

const supabaseBulkCreate = async (entityName, payloads) => {
  const table = getTableName(entityName);
  const mappedPayloads = Array.isArray(payloads)
    ? payloads.map((payload) => mapToDbFields(entityName, payload))
    : payloads;
  const { data, error } = await supabase.from(table).insert(mappedPayloads).select();
  if (error) throw error;
  return normalizeArray(data).map((row) => mapFromDbFields(entityName, row));
};

const supabaseUpdate = async (entityName, id, payload) => {
  const table = getTableName(entityName);
  const { data, error } = await supabase
    .from(table)
    .update(mapToDbFields(entityName, payload))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapFromDbFields(entityName, data);
};

const supabaseDelete = async (entityName, id) => {
  const table = getTableName(entityName);
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
};

const createEntityClient = (entityName) => ({
  list: (order, limit) => supabaseList(entityName, { order, limit }),
  filter: (filters, order, limit) => supabaseFilter(entityName, filters, { order, limit }),
  get: (id) => supabaseGet(entityName, id),
  create: (payload) => supabaseCreate(entityName, payload),
  bulkCreate: (payloads) => supabaseBulkCreate(entityName, payloads),
  update: (id, payload) => supabaseUpdate(entityName, id, payload),
  delete: (id) => supabaseDelete(entityName, id)
});

const entities = new Proxy({}, {
  get(target, prop) {
    if (typeof prop !== 'string') return target[prop];
    if (!target[prop]) {
      target[prop] = createEntityClient(prop);
    }
    return target[prop];
  }
});

const callApi = async (name, payload) => {
  const res = await fetch(`/api/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API ${name} failed (${res.status})`);
  }
  return res.json();
};

const uploadFileToSupabase = async ({ file }) => {
  if (!file) throw new Error('Missing file');
  const bucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'uploads';
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id || 'anon';
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const path = `${userId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type || 'application/octet-stream' });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('Upload succeeded but public URL is missing. Check bucket public access.');
  }

  return { file_url: data.publicUrl, path, bucket };
};

const AGENTS_STORAGE_KEY = 'mv_agents_conversations_v1';
const agentListeners = new Map();

const loadAgentStore = () => {
  try {
    const raw = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (!raw) return { conversations: [] };
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.conversations) ? parsed : { conversations: [] };
  } catch {
    return { conversations: [] };
  }
};

const saveAgentStore = (store) => {
  localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(store));
};

const notifyAgentListeners = (conv) => {
  const listeners = agentListeners.get(conv.id);
  if (!listeners) return;
  listeners.forEach((cb) => cb({ ...conv }));
};

const upsertConversation = (conv) => {
  const store = loadAgentStore();
  const idx = store.conversations.findIndex((c) => c.id === conv.id);
  if (idx >= 0) {
    store.conversations[idx] = conv;
  } else {
    store.conversations.unshift(conv);
  }
  saveAgentStore(store);
  notifyAgentListeners(conv);
  return conv;
};

const getConversationById = (id) => {
  const store = loadAgentStore();
  return store.conversations.find((c) => c.id === id) || null;
};

const agents = {
  listConversations: async ({ agent_name } = {}) => {
    const store = loadAgentStore();
    const list = agent_name
      ? store.conversations.filter((c) => c.agent_name === agent_name)
      : store.conversations;
    return [...list].sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  },
  createConversation: async ({ agent_name, metadata } = {}) => {
    const conv = {
      id: crypto.randomUUID(),
      agent_name: agent_name || 'copilot',
      metadata: metadata || {},
      messages: [],
      created_at: Date.now(),
      updated_at: Date.now()
    };
    return upsertConversation(conv);
  },
  getConversation: async (id) => {
    const conv = getConversationById(id);
    if (!conv) throw new Error('Conversation not found');
    return conv;
  },
  subscribeToConversation: (id, callback) => {
    if (!agentListeners.has(id)) agentListeners.set(id, new Set());
    agentListeners.get(id).add(callback);
    const current = getConversationById(id);
    if (current) callback({ ...current });
    return () => {
      const set = agentListeners.get(id);
      if (!set) return;
      set.delete(callback);
      if (set.size === 0) agentListeners.delete(id);
    };
  },
  addMessage: async (conversation, message) => {
    const conv = getConversationById(conversation.id);
    if (!conv) throw new Error('Conversation not found');
    const now = Date.now();
    conv.messages = [...(conv.messages || []), message];
    conv.updated_at = now;
    upsertConversation(conv);

    const mode = message?.pageContext ? 'floating_copilot_chat' : 'copilot_chat';
    let assistantText = '';
    let confidence = { level: 'low', reason: 'Neznámá' };
    let citations = { internal: [], external: [] };

    try {
      const response = await callApi('invokeEduLLM', {
        mode,
        userPrompt: message.content,
        pageContext: message.pageContext || null
      });
      assistantText = response.text || response.answer_md || response.high_yield || response.deep_dive || response.full_text || '';
      confidence = response.confidence || confidence;
      citations = response.citations || citations;
    } catch (error) {
      assistantText = `⚠️ Chyba při generování odpovědi: ${error.message}`;
    }

    const assistantMessage = {
      role: 'assistant',
      content: assistantText,
      meta: { confidence, citations }
    };

    conv.messages = [...(conv.messages || []), assistantMessage];
    conv.updated_at = Date.now();
    upsertConversation(conv);
    return assistantMessage;
  }
};

const base44 = {
  entities,
  auth: {
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
  },
  functions: {
    invoke: (name, payload) => callApi(name, payload)
  },
  integrations: {
    Core: {
      InvokeLLM: (payload) => callApi('invokeLLM', payload),
      UploadFile: (payload) => uploadFileToSupabase(payload)
    }
  },
  appLogs: {
    logUserInApp: async () => {
      return true;
    }
  },
  agents
};

export { base44 };
