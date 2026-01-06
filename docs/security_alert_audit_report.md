# 🔍 Security & Alert Detection Integration Audit

## ✅ Executive Summary

| Question | Answer |
|----------|--------|
| **Will this work as expected?** | **PARTIALLY** - Several critical issues must be fixed before deployment |
| **Is the integration clean?** | **NO** - The new code has column name mismatches and conflicts with existing functions |
| **Is this production-safe?** | **NO** - The SQL will fail due to `created_at` vs `created_date` column name issue |

**Bottom Line:** The security model is well-designed, but the implementation has several bugs that will cause runtime failures.

---

## ⚠️ Critical Issues (Must Fix)

### 1. **CRITICAL: Wrong Column Name in New Migrations**

**Location:** `20260106100001_add_auth_to_pulse_functions.sql` (lines 70-71, 90-91, etc.)

**Problem:** The new security-enhanced pulse functions use `created_at`:
```sql
AND COALESCE(s.pickup_date, s.created_at::DATE) >= p_start_date
```

But the existing codebase (and the actual database) uses `created_date`:
```sql
-- From existing 20260106033202_fix_pulse_functions_created_date.sql
AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= p_start_date
```

**Impact:** All 4 pulse functions will throw `column "created_at" does not exist` error.

**Fix Required:** Replace ALL occurrences of `s.created_at` with `s.created_date` in:
- `20260106100001_add_auth_to_pulse_functions.sql`
- `20260106100003_create_alert_detection_system.sql`

---

### 2. **CRITICAL: Wrong Column Name in Alert Detection System**

**Location:** `20260106100003_create_alert_detection_system.sql` (lines 237, 243, 251, 257, 273, 287, etc.)

**Problem:** Same issue - uses `s.created_at` throughout:
```sql
WHERE s.customer_id = p_customer_id
  AND COALESCE(s.pickup_date, s.created_at::DATE) >= CURRENT_DATE - rule.lookback_days
```

**Impact:** Alert detection will fail completely - no alerts will be generated.

---

### 3. **Missing `trigger_alert_detection` Function**

**Location:** `RunAnomalyDetection.tsx` (line 45)

**Problem:** The new component calls `trigger_alert_detection()`:
```typescript
const { data, error } = await supabase.rpc('trigger_alert_detection');
```

But this function is defined in `20260106100004_schedule_alert_detection.sql` which only creates it if pg_cron is available. The function signature also doesn't match what the component expects.

**Impact:** "Run All Customers" will fail with "function not found" error.

---

### 4. **RPC Function Name Mismatch**

**Location:** Existing `RunAnomalyDetection.tsx` vs New version

**Problem:** 
- **Existing code** calls: `run_anomaly_detection` and `run_anomaly_detection_all`
- **New code** calls: `detect_widget_alerts` and `trigger_alert_detection`

The old functions don't exist, and now neither approach is complete.

---

### 5. **Edge Function Security Not Applied**

**Location:** `generate-report/index.ts`

**Problem:** The implementation guide mentions updating `generate-report` to use JWT-based auth, but the actual edge function still accepts `userId` and `isAdmin` directly from the request body (line 32-33):
```typescript
interface RequestBody {
  // ...
  isAdmin?: boolean;  // STILL TRUSTED FROM BODY!
  userId?: string;    // STILL TRUSTED FROM BODY!
}
```

This is the exact security vulnerability the patch is supposed to fix.

**Impact:** The generate-report endpoint remains vulnerable to privilege escalation.

---

## 🟡 Structural / Quality Issues (Should Fix)

### 1. **Duplicate Auth Verification Logic**

The existing codebase already has `verifyAdminRole()` function in the edge function (line 100-120). The new `authService.ts` duplicates this.

### 2. **Missing Type Casts**

In alert detection function, `created_at::DATE` should be `created_date::DATE` but also pickup_date should have explicit `::DATE` cast consistently.

### 3. **No Rollback Strategy**

If these migrations are run and fail, there's no way to cleanly rollback the auth changes without breaking the pulse functions entirely.

### 4. **Insert Policy Missing for service_role on widget_alerts**

The new `detect_widget_alerts` function uses `SECURITY DEFINER` but the `widget_alerts` table only has insert policy for authenticated users with admin role. The detection function needs `service_role` access.

---

## 🔄 What Should Have Been Updated in Old Code (But Wasn't)

