import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ScheduleDefaults {
  timezone: string;
  lastRecipients: string[];
  preferredFrequency: string;
  preferredTime: string;
}

const STORAGE_KEY = 'rocket_schedule_defaults';

function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

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

    const offset = new Date().getTimezoneOffset();
    if (offset >= 240 && offset <= 300) return 'America/New_York';
    if (offset >= 300 && offset <= 360) return 'America/Chicago';
    if (offset >= 360 && offset <= 420) return 'America/Denver';
    if (offset >= 420 && offset <= 480) return 'America/Los_Angeles';

    return 'America/Chicago';
  } catch {
    return 'America/Chicago';
  }
}

function dedupeEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  return emails.filter(email => {
    const normalized = email.toLowerCase().trim();
    if (seen.has(normalized) || !normalized.includes('@')) return false;
    seen.add(normalized);
    return true;
  });
}

export function useScheduleDefaults() {
  const { user } = useAuth();

  const [defaults, setDefaults] = useState<ScheduleDefaults>(() => {
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  }, [defaults]);

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
      ]).slice(0, 10),
    }));
  }, []);

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

export default useScheduleDefaults;
