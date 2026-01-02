/*
  # Recreate Daily Budget Check Function

  1. Changes
    - Drops existing function to update return type
    - Recreates with jsonb return type for richer response

  2. New Function Signature
    - `check_user_daily_budget(p_user_id uuid, p_cap numeric)` returns jsonb
    - Returns: allowed, spent_today, daily_cap, message, remaining

  3. Security
    - SECURITY DEFINER with restricted search_path
*/

DROP FUNCTION IF EXISTS check_user_daily_budget(uuid, numeric);

CREATE OR REPLACE FUNCTION check_user_daily_budget(
  p_user_id uuid,
  p_cap numeric DEFAULT 5.00
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spent_today numeric;
  v_allowed boolean;
  v_message text;
BEGIN
  SELECT COALESCE(SUM(
    (input_tokens * 0.000003) + (output_tokens * 0.000015)
  ), 0)
  INTO v_spent_today
  FROM ai_usage_log
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day'
    AND status = 'success';

  v_allowed := v_spent_today < p_cap;

  IF v_allowed THEN
    v_message := format('Budget OK: $%s of $%s used today', 
      ROUND(v_spent_today::numeric, 4), 
      ROUND(p_cap::numeric, 2));
  ELSE
    v_message := format('Daily AI budget exceeded. You''ve used $%s of your $%s daily limit. Budget resets at midnight UTC.',
      ROUND(v_spent_today::numeric, 2),
      ROUND(p_cap::numeric, 2));
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'spent_today', ROUND(v_spent_today::numeric, 4),
    'daily_cap', p_cap,
    'message', v_message,
    'remaining', GREATEST(0, p_cap - v_spent_today)
  );
END;
$$;

COMMENT ON FUNCTION check_user_daily_budget IS 'Check if user has remaining daily AI budget. Returns allowed status, amounts spent/remaining, and message.';
