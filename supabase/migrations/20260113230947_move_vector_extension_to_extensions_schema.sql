/*
  # Move Vector Extension to Separate Schema

  This migration moves the vector extension from the public schema
  to a dedicated extensions schema. This is a security best practice.

  ## Changes:
  1. Create extensions schema
  2. Move vector extension to extensions schema
  3. Grant necessary permissions

  ## Note:
  - pg_net extension cannot be moved (does not support SET SCHEMA)
  - Vector extension functionality remains unchanged
  - Existing code should continue to work
*/

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move vector extension to extensions schema
ALTER EXTENSION vector SET SCHEMA extensions;

-- Grant usage on extensions schema to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO anon;

-- Update search path for vector types to be accessible
-- This ensures vector type can be used without schema qualification
ALTER DATABASE postgres SET search_path TO public, extensions;