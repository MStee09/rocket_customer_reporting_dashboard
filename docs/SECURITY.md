# Security Documentation

**Related Documentation:**
- [RLS Best Practices](./RLS_BEST_PRACTICES.md) - Comprehensive guide to Row Level Security patterns
- [RLS Incident Postmortem](./RLS_INCIDENT_POSTMORTEM.md) - Lessons learned from security incidents
- [Admin Access Test Suite](../scripts/test-admin-access.sql) - Automated testing for RLS policies

## 1. Overview

This application implements a multi-tenant security model with role-based access control to protect sensitive business data. The system supports two primary user roles: **Admin** and **Customer**.

**Core Security Principles:**
- **Data Isolation**: Customers can only access their own shipment data
- **Financial Privacy**: Carrier costs, margins, and internal pricing are hidden from customers
- **View Separation**: Database views enforce field-level security at the database layer
- **Defense in Depth**: Security enforced at both database (RLS + views) and application layers

## 2. User Roles & Permissions

### Permission Matrix

| Permission | Admin | Admin (View as Customer) | Customer |
|------------|-------|--------------------------|----------|
| See all customers' data | ✅ | ❌ | ❌ |
| See cost/carrier_pay/margins | ✅ | ❌ | ❌ |
| Access base tables | ✅ | ❌ | ❌ |
| Access customer views | ✅ | ✅ | ✅ |
| Create system widgets | ✅ | ❌ | ❌ |
| View all custom widgets | ✅ | ❌ | ❌ |
| Create personal widgets | ✅ | ✅ | ✅ |
| Manage users | ✅ | ❌ | ❌ |
| View customer list | ✅ | ❌ | ❌ |
| Export reports | ✅ | ✅ | ✅ |

### Role Determination

```typescript
// User role is determined from user_roles table
const { role } = user; // 'admin' or 'customer'
const isAdmin = role === 'admin';

// View mode affects data access
const isViewingAsCustomer = isAdmin && selectedCustomerId !== null;
```

## 3. Sensitive Fields (Admin-Only)

These fields contain confidential business information and must NEVER be exposed to customers:

| Table | Field | Data Type | Why Sensitive | Customer Sees Instead |
|-------|-------|-----------|---------------|----------------------|
| shipment | `cost` | numeric | What we pay carrier (reveals margin) | `retail` only |
| shipment | `cost_without_tax` | numeric | Carrier cost pre-tax | `retail` only |
| shipment | `target_rate` | numeric | Internal pricing targets | Nothing |
| shipment_carrier | `carrier_pay` | numeric | Actual carrier payment amount | Nothing |
| shipment_accessorial | `cost_amount` | numeric | What carrier charges us for accessorials | `charge_amount` (what customer pays) |

**Critical**: These fields are excluded from `*_customer_view` tables and should never be included in SELECT statements for customer users.

## 4. Database Views

### View Pattern

The application uses a `*_customer_view` naming convention for all customer-facing database views. These views are read-only projections of base tables with sensitive fields excluded.

| Base Table | Customer View | Fields Hidden | Additional Filtering |
|------------|---------------|---------------|---------------------|
| `shipment` | `shipment_customer_view` | cost, cost_without_tax, target_rate | None |
| `shipment_carrier` | `shipment_carrier_customer_view` | carrier_pay | None |
| `shipment_accessorial` | `shipment_accessorial_customer_view` | cost_amount | None |
| `shipment_address` | `shipment_address_customer_view` | None | None |
| `shipment_item` | `shipment_item_customer_view` | None | None |
| `shipment_detail` | `shipment_detail_customer_view` | None | None |
| `shipment_note` | `shipment_note_customer_view` | None | Only `is_visible_to_customer = true` |

### View Definitions

Views are created with SQL like:

