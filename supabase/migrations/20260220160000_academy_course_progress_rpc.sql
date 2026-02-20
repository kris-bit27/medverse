-- ============================================================
-- RPC: get_academy_course_progress
-- Returns all active courses with lesson counts and user progress.
-- Unlike v_academy_course_progress view, this always returns rows
-- even when user has no progress (completed_lessons = 0).
-- Includes course level and track for direct use in dashboard.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_academy_course_progress(p_user_id UUID)
RETURNS TABLE (
  user_id       UUID,
  course_id     UUID,
  level         INTEGER,
  total_lessons BIGINT,
  completed_lessons BIGINT,
  avg_score     NUMERIC,
  total_time_seconds BIGINT,
  is_completed  BOOLEAN,
  completion_date TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p_user_id AS user_id,
    c.id AS course_id,
    c.level,
    COUNT(DISTINCT l.id)::BIGINT AS total_lessons,
    COUNT(DISTINCT aup.lesson_id) FILTER (WHERE aup.status = 'completed')::BIGINT AS completed_lessons,
    ROUND(AVG(aup.score) FILTER (WHERE aup.status = 'completed'), 1) AS avg_score,
    COALESCE(SUM(aup.time_spent_seconds), 0)::BIGINT AS total_time_seconds,
    CASE
      WHEN COUNT(DISTINCT l.id) > 0
           AND COUNT(DISTINCT l.id) =
               COUNT(DISTINCT aup.lesson_id) FILTER (WHERE aup.status = 'completed')
      THEN true
      ELSE false
    END AS is_completed,
    MAX(aup.completed_at) AS completion_date
  FROM public.academy_courses c
  JOIN public.academy_lessons l ON l.course_id = c.id AND l.is_active = true
  LEFT JOIN public.academy_user_progress aup ON aup.lesson_id = l.id AND aup.user_id = p_user_id
  WHERE c.is_active = true
  GROUP BY c.id;
END;
$$;

COMMENT ON FUNCTION public.get_academy_course_progress IS 'Returns all active courses with progress for given user — always returns rows even with no progress';
GRANT EXECUTE ON FUNCTION public.get_academy_course_progress TO authenticated;
