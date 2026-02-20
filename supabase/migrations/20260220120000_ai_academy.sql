-- Migration: AI Academy Module
-- Date: 2026-02-20
-- Description: Complete database schema for MedVerse AI Academy —
--   7 new tables, RLS policies, views, helper functions, and Level 1 seed data.
--   Additive migration — does NOT modify existing tables except ALTER user_profiles.

-- ============================================================
-- 1A) HELPER FUNCTION: is_admin()
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin IS 'Returns true if the current authenticated user has admin role';

-- ============================================================
-- 1B) GLOBAL updated_at TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at IS 'Auto-sets updated_at to now() on row update';

-- ============================================================
-- 1C) TABLES
-- ============================================================

-- academy_courses
CREATE TABLE IF NOT EXISTS public.academy_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  level_label TEXT NOT NULL DEFAULT 'foundations'
    CHECK (level_label IN ('foundations', 'clinical_ai', 'power_user', 'builder')),
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'prompt_engineering', 'ethics', 'clinical_ai', 'critical_thinking', 'builder')),
  order_index INTEGER DEFAULT 0,
  estimated_minutes INTEGER DEFAULT 30,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  is_free BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.academy_courses IS 'AI Academy kurzy — 4 levely od AI Literacy po Builder Program';

-- academy_course_prerequisites (join table)
CREATE TABLE IF NOT EXISTS public.academy_course_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, prerequisite_course_id),
  CHECK (course_id != prerequisite_course_id)
);

COMMENT ON TABLE public.academy_course_prerequisites IS 'Join table for course prerequisite relationships — no self-references';

-- academy_lessons
CREATE TABLE IF NOT EXISTS public.academy_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'article'
    CHECK (content_type IN ('article', 'interactive', 'sandbox', 'case_study', 'quiz', 'video')),
  content JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  estimated_minutes INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  xp_reward INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, slug)
);

COMMENT ON TABLE public.academy_lessons IS 'Lessons within academy courses — supports article, interactive, sandbox, case_study, quiz, video types';

-- academy_user_progress
CREATE TABLE IF NOT EXISTS public.academy_user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
  score NUMERIC,
  attempts INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  sandbox_interactions JSONB DEFAULT '[]',
  quiz_answers JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

COMMENT ON TABLE public.academy_user_progress IS 'Tracks per-user per-lesson progress, scores, and attempts';

-- academy_certificates
CREATE TABLE IF NOT EXISTS public.academy_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_type TEXT NOT NULL,
  title TEXT NOT NULL,
  level INTEGER NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  certificate_number TEXT NOT NULL UNIQUE,
  metadata JSONB DEFAULT '{}',
  pdf_storage_path TEXT,
  public_slug TEXT UNIQUE,
  is_publicly_shared BOOLEAN DEFAULT false,
  share_expires_at TIMESTAMPTZ,
  is_valid BOOLEAN DEFAULT true,
  UNIQUE(user_id, certificate_type)
);

COMMENT ON TABLE public.academy_certificates IS 'Certificates issued upon course/level completion — supports public sharing with expiry';

-- academy_sandbox_sessions
CREATE TABLE IF NOT EXISTS public.academy_sandbox_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.academy_lessons(id),
  client_request_id UUID UNIQUE,
  scenario_type TEXT NOT NULL DEFAULT 'free'
    CHECK (scenario_type IN ('guided', 'free', 'challenge')),
  prompt_used TEXT,
  ai_response TEXT,
  ai_model TEXT,
  evaluation JSONB,
  tokens_cost INTEGER DEFAULT 0,
  store_transcript BOOLEAN DEFAULT false,
  redaction_applied BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.academy_sandbox_sessions IS 'Sandbox AI interaction log — GDPR: transcripts stored only when explicitly opted in';

-- academy_builder_applications
CREATE TABLE IF NOT EXISTS public.academy_builder_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected', 'graduated')),
  role_applied TEXT NOT NULL
    CHECK (role_applied IN ('content_validator', 'prompt_architect', 'feature_designer', 'safety_reviewer')),
  specialization TEXT,
  motivation TEXT NOT NULL,
  tech_skills JSONB DEFAULT '{}',
  academy_level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  onboarded_at TIMESTAMPTZ,
  contribution_stats JSONB DEFAULT '{"topics_validated": 0, "prompts_created": 0, "reviews_done": 0}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role_applied)
);

COMMENT ON TABLE public.academy_builder_applications IS 'Builder program applications — content_validator, prompt_architect, feature_designer, safety_reviewer roles';

-- ALTER user_profiles — add academy columns
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS academy_level INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS academy_xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS academy_badges JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_builder BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS builder_role TEXT;