```sql
CREATE VIEW shipment_customer_view AS
SELECT
  shipment_id,
  load_id,
  customer_id,
  retail,  -- Customer sees what they pay
  -- cost is EXCLUDED
  -- cost_without_tax is EXCLUDED
  pickup_date,
  delivery_date,
  status_id,
  mode_id,
  rate_carrier_id,
  -- ... other non-sensitive fields
FROM shipment;
```

### Row-Level Security (RLS)

All views and base tables have RLS policies that enforce customer_id filtering.

**Important:** See [RLS_BEST_PRACTICES.md](./RLS_BEST_PRACTICES.md) for comprehensive RLS policy patterns and guidelines.

**Standard Admin Policy Pattern:**
```sql
-- Base table policy (admin only)
CREATE POLICY "Admins can read all shipments"
  ON shipment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );
```

**Standard Customer Policy Pattern:**
```sql
-- Customer view policy
CREATE POLICY "Customers can read own shipments"
  ON shipment_customer_view FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id
      FROM users_customers
      WHERE user_id = (select auth.uid())
    )
  );
```

**Critical Rules:**
- NEVER use JWT claims for `user_role` - it's not stored there
- ALWAYS wrap `auth.uid()` in `(select auth.uid())` for performance
- ALWAYS test policies as both admin and customer users
- See [RLS_INCIDENT_POSTMORTEM.md](./RLS_INCIDENT_POSTMORTEM.md) for lessons learned

## 5. Code Patterns

### Required: Always Use getSecureTable()

**File**: `src/utils/getSecureTable.ts`

```typescript
// ✅ CORRECT - Uses secure table helper
import { getSecureTable } from '../utils/getSecureTable';

const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);
const { data } = await supabase
  .from(table)  // 'shipment' OR 'shipment_customer_view'
  .select('*');

// ❌ WRONG - Direct table access (security bypass)
const { data } = await supabase
  .from('shipment')  // Always base table!
  .select('*');
```

### How getSecureTable() Works

```typescript
export function getSecureTable(
  baseTable: SecureTableName,
  isAdmin: boolean,
  isViewingAsCustomer: boolean = false
): string {
  // Admin viewing as themselves = full access
  if (isAdmin && !isViewingAsCustomer) {
    return baseTable;  // Returns 'shipment'
  }

  // Customer OR admin viewing as customer = secure view
  const customerViews: Record<SecureTableName, string> = {
    'shipment': 'shipment_customer_view',
    'shipment_carrier': 'shipment_carrier_customer_view',
    // ... etc
  };

  return customerViews[baseTable] || baseTable;
}
```

### Required: Filter by Customer ID

```typescript
// ✅ CORRECT - Always filter by customer for non-admins
const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

let query = supabase
  .from(table)
  .select('*');

if (!isAdmin || isViewingAsCustomer) {
  query = query.in('customer_id', effectiveCustomerIds);
}

const { data } = await query;

// ❌ WRONG - No customer filter (admin sees all, customer might too via RLS bypass)
const { data } = await supabase
  .from(table)
  .select('*');  // Missing filter!
```

### Required: Filter Select Fields

```typescript
import { getSelectFields } from '../utils/getSecureTable';

// ✅ CORRECT - Remove admin-only fields for customers
const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);
const selectFields = getSelectFields(
  'load_id, retail, cost, miles',
  isAdmin,
  isViewingAsCustomer
);
// Customer gets: 'load_id, retail, miles' (cost removed)

const { data } = await supabase
  .from(table)
  .select(selectFields);

// ❌ WRONG - Requesting cost for customer (will fail or return null)
const { data } = await supabase
  .from(table)
  .select('load_id, retail, cost, miles');  // cost doesn't exist in view!
```

### Full Example Pattern

