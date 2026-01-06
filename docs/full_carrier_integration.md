# Full Carrier Analytics Integration

## What You Get

This integrates the **complete CarriersPage functionality** into Analytics Hub:

| Feature | Included |
|---------|----------|
| 4 Summary KPI Cards | ✅ Active Carriers, Total Spend, Avg Cost, On-Time % |
| Sortable Carrier Table | ✅ All columns with click-to-sort |
| Spend by Carrier Pie Chart | ✅ |
| Monthly Carrier Trend Line Chart | ✅ |
| Ask AI Integration | ✅ |
| Click row → filter shipments | ✅ |
| Trend indicators vs prev period | ✅ |

---

## Step 1: Add Component File

**Tell Bolt:**

```
Create a new file at src/components/analytics/CarrierAnalyticsSection.tsx with the following content:

[PASTE THE ENTIRE CarrierAnalyticsSection.tsx FILE]
```

---

## Step 2: Update AnalyticsHubPage

**Tell Bolt:**

```
Update AnalyticsHubPage.tsx to include the CarrierAnalyticsSection:

1. Add import at top:
import { CarrierAnalyticsSection } from '../components/analytics/CarrierAnalyticsSection';

2. Add 'Building2' to lucide-react imports

3. Update ICON_MAP to add:
building: Building2,

4. Update DEFAULT_SECTIONS to add carrier-analytics:
const DEFAULT_SECTIONS = [
  { id: 'geographic', title: 'Geographic Analysis', description: 'Flow maps and regional cost analysis', icon: 'globe', order: 1 },
  { id: 'volume', title: 'Volume Metrics', description: 'Shipment counts and delivery tracking', icon: 'truck', order: 2 },
  { id: 'financial', title: 'Financial Analytics', description: 'Spend tracking and cost analysis', icon: 'dollar', order: 3 },
  { id: 'carrier-analytics', title: 'Carrier Analytics', description: 'Carrier performance, spend distribution, and comparisons', icon: 'building', order: 4, isCustomSection: true },
  { id: 'performance', title: 'Performance Metrics', description: 'On-time delivery and transit times', icon: 'clock', order: 5 },
  { id: 'breakdown', title: 'Breakdowns', description: 'Mode and lane analysis', icon: 'chart', order: 6 },
  { id: 'custom', title: 'My Analytics', description: 'Your pinned reports and custom widgets', icon: 'star', order: 7 },
];

5. In the section rendering loop, add special handling for carrier-analytics:

{filteredSections.map((section) => {
  const Icon = ICON_MAP[section.icon] || Star;
  const isCollapsed = collapsedSections.has(section.id);
  const isCarrierSection = section.id === 'carrier-analytics';
  const sectionWidgets = isCarrierSection ? [] : getWidgetsForSection(section.id);
  const hasWidgets = sectionWidgets.length > 0 || isCarrierSection;

  return (
    <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* ... existing header code ... */}
      
      {!isCollapsed && (
        <div className="p-5">
          {isCarrierSection ? (
            <CarrierAnalyticsSection
              customerId={customerId}
              startDate={startDate}
              endDate={endDate}
              onAskAI={(context) => navigate(`/ai-studio?query=${encodeURIComponent(context)}`)}
            />
          ) : hasWidgets ? (
            <WidgetGrid ... />
          ) : (
            /* empty state */
          )}
        </div>
      )}
    </div>
  );
})}
```

---

## Step 3: Remove Old Carriers Nav Route (Optional)

After confirming everything works, you can redirect the old /carriers route:

**In App.tsx:**
```tsx
// Change from:
<Route path="carriers" element={<CarriersPage />} />

// To:
<Route path="carriers" element={<Navigate to="/analytics" replace />} />
```

---

## Complete AnalyticsHubPage Changes

Here's the specific code to update in AnalyticsHubPage.tsx:

### Import Section (add these)
```tsx
import { CarrierAnalyticsSection } from '../components/analytics/CarrierAnalyticsSection';
// Add Building2 to lucide imports
import { Plus, Search, Truck, MapPin, DollarSign, Layers, Star, ChevronDown, ChevronRight, Calendar, Sparkles, ArrowLeft, Globe, BarChart3, Clock, Building2 } from 'lucide-react';
```

### ICON_MAP (update)
```tsx
const ICON_MAP: Record<string, React.ElementType> = {
  globe: Globe,
  truck: Truck,
  map: MapPin,
  dollar: DollarSign,
  layers: Layers,
  star: Star,
  chart: BarChart3,
  clock: Clock,
  building: Building2,  // ADD THIS
};
```

### DEFAULT_SECTIONS (update)
```tsx
const DEFAULT_SECTIONS = [
  { id: 'geographic', title: 'Geographic Analysis', description: 'Flow maps and regional cost analysis', icon: 'globe', order: 1 },
  { id: 'volume', title: 'Volume Metrics', description: 'Shipment counts and delivery tracking', icon: 'truck', order: 2 },
  { id: 'financial', title: 'Financial Analytics', description: 'Spend tracking and cost analysis', icon: 'dollar', order: 3 },
  { id: 'carrier-analytics', title: 'Carrier Analytics', description: 'Carrier performance, spend, and comparisons', icon: 'building', order: 4 },  // ADD THIS
  { id: 'performance', title: 'Performance Metrics', description: 'On-time delivery and transit times', icon: 'clock', order: 5 },
  { id: 'breakdown', title: 'Breakdowns', description: 'Mode, carrier, and lane analysis', icon: 'chart', order: 6 },
  { id: 'custom', title: 'My Analytics', description: 'Your pinned reports and custom widgets', icon: 'star', order: 7 },
];
```

### Section Rendering (find the map loop around line 370 and update)

Find this section:
```tsx
{filteredSections.map((section) => {
```

And update the content rendering part:
```tsx
{!isCollapsed && (
  <div className="p-5">
    {section.id === 'carrier-analytics' ? (
      <CarrierAnalyticsSection
        customerId={customerId}
        startDate={startDate}
        endDate={endDate}
        onAskAI={(context) => navigate(`/ai-studio?query=${encodeURIComponent(context)}`)}
      />
    ) : hasWidgets ? (
      <WidgetGrid
        widgets={sectionWidgets}
        customWidgets={customWidgets}
        widgetSizes={localSizes}
        customerId={customerId?.toString()}
        startDate={startDate}
        endDate={endDate}
        comparisonDates={null}
        isEditMode={editMode.state.isEditing}
        selectedWidgetId={editMode.state.selectedWidgetId}
        onWidgetSelect={editMode.selectWidget}
        onWidgetRemove={handleWidgetRemove}
        onWidgetSizeChange={handleWidgetSizeChange}
        onReorder={handleReorder}
        allowHoverDrag={true}
      />
    ) : (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        {/* ... empty state ... */}
      </div>
    )}
  </div>
)}
```

---

## Summary

1. **Create** `src/components/analytics/CarrierAnalyticsSection.tsx`
2. **Update** `AnalyticsHubPage.tsx`:
   - Add import for CarrierAnalyticsSection
   - Add Building2 to lucide imports and ICON_MAP
   - Add carrier-analytics to DEFAULT_SECTIONS
   - Add conditional rendering for carrier section
3. **Optional**: Redirect `/carriers` route to `/analytics`

This gives users the full Carriers experience directly in Analytics Hub!
