-- Migration: Atomic token deduction
-- Date: 2026-02-18
-- Description: Replaces non-atomic check+deduct pattern with a single
--              PostgreSQL function using SELECT ... FOR UPDATE to prevent
--              race conditions in concurrent AI requests.

CREATE OR REPLACE FUNCTION deduct_tokens_atomic(
  p_user_id UUID,
  p_cost INT,
  p_operation TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE(allowed BOOLEAN, remaining INT) AS $$
DECLARE
  v_current INT;
BEGIN
  -- Acquire row-level lock to prevent concurrent reads
  SELECT current_tokens INTO v_current
  FROM user_tokens
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Initialize tokens for new user if not found
  IF NOT FOUND THEN
    INSERT INTO user_tokens (user_id, current_tokens, monthly_limit)
    VALUES (p_user_id, 1000, 1000)
    ON CONFLICT (user_id) DO NOTHING;
    v_current := 1000;
  END IF;

  -- Check if user has enough tokens
  IF v_current < p_cost THEN
    RETURN QUERY SELECT FALSE, v_current;
    RETURN;
  END IF;

  -- Deduct tokens atomically
  UPDATE user_tokens
  SET current_tokens = current_tokens - p_cost,
      total_tokens_used = COALESCE(total_tokens_used, 0) + p_cost,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log transaction (non-critical)
  BEGIN
    INSERT INTO token_transactions (user_id, amount, type, description, related_entity_type)
    VALUES (p_user_id, -p_cost, 'usage', COALESCE(p_description, p_operation), p_operation);
  EXCEPTION WHEN OTHERS THEN
    -- Don't fail the deduction if logging fails
    NULL;
  END;

  RETURN QUERY SELECT TRUE, v_current - p_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION deduct_tokens_atomic TO authenticated;

COMMENT ON FUNCTION deduct_tokens_atomic IS 'Atomically checks and deducts tokens using row-level locking to prevent race conditions';