```typescript
import { getSecureTable, getSelectFields } from '../utils/getSecureTable';

export function useShipmentData(
  effectiveCustomerIds: number[],
  isAdmin: boolean,
  isViewingAsCustomer: boolean,
  dateRange: { start: string; end: string }
) {
  const loadData = async () => {
    // 1. Get secure table
    const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

    // 2. Filter fields (optional, if selecting admin-only fields)
    const fields = getSelectFields(
      'load_id, retail, cost, pickup_date',
      isAdmin,
      isViewingAsCustomer
    );

    // 3. Build query with customer filter
    let query = supabase
      .from(table)
      .select(fields);

    if (!isAdmin || isViewingAsCustomer) {
      query = query.in('customer_id', effectiveCustomerIds);
    }

    // 4. Apply date filters, ordering, etc.
    const { data, error } = await query
      .gte('pickup_date', dateRange.start)
      .lte('pickup_date', dateRange.end);

    return data;
  };
}
```

## 6. "View as Customer" Mode

### Overview

Admins can temporarily view the application from a customer's perspective. This mode:
- Uses customer views (hides cost/margin data)
- Filters all queries to only show selected customer's data
- Shows exactly what that customer would see
- Useful for support, demos, and testing

### Implementation

**Frontend State:**
```typescript
// AuthContext provides these values
const {
  isAdmin,              // User's actual role
  selectedCustomerId,   // Which customer admin is viewing as
  isViewingAsCustomer,  // true when admin has selected a customer
  effectiveCustomerIds  // Array of customer IDs to filter by
} = useAuth();
```

**Flow:**
1. Admin logs in → `isAdmin = true`, `isViewingAsCustomer = false`
2. Admin selects customer from dropdown → `isViewingAsCustomer = true`, `selectedCustomerId = 123`
3. All queries now use customer views and filter by `customer_id = 123`
4. Admin clears selection → `isViewingAsCustomer = false`, sees all data again

**UI Indicators:**
- Header shows "Viewing as: [Customer Name]" badge
- Dashboard switches to customer layout
- Admin-only widgets are hidden
- Clear/exit button to return to admin view

### Testing View as Customer

```typescript
// Manual test
1. Log in as admin
2. Select customer "Acme Corp" from dropdown
3. Open browser DevTools → Network tab
4. Navigate to dashboard
5. Check API requests:
   ✅ Should query shipment_customer_view (not shipment)
   ✅ Should filter .in('customer_id', [123])
   ✅ Response should NOT contain 'cost' fields
```

## 7. Adding New Features - Security Checklist

Before adding any new data-fetching code, verify:

- [ ] **Table Selection**: Am I using `getSecureTable()` for table selection?
- [ ] **Customer Filtering**: Am I filtering by `customer_id` using `effectiveCustomerIds`?
- [ ] **Field Filtering**: Am I excluding sensitive fields for customer context?
- [ ] **Joins**: If joining tables, are all joined tables also using secure views?
- [ ] **RLS Policies**: Do new tables have proper RLS policies?
- [ ] **Testing - Customer**: Have I tested as a customer user?
- [ ] **Testing - Admin**: Have I tested as admin in normal mode?
- [ ] **Testing - View As**: Have I tested admin "View as Customer" mode?
- [ ] **Error Handling**: Does my code handle missing fields gracefully?
- [ ] **Type Safety**: Are TypeScript types excluding admin-only fields for customer context?

### Example: Adding a New Widget

```typescript
// ❌ BAD - Direct table access
const widget = {
  calculate: async ({ supabase, customerId, dateRange }) => {
    const { data } = await supabase
      .from('shipment')  // Direct access!
      .select('*')       // No customer filter!
      .gte('pickup_date', dateRange.start);

    return { value: data.length };
  }
};

// ✅ GOOD - Secure implementation
const widget = {
  calculate: async ({
    supabase,
    effectiveCustomerIds,
    isAdmin,
    isViewingAsCustomer,
    dateRange
  }) => {
    const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

    let query = supabase
      .from(table)
      .select('load_id', { count: 'exact' });

    if (!isAdmin || isViewingAsCustomer) {
      query = query.in('customer_id', effectiveCustomerIds);
    }

    const { count } = await query
      .gte('pickup_date', dateRange.start)
      .lte('pickup_date', dateRange.end);

    return { value: count || 0 };
  }
};
```

