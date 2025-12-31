// ============================================================================
// PHASE 4 (CORRECTED): SMART DEFAULTS
// ============================================================================
// 
// This phase remains largely the same as the original.
// The smart defaults hook and components work with the corrected structure.
//
// ============================================================================


// ============================================================================
// FILE 1: src/hooks/useScheduleDefaults.ts (NEW FILE)
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ScheduleDefaults {
  timezone: string;
  lastRecipients: string[];
  preferredFrequency: string;
  preferredTime: string;
}

const STORAGE_KEY = 'rocket_schedule_defaults';

/**
 * Hook to manage smart defaults for scheduling
 * - Auto-detects timezone from browser
 * - Remembers last-used recipients
 * - Tracks preferred frequency/time
 */
export function useScheduleDefaults() {
  const { user } = useAuth();
  
  const [defaults, setDefaults] = useState<ScheduleDefaults>(() => {
    // Load from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Invalid JSON, use fresh defaults
      }
    }
    
    return {
      timezone: detectTimezone(),
      lastRecipients: user?.email ? [user.email] : [],
      preferredFrequency: 'weekly',
      preferredTime: '07:00',
    };
  });
  
  // Save defaults when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  }, [defaults]);
  
  // Update defaults after a schedule is created
  const recordScheduleCreation = useCallback((scheduleConfig: {
    frequency: string;
    timezone: string;
    run_time: string;
    email_recipients: string[];
  }) => {
    setDefaults(prev => ({
      ...prev,
      timezone: scheduleConfig.timezone,
      preferredFrequency: scheduleConfig.frequency,
      preferredTime: scheduleConfig.run_time,
      lastRecipients: dedupeEmails([
        ...scheduleConfig.email_recipients,
        ...prev.lastRecipients
      ]).slice(0, 10), // Keep last 10 unique recipients
    }));
  }, []);
  
  // Suggest date range based on frequency
  const suggestDateRange = useCallback((frequency: string): { range: string; reason: string } => {
    const suggestions: Record<string, { range: string; reason: string }> = {
      daily: {
        range: 'rolling',
        reason: 'Rolling 7 days gives daily context without overwhelming data'
      },
      weekly: {
        range: 'previous_week',
        reason: 'Previous week (Mon-Sun) aligns with weekly reporting cycles'
      },
      monthly: {
        range: 'previous_month',
        reason: 'Previous month gives complete monthly data for comparison'
      },
      quarterly: {
        range: 'previous_quarter',
        reason: 'Previous quarter provides full quarter-over-quarter analysis'
      },
    };
    return suggestions[frequency] || suggestions.weekly;
  }, []);
  
  // Suggest frequency based on report date range
  const suggestFrequency = useCallback((dateRangeInDays: number): { frequency: string; reason: string } => {
    if (dateRangeInDays <= 7) {
      return { frequency: 'daily', reason: 'Short date range works well with daily updates' };
    } else if (dateRangeInDays <= 31) {
      return { frequency: 'weekly', reason: 'Weekly delivery matches your ~month range' };
    } else if (dateRangeInDays <= 90) {
      return { frequency: 'monthly', reason: 'Monthly delivery suits your quarter-length range' };
    } else {
      return { frequency: 'quarterly', reason: 'Quarterly delivery for long-range analysis' };
    }
  }, []);
  
  return {
    defaults,
    recordScheduleCreation,
    suggestDateRange,
    suggestFrequency,
  };
}

// Helper: Detect user's timezone from browser
function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Map to supported timezones
    const tzMap: Record<string, string> = {
      'America/New_York': 'America/New_York',
      'America/Detroit': 'America/New_York',
      'America/Indiana/Indianapolis': 'America/New_York',
      'America/Chicago': 'America/Chicago',
      'America/Denver': 'America/Denver',
      'America/Phoenix': 'America/Phoenix',
      'America/Los_Angeles': 'America/Los_Angeles',
    };
    
    if (tzMap[tz]) return tzMap[tz];
    
    // Fallback: guess based on offset
    const offset = new Date().getTimezoneOffset();
    if (offset >= 240 && offset <= 300) return 'America/New_York';
    if (offset >= 300 && offset <= 360) return 'America/Chicago';
    if (offset >= 360 && offset <= 420) return 'America/Denver';
    if (offset >= 420 && offset <= 480) return 'America/Los_Angeles';
    
    return 'America/Chicago'; // Default to Central
  } catch {
    return 'America/Chicago';
  }
}

