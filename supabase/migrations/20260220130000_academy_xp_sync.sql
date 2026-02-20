-- Academy XP sync trigger
-- Keeps user_profiles.academy_xp in sync with user_points_history
-- and auto-calculates academy_level based on XP thresholds

-- Function: recalculate academy_xp from points history and update level
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
  -- Level 1: 100 XP, Level 2: 500 XP, Level 3: 1500 XP, Level 4: 5000 XP
  v_new_level := CASE
    WHEN v_total_xp >= 5000 THEN 4
    WHEN v_total_xp >= 1500 THEN 3
    WHEN v_total_xp >= 500  THEN 2
    WHEN v_total_xp >= 100  THEN 1
    ELSE 0
  END;

  -- Update user_profiles with new XP and level
  UPDATE user_profiles
  SET
    academy_xp = v_total_xp,
    academy_level = GREATEST(COALESCE(academy_level, 0), v_new_level)
  WHERE user_id = NEW.user_id;

  -- If no row was updated (profile doesn't exist yet), insert one
  IF NOT FOUND THEN
    INSERT INTO user_profiles (user_id, academy_xp, academy_level)
    VALUES (NEW.user_id, v_total_xp, v_new_level)
    ON CONFLICT (user_id) DO UPDATE
    SET
      academy_xp = EXCLUDED.academy_xp,
      academy_level = GREATEST(COALESCE(user_profiles.academy_level, 0), EXCLUDED.academy_level);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fire after insert on user_points_history for Academy points
DROP TRIGGER IF EXISTS trg_sync_academy_xp ON user_points_history;
CREATE TRIGGER trg_sync_academy_xp
  AFTER INSERT ON user_points_history
  FOR EACH ROW
  WHEN (NEW.reason LIKE 'Academy:%')
  EXECUTE FUNCTION sync_academy_xp();

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'academy_xp'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN academy_xp INT DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'academy_level'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN academy_level INT DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'academy_badges'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN academy_badges JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Backfill existing Academy XP
UPDATE user_profiles up
SET academy_xp = sub.total_xp
FROM (
  SELECT user_id, COALESCE(SUM(points), 0) AS total_xp
  FROM user_points_history
  WHERE reason LIKE 'Academy:%'
  GROUP BY user_id
) sub
WHERE up.user_id = sub.user_id;
