// ============================================================================
// PHASE 3 (CORRECTED): INLINE SCHEDULING
// ============================================================================
// 
// The InlineScheduler component from the original Phase 3 is still valid.
// This file provides the corrected integration points.
//
// Key changes:
// - InlineScheduler appears as a dropdown/popover from the "Schedule" button
// - Prominent date range selection (static vs dynamic)
// - Smart suggestions based on frequency
// - Works for both AI reports and Custom reports
//
// ============================================================================


// ============================================================================
// FILE 1: src/components/reports/InlineScheduler.tsx (NEW FILE)
// ============================================================================
// This is the same as the original Phase 3 file - copy it as-is.
// The component is self-contained and works with the new structure.
//
// Key features:
// - Date range prominently displayed (the static → dynamic transformation)
// - Smart suggestions based on frequency
// - Dynamic vs Static indicator with clear explanation
// - Collapsible advanced options
//
// See phase3_inline_scheduling.tsx for the full component code.


// ============================================================================
// FILE 2: src/components/ai-studio/ReportPreviewHeader.tsx (INTEGRATION)
// ============================================================================

/*
CHANGE 1: Add imports
---------------------
ADD:
*/
import { useState, useRef, useEffect } from 'react';
import { InlineScheduler } from '../reports/InlineScheduler';
import { ScheduledReport } from '../../types/scheduledReports';


/*
CHANGE 2: Add state for inline scheduler visibility
---------------------------------------------------
Inside the component, add:
*/
const [showInlineScheduler, setShowInlineScheduler] = useState(false);
const schedulerRef = useRef<HTMLDivElement>(null);

// Close scheduler when clicking outside
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (schedulerRef.current && !schedulerRef.current.contains(event.target as Node)) {
      setShowInlineScheduler(false);
    }
  }
  
  if (showInlineScheduler) {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }
}, [showInlineScheduler]);


/*
CHANGE 3: Add handler for schedule creation
-------------------------------------------
ADD:
*/
const handleScheduleCreated = (schedule: ScheduledReport) => {
  setShowInlineScheduler(false);
  // Show success notification
  // You can use your existing toast system or add a simple alert
  alert(`Schedule "${schedule.name}" created! View it in Scheduled Reports.`);
};


/*
CHANGE 4: Replace the Schedule button with inline scheduler trigger
-------------------------------------------------------------------
Find the existing Schedule button and replace with:
*/

// Schedule button with inline scheduler dropdown
<div className="relative" ref={schedulerRef}>
  <button
    onClick={() => setShowInlineScheduler(!showInlineScheduler)}
    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
      showInlineScheduler
        ? 'bg-rocket-100 text-rocket-700'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`}
  >
    <Calendar className="w-4 h-4" />
    Schedule
  </button>
  
  {/* Inline Scheduler Dropdown */}
  {showInlineScheduler && report && (
    <div className="absolute right-0 top-full mt-2 z-50">
      <InlineScheduler
        report={{
          id: report.id || `temp-${Date.now()}`,
          name: editableTitle || report.name || 'AI Report',
          type: 'ai_report',
        }}
        onScheduleCreated={handleScheduleCreated}
        onCancel={() => setShowInlineScheduler(false)}
        defaultExpanded={true}
      />
    </div>
  )}
</div>


// ============================================================================
// FILE 3: src/pages/CustomReportViewPage.tsx (INTEGRATION FOR CUSTOM REPORTS)
// ============================================================================

/*
Similarly, add InlineScheduler to the Custom Report View page.
Find where the Schedule button/icon is rendered and replace with the same pattern.

The key difference is the report type:
*/

<InlineScheduler
  report={{
    id: report.id,
    name: report.name,
    type: 'custom_report',  // Different type
    simpleReport: report.simpleReport, // Include the report definition
  }}
  onScheduleCreated={handleScheduleCreated}
  onCancel={() => setShowInlineScheduler(false)}
  defaultExpanded={true}
/>


// ============================================================================
// FILE 4: src/components/reports/InlineScheduler.tsx (ENHANCEMENTS)
// ============================================================================

/*
Additional enhancements to the InlineScheduler from the original Phase 3:

1. Add keyboard support (Escape to close)
2. Add animation for smoother appearance
3. Better mobile handling
*/

// Add this useEffect for keyboard handling:
useEffect(() => {
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isExpanded) {
      if (onCancel) {
        onCancel();
      } else {
        setIsExpanded(false);
      }
    }
  }
  
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isExpanded, onCancel]);


// Update the wrapper div to include animation classes:
<div className={`
  bg-white border border-slate-200 rounded-xl shadow-lg p-5 w-96
  animate-in fade-in slide-in-from-top-2 duration-200
`}>


// ============================================================================
// REMINDER: The Full InlineScheduler Component
// ============================================================================
/*
The complete InlineScheduler component is in phase3_inline_scheduling.tsx.

Key features that address your feedback about date range types:

1. DATE RANGE IS PROMINENT - It's a highlighted dropdown, not buried in advanced options

2. SMART SUGGESTIONS - When user picks "Weekly", we suggest "Previous Week" as range:
   <span className="text-xs text-amber-600 flex items-center gap-1">
     <Lightbulb className="w-3 h-3" />
     Suggested: Previous Week
   </span>

3. DYNAMIC VS STATIC INDICATOR - Clear visual feedback:
   - Green box: "Dynamic Report - Each delivery will include fresh data"
   - Amber box: "Static Report - Same data each time"

4. DATE RANGE OPTIONS:
   - Previous Week (Mon-Sun of last week) - DYNAMIC
   - Rolling 7 Days - DYNAMIC
   - Previous Month - DYNAMIC  
   - Month to Date - DYNAMIC
   - Previous Quarter - DYNAMIC
   - Year to Date - DYNAMIC
   - Keep Original Range (Static) - STATIC

5. PREVIEW SHOWS CONCRETE DATES:
   "First delivery: Jan 6 with data from Dec 30 - Jan 5"
*/


// ============================================================================
// SUMMARY: PHASE 3 INTEGRATION POINTS
// ============================================================================
/*
Files to create:
1. src/components/reports/InlineScheduler.tsx (from phase3_inline_scheduling.tsx)

Files to modify:
1. src/components/ai-studio/ReportPreviewHeader.tsx
   - Add InlineScheduler as dropdown from Schedule button
   - Add click-outside handling
   
2. src/pages/CustomReportViewPage.tsx  
   - Add InlineScheduler for custom reports
   - Pass simpleReport in report prop

3. Optionally update src/components/scheduled-reports/ScheduleBuilderModal.tsx
   - Keep as fallback for complex scheduling needs
   - Add "Advanced options" link in InlineScheduler that opens the full modal

The key insight from your feedback:
- Date range type is THE critical decision point in scheduling
- It transforms a static snapshot into a living, dynamic report
- This must be prominent, not hidden in advanced options
*/
