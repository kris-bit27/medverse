// @ts-nocheck
// =============================================================================
// MedVerse EDU — Supabase API Client (v2)
// =============================================================================
// Replaces the legacy base44Client.js with a clean, Supabase-native implementation.
//
// MIGRATION NOTES:
// - Export name stays `base44` for backwards compatibility with all 30+ components
//   that import { base44 } from '@/api/base44Client'
// - Will be renamed to `medverse` in a future refactor once all imports are updated
// - Removed: @base44/sdk dependency, Base44-specific abstractions
// - Kept: same public API shape (.entities, .auth, .functions, .agents, .integrations)
// =============================================================================

import { supabase } from '@/lib/supabase';

// =============================================================================
// UTILITY HELPERS
// =============================================================================

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const toSnakeCase = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();

// =============================================================================
// USER MAPPING
// =============================================================================

const mapSupabaseUser = (user) => {
  if (!user) return null;
  const rawDisciplines =
    user.user_metadata?.clinical_disciplines ||
    user.app_metadata?.clinical_disciplines;
  const clinical_disciplines = Array.isArray(rawDisciplines)
    ? rawDisciplines
    : rawDisciplines
      ? [rawDisciplines].flat().filter(Boolean)
      : [];
  return {
    id: user.id,
    email: user.email,
    full_name:
      user.user_metadata?.full_name || user.user_metadata?.name || '',
    role:
      user.app_metadata?.role || user.user_metadata?.role || 'student',
    plan: user.user_metadata?.plan || user.app_metadata?.plan || 'free',
    settings: user.user_metadata?.settings || null,
    clinical_disciplines,
    ...user.user_metadata,
    _supabase: user,
  };
};

// =============================================================================
// ENTITY → TABLE MAPPING (single source of truth)
// =============================================================================
// Rules:
//   1. If an entity has a config entry here, use config.table
//   2. Otherwise, convert PascalCase entity name to snake_case
//
// fieldMap: maps frontend field names → DB column names (for legacy compat)
// fromDb:   transforms a DB row back to frontend shape
// =============================================================================

const ENTITY_CONFIG = {
  // --- Core content ---
  ClinicalDiscipline: {
    table: 'obory',
    fieldMap: { order: 'order_index' },
    fromDb: (row) => ({
      ...row,
      // Ensure frontend always sees `order` even though DB has `order_index`
      order: row.order ?? row.order_index ?? 0,
    }),
  },
  Okruh: {
    table: 'okruhy',
    fieldMap: {
      title: 'name',
      clinical_discipline_id: 'obor_id',
      order: 'order_index',
    },
    fromDb: (row) => ({
      ...row,
      title: row.title ?? row.name ?? '',
      clinical_discipline_id: row.clinical_discipline_id ?? row.obor_id ?? null,
      order: row.order ?? row.order_index ?? 0,
    }),
  },

  // --- Content ---
  Topic:              { table: 'topics' },
  Question:           { table: 'questions' },
  Article:            { table: 'articles' },
  Tool:               { table: 'clinical_tools' },    // DB is "clinical_tools", frontend says "Tool"
  TopicVersion:       { table: 'topic_versions' },
  TopicNote:          { table: 'topic_notes' },

  // --- Flashcards ---
  Flashcard:          { table: 'flashcards' },
  FlashcardProgress:  { table: 'user_flashcard_progress' },
  FlashcardSession:   { table: 'flashcard_review_sessions' },
  FlashcardRequest:   { table: 'flashcard_generation_requests' },

  // --- User learning ---
  UserProgress:       { table: 'user_progress' },
  UserNote:           { table: 'user_notes' },
  Bookmark:           { table: 'bookmarks' },
  StudyPlan:          { table: 'study_plans' },
  StudyPlanItem:      { table: 'study_plan_items' },
  StudyTask:          { table: 'study_tasks' },
  StudySession:       { table: 'study_sessions' },

  // --- Tests ---
  TestSession:        { table: 'test_sessions' },
  TestAnswer:         { table: 'test_answers' },

  // --- Study packages (legacy Base44 entities) ---
  StudyPackage:       { table: 'study_packages' },
  StudyPack:          { table: 'study_packs' },
  StudyPackOutput:    { table: 'study_pack_outputs' },
  StudyPackFile:      { table: 'study_pack_files' },
  StudyPackChunk:     { table: 'study_pack_chunks' },

  // --- Social / community ---
  ForumThread:        { table: 'forum_threads' },
  ForumPost:          { table: 'forum_posts' },
  StudyGroup:         { table: 'study_groups' },
  StudyGroupMember:   { table: 'study_group_members' },
  StudyGroupPost:     { table: 'study_group_posts' },
  StudyGroupComment:  { table: 'study_group_comments' },
  PeerReview:         { table: 'peer_reviews' },

  // --- Logbook / certification ---
  LogbookEntry:       { table: 'logbook_entries' },
  CaseLog:            { table: 'case_logs' },
  ProcedureCategory:  { table: 'procedure_categories' },
  CertificationReq:   { table: 'certification_requirements' },
  UserCertProgress:   { table: 'user_certification_progress' },

  // --- Clinical reference ---
  Drug:               { table: 'drugs' },
  ClinicalGuideline:  { table: 'clinical_guidelines' },
  ToolUsageLog:       { table: 'tool_usage_log' },

  // --- User management ---
  UserProfile:        { table: 'user_profiles' },
  UserSettings:       { table: 'user_settings' },
  UserSubjectLevel:   { table: 'user_subject_levels' },
  UserToken:          { table: 'user_tokens' },
  TokenTransaction:   { table: 'token_transactions' },
  UserDataConsent:    { table: 'user_data_consent' },

  // --- Organizations ---
  Organization:       { table: 'organizations' },
  OrganizationMember: { table: 'organization_members' },
  CustomContent:      { table: 'custom_content' },

  // --- Analytics / logs ---
  AIInteractionLog:   { table: 'ai_interaction_logs' },
  AuditLog:           { table: 'audit_logs' },
  AnalyticsEvent:     { table: 'analytics_events' },
  DailyUsageStat:     { table: 'daily_usage_stats' },
  UserAiUsage:        { table: 'user_ai_usage' },
  AIGenerationCache:  { table: 'ai_generation_cache' },
  EmailLog:           { table: 'email_log' },

  // --- Gamification ---
  GamificationAchievement: { table: 'gamification_achievements' },
  LeaderboardEntry:   { table: 'leaderboard_entries' },
  UserPointsHistory:  { table: 'user_points_history' },

  // --- Institutions / mentoring ---
  Institution:        { table: 'institutions' },
  UserInstitution:    { table: 'user_institutions' },
  MentorRelationship: { table: 'mentor_relationships' },
};

