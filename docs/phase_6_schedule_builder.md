# Phase 6: Schedule Builder - CSV + Link Delivery

## Overview
Update the schedule builder to clarify that scheduled reports deliver:
1. CSV file attached to email
2. Link to view full report with charts (can export to PDF from there)

This phase updates the UI messaging and delivery preview in the existing ScheduleBuilderSingleScreen component.

---

## File: `src/components/scheduled-reports/ScheduleBuilderSingleScreen.tsx`

**Find the "Delivery includes" section (around line 460-472) and replace with:**

```tsx
<div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
  <div className="text-sm font-medium text-slate-700 mb-3">Email will include:</div>
  <div className="space-y-2">
    <div className="flex items-start gap-3 text-sm text-slate-600">
      <FileSpreadsheet className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
      <div>
        <span className="font-medium text-slate-700">CSV attachment</span>
        <p className="text-slate-500 text-xs mt-0.5">Raw data file, opens in Excel</p>
      </div>
    </div>
    <div className="flex items-start gap-3 text-sm text-slate-600">
      <Eye className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
      <div>
        <span className="font-medium text-slate-700">View Report link</span>
        <p className="text-slate-500 text-xs mt-0.5">Full report with charts • Export to PDF available</p>
      </div>
    </div>
  </div>
</div>
```

---

**Find the Schedule Preview section (around line 474-494) and update it:**

```tsx
<div className="bg-rocket-50 rounded-xl p-4 border border-rocket-200">
  <div className="text-sm text-rocket-800">
    <div className="font-medium mb-2">Schedule Preview</div>
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-rocket-600" />
        <span>
          {state.frequency === 'daily' && 'Every day'}
          {state.frequency === 'weekly' && `Every ${DAYS_OF_WEEK.find(d => d.value === state.day_of_week)?.label || 'Monday'}`}
          {state.frequency === 'monthly' && `Monthly on day ${state.day_of_month}`}
          {state.frequency === 'quarterly' && `Quarterly on day ${state.day_of_month}`}
          {' at '}
          {formatTime(state.run_time)} {getTimezoneLabel(state.timezone)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-rocket-600">
        <Clock className="w-4 h-4" />
        <span>Next delivery: {formatDate(nextRunDate)}</span>
      </div>
      {!isAIReport && dateRange && (
        <div className="flex items-center gap-2 text-rocket-600">
          <FileText className="w-4 h-4" />
          <span>Data range: {formatDate(dateRange.start)} – {formatDate(dateRange.end)}</span>
        </div>
      )}
    </div>
  </div>
</div>
```

---

**Make sure these icons are imported at the top of the file:**

```tsx
import {
  X, Plus, Trash2, ChevronDown, ChevronUp,
  FileSpreadsheet, Eye, Command, Calendar, Clock, FileText  // Add Calendar, Clock, FileText
} from 'lucide-react';
```

---

**Update the state initialization to ensure both formats are enabled by default (around line 127-129):**

```tsx
format_pdf: true,  // Keep but we'll use for the "View Report" link
format_csv: true,  // CSV is always attached
```

---

**Remove the format checkboxes from the Advanced section since we're standardizing delivery. Find and remove any checkbox for format_pdf/format_csv if they exist in the advanced section.**

The delivery format is now standardized: CSV attached + link to view/export PDF.

---

## Testing Checklist

After applying these changes:

1. [ ] Schedule builder shows clear delivery explanation
2. [ ] "CSV attachment" shows with green icon
3. [ ] "View Report link" shows with blue icon
4. [ ] Schedule preview shows next delivery date
5. [ ] Schedule preview shows data range for custom reports
6. [ ] No format selection checkboxes (standardized delivery)
7. [ ] Creating a schedule still works correctly

---

## Notes

- We're standardizing on CSV + Link as the delivery method
- This matches what we discussed: CSV for data, link for visuals
- Users can export PDF from the linked report page
- This simplifies the UI by removing format options
