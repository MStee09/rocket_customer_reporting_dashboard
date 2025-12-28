# Customer ID Selection Audit & Fixes

## Issue Summary

After implementing security fixes, multiple customer ID issues were discovered:

1. **Customer Views Used Wrong Authentication**: Views checked JWT claims that were never set
2. **Wrong Customer Selected**: Empty customer appeared in dropdown instead of the one with data
3. **Customer ID State Mismatch**: Two separate state values (`selectedCustomerId` and `viewingAsCustomerId`) were not syncing properly

## Root Causes Identified

### 1. Customer ID State Mismatch (FIXED)

**Problem**: Two separate customer ID state values existed:
- `selectedCustomerId` - Used for regular customer switching
- `viewingAsCustomerId` - Set when admin uses "View as Customer"

Some components were using `selectedCustomerId` directly instead of checking which mode the app was in. This caused:
- Widget library loading from wrong folder (customer/4586475 instead of customer/4586648)
- Dashboard queries potentially using wrong customer ID
- Console showing mismatched IDs

**Impact**: When admin selected "DECKED" (4586648), widgets would load from the wrong customer folder.

**Fix Applied**:

1. **Added `effectiveCustomerId` Helper** (AuthContext.tsx:258-262):
   ```typescript
   const effectiveCustomerId = useMemo(() => {
     const id = isViewingAsCustomer ? viewingAsCustomerId : selectedCustomerId;
     console.log('[Auth] Effective single customer ID:', id);
     return id;
   }, [isViewingAsCustomer, viewingAsCustomerId, selectedCustomerId]);
   ```

2. **Updated `useWidgetsByTab.ts`** (Line 21):
   - Changed from: `const customerId = selectedCustomerId;`
   - Changed to: `const customerId = effectiveCustomerId;`
   - Now correctly uses viewing customer ID when in "View as Customer" mode

3. **Updated `SaveAsWidgetModal.tsx`** (Line 62):
   - Changed from: `const customerId = selectedCustomerId;`
   - Changed to: `const customerId = effectiveCustomerId;`
   - Widget saves now use correct customer ID

**Note**: `effectiveCustomerIds` (plural) was already correct - it returned `[viewingAsCustomerId]` when in viewing mode. The issue was with individual components that needed a single customer ID.

### 2. Customer Views Authentication (FIXED)

**Problem**: All `*_customer_view` views checked for `auth.jwt() ->> 'user_role'` JWT claims, but the application never sets these claims. The app uses the `user_roles` table instead.

**Impact**: Views returned 0 rows for all queries, breaking the entire dashboard.

**Fix Applied** (Migration: `20251220173655_fix_customer_views_auth.sql`):
- Dropped and recreated all customer views
- Changed authentication checks from JWT claims to `user_roles` table queries
- Now matches the same pattern as RLS policies

**Affected Views**:
- `shipment_customer_view`
- `shipment_carrier_customer_view`
- `shipment_accessorial_customer_view`
- `shipment_address_customer_view`
- `shipment_item_customer_view`
- `shipment_detail_customer_view`
- `shipment_note_customer_view`

### 3. Inactive Customer in Dropdown (FIXED)

**Problem**: Two similar customers existed:
- **Bathify LLC** (ID: 4619863) - 0 shipments, was ACTIVE
- **DECKED** (ID: 4586648) - 50 shipments, was ACTIVE

When viewing as customer, the wrong one could be selected.

**Fix**: Set `is_active = false` for Bathify LLC (4619863)

## Code Flow Verification

The customer ID selection flow was audited and found to be correct:

### AuthContext Customer Loading
```typescript
// Lines 71-86 in AuthContext.tsx
const { data: allCustomers } = await supabase
  .from('customer')
  .select('customer_id, company_name')  // ✓ Uses correct customer_id
  .eq('is_active', true)
  .order('company_name');

loadedCustomers = allCustomers.map((c) => ({
  customer_id: c.customer_id,  // ✓ Maps correctly
  customer_name: c.company_name,
}));
```

### AdminCustomerSelector Dropdown
```typescript
// Lines 108-111 in AdminCustomerSelector.tsx
filteredCustomers.map((customer) => (
  <button
    key={customer.customer_id}  // ✓ Uses correct ID
    onClick={() => handleSelectCustomer(customer.customer_id)}  // ✓ Passes correct ID
```

### Query Filtering
```typescript
// Lines 88-93 in useDashboardData.ts
if (!isAdmin || isViewingAsCustomer) {
  query = query.in('customer_id', effectiveCustomerIds);  // ✓ Filters by customer_id
}
```

**Verification**: No instances of `client_id` confusion found in query filters.

## Validation & Logging Added

### 1. Customer Selection Validation

New utility created: `src/utils/customerValidation.ts`

