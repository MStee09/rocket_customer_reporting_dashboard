# Phase 5: Navigation Hierarchy & Final Polish
## P1-P2 Items

---

# Navigation Hierarchy Update

## Update `src/components/Sidebar.tsx`

The key change is reordering the navigation items and adding a "Details" section for Shipments.

Find the `mainNavItems` array (around line 49) and replace it with:

```typescript
const mainNavItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  {
    to: '/analyze',
    icon: Search,
    label: 'Analyze',
    matchPaths: ['/analyze', '/ai-studio', '/custom-reports', '/create']
  },
  {
    to: '/reports',
    icon: FileText,
    label: 'Reports',
    matchPaths: ['/reports', '/scheduled-reports', '/ai-reports']
  },
  { to: '/carriers', icon: Building2, label: 'Carriers' },
];

// Separate operational items
const detailNavItems: NavItem[] = [
  { to: '/shipments', icon: Truck, label: 'Shipments' },
];
```

Then in the render section, add the Details section after the main nav items:

```tsx
<nav className="flex-1 p-4 space-y-1 overflow-y-auto">
  {/* Main Navigation */}
  {mainNavItems.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      onClick={onClose}
      className={() => navItemClasses(isActiveRoute(item))}
    >
      <item.icon className="w-5 h-5" />
      <span className="font-medium flex-1">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="px-2 py-0.5 bg-rocket-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
          {item.badge}
        </span>
      )}
    </NavLink>
  ))}

  {/* Details Section - NEW */}
  <div className="pt-4 mt-2 border-t border-charcoal-700">
    <div className="px-3 py-2">
      <span className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">
        Details
      </span>
    </div>
    {detailNavItems.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onClose}
        className={() => navItemClasses(isActiveRoute(item))}
      >
        <item.icon className="w-5 h-5" />
        <span className="font-medium flex-1">{item.label}</span>
      </NavLink>
    ))}
  </div>

  {/* Saved Views Section - keep existing */}
  {pinnedViews.length > 0 && (
    // ... existing saved views code
  )}

  {/* Admin Section - keep existing */}
  {shouldShowAdmin && (
    // ... existing admin code
  )}
</nav>
```

---

# Updated Evaluation Document

## Update `rocket_dashboard_evaluation_v2.md`

The evaluation should be updated to reflect:

1. **Removed AI Suggested Actions** - Per our discussion, the AI will NOT provide suggested actions that it "knows nothing about"
2. **Option A Selected** - Signals will show anomaly data with driver analysis but no action recommendations
3. **All agreed changes documented**

Key changes to the insights:

**Before (removed):**
```
💡 Suggested Action
Consider requesting updated quotes from alternate carriers for TX lanes.
```

**After (implemented):**
```
Driver Analysis
Costs up 12% driven primarily by 23% cost increase on Texas lanes.
Per-shipment costs rose from $1,840 to $2,260 while volume remained flat.
```

No suggested actions. Just facts and context.

---

# Implementation Summary

## Files Created (4 new files)
1. `src/services/attentionSignalService.ts` - Anomaly detection logic
2. `src/hooks/useAttentionSignals.ts` - React hook for signals
3. `src/components/dashboard/AttentionSignals.tsx` - UI component
4. `src/components/dashboard/DateRangeSelector.tsx` - New date picker

## Files Modified (6 files)
1. `src/pages/DashboardPage.tsx` - Added signals, updated imports
2. `src/components/dashboard/DashboardHeader.tsx` - New date selector
3. `src/components/dashboard/WidgetGalleryModal.tsx` - Tiered design
4. `src/components/dashboard/AIInsightsCard.tsx` - Driver analysis (no actions)
5. `src/components/dashboard/index.ts` - New exports
6. `src/pages/ShipmentsPage.tsx` - 50 limit, removed QuickFilters
7. `src/components/Sidebar.tsx` - Navigation reorder

## Files Removed/Unused
- QuickFilters is no longer imported in ShipmentsPage (component file remains)

---

# Dependency Chain

Make sure to implement in this order to avoid breaking changes:

```
Phase 1: Attention Signals (standalone, no dependencies)
    ↓
Phase 2: Widget Gallery (standalone, no dependencies)
    ↓
Phase 3: Date Range (depends on DashboardHeader)
    ↓
Phase 4: Shipments (standalone, just removes features)
    ↓
Phase 5: Navigation (standalone)
```

---

# Post-Implementation Verification

After all phases are complete, verify:

1. **Dashboard loads correctly**
   - No console errors
   - Attention Signals appear (or "All clear" message)
   - AI Insights loads below signals
   - Date range selector works

2. **Widget Gallery functions**
   - Recommended section visible
   - New badges appear on configured widgets
   - All Widgets collapsed by default
   - Adding widget updates dashboard

3. **Shipments page performs**
   - Loads quickly (50 records)
   - Load More button works
   - No QuickFilters visible
   - Search still functional

4. **Navigation is correct**
   - Order: Dashboard → Analyze → Reports → Carriers
   - "Details" section contains Shipments
   - All links work correctly

---

# Future Enhancements (Not in Current Scope)

These were discussed but deferred:

1. **Global Search (⌘K)** - Shipment lookup from anywhere
2. **Custom Date Picker** - Full calendar selection
3. **Widget Archive System** - Auto-archive unused widgets
4. **Server-side Shipment Search** - Currently client-side
5. **Context Transition Animation** - Admin → Customer smooth morph
6. **Knowledge Base Integration** - AI insights from company IP

---

# Support

If you encounter issues during implementation:

1. **TypeScript Errors** - Check import paths match your project structure
2. **Missing Dependencies** - Ensure all hooks and services are exported
3. **Styling Issues** - Tailwind classes should work if configured correctly
4. **Data Not Loading** - Verify Supabase table names and RLS policies