| File | What's Missing |
|------|----------------|
| `generate-report/index.ts` | Should extract user from JWT header, not trust body |
| `RunAnomalyDetection.tsx` | Already exists - should be updated in place, not replaced |
| `widget_alerts` RLS | Needs INSERT policy for SECURITY DEFINER functions |

---

## 🧠 Recommended Integration Strategy

### Correct Mental Model

1. **Auth verification** should happen at:
   - Edge function level (JWT extraction)
   - RPC function level (verify_customer_access)

2. **Alert detection** should:
   - Use `detect_widget_alerts` as the core function
   - Have a wrapper `trigger_alert_detection` that's always available (not just with pg_cron)
   - Return consistent JSON structure for the React component

3. **Column names** must be consistent:
   - Always use `created_date` (the actual column name)
   - Use explicit `::DATE` casts on all date comparisons

---

## 🧩 CORRECTED SQL MIGRATIONS (Copy-Paste Ready)

### Migration 1: Auth Verification Functions (No Changes Needed)
The `20260106100000_add_auth_verification_function.sql` is correct.

### Migration 2: Pulse Functions with Auth (CORRECTED)

```sql
/*
  # Add Auth Verification to Pulse Functions (CORRECTED)
  
  Fixed: Uses created_date instead of created_at
*/

CREATE OR REPLACE FUNCTION get_pulse_executive_metrics(
  p_customer_id INTEGER,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  current_metrics RECORD;
  previous_metrics RECORD;
  period_days INTEGER;
  prev_start DATE;
  prev_end DATE;
  calling_user_id UUID;
BEGIN
  -- Get calling user and verify access
  calling_user_id := auth.uid();
  
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF NOT verify_customer_access(calling_user_id, p_customer_id) THEN
    RAISE EXCEPTION 'Access denied to customer %', p_customer_id;
  END IF;
  
  -- Original function logic with CORRECTED column name
  period_days := p_end_date - p_start_date;
  prev_end := p_start_date - INTERVAL '1 day';
  prev_start := (prev_end - (period_days || ' days')::INTERVAL)::DATE;
  
  SELECT 
    COUNT(*) as total_shipments,
    COALESCE(SUM(s.retail), 0) as total_spend,
    CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(s.retail) / COUNT(*))::NUMERIC, 2) ELSE 0 END as avg_cost,
    COALESCE(
      ROUND(
        (COUNT(*) FILTER (
          WHERE s.delivery_date IS NOT NULL 
          AND s.expected_delivery_date IS NOT NULL 
          AND s.delivery_date <= s.expected_delivery_date
        ))::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE s.delivery_date IS NOT NULL), 0) * 100
      , 1),
      0
    ) as on_time_pct,
    COALESCE(
      ROUND(
        AVG(EXTRACT(EPOCH FROM (s.delivery_date - s.pickup_date)) / 86400) 
        FILTER (WHERE s.delivery_date IS NOT NULL AND s.pickup_date IS NOT NULL)
      ::NUMERIC, 1),
      0
    ) as avg_transit_days,
    COUNT(DISTINCT s.rate_carrier_id) FILTER (WHERE s.rate_carrier_id IS NOT NULL) as active_carriers
  INTO current_metrics
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= p_start_date
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= p_end_date;
  
  SELECT 
    COUNT(*) as total_shipments,
    COALESCE(SUM(s.retail), 0) as total_spend,
    COALESCE(
      ROUND(
        (COUNT(*) FILTER (
          WHERE s.delivery_date IS NOT NULL 
          AND s.expected_delivery_date IS NOT NULL 
          AND s.delivery_date <= s.expected_delivery_date
        ))::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE s.delivery_date IS NOT NULL), 0) * 100
      , 1),
      0
    ) as on_time_pct
  INTO previous_metrics
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= prev_start
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= prev_end;
  
  result := json_build_object(
    'totalShipments', current_metrics.total_shipments,
    'totalSpend', current_metrics.total_spend,
    'avgCostPerShipment', current_metrics.avg_cost,
    'onTimePercentage', current_metrics.on_time_pct,
    'avgTransitDays', current_metrics.avg_transit_days,
    'activeCarriers', current_metrics.active_carriers,
    'shipmentsChange', CASE 
      WHEN previous_metrics.total_shipments > 0 THEN 
        ROUND(((current_metrics.total_shipments - previous_metrics.total_shipments)::NUMERIC / previous_metrics.total_shipments * 100), 1)
      ELSE 0 
    END,
    'spendChange', CASE 
      WHEN previous_metrics.total_spend > 0 THEN 
        ROUND(((current_metrics.total_spend - previous_metrics.total_spend) / previous_metrics.total_spend * 100)::NUMERIC, 1)
      ELSE 0 
    END,
    'onTimeChange', CASE 
      WHEN previous_metrics.on_time_pct > 0 THEN 
        ROUND(((current_metrics.on_time_pct - previous_metrics.on_time_pct))::NUMERIC, 1)
      ELSE 0 
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION get_pulse_spend_trend(
  p_customer_id INTEGER,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  spend NUMERIC,
  shipments BIGINT
) AS $$
DECLARE
  calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();
  
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF NOT verify_customer_access(calling_user_id, p_customer_id) THEN
    RAISE EXCEPTION 'Access denied to customer %', p_customer_id;
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(s.pickup_date::DATE, s.created_date::DATE) as date,
    COALESCE(SUM(s.retail), 0)::NUMERIC as spend,
    COUNT(*)::BIGINT as shipments
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= p_start_date
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= p_end_date
  GROUP BY COALESCE(s.pickup_date::DATE, s.created_date::DATE)
  ORDER BY COALESCE(s.pickup_date::DATE, s.created_date::DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION get_pulse_top_carriers(
  p_customer_id INTEGER,
  p_start_date DATE,
  p_end_date DATE,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  carrier_name TEXT,
  shipment_count BIGINT,
  total_spend NUMERIC,
  on_time_pct NUMERIC,
  volume_share_pct NUMERIC
) AS $$
DECLARE
  total_shipments BIGINT;
  calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();
  
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF NOT verify_customer_access(calling_user_id, p_customer_id) THEN
    RAISE EXCEPTION 'Access denied to customer %', p_customer_id;
  END IF;

  SELECT COUNT(*) INTO total_shipments
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= p_start_date
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= p_end_date;
  
  RETURN QUERY
  SELECT 
    COALESCE(c.carrier_name, 'Unknown')::TEXT as carrier_name,
    COUNT(*)::BIGINT as shipment_count,
    ROUND(COALESCE(SUM(s.retail), 0)::NUMERIC, 2) as total_spend,
    ROUND(
      COALESCE(
        (COUNT(*) FILTER (
          WHERE s.delivery_date IS NOT NULL 
          AND s.expected_delivery_date IS NOT NULL 
          AND s.delivery_date <= s.expected_delivery_date
        ))::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE s.delivery_date IS NOT NULL), 0) * 100
      , 0)
    , 1) as on_time_pct,
    ROUND((COUNT(*)::NUMERIC / NULLIF(total_shipments, 0) * 100), 1) as volume_share_pct
  FROM shipment s
  LEFT JOIN carrier c ON c.carrier_id = s.rate_carrier_id
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= p_start_date
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= p_end_date
  GROUP BY c.carrier_name
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION get_pulse_performance_summary(
  p_customer_id INTEGER,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  volume_stats RECORD;
  lane_stats RECORD;
  weight_stats RECORD;
  calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();
  
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF NOT verify_customer_access(calling_user_id, p_customer_id) THEN
    RAISE EXCEPTION 'Access denied to customer %', p_customer_id;
  END IF;

  SELECT 
    COUNT(*) as total_shipments,
    COUNT(*) FILTER (WHERE st.is_completed = true) as completed,
    COUNT(*) FILTER (WHERE st.is_completed = false AND COALESCE(st.is_cancelled, false) = false) as in_progress,
    COUNT(*) FILTER (WHERE st.is_cancelled = true) as cancelled
  INTO volume_stats
  FROM shipment s
  LEFT JOIN shipment_status st ON st.status_id = s.status_id
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= p_start_date
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= p_end_date;
  
  BEGIN
    SELECT 
      origin.state as origin_state,
      dest.state as dest_state,
      COUNT(*) as lane_count
    INTO lane_stats
    FROM shipment s
    JOIN shipment_address origin ON origin.load_id = s.load_id AND origin.address_type = 1
    JOIN shipment_address dest ON dest.load_id = s.load_id AND dest.address_type = 2
    WHERE s.customer_id = p_customer_id
      AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= p_start_date
      AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= p_end_date
    GROUP BY origin.state, dest.state
    ORDER BY COUNT(*) DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    lane_stats := NULL;
  END;
  
  SELECT 
    COALESCE(SUM(si.weight), 0) as total_weight
  INTO weight_stats
  FROM shipment s
  JOIN shipment_item si ON si.load_id = s.load_id
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= p_start_date
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= p_end_date;
  
  result := json_build_object(
    'totalShipments', COALESCE(volume_stats.total_shipments, 0),
    'completedShipments', COALESCE(volume_stats.completed, 0),
    'inProgressShipments', COALESCE(volume_stats.in_progress, 0),
    'cancelledShipments', COALESCE(volume_stats.cancelled, 0),
    'completionRate', CASE 
      WHEN COALESCE(volume_stats.total_shipments, 0) > 0 
      THEN ROUND((COALESCE(volume_stats.completed, 0)::NUMERIC / volume_stats.total_shipments * 100), 1)
      ELSE 0 
    END,
    'topOriginState', COALESCE(lane_stats.origin_state, 'N/A'),
    'topDestState', COALESCE(lane_stats.dest_state, 'N/A'),
    'topLaneCount', COALESCE(lane_stats.lane_count, 0),
    'totalWeight', COALESCE(ROUND(weight_stats.total_weight::NUMERIC, 0), 0)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_pulse_executive_metrics(INTEGER, DATE, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_pulse_spend_trend(INTEGER, DATE, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_pulse_top_carriers(INTEGER, DATE, DATE, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_pulse_performance_summary(INTEGER, DATE, DATE) TO authenticated, service_role;
```