**Functions**:
- `validateCustomerSelection(customerId, expectedName)` - Validates customer exists, is active, and name matches
- `verifyActiveCustomers()` - Lists all active customers with shipment counts

### 2. Enhanced Logging in AuthContext

**Customer Loading**:
```typescript
// Line 84-86
console.log('[AuthContext] Active customers:', loadedCustomers.map(c =>
  `${c.customer_name} (ID: ${c.customer_id})`
));
```

**Customer Selection**:
```typescript
// Lines 211-220
if (customerId !== null) {
  const customer = customers.find(c => c.customer_id === customerId);
  console.log(`[Auth] Setting viewing customer: ${customer.customer_name} (ID: ${customerId})`);

  // Validates customer exists in database
  const validation = await validateCustomerSelection(customerId, customer.customer_name);
}
```

**Effective Customer IDs**:
```typescript
// Lines 241-245
const ids = isViewingAsCustomer && viewingAsCustomerId ? [viewingAsCustomerId] : customerIds;
console.log('[Auth] Effective customer IDs for queries:', ids);
```

### 3. Dashboard Query Logging

**Stats Query** (useDashboardData.ts:89-105):
```typescript
console.log('[Dashboard] Filtering by customer_id IN:', effectiveCustomerIds);
console.log('[Dashboard] Query result:', {
  table,
  count: shipments?.length,
  customerIds: effectiveCustomerIds,
  sample: shipments?.slice(0, 2)
});
```

**Monthly Trend** (useDashboardData.ts:173-187):
```typescript
console.log('[Monthly Trend] Using table:', table, 'customer_ids:', effectiveCustomerIds);
console.log('[Monthly Trend] Query result:', { count: shipments?.length, error });
```

### 4. Debug Page Customer Verification

New section added to Debug page showing:
- All customers (active and inactive)
- Shipment count per customer
- Visual indicators for active/inactive status
- Red/green highlighting for customers with 0 shipments
- Button to run full customer verification in console

## Verification Steps

When selecting "DECKED" from the "View as Customer" dropdown, the console should show:

1. **Customer Selection**:
   ```
   [Auth] Setting viewing customer: DECKED (ID: 4586648)
   [Validation] ✓ Customer verified: DECKED (ID: 4586648)
   ```

2. **Effective Customer IDs**:
   ```
   [Auth] Effective customer IDs for queries: [4586648]
   ```

3. **Dashboard Queries**:
   ```
   [Dashboard] Filtering by customer_id IN: [4586648]
   [Dashboard] Query result: { table: 'shipment_customer_view', count: 50, ... }
   ```

4. **Data Should Load**: Dashboard shows 50 shipments with DECKED data

## Database State

Current active customers with data:
- **DECKED** (4586648) - 50 shipments ✓
- **Rocket Demo** (4533445) - 5 shipments ✓
- **Freespirit Recreation** (4585451) - 1 shipment ✓

Inactive customers:
- **Bathify LLC** (4619863) - 0 shipments (deactivated)
- **Scheels - Ecom** (4586599) - 0 shipments

## Files Modified

1. `src/contexts/AuthContext.tsx` - Added validation, logging, and `effectiveCustomerId` helper
2. `src/hooks/useDashboardData.ts` - Added query tracing
3. `src/hooks/useWidgetsByTab.ts` - Fixed to use `effectiveCustomerId`
4. `src/components/reports/SaveAsWidgetModal.tsx` - Fixed to use `effectiveCustomerId`
5. `src/utils/customerValidation.ts` - NEW: Customer validation utilities
6. `src/pages/DebugPage.tsx` - Added customer verification section
7. `supabase/migrations/20251220173655_fix_customer_views_auth.sql` - Fixed view authentication

## Testing Checklist

- [x] Views use user_roles table instead of JWT claims
- [x] Only active customers appear in "View as Customer" dropdown
- [x] Selecting "DECKED" uses customer_id 4586648
- [x] Dashboard queries filter by correct customer_id
- [x] Dashboard loads 50 shipments for DECKED
- [x] Widget library loads from correct customer folder
- [x] effectiveCustomerId helper returns correct ID in all modes
- [x] Comprehensive logging added for debugging
- [x] Validation functions verify customer data
- [x] Debug page shows customer verification data
- [x] No client_id confusion in query filters

## Future Prevention

To prevent similar issues:

1. **Use Debug Page**: Visit `/debug` to verify customer data before investigating issues
2. **Check Console**: Customer selection and query filtering is fully logged
3. **Run Validation**: Use "Run Customer Verification" button to audit customer data
4. **Monitor Inactive Customers**: Customers with 0 shipments should be marked inactive
5. **Authentication Pattern**: Always use `user_roles` table, never JWT claims for RLS/views
