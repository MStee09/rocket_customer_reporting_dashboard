# Go Rocket Shipping - UX Transformation Integration Guide

## 🔴 CRITICAL: Fix SQL First

Before implementing any UX changes, you must fix the SQL column name issue. Your database has `created_date`, not `created_at`.

### Run This SQL First (Supabase SQL Editor)

```sql
-- =============================================
-- CORRECTED PULSE FUNCTIONS (uses created_date)
-- Run this FIRST before any other changes
-- =============================================

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
BEGIN
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
        ROUND((current_metrics.on_time_pct - previous_metrics.on_time_pct)::NUMERIC, 1)
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
BEGIN
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
BEGIN
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
BEGIN
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

-- Test
SELECT get_pulse_executive_metrics(4586648, '2025-12-01'::DATE, '2025-12-31'::DATE);
```

---

## Implementation Phases

After running the SQL fix above, implement the UX transformation in this order:

### Phase 1: Navigation Renaming (2 hours)

**Tell Bolt:**
```
Update the Sidebar.tsx with these changes:

1. Rename "Analytics" to "Analytics Hub"
2. Rename "Analyze" to "AI Studio" and change the route to /ai-studio
3. Change the Analyze icon from Search to Sparkles
4. Remove the Carriers nav item (it will be part of Analytics Hub)

Here's the updated mainNavItems:

const mainNavItems: NavItem[] = [
  { 
    to: '/dashboard', 
    icon: LayoutDashboard, 
    label: 'Pulse',
    description: 'Daily command center with key metrics and insights'
  },
  { 
    to: '/analytics', 
    icon: BarChart3, 
    label: 'Analytics Hub',
    description: 'Deep exploration of your freight data'
  },
  {
    to: '/ai-studio',
    icon: Sparkles,
    label: 'AI Studio',
    matchPaths: ['/ai-studio', '/analyze', '/custom-reports', '/create'],
    description: 'AI-powered analysis and investigation'
  },
  {
    to: '/reports',
    icon: FileText,
    label: 'Reports',
    matchPaths: ['/reports', '/scheduled-reports', '/ai-reports'],
    description: 'Saved and scheduled reports'
  },
];

Also add the Sparkles import from lucide-react.
```

---

### Phase 2: Complete Pulse Dashboard (4 hours)

**Step 2a: Create RecentActivityFeed component**

**Tell Bolt:**
```
Create a new component at src/components/pulse/RecentActivityFeed.tsx:

This component shows recent activity from the last 24 hours. Here's the implementation:

[PASTE THE FULL RecentActivityFeed.tsx from phase2-pulse/RecentActivityFeed.tsx]

Note: The component queries from 'shipment' table (singular), not 'shipments'. 
Update the query to use the correct table name and column names:
- Use 'shipment' instead of 'shipments'
- Use 'load_id' for the shipment ID
- Use 'rate_carrier_id' to join with carrier table for carrier_name
- Use 'delivery_date' instead of 'actual_delivery_date'
- Use 'retail' instead of 'total_cost'
```

**Step 2b: Update PulseDashboardPage**

**Tell Bolt:**
```
Update PulseDashboardPage.tsx:

1. Remove the ExploreAnalyticsCTA import and component
2. Import RecentActivityFeed from '../components/pulse/RecentActivityFeed'
3. Replace <ExploreAnalyticsCTA onClick={handleExploreAnalytics} /> with:

{customerId && (
  <RecentActivityFeed
    customerId={customerId.toString()}
    maxItems={5}
    onViewDetails={handleActivityClick}
  />
)}

4. Add the handleActivityClick handler:

const handleActivityClick = useCallback((item: any) => {
  if (item.metadata?.loadId) {
    navigate(`/shipments/${item.metadata.loadId}`);
  } else if (item.type === 'alert') {
    navigate('/ai-studio?query=' + encodeURIComponent(`Investigate alert: ${item.title}`));
  }
}, [navigate]);

5. Remove the handleExploreAnalytics function (no longer needed)
```

**Step 2c: Update pulse exports**

**Tell Bolt:**
```
Update src/components/pulse/index.ts:

export { PulseHeader } from './PulseHeader';
export { ExecutiveMetricsRow } from './ExecutiveMetricsRow';
export { SpendTrendChart } from './SpendTrendChart';
export { TopCarriersCompact } from './TopCarriersCompact';
export { RecentActivityFeed } from './RecentActivityFeed';

Remove: ExploreAnalyticsCTA and CoreKPIRow exports
```

---

### Phase 3: Full-Page AI Studio (8 hours)

This is a larger change. Use the AIStudioPage.tsx from the ux-transformation package as a reference to convert the modal-based Investigator to a full-page workspace.

---

### Phase 4: Unified Analytics Hub (6 hours)

Add a "Carrier Analytics" section to AnalyticsHubPage with these widgets:
- Carrier Performance Matrix
- Carrier Cost Trends  
- Carrier Concentration
- Carrier Scorecard
- Lane-Carrier Analysis

---

### Phase 5: Performance Optimization (16 hours)

Implement the composite SQL function and React Query caching. This is optional for now - the individual RPC calls work fine for current data volumes.

---

## Clean Up Dead Code

**Tell Bolt:**
```
Please delete these unused files:
1. src/components/pulse/CoreKPIRow.tsx (duplicate of ExecutiveMetricsRow)
2. src/components/pulse/ExploreAnalyticsCTA.tsx (replaced by RecentActivityFeed)

And update src/components/pulse/index.ts to remove their exports.
```

---

## Summary

| Step | Action | Priority |
|------|--------|----------|
| 1 | Run corrected SQL in Supabase | 🔴 CRITICAL |
| 2 | Phase 1: Rename nav items | 🟢 Quick win |
| 3 | Phase 2: Add RecentActivityFeed | 🟡 Medium |
| 4 | Clean up dead code | 🟢 Quick win |
| 5 | Phase 3-5 | 🔵 Later |

After Step 1, refresh your dashboard and you should see real data for DECKED!