### Migration 3: Add trigger_alert_detection Function (Always Available)

```sql
/*
  # Trigger Alert Detection Function
  
  Creates a function that can always be called, whether or not pg_cron is available.
  Returns JSON that the React component expects.
*/

CREATE OR REPLACE FUNCTION trigger_alert_detection(p_customer_id INTEGER DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  total_alerts INTEGER := 0;
  customers_processed INTEGER := 0;
  customer_details JSONB := '[]'::JSONB;
  cust RECORD;
  alerts_for_customer INTEGER;
BEGIN
  IF p_customer_id IS NOT NULL THEN
    -- Single customer
    SELECT detect_widget_alerts(p_customer_id) INTO alerts_for_customer;
    
    result := jsonb_build_object(
      'total_alerts_created', alerts_for_customer,
      'customers_processed', 1,
      'details', jsonb_build_array(
        jsonb_build_object(
          'customer_id', p_customer_id,
          'customer_name', (SELECT company_name FROM customers WHERE id = p_customer_id),
          'alerts_created', alerts_for_customer
        )
      )
    );
  ELSE
    -- All customers with recent activity
    FOR cust IN 
      SELECT DISTINCT c.id, c.company_name
      FROM customers c
      JOIN shipment s ON s.customer_id = c.id
      WHERE COALESCE(s.pickup_date::DATE, s.created_date::DATE) > CURRENT_DATE - 90
      ORDER BY c.company_name
    LOOP
      BEGIN
        SELECT detect_widget_alerts(cust.id) INTO alerts_for_customer;
        total_alerts := total_alerts + COALESCE(alerts_for_customer, 0);
        customers_processed := customers_processed + 1;
        
        customer_details := customer_details || jsonb_build_array(
          jsonb_build_object(
            'customer_id', cust.id,
            'customer_name', cust.company_name,
            'alerts_created', COALESCE(alerts_for_customer, 0)
          )
        );
      EXCEPTION WHEN OTHERS THEN
        customers_processed := customers_processed + 1;
        customer_details := customer_details || jsonb_build_array(
          jsonb_build_object(
            'customer_id', cust.id,
            'customer_name', cust.company_name,
            'alerts_created', -1
          )
        );
      END;
    END LOOP;
    
    result := jsonb_build_object(
      'total_alerts_created', total_alerts,
      'customers_processed', customers_processed,
      'details', customer_details
    );
  END IF;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION trigger_alert_detection(INTEGER) TO authenticated, service_role;
```

---

## Summary

| Issue | Severity | Status |
|-------|----------|--------|
| `created_at` vs `created_date` in pulse functions | 🔴 Critical | Must fix |
| `created_at` vs `created_date` in alert detection | 🔴 Critical | Must fix |
| Missing `trigger_alert_detection` function | 🔴 Critical | Must add |
| Edge function security not actually applied | 🔴 Critical | Must fix |
| Service role insert policy for widget_alerts | 🟡 Medium | Should fix |

**Do NOT deploy the new migrations until ALL critical issues are fixed.**