-- ============================================================
-- 1D) INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_academy_courses_level
  ON public.academy_courses(level, order_index) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_academy_lessons_course
  ON public.academy_lessons(course_id, order_index) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_academy_progress_user
  ON public.academy_user_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_academy_progress_user_status
  ON public.academy_user_progress(user_id, status);

CREATE INDEX IF NOT EXISTS idx_academy_sandbox_user
  ON public.academy_sandbox_sessions(user_id, lesson_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_academy_sandbox_cleanup
  ON public.academy_sandbox_sessions(expires_at)
  WHERE store_transcript = true AND expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_academy_builder_status
  ON public.academy_builder_applications(status);

CREATE INDEX IF NOT EXISTS idx_academy_certs_public
  ON public.academy_certificates(public_slug)
  WHERE is_publicly_shared = true;

-- ============================================================
-- 1E) UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_academy_courses_updated_at
  BEFORE UPDATE ON public.academy_courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_academy_lessons_updated_at
  BEFORE UPDATE ON public.academy_lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_academy_user_progress_updated_at
  BEFORE UPDATE ON public.academy_user_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_academy_builder_applications_updated_at
  BEFORE UPDATE ON public.academy_builder_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 1F) RLS POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_course_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_sandbox_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_builder_applications ENABLE ROW LEVEL SECURITY;

-- ---- academy_courses ----
CREATE POLICY academy_courses_select ON public.academy_courses
  FOR SELECT USING (is_active = true);

CREATE POLICY academy_courses_insert ON public.academy_courses
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY academy_courses_update ON public.academy_courses
  FOR UPDATE USING (public.is_admin());

CREATE POLICY academy_courses_delete ON public.academy_courses
  FOR DELETE USING (public.is_admin());

-- ---- academy_course_prerequisites ----
CREATE POLICY academy_prereqs_select ON public.academy_course_prerequisites
  FOR SELECT USING (true);

CREATE POLICY academy_prereqs_insert ON public.academy_course_prerequisites
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY academy_prereqs_update ON public.academy_course_prerequisites
  FOR UPDATE USING (public.is_admin());

CREATE POLICY academy_prereqs_delete ON public.academy_course_prerequisites
  FOR DELETE USING (public.is_admin());

-- ---- academy_lessons ----
CREATE POLICY academy_lessons_select ON public.academy_lessons
  FOR SELECT USING (
    is_active = true
    AND (
      EXISTS (
        SELECT 1 FROM public.academy_courses c
        WHERE c.id = course_id AND c.is_free = true
      )
      OR auth.uid() IS NOT NULL
    )
  );

CREATE POLICY academy_lessons_insert ON public.academy_lessons
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY academy_lessons_update ON public.academy_lessons
  FOR UPDATE USING (public.is_admin());

CREATE POLICY academy_lessons_delete ON public.academy_lessons
  FOR DELETE USING (public.is_admin());

-- ---- academy_user_progress ----
CREATE POLICY academy_progress_select ON public.academy_user_progress
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY academy_progress_insert ON public.academy_user_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY academy_progress_update ON public.academy_user_progress
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY academy_progress_delete ON public.academy_user_progress
  FOR DELETE USING (public.is_admin());

-- ---- academy_certificates ----
CREATE POLICY academy_certs_select ON public.academy_certificates
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR (
      is_publicly_shared = true
      AND (share_expires_at IS NULL OR share_expires_at > now())
    )
  );

CREATE POLICY academy_certs_insert ON public.academy_certificates
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY academy_certs_update ON public.academy_certificates
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY academy_certs_delete ON public.academy_certificates
  FOR DELETE USING (public.is_admin());

-- ---- academy_sandbox_sessions ----
CREATE POLICY academy_sandbox_select ON public.academy_sandbox_sessions
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY academy_sandbox_insert ON public.academy_sandbox_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- No UPDATE policy — sandbox sessions are immutable

CREATE POLICY academy_sandbox_delete ON public.academy_sandbox_sessions
  FOR DELETE USING (public.is_admin());

-- ---- academy_builder_applications ----
CREATE POLICY academy_builder_select ON public.academy_builder_applications
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY academy_builder_insert ON public.academy_builder_applications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY academy_builder_update_own ON public.academy_builder_applications
  FOR UPDATE USING (
    (user_id = auth.uid() AND status = 'pending')
    OR public.is_admin()
  );

CREATE POLICY academy_builder_delete ON public.academy_builder_applications
  FOR DELETE USING (public.is_admin());

