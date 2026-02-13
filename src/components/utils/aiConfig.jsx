/**
 * AI Model Configuration — Multi-model strategy
 * 
 * Opus 4.5    → fulltext, deep_dive (highest medical accuracy)
 * Sonnet 4    → high_yield, mcq, study plans (good balance)
 * Haiku 4.5   → flashcards, copilot (fast & cheap)
 * GPT-4o      → content review (independent cross-model)
 * Gemini Flash → data analytics only (no medical content)
 */

export const AI_VERSION_TAG = "medverse_multimodel_v2";

export const AI_MODELS = {
  OPUS:    { id: 'claude-opus-4-20250514',   label: 'Claude Opus 4.5',   provider: 'anthropic', inputPer1M: 5,    outputPer1M: 25 },
  SONNET:  { id: 'claude-sonnet-4-20250514',  label: 'Claude Sonnet 4',   provider: 'anthropic', inputPer1M: 3,    outputPer1M: 15 },
  HAIKU:   { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',  provider: 'anthropic', inputPer1M: 1,    outputPer1M: 5  },
  GPT4O:   { id: 'gpt-4o',                    label: 'GPT-4o',            provider: 'openai',    inputPer1M: 2.50, outputPer1M: 10 },
  GEMINI:  { id: 'gemini-2.5-flash',          label: 'Gemini 2.5 Flash',  provider: 'google',    inputPer1M: 0.15, outputPer1M: 0.60 },
  // Legacy
  PRIMARY: 'claude-sonnet-4-20250514',
  FALLBACK: 'gemini-1.5-pro-002',
  VERSION_TAG: "medverse_multimodel_v2",
};

// Which model handles which task
export const MODEL_ASSIGNMENTS = {
  fulltext:    'opus',     // Best medical accuracy, web search
  deep_dive:   'opus',     // Deep content needs best model
  high_yield:  'sonnet',   // Extraction from fulltext, Sonnet is enough
  flashcards:  'haiku',    // Simple Q&A, fast & cheap
  mcq:         'sonnet',   // Needs clinical reasoning for distractors
  review:      'gpt4o',    // Independent cross-model review
  copilot:     'haiku',    // Conversational, fast
  study_plan:  'sonnet',   // Personalization + structured JSON
  analytics:   'gemini',   // Numbers & charts only
};

export const AI_FEATURES = {
  WEB_SEARCH: true,
  CONFIDENCE_SCORING: true,
  SOURCE_CITATION: true,
  FACT_CHECKING: true,
  CROSS_MODEL_REVIEW: true,
};