const getTableName = (entityName) =>
  ENTITY_CONFIG[entityName]?.table || toSnakeCase(entityName);

// =============================================================================
// FIELD MAPPING (frontend ↔ DB)
// =============================================================================

const mapToDbFields = (entityName, payload) => {
  const config = ENTITY_CONFIG[entityName];
  if (!config?.fieldMap || !payload || typeof payload !== 'object') return payload;
  const out = { ...payload };
  for (const [frontendKey, dbKey] of Object.entries(config.fieldMap)) {
    if (frontendKey in out) {
      if (!(dbKey in out)) out[dbKey] = out[frontendKey];
      delete out[frontendKey];
    }
  }
  return out;
};

const mapFromDbFields = (entityName, row) => {
  const config = ENTITY_CONFIG[entityName];
  if (!config?.fromDb || !row) return row;
  return config.fromDb(row);
};

const mapFiltersToDb = (entityName, filters) => {
  if (!filters || typeof filters !== 'object') return filters;
  return mapToDbFields(entityName, filters);
};

const mapOrderColumn = (entityName, column) => {
  const config = ENTITY_CONFIG[entityName];
  if (config?.fieldMap?.[column]) return config.fieldMap[column];
  return column;
};

// =============================================================================
// QUERY HELPERS
// =============================================================================

const parseOrder = (order, entityName) => {
  if (!order || typeof order !== 'string') return null;
  const desc = order.startsWith('-');
  const rawColumn = desc ? order.slice(1) : order;
  const column = mapOrderColumn(entityName, rawColumn);
  return { column, ascending: !desc };
};

