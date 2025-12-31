import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Mail,
  Bell,
  Check,
  Loader2,
  X,
  AlertCircle,
  RefreshCw,
  FileText,
} from 'lucide-react';
import {
  ScheduledReport,
  calculateNextRun,
  calculateDateRange,
} from '../../types/scheduledReports';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface InlineSchedulerProps {
  report: {
    id: string;
    name: string;
    type: 'ai_report' | 'custom_report';
    simpleReport?: unknown;
  };
  onScheduleCreated: (schedule: ScheduledReport) => void;
  onCancel?: () => void;
  defaultExpanded?: boolean;
}

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
] as const;

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const DATE_RANGE_OPTIONS = [
  { value: 'previous_week', label: 'Previous Week', description: 'Mon-Sun of last week', dynamic: true },
  { value: 'rolling', label: 'Rolling 7 Days', description: 'Last 7 days from run date', dynamic: true },
  { value: 'previous_month', label: 'Previous Month', description: 'Full previous calendar month', dynamic: true },
  { value: 'mtd', label: 'Month to Date', description: 'From 1st of month to yesterday', dynamic: true },
  { value: 'previous_quarter', label: 'Previous Quarter', description: 'Full previous quarter', dynamic: true },
  { value: 'ytd', label: 'Year to Date', description: 'From Jan 1 to yesterday', dynamic: true },
  { value: 'report_default', label: 'Keep Original Range', description: 'Static - same data each time', dynamic: false },
] as const;

type DateRangeType = typeof DATE_RANGE_OPTIONS[number]['value'];
type Frequency = typeof FREQUENCIES[number]['value'];

function getSuggestedDateRange(frequency: Frequency): DateRangeType {
  switch (frequency) {
    case 'daily': return 'rolling';
    case 'weekly': return 'previous_week';
    case 'monthly': return 'previous_month';
    case 'quarterly': return 'previous_quarter';
    default: return 'previous_week';
  }
}

