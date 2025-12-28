# RLS Policy Incident - Postmortem

## Date: December 28, 2024

## What Happened

Admin users were unable to see multiple customers - only seeing one customer instead of all customers in the system. This broke admin functionality across the entire application.

## Root Cause

Between December 18-28, 2024, a series of migrations changed admin RLS policies from querying the `user_roles` table to checking JWT claims:

**Original (Working) Pattern:**
```sql
EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid()
    AND user_role = 'admin'
)
```

**Broken Pattern:**
```sql
(SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
```

**The Problem:** The JWT token doesn't contain a `user_role` field, so this check always returned `null`, which PostgreSQL treats as `false`. This broke all admin access.

## Timeline

1. **Dec 18, 2024** - First JWT-based policy introduced in `20251218192818_fix_user_roles_rls_policy.sql`
2. **Dec 23, 2024** - "Performance optimization" migrations converted many policies to JWT-based checks (migrations 20251223193441 through 20251223193645)
3. **Dec 28, 2024** - More policies converted to JWT-based checks (migrations 20251228183749 through 20251228183838)
4. **Dec 28, 2024** - Issue discovered and fixed in `20251228184812_fix_all_admin_policies_use_user_roles_table.sql`

## Impact

- **43 policies** across the entire system were broken
- Affected tables:
  - Core data: `customer`, `carrier`, `shipment`, `client`
  - Shipment details: `shipment_address`, `shipment_carrier`, `shipment_detail`, `shipment_item`, `shipment_note`, `shipment_accessorial`
  - Dashboard: `dashboard_widgets`
  - AI systems: `ai_knowledge`, `ai_knowledge_documents`, `ai_learning_feedback`, `ai_report_audit`
  - Glossary: `glossary_global`, `glossary_customer`, `glossary_learning_queue`, `glossary_audit_log`
  - Metadata: `field_business_context`, `users_customers`

## Why It Happened

1. **False Assumption**: Assumed `user_role` was stored in JWT claims without verification
2. **No Testing**: Changes weren't tested as admin user before deploying
3. **Pattern Replication**: Once the wrong pattern was introduced, it was copied to many other policies
4. **Performance Focus**: Focused on optimization without verifying correctness first

## The Fix

All 43 policies were updated to use the correct pattern:

```sql
EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = (select auth.uid())
    AND user_role = 'admin'
)
```

Note: The `(select auth.uid())` wrapper is kept for performance - it ensures the function is called once per query rather than once per row.

## Prevention Strategies

### 1. Database Testing Protocol

Create a test script that validates admin access:

```sql
-- Test admin can see all customers
SELECT COUNT(*) FROM customer; -- Should return all active customers

-- Verify JWT contents
SELECT
  (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) as jwt_user_role,
  (SELECT user_role FROM user_roles WHERE user_id = auth.uid()) as db_user_role;
```

### 2. Policy Standards

**NEVER use JWT claims for `user_role`** - it's not stored there. Instead:

✅ **CORRECT - Query user_roles table:**
```sql
EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = (select auth.uid())
    AND user_role = 'admin'
)
```

❌ **WRONG - JWT claims:**
```sql
(SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
```

**Exception:** The `user_roles` table itself must use JWT or direct `auth.uid()` to avoid recursion.

### 3. Migration Review Checklist

Before applying RLS migrations:

- [ ] Have you tested this policy as both admin and customer user?
- [ ] If using JWT claims, have you verified the field exists in the JWT?
- [ ] Does the policy query other tables that also have RLS? (risk of recursion)
- [ ] Have you checked similar policies for consistency?
- [ ] Can you explain why this pattern is better than the existing one?

### 4. What's Actually In The JWT

Our JWT tokens contain:
- `aud`, `exp`, `iat`, `sub` (standard claims)
- `email`, `phone`, `role` (Supabase auth)
- **NOT `user_role`** - this is stored in the database only

### 5. Performance vs Correctness

When optimizing:
1. **First, ensure it works correctly**
2. Then measure if there's a performance problem
3. Only then optimize
4. Test again to ensure correctness

Don't optimize based on assumptions.

### 6. Monitoring

Add these checks to catch similar issues:

1. **Admin access test**: Periodically verify admin can see all customers
2. **Policy audit**: Script to find all policies using JWT claims
3. **Migration testing**: Test all RLS changes in development first

## Query to Find Problematic Policies

```sql
-- Find all policies using JWT claims
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE qual LIKE '%request.jwt.claims%user_role%'
   OR with_check LIKE '%request.jwt.claims%user_role%'
ORDER BY tablename, policyname;
```

If this returns any results (except for the `user_roles` table), those policies need to be fixed.

## Lessons Learned

1. **Test as different user types** - Admin and customer users have different permissions
2. **Verify assumptions** - Don't assume JWT contains fields without checking
3. **Correctness first** - Never sacrifice correctness for performance
4. **Pattern replication** - Be careful when copying patterns; one mistake multiplies
5. **Documentation** - Document what's in JWT vs database tables

## Action Items

- [x] Fix all 43 broken policies
- [x] Document the incident
- [ ] Create automated test suite for RLS policies
- [ ] Add migration review process
- [ ] Document JWT contents in developer docs
- [ ] Create policy template/examples
