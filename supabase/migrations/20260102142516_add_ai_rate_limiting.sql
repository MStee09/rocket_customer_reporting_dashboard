/*
  # Add AI Rate Limiting System

  1. New Tables
    - `ai_rate_limits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, not null) - The user making requests
      - `customer_id` (integer, foreign key) - Optional customer context
      - `request_timestamp` (timestamptz) - When the request was made

  2. New Functions
    - `check_user_rate_limit` - Checks if user is within rate limits
    - `record_rate_limit_request` - Records a new request
    - `cleanup_old_rate_limits` - Cleans up old records (run daily)

  3. Security
    - Functions use SECURITY DEFINER for controlled access
    - Appropriate grants for authenticated and service_role

  4. Indexes
    - User + timestamp index for efficient lookups
    - Customer index for customer-level analytics
    - Timestamp index for cleanup operations
*/

CREATE TABLE IF NOT EXISTS ai_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_id INTEGER REFERENCES customer(customer_id) ON DELETE CASCADE,
  request_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_rate_limits_user_idx 
ON ai_rate_limits(user_id, request_timestamp);

CREATE INDEX IF NOT EXISTS ai_rate_limits_customer_idx 
ON ai_rate_limits(customer_id, request_timestamp);

CREATE INDEX IF NOT EXISTS ai_rate_limits_timestamp_idx 
ON ai_rate_limits(request_timestamp);

CREATE OR REPLACE FUNCTION check_user_rate_limit(
  p_user_id UUID,
  p_hourly_limit INT DEFAULT 20,
  p_daily_limit INT DEFAULT 100
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hourly_count INT;
  v_daily_count INT;
  v_hourly_reset TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*) INTO v_hourly_count
  FROM ai_rate_limits
  WHERE user_id = p_user_id
    AND request_timestamp > NOW() - INTERVAL '1 hour';
  
  SELECT COUNT(*) INTO v_daily_count
  FROM ai_rate_limits
  WHERE user_id = p_user_id
    AND request_timestamp > DATE_TRUNC('day', NOW());
  
  v_hourly_reset := DATE_TRUNC('hour', NOW()) + INTERVAL '1 hour';
  
  IF v_hourly_count >= p_hourly_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'limit_type', 'hourly',
      'current_count', v_hourly_count,
      'reset_in_seconds', EXTRACT(EPOCH FROM (v_hourly_reset - NOW()))::INT,
      'message', format('You''ve reached your hourly limit of %s AI requests. Resets in %s minutes.', 
                        p_hourly_limit, 
                        CEIL(EXTRACT(EPOCH FROM (v_hourly_reset - NOW())) / 60))
    );
  END IF;
  
  IF v_daily_count >= p_daily_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'limit_type', 'daily',
      'current_count', v_daily_count,
      'reset_in_seconds', EXTRACT(EPOCH FROM (DATE_TRUNC('day', NOW()) + INTERVAL '1 day' - NOW()))::INT,
      'message', format('You''ve reached your daily limit of %s AI requests. Resets at midnight.', p_daily_limit)
    );
  END IF;
  
  RETURN json_build_object(
    'allowed', true,
    'hourly_count', v_hourly_count,
    'daily_count', v_daily_count,
    'hourly_remaining', p_hourly_limit - v_hourly_count,
    'daily_remaining', p_daily_limit - v_daily_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION record_rate_limit_request(
  p_user_id UUID,
  p_customer_id INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO ai_rate_limits (user_id, customer_id, request_timestamp)
  VALUES (p_user_id, p_customer_id, NOW());
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM ai_rate_limits
  WHERE request_timestamp < NOW() - INTERVAL '2 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION check_user_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION record_rate_limit_request TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits TO service_role;