## 8. AI/LLM Integration Rules

When adding AI features that access data:

### Context Limitation

AI assistants must be constrained to user's permission level:

```typescript
const aiQueryContext = {
  // Limit available tables
  allowedTables: isAdmin && !isViewingAsCustomer
    ? ALL_TABLES
    : CUSTOMER_VIEW_TABLES,

  // Force customer filter
  requiredFilters: {
    customer_id: effectiveCustomerIds
  },

  // Block sensitive fields
  blockedFields: isAdmin && !isViewingAsCustomer
    ? []
    : ['cost', 'cost_without_tax', 'carrier_pay', 'cost_amount', 'target_rate'],

  // User context
  userRole: isAdmin ? 'admin' : 'customer',
  isViewingAsCustomer,
};
```

### AI Query Generation Rules

1. **ALWAYS** pass user role context to any AI query builder
2. AI should **ONLY** generate queries using customer views for non-admin users
3. **NEVER** allow AI to reference blocked fields for customers
4. AI-generated queries **MUST** include customer_id filter
5. **VALIDATE** AI-generated SQL before execution
6. **LOG** all AI-generated queries for audit

### Safe AI Query Pattern

```typescript
async function executeAIQuery(
  naturalLanguageQuery: string,
  userContext: UserContext
) {
  // 1. Generate SQL with context
  const sql = await aiAgent.generateSQL(naturalLanguageQuery, {
    allowedTables: getAvailableTables(userContext),
    blockedFields: getSensitiveFields(userContext),
    requiredFilters: { customer_id: userContext.effectiveCustomerIds }
  });

  // 2. Validate generated query
  const validation = validateQuery(sql, userContext);
  if (!validation.valid) {
    throw new Error(`Unsafe query: ${validation.errors.join(', ')}`);
  }

  // 3. Log for audit
  await logAIQuery({
    userId: userContext.userId,
    query: sql,
    naturalLanguage: naturalLanguageQuery,
    timestamp: new Date()
  });

  // 4. Execute with proper table
  const table = getSecureTable(
    validation.baseTable,
    userContext.isAdmin,
    userContext.isViewingAsCustomer
  );

  return supabase.from(table).select(validation.selectClause);
}
```

### Prohibited AI Behaviors

**NEVER** allow AI to:
- Query base tables for customer users
- SELECT cost, carrier_pay, or other sensitive fields for customers
- Generate queries without customer_id filter for non-admins
- Bypass `getSecureTable()` helper
- Execute raw SQL without validation
- Access data from other customers

## 9. Testing Security

### Manual Testing Checklist

#### Test as Customer User

1. **Log in as customer** (use test account)
2. **Open Browser DevTools** → Network tab
3. **Navigate through application**:
   - Dashboard
   - Shipments list
   - Reports page
   - Custom reports
   - Widget library
4. **Verify ALL network requests**:
   - [ ] All Supabase requests query `*_customer_view` tables
   - [ ] No requests to base tables (shipment, shipment_carrier, etc.)
   - [ ] Response data does NOT contain: `cost`, `carrier_pay`, `cost_amount`, `target_rate`
   - [ ] All queries include customer_id filter
   - [ ] Only see own customer's shipments

#### Test as Admin (Normal Mode)

1. **Log in as admin**
2. **Open Browser DevTools** → Network tab
3. **Navigate through application**
4. **Verify**:
   - [ ] Requests query base tables (shipment, not shipment_customer_view)
   - [ ] Response data DOES contain: `cost`, `carrier_pay` (where applicable)
   - [ ] See shipments from ALL customers
   - [ ] Admin-only widgets are visible

#### Test as Admin (View as Customer Mode)