// Helper: Dedupe emails while preserving order
function dedupeEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  return emails.filter(email => {
    const normalized = email.toLowerCase().trim();
    if (seen.has(normalized) || !normalized.includes('@')) return false;
    seen.add(normalized);
    return true;
  });
}

export default useScheduleDefaults;


// ============================================================================
// FILE 2: src/components/reports/SmartScheduleHints.tsx (NEW FILE)
// ============================================================================

import React from 'react';
import { Lightbulb } from 'lucide-react';

interface SmartScheduleHintsProps {
  currentFrequency: string;
  currentDateRange: string;
  suggestedDateRange: { range: string; reason: string };
  onApplySuggestion: (suggestion: { dateRange?: string; frequency?: string }) => void;
}

const DATE_RANGE_LABELS: Record<string, string> = {
  rolling: 'Rolling 7 Days',
  previous_week: 'Previous Week',
  previous_month: 'Previous Month',
  previous_quarter: 'Previous Quarter',
  mtd: 'Month to Date',
  ytd: 'Year to Date',
  report_default: 'Report Default',
};

export function SmartScheduleHints({
  currentFrequency,
  currentDateRange,
  suggestedDateRange,
  onApplySuggestion
}: SmartScheduleHintsProps) {
  const showSuggestion = currentDateRange !== suggestedDateRange.range 
    && currentDateRange !== 'report_default';
  
  if (!showSuggestion) return null;
  
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">Suggestion</p>
          <p className="text-xs text-amber-700 mt-0.5">
            {suggestedDateRange.reason}
          </p>
          <button
            onClick={() => onApplySuggestion({ dateRange: suggestedDateRange.range })}
            className="mt-2 text-xs font-medium text-amber-600 hover:text-amber-800 
                       underline underline-offset-2"
          >
            Use "{DATE_RANGE_LABELS[suggestedDateRange.range]}" instead
          </button>
        </div>
      </div>
    </div>
  );
}

export default SmartScheduleHints;


// ============================================================================
// FILE 3: src/components/reports/RecentRecipientsDropdown.tsx (NEW FILE)
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Clock, Plus } from 'lucide-react';

interface RecentRecipientsDropdownProps {
  recentRecipients: string[];
  currentRecipients: string[];
  onAddRecipient: (email: string) => void;
}

