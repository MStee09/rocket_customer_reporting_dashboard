# Phase 4: Reports Hub Tab Simplification

## Overview
Simplify the Reports Hub by removing the AI/Custom type filtering tabs. Keep only "All" and "Scheduled" tabs.

## Changes Summary
1. Remove `ai` and `custom` filter tabs
2. Keep only `all` and `scheduled` tabs  
3. Add subtle sparkle icon for AI-generated reports
4. Update links to use new `/analyze` route

---

## File: `src/pages/ReportsHubPage.tsx`

**Find the FilterTab type definition (around line 14) and change from:**

```tsx
type FilterTab = 'all' | 'ai' | 'custom' | 'scheduled';
```

**To:**

```tsx
type FilterTab = 'all' | 'scheduled';
```

---

**Find the tabs rendering section (search for "activeTab === 'ai'" or the tab buttons) and replace the entire tabs section with:**

```tsx
{/* Simplified Tabs - Only All and Scheduled */}
<div className="flex items-center gap-6 border-b border-slate-200 mb-6">
  <button
    onClick={() => handleTabChange('all')}
    className={`pb-3 text-sm font-medium transition-colors relative ${
      activeTab === 'all'
        ? 'text-rocket-600'
        : 'text-slate-500 hover:text-slate-700'
    }`}
  >
    All Reports
    <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
      {reportItems.length}
    </span>
    {activeTab === 'all' && (
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rocket-600" />
    )}
  </button>
  <button
    onClick={() => handleTabChange('scheduled')}
    className={`pb-3 text-sm font-medium transition-colors relative ${
      activeTab === 'scheduled'
        ? 'text-rocket-600'
        : 'text-slate-500 hover:text-slate-700'
    }`}
  >
    <span className="flex items-center gap-1.5">
      <Calendar className="w-4 h-4" />
      Scheduled
    </span>
    <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
      {scheduledReports.length}
    </span>
    {activeTab === 'scheduled' && (
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rocket-600" />
    )}
  </button>
</div>
```

---

**Find the filteredReports useMemo and simplify it (remove type filtering):**

```tsx
const filteredReports = useMemo(() => {
  let filtered = reportItems;

  // Remove the type filtering - we no longer filter by ai/custom
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((r) => r.name.toLowerCase().includes(query));
  }

  return filtered;
}, [reportItems, searchQuery]);
```

---

**In the report list item, update the icon to show a subtle sparkle for AI reports. Find the report icon section and update:**

```tsx
<div className="flex-shrink-0">
  <div
    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
      report.type === 'ai'
        ? 'bg-amber-50 text-amber-600'
        : 'bg-slate-100 text-slate-600'
    }`}
  >
    {report.type === 'ai' ? (
      <Sparkles className="w-5 h-5" />
    ) : (
      <FileText className="w-5 h-5" />
    )}
  </div>
</div>
```

---

**Update the "New Report" link to go to /analyze:**

```tsx
<Link
  to="/analyze"
  className="flex items-center gap-2 px-4 py-2 bg-rocket-600 hover:bg-rocket-700 text-white font-medium rounded-xl transition-colors"
>
  <Plus className="w-4 h-4" />
  New Report
</Link>
```

---

**Update empty state button to also go to /analyze:**

```tsx
<Link
  to="/analyze"
  className="inline-flex items-center gap-2 px-4 py-2 bg-rocket-600 hover:bg-rocket-700 text-white font-medium rounded-xl transition-colors"
>
  <Plus className="w-4 h-4" />
  Create Report
</Link>
```

---

**Make sure to add Plus to the imports at the top:**

```tsx
import {
  FileText, Calendar, Search, MoreVertical, Eye,
  Clock, Trash2, Sparkles, Plus,  // Add Plus here
} from 'lucide-react';
```

---

## Testing Checklist

After applying these changes:

1. [ ] Only two tabs visible: "All Reports" and "Scheduled"
2. [ ] "All Reports" shows both AI and custom reports together
3. [ ] AI reports have amber sparkle icon
4. [ ] Custom reports have slate file icon  
5. [ ] Search works across all reports
6. [ ] "New Report" button goes to /analyze
7. [ ] Scheduled tab still works correctly
8. [ ] No console errors

---

## Notes

- The type distinction (AI vs Custom) is preserved in the data and shown via icon
- Users no longer need to think about which "type" of report they want to view
- This simplification reduces cognitive load while maintaining the information
