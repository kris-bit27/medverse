-- Migration: Audit fixes
-- Date: 2026-02-20
-- Description:
--   1) handle_new_user trigger — auto-create user_profiles on signup
--   2) RLS policies for user_ai_usage table
--   3) Fix sync_academy_xp() to use atomic INSERT ... ON CONFLICT

-- =============================================================================
-- 1) Auto-create user_profiles on signup
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    display_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fires after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 2) RLS for user_ai_usage
-- =============================================================================

ALTER TABLE user_ai_usage ENABLE ROW LEVEL SECURITY;

-- Users can only read their own AI usage records
CREATE POLICY "Users can view own AI usage"
  ON user_ai_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own AI usage records (via API routes)
CREATE POLICY "Users can insert own AI usage"
  ON user_ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all AI usage (for cost analytics dashboard)
CREATE POLICY "Admins can view all AI usage"
  ON user_ai_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

-- =============================================================================
-- 3) Fix sync_academy_xp() — atomic INSERT ... ON CONFLICT
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_academy_xp()
RETURNS TRIGGER AS $$
DECLARE
  v_total_xp INT;
  v_new_level INT;
BEGIN
  -- Sum all Academy-related points for this user
  SELECT COALESCE(SUM(points), 0) INTO v_total_xp
  FROM user_points_history
  WHERE user_id = NEW.user_id
    AND reason LIKE 'Academy:%';

  -- Calculate level based on XP thresholds
  v_new_level := CASE
    WHEN v_total_xp >= 5000 THEN 4
    WHEN v_total_xp >= 1500 THEN 3
    WHEN v_total_xp >= 500  THEN 2
    WHEN v_total_xp >= 100  THEN 1
    ELSE 0
  END;

  -- Atomic upsert — no race condition between UPDATE and INSERT
  INSERT INTO user_profiles (user_id, academy_xp, academy_level)
  VALUES (NEW.user_id, v_total_xp, v_new_level)
  ON CONFLICT (user_id) DO UPDATE
  SET
    academy_xp = EXCLUDED.academy_xp,
    academy_level = GREATEST(COALESCE(user_profiles.academy_level, 0), EXCLUDED.academy_level);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
