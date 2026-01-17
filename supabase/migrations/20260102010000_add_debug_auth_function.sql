/*
  # Add Debug Auth Function
  
  Creates a function that returns auth debugging info to help
  diagnose RLS policy issues.
*/

CREATE OR REPLACE FUNCTION debug_auth_info()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  user_uuid uuid;
  role_record record;
BEGIN
  user_uuid := auth.uid();
  
  SELECT user_role INTO role_record
  FROM user_roles
  WHERE user_id = user_uuid;
  
  result := jsonb_build_object(
    'auth_uid', user_uuid,
    'user_role_from_table', role_record.user_role,
    'timestamp', now()
  );
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION debug_auth_info() TO authenticated;