-- ============================================================
-- 1G) SQL VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.v_academy_course_progress AS
SELECT
  p.user_id,
  l.course_id,
  COUNT(DISTINCT l.id) FILTER (WHERE l.is_active = true) AS total_lessons,
  COUNT(DISTINCT p.lesson_id) FILTER (WHERE p.status = 'completed') AS completed_lessons,
  ROUND(AVG(p.score) FILTER (WHERE p.status = 'completed'), 1) AS avg_score,
  SUM(p.time_spent_seconds) AS total_time_seconds,
  CASE
    WHEN COUNT(DISTINCT l.id) FILTER (WHERE l.is_active = true) > 0
         AND COUNT(DISTINCT l.id) FILTER (WHERE l.is_active = true) =
             COUNT(DISTINCT p.lesson_id) FILTER (WHERE p.status = 'completed')
    THEN true
    ELSE false
  END AS is_completed,
  MAX(p.completed_at) AS completion_date
FROM public.academy_lessons l
LEFT JOIN public.academy_user_progress p ON p.lesson_id = l.id
WHERE l.is_active = true
GROUP BY p.user_id, l.course_id;

COMMENT ON VIEW public.v_academy_course_progress IS 'Aggregated course progress per user — completion %, avg score, total time';

-- ============================================================
-- 1H) HELPER FUNCTIONS
-- ============================================================

-- calculate_academy_level: returns max level where user completed ALL active courses
CREATE OR REPLACE FUNCTION public.calculate_academy_level(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_level INTEGER := 0;
  v_check_level INTEGER;
  v_total_courses INTEGER;
  v_completed_courses INTEGER;
BEGIN
  FOR v_check_level IN 1..4 LOOP
    -- Count total active courses at this level
    SELECT COUNT(*) INTO v_total_courses
    FROM public.academy_courses
    WHERE level = v_check_level AND is_active = true;

    -- If no courses at this level, skip
    IF v_total_courses = 0 THEN
      CONTINUE;
    END IF;

    -- Count completed courses at this level (all lessons done + prerequisites met)
    SELECT COUNT(*) INTO v_completed_courses
    FROM public.academy_courses c
    WHERE c.level = v_check_level
      AND c.is_active = true
      -- All active lessons in this course must be completed
      AND NOT EXISTS (
        SELECT 1 FROM public.academy_lessons al
        WHERE al.course_id = c.id AND al.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM public.academy_user_progress aup
            WHERE aup.lesson_id = al.id
              AND aup.user_id = p_user_id
              AND aup.status = 'completed'
          )
      )
      -- All prerequisites must be completed
      AND NOT EXISTS (
        SELECT 1 FROM public.academy_course_prerequisites cp
        WHERE cp.course_id = c.id
          AND NOT EXISTS (
            -- Check prerequisite course is fully completed
            SELECT 1 FROM public.v_academy_course_progress vp
            WHERE vp.course_id = cp.prerequisite_course_id
              AND vp.user_id = p_user_id
              AND vp.is_completed = true
          )
      );

    IF v_completed_courses >= v_total_courses THEN
      v_level := v_check_level;
    ELSE
      EXIT; -- Can't skip levels
    END IF;
  END LOOP;

  RETURN v_level;
END;
$$;

COMMENT ON FUNCTION public.calculate_academy_level IS 'Returns max academy level where user completed ALL active courses (sequential, no skipping)';
GRANT EXECUTE ON FUNCTION public.calculate_academy_level TO authenticated;

