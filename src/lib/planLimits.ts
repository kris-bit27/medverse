export const PLAN_LIMITS = {
  free: {
    monthly_tokens: 50,
    daily_flashcards: 50,
    daily_tests: 3,
    test_max_questions: 10,
    content_preview_chars: 500,
    has_ai_consultant: false,
    has_full_content: false,
    has_progress_tracking: false,
  },
  premium: {
    monthly_tokens: 2000,
    daily_flashcards: Infinity,
    daily_tests: Infinity,
    test_max_questions: Infinity,
    content_preview_chars: Infinity,
    has_ai_consultant: true,
    has_full_content: true,
    has_progress_tracking: true,
  },
  pro: {
    monthly_tokens: 8000,
    daily_flashcards: Infinity,
    daily_tests: Infinity,
    test_max_questions: Infinity,
    content_preview_chars: Infinity,
    has_ai_consultant: true,
    has_full_content: true,
    has_progress_tracking: true,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

export function getPlanLimits(tier: string) {
  return PLAN_LIMITS[tier as PlanTier] || PLAN_LIMITS.free;
}
