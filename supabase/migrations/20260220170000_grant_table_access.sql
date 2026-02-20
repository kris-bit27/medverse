-- ============================================================
-- Grant table-level access to authenticated and anon roles.
-- RLS policies control row-level access, but without GRANT
-- the roles cannot access the tables at all.
-- ============================================================

-- Academy tables (public read, authenticated write where RLS allows)
GRANT SELECT ON public.academy_courses TO authenticated, anon;
GRANT SELECT ON public.academy_course_prerequisites TO authenticated, anon;
GRANT SELECT ON public.academy_lessons TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.academy_user_progress TO authenticated;
GRANT SELECT ON public.academy_certificates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_sandbox_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_builder_applications TO authenticated;

-- User profile tables
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

-- Other app tables — grant only if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'questions') THEN
    EXECUTE 'GRANT SELECT ON public.questions TO authenticated, anon';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'okruhy') THEN
    EXECUTE 'GRANT SELECT ON public.okruhy TO authenticated, anon';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'topics') THEN
    EXECUTE 'GRANT SELECT ON public.topics TO authenticated, anon';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookmarks') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_flashcard_progress') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.user_flashcard_progress TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_events') THEN
    EXECUTE 'GRANT SELECT, INSERT ON public.analytics_events TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_ai_usage') THEN
    EXECUTE 'GRANT SELECT, INSERT ON public.user_ai_usage TO authenticated';
  END IF;
END $$;

-- Sequences (needed for INSERT on tables with serial/bigserial columns)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
