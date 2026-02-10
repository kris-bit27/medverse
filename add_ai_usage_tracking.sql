-- Migration: Add AI Usage Tracking
-- Date: 2026-02-10
-- Description: Sledování AI usage a cost control per user

-- Create user_ai_usage table
CREATE TABLE IF NOT EXISTS user_ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cost DECIMAL(10,4) NOT NULL,
  model VARCHAR(50) NOT NULL,
  tokens_used INTEGER NOT NULL,
  mode VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_ai_usage_user_date 
  ON user_ai_usage(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_ai_usage_cost 
  ON user_ai_usage(cost);

-- Add comments for documentation
COMMENT ON TABLE user_ai_usage IS 'Tracks AI API usage and costs per user for budget management';
COMMENT ON COLUMN user_ai_usage.cost IS 'Cost in USD for this AI request';
COMMENT ON COLUMN user_ai_usage.model IS 'AI model used (e.g., claude-opus-4, claude-sonnet-4)';
COMMENT ON COLUMN user_ai_usage.tokens_used IS 'Total tokens consumed (input + output)';
COMMENT ON COLUMN user_ai_usage.mode IS 'Generation mode (fulltext_v2, high_yield, deep_dive)';

-- Create function to get monthly usage
CREATE OR REPLACE FUNCTION get_user_monthly_usage(p_user_id UUID)
RETURNS TABLE (
  total_cost DECIMAL,
  total_tokens BIGINT,
  request_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(cost), 0)::DECIMAL as total_cost,
    COALESCE(SUM(tokens_used), 0)::BIGINT as total_tokens,
    COUNT(*)::BIGINT as request_count
  FROM user_ai_usage
  WHERE user_id = p_user_id
    AND created_at >= DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT ON user_ai_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_monthly_usage TO authenticated;

-- Example usage:
-- SELECT * FROM get_user_monthly_usage('user-uuid-here');