-- get_academy_skill_radar: returns JSONB with 6 skill dimensions (0-5 scale)
CREATE OR REPLACE FUNCTION public.get_academy_skill_radar(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB := '{}';
  v_category TEXT;
  v_avg NUMERIC;
  v_count INTEGER;
  v_categories TEXT[] := ARRAY['prompt_engineering', 'critical_thinking', 'ethics', 'clinical_ai', 'general', 'builder'];
  v_keys TEXT[] := ARRAY['prompt_engineering', 'critical_thinking', 'ethics', 'clinical_ai', 'safety_awareness', 'technical_literacy'];
BEGIN
  FOR i IN 1..array_length(v_categories, 1) LOOP
    SELECT AVG(aup.score), COUNT(*)
    INTO v_avg, v_count
    FROM public.academy_user_progress aup
    JOIN public.academy_lessons al ON al.id = aup.lesson_id
    JOIN public.academy_courses ac ON ac.id = al.course_id
    WHERE aup.user_id = p_user_id
      AND aup.status = 'completed'
      AND aup.score IS NOT NULL
      AND ac.category = v_categories[i];

    IF v_count < 3 THEN
      v_result := v_result || jsonb_build_object(
        v_keys[i], -1,
        v_keys[i] || '_data_points', v_count
      );
    ELSE
      v_result := v_result || jsonb_build_object(
        v_keys[i], LEAST(5, ROUND(v_avg / 20.0, 1)),
        v_keys[i] || '_data_points', v_count
      );
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_academy_skill_radar IS 'Returns JSONB skill radar with 6 dimensions (0-5). Returns -1 for dimensions with < 3 data points';
GRANT EXECUTE ON FUNCTION public.get_academy_skill_radar TO authenticated;

-- generate_certificate_number: MVAC-YYYY-XXXXX format
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql VOLATILE
AS $$
DECLARE
  v_number TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_number := 'MVAC-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 100000)::text, 5, '0');
    SELECT EXISTS (
      SELECT 1 FROM public.academy_certificates WHERE certificate_number = v_number
    ) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_number;
END;
$$;

COMMENT ON FUNCTION public.generate_certificate_number IS 'Generates unique certificate number in MVAC-YYYY-XXXXX format';
GRANT EXECUTE ON FUNCTION public.generate_certificate_number TO authenticated;

-- check_sandbox_daily_limit: returns true if user has < 20 sessions today
CREATE OR REPLACE FUNCTION public.check_sandbox_daily_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT (
    SELECT COUNT(*)
    FROM public.academy_sandbox_sessions
    WHERE user_id = p_user_id
      AND created_at >= date_trunc('day', now())
  ) < 20;
$$;

COMMENT ON FUNCTION public.check_sandbox_daily_limit IS 'Returns true if user has fewer than 20 sandbox sessions today';
GRANT EXECUTE ON FUNCTION public.check_sandbox_daily_limit TO authenticated;

-- ============================================================
-- 1I) SEED DATA — Level 1 courses + lessons
-- ============================================================

-- Course 1: Co je AI a jak funguje v medicíně
INSERT INTO public.academy_courses (title, slug, description, level, level_label, category, order_index, estimated_minutes, icon, color, is_active, is_free)
VALUES (
  'Co je AI a jak funguje v medicíně',
  'ai-intro-medicine',
  'Úvod do umělé inteligence v kontextu klinické praxe — jak AI přemýšlí, co umí a co ne.',
  1, 'foundations', 'general', 1, 40, '🧠', '#3B82F6', true, true
);

INSERT INTO public.academy_lessons (course_id, title, slug, content_type, content, order_index, estimated_minutes, xp_reward)
SELECT c.id, v.title, v.slug, v.content_type, '{}', v.order_index, v.estimated_minutes, v.xp_reward
FROM public.academy_courses c,
(VALUES
  ('LLM jako nástroj pro rozšíření diferenciální rozvahy', 'llm-differential-diagnosis', 'article', 1, 10, 10),
  ('Jak AI přemýšlí — pravděpodobnosti, ne jistoty', 'ai-probabilistic-thinking', 'interactive', 2, 10, 15),
  ('AI Safety Checklist — 30 sekund před každým promptem', 'ai-safety-checklist', 'interactive', 3, 5, 15),
  ('AI vs. lékař — co kdo umí lépe', 'ai-vs-doctor', 'article', 4, 10, 10),
  ('Kvíz: Základy AI v medicíně', 'quiz-ai-basics', 'quiz', 5, 5, 25)
) AS v(title, slug, content_type, order_index, estimated_minutes, xp_reward)
WHERE c.slug = 'ai-intro-medicine';

-- Course 2: Halucinace a limity AI
INSERT INTO public.academy_courses (title, slug, description, level, level_label, category, order_index, estimated_minutes, icon, color, is_active, is_free)
VALUES (
  'Halucinace a limity AI',
  'ai-hallucinations-limits',
  'Jak rozpoznat, když AI lže — fact-checking framework a praktické příklady halucinací.',
  1, 'foundations', 'critical_thinking', 2, 35, '🔍', '#EF4444', true, true
);

INSERT INTO public.academy_lessons (course_id, title, slug, content_type, content, order_index, estimated_minutes, xp_reward)
SELECT c.id, v.title, v.slug, v.content_type, '{}', v.order_index, v.estimated_minutes, v.xp_reward
FROM public.academy_courses c,
(VALUES
  ('Proč AI občas lže — a jak to poznat', 'why-ai-lies', 'article', 1, 10, 10),
  ('Rozpoznej halucinaci — case study', 'hallucination-case-study', 'case_study', 2, 10, 20),
  ('Fact-checking framework pro AI výstupy', 'fact-checking-framework', 'interactive', 3, 10, 15),
  ('Stop the AI — odhal nebezpečnou odpověď', 'stop-the-ai', 'sandbox', 4, 10, 25)
) AS v(title, slug, content_type, order_index, estimated_minutes, xp_reward)
WHERE c.slug = 'ai-hallucinations-limits';

