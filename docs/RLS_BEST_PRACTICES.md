# Row Level Security (RLS) Best Practices

## Core Principles

1. **Correctness First** - RLS is a security boundary. Never compromise security for performance.
2. **Test Everything** - Test policies as different user roles before deploying.
3. **Document Assumptions** - If a policy relies on JWT claims, document what's in the JWT.
4. **Avoid Recursion** - Be careful when policies query tables that also have RLS enabled.

## Standard Patterns

### Admin User Check

✅ **CORRECT - Use user_roles table:**
```sql
EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = (select auth.uid())
    AND user_role = 'admin'
)
```

❌ **WRONG - JWT claims (user_role not in JWT):**
```sql
(SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
```

### Customer User Check

For customer-specific data:
```sql
customer_id IN (
  SELECT customer_id
  FROM users_customers
  WHERE user_id = (select auth.uid())
)
```

### Combined Admin OR Customer Check

```sql
-- Admin can see everything OR customer can see their data
EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = (select auth.uid())
    AND user_role = 'admin'
)
OR
customer_id IN (
  SELECT customer_id
  FROM users_customers
  WHERE user_id = (select auth.uid())
)
```

### Own Data Check

For data owned by the user directly:
```sql
user_id = (select auth.uid())
```

Or with admin access:
```sql
user_id = (select auth.uid())
OR
EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = (select auth.uid())
    AND user_role = 'admin'
)
```

## Performance Optimization

### The `(select auth.uid())` Pattern

Always wrap `auth.uid()` in a SELECT:

```sql
-- ✅ Good - evaluated once per query
WHERE user_id = (select auth.uid())

-- ❌ Bad - evaluated once per row
WHERE user_id = auth.uid()
```

This is a significant performance improvement for large datasets.

### The `(select current_setting(...))` Pattern

Same applies to JWT access:

```sql
-- ✅ Good - evaluated once per query
WHERE (SELECT (current_setting('request.jwt.claims', true)::json->>'email')) = email

-- ❌ Bad - evaluated once per row
WHERE (current_setting('request.jwt.claims', true)::json->>'email') = email
```

**BUT REMEMBER**: Only use JWT claims for fields that actually exist in the JWT!

## What's In The JWT Token

Our Supabase JWT contains:
- `aud` - Audience
- `exp` - Expiration time
- `iat` - Issued at
- `sub` - Subject (user ID)
- `email` - User's email
- `phone` - User's phone (if set)
- `role` - Supabase auth role (always 'authenticated' for logged-in users)
- `app_metadata` - Any custom app metadata
- `user_metadata` - User profile data

**NOT in JWT:**
- `user_role` - This is stored in the `user_roles` table only
- `customer_id` - This is in `users_customers` table
- Custom application data

To verify what's in your JWT:
```sql
SELECT current_setting('request.jwt.claims', true)::json;
```

## Policy Types

### SELECT Policies
```sql
CREATE POLICY "policy_name"
  ON table_name
  FOR SELECT
  TO authenticated
  USING (condition);
```

### INSERT Policies
```sql
CREATE POLICY "policy_name"
  ON table_name
  FOR INSERT
  TO authenticated
  WITH CHECK (condition);
```

### UPDATE Policies
```sql
CREATE POLICY "policy_name"
  ON table_name
  FOR UPDATE
  TO authenticated
  USING (can_see_row_condition)
  WITH CHECK (can_modify_to_these_values_condition);
```

### DELETE Policies
```sql
CREATE POLICY "policy_name"
  ON table_name
  FOR DELETE
  TO authenticated
  USING (condition);
```

### ALL Policies (use sparingly)
```sql
CREATE POLICY "policy_name"
  ON table_name
  FOR ALL
  TO authenticated
  USING (condition)
  WITH CHECK (condition);
```

## Common Pitfalls

### 1. Infinite Recursion

❌ **WRONG - Creates recursion:**
```sql
-- On user_roles table
CREATE POLICY "..." ON user_roles
  USING (
    EXISTS (
      SELECT 1 FROM user_roles  -- Queries same table!
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  );
```

✅ **CORRECT - Use direct check:**
```sql
-- On user_roles table
CREATE POLICY "..." ON user_roles
  USING ((select auth.uid()) = user_id);
```

### 2. Forgetting WITH CHECK

❌ **WRONG - Can see data but can't insert/update:**
```sql
CREATE POLICY "..." ON table
  FOR UPDATE
  USING (customer_id = 123);
  -- Missing WITH CHECK!
```

✅ **CORRECT:**
```sql
CREATE POLICY "..." ON table
  FOR UPDATE
  USING (customer_id = 123)
  WITH CHECK (customer_id = 123);
```

### 3. Using auth.uid() Without SELECT Wrapper

❌ **SLOW:**
```sql
WHERE user_id = auth.uid()
```

✅ **FAST:**
```sql
WHERE user_id = (select auth.uid())
```

### 4. Making Policies Too Permissive

❌ **WRONG - Security risk:**
```sql
CREATE POLICY "..." ON sensitive_table
  USING (true);  -- Everyone can see everything!
```

✅ **CORRECT - Restrictive by default:**
```sql
CREATE POLICY "..." ON sensitive_table
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  );
```

## Testing Checklist

Before deploying RLS changes:

- [ ] Test as admin user - can see all data?
- [ ] Test as customer user - can only see their data?
- [ ] Test as different customers - isolated from each other?
- [ ] Test as unauthenticated user - blocked?
- [ ] Try to access other customers' data directly by ID - blocked?
- [ ] Check query performance with EXPLAIN ANALYZE
- [ ] Run the admin access test suite (`scripts/test-admin-access.sql`)

## Migration Template

```sql
/*
  # [Brief description]

  1. Changes
    - [What's changing]
    - [Why it's changing]

  2. Security
    - [How this maintains/improves security]
    - [What users can do]
    - [What users cannot do]

  3. Testing
    - [ ] Tested as admin user
    - [ ] Tested as customer user
    - [ ] Verified isolation between customers
*/

-- Your migration here
```

## Debugging RLS Issues

### Check if RLS is enabled:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### View all policies on a table:
```sql
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

### Test a policy as a specific user:
```sql
-- In Supabase dashboard SQL editor, or via API with user's JWT
SELECT * FROM your_table;
```

### Check what auth.uid() returns:
```sql
SELECT auth.uid();
```

### View JWT contents:
```sql
SELECT current_setting('request.jwt.claims', true)::json;
```

## Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Project-specific: `docs/RLS_INCIDENT_POSTMORTEM.md` for lessons learned