export function InlineScheduler({
  report,
  onScheduleCreated,
  onCancel,
  defaultExpanded = false,
}: InlineSchedulerProps) {
  const { user, effectiveCustomerId } = useAuth();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAIReport = report.type === 'ai_report';

  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [runTime, setRunTime] = useState('07:00');
  const [timezone] = useState('America/Chicago');
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>(
    isAIReport ? 'report_default' : 'previous_week'
  );
  const [rollingValue, setRollingValue] = useState(7);
  const [deliverEmail, setDeliverEmail] = useState(true);
  const [deliverNotification, setDeliverNotification] = useState(true);
  const [emailRecipient, setEmailRecipient] = useState(user?.email || '');
  const [formatPdf, setFormatPdf] = useState(true);
  const [formatCsv, setFormatCsv] = useState(false);

  const suggestedRange = useMemo(() => getSuggestedDateRange(frequency), [frequency]);
  const showSuggestion = !isAIReport && dateRangeType !== suggestedRange;

  const config = useMemo(() => ({
    frequency,
    day_of_week: dayOfWeek,
    day_of_month: dayOfMonth,
    run_time: runTime,
    date_range_type: dateRangeType,
    rolling_value: rollingValue,
    rolling_unit: 'days' as const,
  }), [frequency, dayOfWeek, dayOfMonth, runTime, dateRangeType, rollingValue]);

  const nextRunDate = useMemo(() => calculateNextRun(config), [config]);
  const dateRange = useMemo(() => calculateDateRange(config, nextRunDate), [config, nextRunDate]);

  const selectedDateRangeOption = DATE_RANGE_OPTIONS.find(o => o.value === dateRangeType);
  const isDynamic = selectedDateRangeOption?.dynamic ?? true;

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

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const formatDateTime = (date: Date) => date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const handleSave = async () => {
    if (!effectiveCustomerId) {
      setError('No customer context available');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (report.type === 'custom_report' && report.simpleReport) {
        const reportDefinition = {
          id: report.id,
          name: report.name,
          type: 'custom_report',
          simpleReport: report.simpleReport,
          createdAt: new Date().toISOString(),
          customerId: effectiveCustomerId,
        };

        const storagePath = `${effectiveCustomerId}/custom-reports/${report.id}.json`;
        const reportBlob = new Blob([JSON.stringify(reportDefinition)], { type: 'application/json' });

        const { error: uploadError } = await supabase.storage
          .from('customer-reports')
          .upload(storagePath, reportBlob, { upsert: true });

        if (uploadError) {
          console.error('Failed to save custom report to storage:', uploadError);
          throw new Error('Failed to save report for scheduling.');
        }
      }

      const scheduleName = `${report.name} - ${frequency.charAt(0).toUpperCase() + frequency.slice(1)}`;

      const scheduleData = {
        customer_id: effectiveCustomerId,
        created_by: user?.id,

        report_type: report.type,
        report_id: report.id,
        report_name: report.name,

        name: scheduleName,
        description: null,
        is_active: true,

        frequency,
        timezone,
        day_of_week: frequency === 'weekly' ? dayOfWeek : null,
        day_of_month: ['monthly', 'quarterly'].includes(frequency) ? dayOfMonth : null,
        run_time: runTime,

        date_range_type: isAIReport ? 'report_default' : dateRangeType,
        rolling_value: dateRangeType === 'rolling' ? rollingValue : null,
        rolling_unit: dateRangeType === 'rolling' ? 'days' : null,

        delivery_email: deliverEmail,
        delivery_notification: deliverNotification,
        email_recipients: deliverEmail && emailRecipient ? [emailRecipient] : [],
        email_subject: `${scheduleName} - {{date_range}}`,
        email_body: null,
        format_pdf: formatPdf,
        format_csv: formatCsv,

        next_run_at: nextRunDate.toISOString(),
      };

      const { data, error: insertError } = await supabase
        .from('scheduled_reports')
        .insert(scheduleData)
        .select()
        .single();

      if (insertError) throw insertError;

      onScheduleCreated(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create schedule';
      console.error('Failed to save schedule:', err);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Calendar className="w-4 h-4 text-slate-600" />
        <span className="text-sm font-medium text-slate-700">Schedule</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-5 w-96 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Schedule Report</h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            How often?
          </label>
          <div className="grid grid-cols-4 gap-1">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                onClick={() => setFrequency(f.value)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  frequency === f.value
                    ? 'bg-rocket-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {frequency === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Day of week
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rocket-500"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        )}

        {['monthly', 'quarterly'].includes(frequency) && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Day of month
            </label>
            <select
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rocket-500"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        {!isAIReport && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <span className="flex items-center gap-2">
                Date Range
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isDynamic
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {isDynamic ? 'Dynamic' : 'Static'}
                </span>
              </span>
            </label>
            <select
              value={dateRangeType}
              onChange={(e) => setDateRangeType(e.target.value as DateRangeType)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rocket-500"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {selectedDateRangeOption?.description}
            </p>

            {showSuggestion && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
                <Lightbulb className="w-3 h-3" />
                <span>
                  Suggested for {frequency}: {DATE_RANGE_OPTIONS.find(o => o.value === suggestedRange)?.label}
                </span>
                <button
                  onClick={() => setDateRangeType(suggestedRange)}
                  className="ml-1 underline hover:no-underline"
                >
                  Use it
                </button>
              </div>
            )}

            {dateRangeType === 'rolling' && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-slate-600">Last</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={rollingValue}
                  onChange={(e) => setRollingValue(Number(e.target.value))}
                  className="w-16 px-2 py-1 border border-slate-200 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-rocket-500"
                />
                <span className="text-sm text-slate-600">days</span>
              </div>
            )}

            <div className={`mt-3 p-3 rounded-lg text-xs ${
              isDynamic
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}>
              <div className="flex items-start gap-2">
                <RefreshCw className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isDynamic ? 'text-green-600' : 'text-amber-600'}`} />
                <div>
                  <span className="font-medium">
                    {isDynamic ? 'Dynamic Report' : 'Static Report'}
                  </span>
                  <p className="mt-0.5 opacity-90">
                    {isDynamic
                      ? 'Each delivery will include fresh data for the specified time period.'
                      : 'Same data each time - useful for archiving a specific snapshot.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showAdvanced ? 'Hide' : 'Show'} delivery options
        </button>

        {showAdvanced && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Run Time
              </label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <input
                  type="time"
                  value={runTime}
                  onChange={(e) => setRunTime(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rocket-500"
                />
                <span className="text-xs text-slate-500">CT</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deliverEmail}
                  onChange={(e) => setDeliverEmail(e.target.checked)}
                  className="rounded border-slate-300 text-rocket-600 focus:ring-rocket-500"
                />
                <Mail className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-700">Email delivery</span>
              </label>

              {deliverEmail && (
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rocket-500 ml-6"
                />
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deliverNotification}
                  onChange={(e) => setDeliverNotification(e.target.checked)}
                  className="rounded border-slate-300 text-rocket-600 focus:ring-rocket-500"
                />
                <Bell className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-700">In-app notification</span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Format
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formatPdf}
                    onChange={(e) => setFormatPdf(e.target.checked)}
                    className="rounded border-slate-300 text-rocket-600 focus:ring-rocket-500"
                  />
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700">PDF</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formatCsv}
                    onChange={(e) => setFormatCsv(e.target.checked)}
                    className="rounded border-slate-300 text-rocket-600 focus:ring-rocket-500"
                  />
                  <span className="text-sm text-slate-700">CSV</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-50 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 text-slate-700 font-medium mb-1">
            <Calendar className="w-4 h-4" />
            First delivery
          </div>
          <p className="text-slate-600">
            {formatDateTime(nextRunDate)}
            {!isAIReport && isDynamic && (
              <span className="text-slate-500">
                {' '}with data from {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
              </span>
            )}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || (!deliverEmail && !deliverNotification)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rocket-600 hover:bg-rocket-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create Schedule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