-- Course 3: Prompt engineering pro lékaře
INSERT INTO public.academy_courses (title, slug, description, level, level_label, category, order_index, estimated_minutes, icon, color, is_active, is_free)
VALUES (
  'Prompt engineering pro lékaře',
  'prompt-engineering-basics',
  'Anatomie dobrého klinického promptu — strukturované výstupy, iterace a optimalizace.',
  1, 'foundations', 'prompt_engineering', 3, 45, '✍️', '#10B981', true, true
);

INSERT INTO public.academy_lessons (course_id, title, slug, content_type, content, order_index, estimated_minutes, xp_reward)
SELECT c.id, v.title, v.slug, v.content_type, '{}', v.order_index, v.estimated_minutes, v.xp_reward
FROM public.academy_courses c,
(VALUES
  ('Anatomie dobrého klinického promptu', 'anatomy-of-good-prompt', 'article', 1, 10, 10),
  ('Dobrý vs. špatný prompt — porovnání', 'good-vs-bad-prompt', 'interactive', 2, 10, 15),
  ('Strukturovaný výstup: SOAP, DDx, red flags', 'structured-output', 'article', 3, 10, 10),
  ('Sandbox: Tvůj první klinický prompt', 'sandbox-first-prompt', 'sandbox', 4, 10, 20),
  ('Sandbox: Optimalizuj odpověď iterací', 'sandbox-iterate-prompt', 'sandbox', 5, 10, 20)
) AS v(title, slug, content_type, order_index, estimated_minutes, xp_reward)
WHERE c.slug = 'prompt-engineering-basics';

-- Course 4: Etika AI v medicíně
INSERT INTO public.academy_courses (title, slug, description, level, level_label, category, order_index, estimated_minutes, icon, color, is_active, is_free)
VALUES (
  'Etika AI v medicíně',
  'ai-ethics-medicine',
  'GDPR, bias, odpovědnost — etické aspekty používání AI v klinické praxi.',
  1, 'foundations', 'ethics', 4, 30, '⚖️', '#8B5CF6', true, true
);

INSERT INTO public.academy_lessons (course_id, title, slug, content_type, content, order_index, estimated_minutes, xp_reward)
SELECT c.id, v.title, v.slug, v.content_type, '{}', v.order_index, v.estimated_minutes, v.xp_reward
FROM public.academy_courses c,
(VALUES
  ('GDPR a pacientská data — co nikdy nedávat AI', 'gdpr-patient-data', 'article', 1, 10, 10),
  ('AI bias v medicíně — reálné příklady', 'ai-bias-examples', 'case_study', 2, 10, 20),
  ('Odpovědnost při použití AI v klinické praxi', 'ai-responsibility', 'article', 3, 10, 10),
  ('Kvíz: Etika AI v medicíně', 'quiz-ai-ethics', 'quiz', 4, 5, 25)
) AS v(title, slug, content_type, order_index, estimated_minutes, xp_reward)
WHERE c.slug = 'ai-ethics-medicine';

-- Course 5: Závěrečný test Level 1
INSERT INTO public.academy_courses (title, slug, description, level, level_label, category, order_index, estimated_minutes, icon, color, is_active, is_free)
VALUES (
  'Závěrečný test Level 1',
  'level-1-final',
  'Závěrečný souhrnný test a praktický sandbox challenge pro Level 1.',
  1, 'foundations', 'general', 5, 30, '🎓', '#F59E0B', true, true
);

INSERT INTO public.academy_lessons (course_id, title, slug, content_type, content, order_index, estimated_minutes, xp_reward)
SELECT c.id, v.title, v.slug, v.content_type, '{}', v.order_index, v.estimated_minutes, v.xp_reward
FROM public.academy_courses c,
(VALUES
  ('Souhrnný test Level 1', 'final-quiz-level-1', 'quiz', 1, 20, 50),
  ('Praktický sandbox challenge', 'final-sandbox-challenge', 'sandbox', 2, 15, 50)
) AS v(title, slug, content_type, order_index, estimated_minutes, xp_reward)
WHERE c.slug = 'level-1-final';

-- Set prerequisites: level-1-final requires all other Level 1 courses
INSERT INTO public.academy_course_prerequisites (course_id, prerequisite_course_id)
SELECT final.id, prereq.id
FROM public.academy_courses final, public.academy_courses prereq
WHERE final.slug = 'level-1-final'
  AND prereq.level = 1
  AND prereq.slug != 'level-1-final';

-- ============================================================
-- DONE
-- ============================================================
