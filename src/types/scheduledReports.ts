export interface ScheduledReport {
  id: string;
  customer_id: number | null;
  created_by: string | null;
  created_by_user_id: string | null;

  report_type: 'ai_report' | 'custom_report';
  report_id: string;
  report_name: string;
  report_scope: 'customer' | 'admin';
  target_customer_ids: number[] | null;

  name: string;
  description: string | null;
  is_active: boolean;

  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  timezone: string;
  day_of_week: number | null;
  day_of_month: number | null;
  run_time: string;

  date_range_type: 'rolling' | 'previous_week' | 'previous_month' | 'previous_quarter' | 'mtd' | 'ytd' | 'report_default';
  rolling_value: number | null;
  rolling_unit: 'days' | 'weeks' | 'months' | null;

  delivery_email: boolean;
  delivery_notification: boolean;
  email_recipients: string[];
  email_subject: string | null;
  email_body: string | null;
  format_pdf: boolean;
  format_csv: boolean;

  last_run_at: string | null;
  next_run_at: string | null;
  last_run_status: 'success' | 'failed' | 'running' | null;
  last_run_error: string | null;
  run_count: number;

  created_at: string;
  updated_at: string;
}

export interface ScheduledReportRun {
  id: string;
  scheduled_report_id: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'success' | 'failed';
  error_message: string | null;
  date_range_start: string | null;
  date_range_end: string | null;
  record_count: number | null;
  pdf_storage_path: string | null;
  csv_storage_path: string | null;
  emails_sent: number;
  email_recipients: string[] | null;
  notifications_created: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'scheduled_report' | 'system' | 'alert';
  title: string;
  message: string | null;
  scheduled_report_id: string | null;
  scheduled_run_id: string | null;
  report_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ScheduleBuilderState {
  report_type: 'ai_report' | 'custom_report';
  report_id: string;
  report_name: string;

  name: string;
  description: string;

  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  timezone: string;
  day_of_week: number;
  day_of_month: number;
  run_time: string;

  date_range_type: 'rolling' | 'previous_week' | 'previous_month' | 'previous_quarter' | 'mtd' | 'ytd' | 'report_default';
  rolling_value: number;
  rolling_unit: 'days' | 'weeks' | 'months';

  delivery_email: boolean;
  delivery_notification: boolean;
  email_recipients: string[];
  email_subject: string;
  email_body: string;
  format_pdf: boolean;
  format_csv: boolean;
}

export function calculateNextRun(config: Partial<ScheduleBuilderState>): Date {
  const now = new Date();
  const [hours, minutes] = (config.run_time || '07:00').split(':').map(Number);

  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  switch (config.frequency) {
    case 'daily':
      break;

    case 'weekly': {
      const targetDay = config.day_of_week ?? 1;
      while (next.getDay() !== targetDay) {
        next.setDate(next.getDate() + 1);
      }
      break;
    }

    case 'monthly': {
      const targetDate = config.day_of_month ?? 1;
      next.setDate(targetDate);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;
    }

    case 'quarterly': {
      const quarterMonths = [0, 3, 6, 9];
      const currentMonth = next.getMonth();
      const nextQuarterMonth = quarterMonths.find(m => m > currentMonth) ?? quarterMonths[0];
      if (nextQuarterMonth <= currentMonth) {
        next.setFullYear(next.getFullYear() + 1);
      }
      next.setMonth(nextQuarterMonth);
      next.setDate(config.day_of_month ?? 1);
      break;
    }
  }

  return next;
}

export function calculateDateRange(config: Partial<ScheduleBuilderState>, runDate: Date = new Date()): { start: Date; end: Date } {
  const { date_range_type, rolling_value = 7, rolling_unit = 'days' } = config;

  switch (date_range_type) {
    case 'rolling': {
      const end = new Date(runDate);
      end.setDate(end.getDate() - 1);
      const start = new Date(end);

      if (rolling_unit === 'days') {
        start.setDate(start.getDate() - rolling_value + 1);
      } else if (rolling_unit === 'weeks') {
        start.setDate(start.getDate() - (rolling_value * 7) + 1);
      } else if (rolling_unit === 'months') {
        start.setMonth(start.getMonth() - rolling_value);
        start.setDate(start.getDate() + 1);
      }
      return { start, end };
    }

    case 'previous_week': {
      const end = new Date(runDate);
      end.setDate(end.getDate() - end.getDay());
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { start, end };
    }

    case 'previous_month': {
      const firstOfThisMonth = new Date(runDate.getFullYear(), runDate.getMonth(), 1);
      const end = new Date(firstOfThisMonth);
      end.setDate(end.getDate() - 1);
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return { start, end };
    }

    case 'previous_quarter': {
      const currentQuarter = Math.floor(runDate.getMonth() / 3);
      const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
      const year = currentQuarter === 0 ? runDate.getFullYear() - 1 : runDate.getFullYear();
      const start = new Date(year, prevQuarter * 3, 1);
      const end = new Date(year, prevQuarter * 3 + 3, 0);
      return { start, end };
    }

    case 'mtd': {
      const start = new Date(runDate.getFullYear(), runDate.getMonth(), 1);
      const end = new Date(runDate);
      end.setDate(end.getDate() - 1);
      return { start, end };
    }

    case 'ytd': {
      const start = new Date(runDate.getFullYear(), 0, 1);
      const end = new Date(runDate);
      end.setDate(end.getDate() - 1);
      return { start, end };
    }

    case 'report_default': {
      const end = new Date(runDate);
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { start, end };
    }

    default: {
      const end = new Date(runDate);
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { start, end };
    }
  }
}
