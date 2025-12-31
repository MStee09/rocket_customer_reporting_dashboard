# REMOVE Phase 1: Attention Signals

Phase 1 is being removed because the signals were based on data that doesn't exist in the database (carrier performance, expected delivery dates, etc.). This was generating false alerts.

---

## Step 1: Delete These Files

Delete these 3 files completely:

```
src/services/attentionSignalService.ts
src/hooks/useAttentionSignals.ts
src/components/dashboard/AttentionSignals.tsx
```

---

## Step 2: Revert `src/components/dashboard/index.ts`

Remove this line if it was added:

```typescript
export { AttentionSignals } from './AttentionSignals';
```

---

## Step 3: Revert `src/pages/DashboardPage.tsx`

### 3a. Remove these imports (near top of file):

```typescript
// DELETE THESE LINES:
import { AttentionSignals } from '../components/dashboard';
import { useAttentionSignals } from '../hooks/useAttentionSignals';
```

### 3b. Remove the hook call (around line 50-60):

```typescript
// DELETE THIS ENTIRE BLOCK:
const {
  signals,
  allClear,
  isLoading: signalsLoading,
  refresh: refreshSignals,
} = useAttentionSignals({
  dateRange: { start: startDate, end: endDate },
});
```

### 3c. Remove the handler function:

```typescript
// DELETE THIS:
const handleViewSignalDetails = useCallback((signal: any) => {
  console.log('View details for signal:', signal);
}, []);
```

### 3d. Remove the AttentionSignals component from JSX (in the return statement):

```tsx
{/* DELETE THIS ENTIRE BLOCK: */}
{effectiveCustomerId && (
  <AttentionSignals
    signals={signals}
    allClear={allClear}
    isLoading={signalsLoading}
    onRefresh={refreshSignals}
    onViewDetails={handleViewSignalDetails}
  />
)}
```

---

## Step 4: Verify

After removing, your DashboardPage should go back to showing:
- DashboardHeader
- AIInsightsCard (directly, no AttentionSignals above it)
- WidgetGrid
- etc.

No more fake carrier performance alerts.

---

## Why This Was Wrong

The attentionSignalService was checking:
- `expected_delivery_date` - not reliably populated
- `delivery_date` comparisons - incomplete data
- Carrier on-time calculations - no real data to support this

**Lesson:** Don't build features that assume data exists without verifying the actual database schema and data quality first.
