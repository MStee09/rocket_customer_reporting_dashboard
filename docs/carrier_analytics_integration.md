# Carrier Analytics Integration for Analytics Hub

## Overview
This adds a dedicated "Carrier Analytics" section to Analytics Hub, replacing the removed Carriers nav item.

---

## Instructions for Bolt

**Prompt to paste into Bolt:**

```
Update AnalyticsHubPage.tsx to add a Carrier Analytics section:

1. Add 'Building2' to the lucide-react imports (for the carrier icon)

2. Update ICON_MAP to add:
building: Building2,

3. Update WIDGET_SECTIONS to add carrier-analytics:
const WIDGET_SECTIONS: Record<string, string[]> = {
  'geographic': ['flow_map', 'cost_by_state'],
  'volume': ['total_shipments', 'in_transit', 'delivered_month'],
  'financial': ['total_cost', 'avg_cost_shipment', 'monthly_spend'],
  'carrier-analytics': ['carrier_performance', 'carrier_mix', 'spend_by_carrier'],  // NEW
  'performance': ['on_time_pct', 'avg_transit_days'],
  'breakdown': ['mode_breakdown', 'top_lanes'],
};

Note: Move carrier_performance from 'performance' to 'carrier-analytics', and remove carrier_mix from 'breakdown'.

4. Update DEFAULT_SECTIONS to add carrier-analytics section:
const DEFAULT_SECTIONS = [
  { id: 'geographic', title: 'Geographic Analysis', description: 'Flow maps and regional cost analysis', icon: 'globe', order: 1 },
  { id: 'volume', title: 'Volume Metrics', description: 'Shipment counts and delivery tracking', icon: 'truck', order: 2 },
  { id: 'financial', title: 'Financial Analytics', description: 'Spend tracking and cost analysis', icon: 'dollar', order: 3 },
  { id: 'carrier-analytics', title: 'Carrier Analytics', description: 'Carrier performance, spend distribution, and comparisons', icon: 'building', order: 4 },  // NEW
  { id: 'performance', title: 'Performance Metrics', description: 'On-time delivery and transit times', icon: 'clock', order: 5 },
  { id: 'breakdown', title: 'Breakdowns', description: 'Mode and lane analysis', icon: 'chart', order: 6 },
  { id: 'custom', title: 'My Analytics', description: 'Your pinned reports and custom widgets', icon: 'star', order: 7 },
];

5. Update DEFAULT_WIDGET_LAYOUT to include carrier widgets:
const DEFAULT_WIDGET_LAYOUT = [
  'flow_map',
  'cost_by_state',
  'total_shipments',
  'in_transit',
  'delivered_month',
  'total_cost',
  'avg_cost_shipment',
  'monthly_spend',
  'carrier_performance',
  'carrier_mix',
  'spend_by_carrier',
  'on_time_pct',
  'avg_transit_days',
  'mode_breakdown',
  'top_lanes',
];
```

---

## Complete Updated Code Sections

### Import Update (line 4)
```typescript
import { Plus, Search, Truck, MapPin, DollarSign, Layers, Star, ChevronDown, ChevronRight, Calendar, Sparkles, ArrowLeft, Globe, BarChart3, Clock, Building2 } from 'lucide-react';
```

### ICON_MAP (lines 19-28)
```typescript
const ICON_MAP: Record<string, React.ElementType> = {
  globe: Globe,
  truck: Truck,
  map: MapPin,
  dollar: DollarSign,
  layers: Layers,
  star: Star,
  chart: BarChart3,
  clock: Clock,
  building: Building2,
};
```

### WIDGET_SECTIONS (lines 30-36)
```typescript
const WIDGET_SECTIONS: Record<string, string[]> = {
  'geographic': ['flow_map', 'cost_by_state'],
  'volume': ['total_shipments', 'in_transit', 'delivered_month'],
  'financial': ['total_cost', 'avg_cost_shipment', 'monthly_spend'],
  'carrier-analytics': ['carrier_performance', 'carrier_mix', 'spend_by_carrier'],
  'performance': ['on_time_pct', 'avg_transit_days'],
  'breakdown': ['mode_breakdown', 'top_lanes'],
};
```

### DEFAULT_SECTIONS (lines 38-45)
```typescript
const DEFAULT_SECTIONS = [
  { id: 'geographic', title: 'Geographic Analysis', description: 'Flow maps and regional cost analysis', icon: 'globe', order: 1 },
  { id: 'volume', title: 'Volume Metrics', description: 'Shipment counts and delivery tracking', icon: 'truck', order: 2 },
  { id: 'financial', title: 'Financial Analytics', description: 'Spend tracking and cost analysis', icon: 'dollar', order: 3 },
  { id: 'carrier-analytics', title: 'Carrier Analytics', description: 'Carrier performance, spend distribution, and comparisons', icon: 'building', order: 4 },
  { id: 'performance', title: 'Performance Metrics', description: 'On-time delivery and transit times', icon: 'clock', order: 5 },
  { id: 'breakdown', title: 'Breakdowns', description: 'Mode and lane analysis', icon: 'chart', order: 6 },
  { id: 'custom', title: 'My Analytics', description: 'Your pinned reports and custom widgets', icon: 'star', order: 7 },
];
```

### DEFAULT_WIDGET_LAYOUT (lines 55-69)
```typescript
const DEFAULT_WIDGET_LAYOUT = [
  'flow_map',
  'cost_by_state',
  'total_shipments',
  'in_transit',
  'delivered_month',
  'total_cost',
  'avg_cost_shipment',
  'monthly_spend',
  'carrier_performance',
  'carrier_mix',
  'spend_by_carrier',
  'on_time_pct',
  'avg_transit_days',
  'mode_breakdown',
  'top_lanes',
];
```

---

## What This Achieves

1. **New "Carrier Analytics" section** with 3 widgets:
   - Carrier Performance (on-time rates, transit times by carrier)
   - Carrier Mix (shipment distribution pie chart)
   - Spend by Carrier (bar chart of top carriers by spend)

2. **Logical widget reorganization:**
   - Moved carrier_performance from Performance → Carrier Analytics
   - Moved carrier_mix from Breakdowns → Carrier Analytics
   - Added spend_by_carrier to Carrier Analytics

3. **Clean section flow:**
   - Geographic → Volume → Financial → **Carrier Analytics** → Performance → Breakdowns → Custom

---

## Optional: Remove /carriers Route

After confirming Carrier Analytics works in Analytics Hub, you can optionally remove the standalone Carriers page:

```
In App.tsx:
1. Remove: import { CarriersPage } from './pages/CarriersPage';
2. Change route from:
   <Route path="carriers" element={<CarriersPage />} />
   To:
   <Route path="carriers" element={<Navigate to="/analytics" replace />} />

This redirects any old bookmarks to Analytics Hub.
```

---

## Widgets Available in widgetLibrary

These carrier widgets already exist and will work automatically:

| Widget ID | Name | Type |
|-----------|------|------|
| `carrier_mix` | Carrier Mix | Pie chart |
| `spend_by_carrier` | Spend by Carrier | Bar chart |
| `carrier_performance` | Carrier Performance | Table |

All three use the correct table names (`shipment`, `carrier`) and column names (`retail`, `rate_carrier_id`).