1. **Log in as admin**
2. **Select specific customer** from "View as Customer" dropdown
3. **Open Browser DevTools** → Network tab
4. **Navigate through application**
5. **Verify**:
   - [ ] Requests query `*_customer_view` tables (not base tables)
   - [ ] Response data does NOT contain: `cost`, `carrier_pay`
   - [ ] Only see selected customer's shipments
   - [ ] Admin-only widgets are hidden
   - [ ] Header shows "Viewing as: [Customer Name]"
6. **Clear customer selection**
7. **Verify** returns to admin mode (see all data again)

### Automated Test Examples

```typescript
describe('Security - Customer Data Access', () => {
  it('should use customer view for customer users', async () => {
    const { isAdmin, isViewingAsCustomer } = { isAdmin: false, isViewingAsCustomer: false };
    const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

    expect(table).toBe('shipment_customer_view');
  });

  it('should use base table for admins', async () => {
    const { isAdmin, isViewingAsCustomer } = { isAdmin: true, isViewingAsCustomer: false };
    const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

    expect(table).toBe('shipment');
  });

  it('should use customer view when admin views as customer', async () => {
    const { isAdmin, isViewingAsCustomer } = { isAdmin: true, isViewingAsCustomer: true };
    const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

    expect(table).toBe('shipment_customer_view');
  });

  it('should filter out cost field for customers', async () => {
    const fields = getSelectFields('load_id, retail, cost', false, false);

    expect(fields).toBe('load_id, retail');
    expect(fields).not.toContain('cost');
  });
});
```

## 10. Incident Response

### If Sensitive Data is Exposed

**Immediate Actions:**

1. **Identify the leak**:
   - Which endpoint/query is leaking data?
   - Which fields are exposed?
   - Which users have access?

2. **Check the code**:
   - Was `getSecureTable()` used?
   - Was `customer_id` filter applied?
   - Were sensitive fields in SELECT clause?

3. **Fix immediately**:
   ```typescript
   // Common fixes:

   // Fix 1: Add getSecureTable()
   - const { data } = await supabase.from('shipment')
   + const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);
   + const { data } = await supabase.from(table)

   // Fix 2: Add customer filter
   + if (!isAdmin || isViewingAsCustomer) {
   +   query = query.in('customer_id', effectiveCustomerIds);
   + }

   // Fix 3: Filter select fields
   + const fields = getSelectFields(selectClause, isAdmin, isViewingAsCustomer);
   + .select(fields)
   ```

4. **Deploy fix** to production immediately

5. **Audit logs**:
   - Check Supabase logs for unauthorized queries
   - Identify affected customers
   - Determine if data was accessed

6. **Document incident**:
   - What leaked?
   - How was it exposed?
   - Who was affected?
   - What was the fix?
   - How do we prevent this in the future?

### Prevention Measures

- **Code review**: All data-fetching PRs must be reviewed for security
- **Linting**: Add ESLint rules to detect `.from('shipment')` without `getSecureTable()`
- **Testing**: Security tests must pass in CI/CD
- **Documentation**: This file should be required reading for all developers
- **Monitoring**: Alert on queries to base tables from non-admin users

---

## Quick Reference

### Key Functions

```typescript
// Get appropriate table/view based on role
getSecureTable(baseTable, isAdmin, isViewingAsCustomer): string

// Filter out admin-only fields
getSelectFields(fields, isAdmin, isViewingAsCustomer): string
```

### Files to Reference

- `src/utils/getSecureTable.ts` - Core security helper
- `src/hooks/useDashboardData.ts` - Example usage patterns
- `src/config/dashboardWidgets.ts` - Widget security patterns
- `supabase/migrations/*_customer_view.sql` - View definitions

### Sensitive Field List (Never Show to Customers)

- `shipment.cost`
- `shipment.cost_without_tax`
- `shipment.target_rate`
- `shipment_carrier.carrier_pay`
- `shipment_accessorial.cost_amount`

---

**Last Updated**: 2024-12-28
**Version**: 1.1
**Owner**: Engineering Team