export function RecentRecipientsDropdown({
  recentRecipients,
  currentRecipients,
  onAddRecipient
}: RecentRecipientsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Filter out already-added recipients
  const availableRecipients = recentRecipients.filter(
    email => !currentRecipients.map(e => e.toLowerCase()).includes(email.toLowerCase())
  );
  
  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  if (availableRecipients.length === 0) return null;
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        type="button"
      >
        <Clock className="w-3 h-3" />
        Recent
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 
                        rounded-lg shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          <p className="px-3 py-1.5 text-xs text-slate-400 font-medium border-b border-slate-100">
            Recently used
          </p>
          {availableRecipients.map(email => (
            <button
              key={email}
              onClick={() => {
                onAddRecipient(email);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-slate-700 
                         hover:bg-slate-50 flex items-center justify-between"
              type="button"
            >
              <span className="truncate">{email}</span>
              <Plus className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecentRecipientsDropdown;


// ============================================================================
// FILE 4: src/components/reports/InlineScheduler.tsx (INTEGRATION)
// ============================================================================

/*
Update InlineScheduler to use the smart defaults hook.

CHANGE 1: Add imports
---------------------
*/
import { useScheduleDefaults } from '../../hooks/useScheduleDefaults';
import { SmartScheduleHints } from './SmartScheduleHints';
import { RecentRecipientsDropdown } from './RecentRecipientsDropdown';


/*
CHANGE 2: Use the hook in the component
---------------------------------------
Add near the top of the component:
*/
const { 
  defaults, 
  recordScheduleCreation, 
  suggestDateRange 
} = useScheduleDefaults();


/*
CHANGE 3: Update initial state to use smart defaults
----------------------------------------------------
Update the useState for state:
*/
const [state, setState] = useState<ScheduleBuilderState>(() => ({
  report_type: report.type,
  report_id: report.id,
  report_name: report.name,
  
  name: `${defaults.preferredFrequency.charAt(0).toUpperCase() + defaults.preferredFrequency.slice(1)} ${report.name}`,
  description: '',
  
  frequency: defaults.preferredFrequency as any,  // Use remembered preference
  timezone: defaults.timezone,                      // Auto-detected
  day_of_week: 1,
  day_of_month: 1,
  run_time: defaults.preferredTime,                // Use remembered preference
  
  date_range_type: getSuggestedRange(defaults.preferredFrequency),
  rolling_value: 7,
  rolling_unit: 'days',
  
  delivery_email: true,
  delivery_notification: true,
  email_recipients: defaults.lastRecipients.length > 0 
    ? [defaults.lastRecipients[0]]  // Pre-fill with most recent recipient
    : [user?.email || ''],
  email_subject: '{{schedule_name}} - {{date_range}}',
  email_body: '',
  format_pdf: true,
  format_csv: true,
}));


/*
CHANGE 4: Add SmartScheduleHints in the form
--------------------------------------------
Add after the date range selector:
*/
<SmartScheduleHints
  currentFrequency={state.frequency}
  currentDateRange={state.date_range_type}
  suggestedDateRange={suggestDateRange(state.frequency)}
  onApplySuggestion={(suggestion) => {
    if (suggestion.dateRange) {
      updateState({ date_range_type: suggestion.dateRange as any });
    }
  }}
/>


/*
CHANGE 5: Add RecentRecipientsDropdown near email input
-------------------------------------------------------
Update the email recipients section:
*/
<div className="mb-4">
  <div className="flex items-center justify-between mb-1.5">
    <label className="text-sm font-medium text-slate-700">Send To</label>
    <RecentRecipientsDropdown
      recentRecipients={defaults.lastRecipients}
      currentRecipients={state.email_recipients}
      onAddRecipient={(email) => {
        updateState({ 
          email_recipients: [...state.email_recipients.filter(e => e), email] 
        });
      }}
    />
  </div>
  {/* ... existing email input fields ... */}
</div>


/*
CHANGE 6: Record the schedule creation in handleSave
----------------------------------------------------
After successful save, before closing:
*/
// After: onScheduleCreated(data as ScheduledReport);
// Add:
recordScheduleCreation({
  frequency: state.frequency,
  timezone: state.timezone,
  run_time: state.run_time,
  email_recipients: state.email_recipients.filter(r => r.includes('@')),
});


// ============================================================================
// SUMMARY: PHASE 4 DELIVERABLES
// ============================================================================
/*
New files to create:
1. src/hooks/useScheduleDefaults.ts - Smart defaults hook
2. src/components/reports/SmartScheduleHints.tsx - Contextual suggestions
3. src/components/reports/RecentRecipientsDropdown.tsx - Quick recipient selection

Updates to make:
1. src/components/reports/InlineScheduler.tsx
   - Import and use useScheduleDefaults hook
   - Initialize form with smart defaults
   - Add SmartScheduleHints component
   - Add RecentRecipientsDropdown
   - Record schedule creation for learning

Smart defaults behavior:
- Timezone: Auto-detected from browser
- Frequency: Remembers last used (default: weekly)
- Time: Remembers last used (default: 7:00 AM)
- Recipients: Shows dropdown of recently used emails
- Date range: Suggests based on frequency

The goal: Reduce decisions by making smart choices automatic while keeping
full control available. Users who always send to the same 3 people every Monday
shouldn't have to re-enter that info each time.
*/
