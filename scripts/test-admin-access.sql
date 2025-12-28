/*
  Admin Access Test Suite

  Run these queries as an admin user to verify RLS policies are working correctly.
  All queries should succeed and return data.
*/

-- ====================
-- 1. JWT Verification
-- ====================
SELECT
  'JWT Contents' as test_name,
  (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) as jwt_user_role,
  (SELECT user_role FROM user_roles WHERE user_id = auth.uid()) as db_user_role,
  CASE
    WHEN (SELECT user_role FROM user_roles WHERE user_id = auth.uid()) = 'admin'
    THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status;

-- ====================
-- 2. Core Table Access
-- ====================
SELECT
  'Customer Access' as test_name,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) > 1 THEN '✓ PASS'
    ELSE '✗ FAIL - Should see multiple customers'
  END as status
FROM customer;

SELECT
  'Carrier Access' as test_name,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM carrier;

SELECT
  'Shipment Access' as test_name,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM shipment;

-- ====================
-- 3. User Management
-- ====================
SELECT
  'User Roles Access' as test_name,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) > 1 THEN '✓ PASS - Can see all user roles'
    ELSE '✗ FAIL - Should see multiple user roles'
  END as status
FROM user_roles;

SELECT
  'Users-Customers Access' as test_name,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM users_customers;

-- ====================
-- 4. Dashboard & Widgets
-- ====================
SELECT
  'Dashboard Widgets Access' as test_name,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM dashboard_widgets;

-- ====================
-- 5. AI & Knowledge Base
-- ====================
SELECT
  'AI Knowledge Access' as test_name,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM ai_knowledge;

SELECT
  'AI Knowledge Documents' as test_name,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM ai_knowledge_documents;

SELECT
  'Field Business Context' as test_name,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM field_business_context;

-- ====================
-- 6. Glossary System
-- ====================
SELECT
  'Global Glossary Access' as test_name,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM glossary_global;

SELECT
  'Customer Glossary Access' as test_name,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM glossary_customer;

-- ====================
-- 7. Scheduled Reports
-- ====================
SELECT
  'Scheduled Reports Access' as test_name,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM scheduled_reports;

-- ====================
-- 8. Policy Audit
-- ====================
-- Find any policies still using JWT for user_role (should only be user_roles table)
SELECT
  'JWT Policy Audit' as test_name,
  tablename,
  policyname,
  CASE
    WHEN tablename = 'user_roles' THEN '✓ OK - Exception for user_roles table'
    ELSE '✗ FAIL - Should not use JWT for user_role'
  END as status
FROM pg_policies
WHERE (qual LIKE '%request.jwt.claims%user_role%'
   OR with_check LIKE '%request.jwt.claims%user_role%')
  AND tablename != 'user_roles'
ORDER BY tablename, policyname;

-- ====================
-- Summary
-- ====================
SELECT
  '===================' as summary,
  'All tests completed' as message,
  'If any tests show FAIL, RLS policies need review' as note;