const applyFilters = (query, filters = {}) => {
  if (!filters || typeof filters !== 'object') return query;
  for (const [key, value] of Object.entries(filters)) {
    if (value && typeof value === 'object' && '$in' in value) {
      query = query.in(key, value.$in);
    } else if (value === null) {
      query = query.is(key, null);
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
};

// =============================================================================
// SUPABASE CRUD OPERATIONS
// =============================================================================

const supabaseList = async (entityName, { order, limit } = {}) => {
  const table = getTableName(entityName);
  let query = supabase.from(table).select('*');
  const orderConfig = parseOrder(order, entityName);
  if (orderConfig) {
    query = query.order(orderConfig.column, { ascending: orderConfig.ascending });
  }
  if (typeof limit === 'number') query = query.limit(limit);
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
  if (typeof limit === 'number') query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return normalizeArray(data).map((row) => mapFromDbFields(entityName, row));
};

const supabaseGet = async (entityName, id) => {
  const table = getTableName(entityName);
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return mapFromDbFields(entityName, data);
};

const supabaseCreate = async (entityName, payload) => {
  const table = getTableName(entityName);
  const { data, error } = await supabase
    .from(table)
    .insert(mapToDbFields(entityName, payload))
    .select()
    .single();
  if (error) throw error;
  return mapFromDbFields(entityName, data);
};

const supabaseBulkCreate = async (entityName, payloads) => {
  const table = getTableName(entityName);
  const mapped = Array.isArray(payloads)
    ? payloads.map((p) => mapToDbFields(entityName, p))
    : payloads;
  const { data, error } = await supabase.from(table).insert(mapped).select();
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

// =============================================================================
// ENTITY CLIENT FACTORY (Proxy-based, auto-creates clients for any entity name)
// =============================================================================

const createEntityClient = (entityName) => ({
  list: (order, limit) => supabaseList(entityName, { order, limit }),
  filter: (filters, order, limit) =>
    supabaseFilter(entityName, filters, { order, limit }),
  get: (id) => supabaseGet(entityName, id),
  create: (payload) => supabaseCreate(entityName, payload),
  bulkCreate: (payloads) => supabaseBulkCreate(entityName, payloads),
  update: (id, payload) => supabaseUpdate(entityName, id, payload),
  delete: (id) => supabaseDelete(entityName, id),
});

const entities = new Proxy(
  {},
  {
    get(target, prop) {
      if (typeof prop !== 'string') return target[prop];
      if (!target[prop]) target[prop] = createEntityClient(prop);
      return target[prop];
    },
  }
);

// =============================================================================
// API CALLS (Vercel serverless functions)
// =============================================================================

const callApi = async (name, payload) => {
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
};

// =============================================================================
// FILE UPLOAD (Supabase Storage)
// =============================================================================

const uploadFile = async ({ file }) => {
  if (!file) throw new Error('Missing file');
  const bucket =
    import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'uploads';
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id || 'anon';
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const path = `${userId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type || 'application/octet-stream',
    });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error(
      'Upload succeeded but public URL is missing. Check bucket public access.'
    );
  }
  return { file_url: data.publicUrl };
};

// =============================================================================
// AGENTS (Hippo chat, conversations)
// =============================================================================

const CONVERSATIONS_KEY = 'mv:conversations';

const getConversations = () => {
  try {
    return JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || '[]');
  } catch {
    return [];
  }
};

const upsertConversation = (conv) => {
  const all = getConversations();
  const idx = all.findIndex((c) => c.id === conv.id);
  if (idx >= 0) all[idx] = conv;
  else all.push(conv);
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(all));
};

const agents = {
  getConversations,
  createConversation: (id, title) => {
    const conv = {
      id,
      title,
      messages: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    upsertConversation(conv);
    return conv;
  },
  getConversation: (id) =>
    getConversations().find((c) => c.id === id) || null,

  sendMessage: async (conversationId, message) => {
    const all = getConversations();
    let conv = all.find((c) => c.id === conversationId);
    if (!conv) {
      conv = {
        id: conversationId,
        title: 'Hippo',
        messages: [],
        created_at: Date.now(),
        updated_at: Date.now(),
      };
    }

    conv.messages = [...(conv.messages || []), message];
    conv.updated_at = Date.now();
    upsertConversation(conv);

    // Determine AI mode based on message type
    const mode = message.isFloatingCopilot
      ? 'floating_copilot_chat'
      : 'copilot_chat';

    let assistantText = '';
    let confidence = { level: 'low', reason: 'Neznámá' };
    let citations = { internal: [], external: [] };

    try {
      const response = await callApi('invokeEduLLM', {
        mode,
        userPrompt: message.content,
        pageContext: message.pageContext || null,
      });
      assistantText =
        response.text ||
        response.answer_md ||
        response.high_yield ||
        response.deep_dive ||
        response.full_text ||
        '';
      confidence = response.confidence || confidence;
      citations = response.citations || citations;
    } catch (error) {
      assistantText = `⚠️ Chyba při generování odpovědi: ${error.message}`;
    }

    const assistantMessage = {
      role: 'assistant',
      content: assistantText,
      meta: { confidence, citations },
    };

    conv.messages = [...(conv.messages || []), assistantMessage];
    conv.updated_at = Date.now();
    upsertConversation(conv);
    return assistantMessage;
  },
};

// =============================================================================
// AUTH
// =============================================================================

const auth = {
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
      data: updates,
    });
    if (error) throw error;
    return mapSupabaseUser(data.user);
  },

  logout: async (redirectTo) => {
    await supabase.auth.signOut();
    if (redirectTo) window.location.href = redirectTo;
  },

  redirectToLogin: (returnTo) => {
    const target = returnTo || window.location.href;
    window.location.href = `/login?redirectTo=${encodeURIComponent(target)}`;
  },
};

// =============================================================================
// PUBLIC API — backwards compatible with `import { base44 } from '...'`
// =============================================================================

const base44 = {
  entities,
  auth,
  functions: {
    invoke: (name, payload) => callApi(name, payload),
  },
  integrations: {
    Core: {
      InvokeLLM: (payload) => callApi('invokeLLM', payload),
      UploadFile: (payload) => uploadFile(payload),
    },
  },
  appLogs: {
    logUserInApp: async () => true,
  },
  agents,
};

// Also export as `medverse` for new code — prefer this name going forward
const medverse = base44;

export { base44, medverse };
