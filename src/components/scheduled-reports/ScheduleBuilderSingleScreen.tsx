import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X, Plus, Trash2, ChevronDown, ChevronUp, ChevronRight,
  FileSpreadsheet, Eye, Command, Calendar, Clock, FileText,
  RefreshCw, Sparkles
} from 'lucide-react';
import {
  ScheduleBuilderState,
  ScheduledReport,
  calculateNextRun,
  calculateDateRange
} from '../../types/scheduledReports';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface ScheduleBuilderSingleScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: ScheduledReport) => void;
  report?: {
    id: string;
    name: string;
    type: 'ai_report' | 'custom_report';
    simpleReport?: unknown;
  };
  existingSchedule?: ScheduledReport;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'weekly', label: 'Weekly', description: 'Once a week' },
  { value: 'monthly', label: 'Monthly', description: 'Once a month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Every 3 months' },
];

const DATE_RANGES = [
  {
    value: 'previous_week',
    label: 'Previous Week',
    description: 'Monday through Sunday of last week',
    icon: Calendar,
    recommended: ['weekly'],
  },
  {
    value: 'previous_month',
    label: 'Previous Month',
    description: 'The entire previous calendar month',
    icon: Calendar,
    recommended: ['monthly'],
  },
  {
    value: 'previous_quarter',
    label: 'Previous Quarter',
    description: 'The entire previous calendar quarter',
    icon: Calendar,
    recommended: ['quarterly'],
  },
  {
    value: 'mtd',
    label: 'Month to Date',
    description: 'From the 1st of this month until now',
    icon: Calendar,
    recommended: ['daily', 'weekly'],
  },
  {
    value: 'ytd',
    label: 'Year to Date',
    description: 'From January 1st until now',
    icon: Calendar,
    recommended: ['monthly', 'quarterly'],
  },
  {
    value: 'rolling',
    label: 'Rolling Window',
    description: 'Custom rolling period (e.g., last 7 days)',
    icon: RefreshCw,
    recommended: ['daily'],
  },
];

function detectTimezone(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzMap: Record<string, string> = {
    'America/New_York': 'America/New_York',
    'America/Chicago': 'America/Chicago',
    'America/Denver': 'America/Denver',
    'America/Los_Angeles': 'America/Los_Angeles',
    'America/Phoenix': 'America/Phoenix',
  };
  return tzMap[tz] || 'America/Chicago';
}

function getTimezoneLabel(tz: string): string {
  const labels: Record<string, string> = {
    'America/New_York': 'ET',
    'America/Chicago': 'CT',
    'America/Denver': 'MT',
    'America/Los_Angeles': 'PT',
    'America/Phoenix': 'AZ',
    'UTC': 'UTC',
  };
  return labels[tz] || 'CT';
}

export function ScheduleBuilderSingleScreen({
  isOpen,
  onClose,
  onSave,
  report,
  existingSchedule
}: ScheduleBuilderSingleScreenProps) {
  const { user, effectiveCustomerId } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isAIReport = (report?.type || existingSchedule?.report_type) === 'ai_report';

  const getSmartDateRange = (frequency: string): ScheduleBuilderState['date_range_type'] => {
    if (isAIReport) return 'report_default';
    switch (frequency) {
      case 'daily': return 'mtd';
      case 'weekly': return 'previous_week';
      case 'monthly': return 'previous_month';
      case 'quarterly': return 'previous_quarter';
      default: return 'previous_week';
    }
  };

  const [state, setState] = useState<ScheduleBuilderState>(() => ({
    report_type: report?.type || existingSchedule?.report_type || 'ai_report',
    report_id: report?.id || existingSchedule?.report_id || '',
    report_name: report?.name || existingSchedule?.report_name || '',

    name: existingSchedule?.name || `Weekly ${report?.name || 'Report'}`,
    description: existingSchedule?.description || '',

    frequency: existingSchedule?.frequency || 'weekly',
    timezone: existingSchedule?.timezone || detectTimezone(),
    day_of_week: existingSchedule?.day_of_week ?? 1,
    day_of_month: existingSchedule?.day_of_month ?? 1,
    run_time: existingSchedule?.run_time || '07:00',

    date_range_type: existingSchedule?.date_range_type || getSmartDateRange('weekly'),
    rolling_value: existingSchedule?.rolling_value ?? 7,
    rolling_unit: existingSchedule?.rolling_unit || 'days',

    delivery_email: true,
    delivery_notification: existingSchedule?.delivery_notification ?? true,
    email_recipients: existingSchedule?.email_recipients || [user?.email || ''],
    email_subject: existingSchedule?.email_subject || '{{schedule_name}} - {{date_range}}',
    email_body: existingSchedule?.email_body || '',
    format_pdf: true,
    format_csv: true,
  }));

  useEffect(() => {
    if (!existingSchedule && !isAIReport) {
      const freqLabel = FREQUENCIES.find(f => f.value === state.frequency)?.label || 'Weekly';
      setState(prev => ({
        ...prev,
        name: `${freqLabel} ${report?.name || 'Report'}`,
        date_range_type: getSmartDateRange(prev.frequency),
      }));
    }
  }, [state.frequency, existingSchedule, report?.name, isAIReport]);

  const isValid = useCallback(() => {
    return state.email_recipients.some(r => r.includes('@'));
  }, [state.email_recipients]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && isValid()) {
      e.preventDefault();
      handleSave();
    }
  }, [onClose, isValid]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const nextRunDate = useMemo(() => calculateNextRun(state), [state]);
  const dateRange = useMemo(() => calculateDateRange(state, nextRunDate), [state, nextRunDate]);

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const updateState = (updates: Partial<ScheduleBuilderState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const addRecipient = () => {
    updateState({ email_recipients: [...state.email_recipients, ''] });
  };

  const removeRecipient = (index: number) => {
    if (state.email_recipients.length > 1) {
      updateState({
        email_recipients: state.email_recipients.filter((_, i) => i !== index)
      });
    }
  };

  const updateRecipient = (index: number, value: string) => {
    const newRecipients = [...state.email_recipients];
    newRecipients[index] = value;
    updateState({ email_recipients: newRecipients });
  };

  const handleSave = async () => {
    if (!isValid()) {
      setError('Please add at least one valid email recipient');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (state.report_type === 'custom_report' && report?.simpleReport) {
        const reportDefinition = {
          id: state.report_id,
          name: state.report_name,
          type: 'custom_report',
          simpleReport: report.simpleReport,
          createdAt: new Date().toISOString(),
          customerId: effectiveCustomerId,
        };

        const storagePath = `${effectiveCustomerId}/custom-reports/${state.report_id}.json`;
        const reportBlob = new Blob([JSON.stringify(reportDefinition)], { type: 'application/json' });

        const { error: uploadError } = await supabase.storage
          .from('customer-reports')
          .upload(storagePath, reportBlob, { upsert: true });

        if (uploadError) {
          throw new Error('Failed to save report for scheduling');
        }
      }

      const scheduleData = {
        customer_id: effectiveCustomerId,
        created_by: user?.id,

        report_type: state.report_type,
        report_id: state.report_id,
        report_name: state.report_name,

        name: state.name,
        description: state.description || null,
        is_active: true,

        frequency: state.frequency,
        timezone: state.timezone,
        day_of_week: state.frequency === 'weekly' ? state.day_of_week : null,
        day_of_month: ['monthly', 'quarterly'].includes(state.frequency) ? state.day_of_month : null,
        run_time: state.run_time,

        date_range_type: isAIReport ? 'report_default' : state.date_range_type,
        rolling_value: state.date_range_type === 'rolling' ? state.rolling_value : null,
        rolling_unit: state.date_range_type === 'rolling' ? state.rolling_unit : null,

        delivery_email: true,
        delivery_notification: state.delivery_notification,
        email_recipients: state.email_recipients.filter(r => r.includes('@')),
        email_subject: state.email_subject,
        email_body: state.email_body || null,
        format_pdf: true,
        format_csv: true,

        next_run_at: nextRunDate.toISOString(),
      };

      let result;
      if (existingSchedule) {
        result = await supabase
          .from('scheduled_reports')
          .update({ ...scheduleData, updated_at: new Date().toISOString() })
          .eq('id', existingSchedule.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('scheduled_reports')
          .insert(scheduleData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      onSave(result.data);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save schedule';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const recommendedRanges = DATE_RANGES.filter(r =>
    r.recommended.includes(state.frequency)
  );
  const otherRanges = DATE_RANGES.filter(r =>
    !r.recommended.includes(state.frequency)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">
              {existingSchedule ? 'Edit Schedule' : 'Schedule Report'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{state.report_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <RefreshCw className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">
                  Dynamic Data, Every Time
                </h3>
                <p className="text-sm text-amber-800">
                  Your report definition stays the same, but the <strong>data updates automatically</strong> based on the date range you choose below.
                </p>
              </div>
            </div>
          </div>

          {!isAIReport && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-rocket-600" />
                <label className="text-base font-semibold text-gray-900">
                  What data should each report include?
                </label>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Each time this report runs, it will pull data from this time window
              </p>

              <div className="space-y-2 mb-4">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Recommended for {state.frequency} reports
                </div>
                {recommendedRanges.map((range) => {
                  const IconComponent = range.icon;
                  return (
                    <button
                      key={range.value}
                      onClick={() => updateState({ date_range_type: range.value as ScheduleBuilderState['date_range_type'] })}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                        state.date_range_type === range.value
                          ? 'border-rocket-500 bg-rocket-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <IconComponent className={`w-5 h-5 ${
                          state.date_range_type === range.value ? 'text-rocket-600' : 'text-gray-400'
                        }`} />
                        <div className="flex-1">
                          <div className={`font-medium ${
                            state.date_range_type === range.value ? 'text-rocket-700' : 'text-gray-900'
                          }`}>
                            {range.label}
                          </div>
                          <div className="text-sm text-gray-500">{range.description}</div>
                        </div>
                        {state.date_range_type === range.value && (
                          <div className="w-5 h-5 bg-rocket-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {otherRanges.length > 0 && (
                <details className="group">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 list-none flex items-center gap-1">
                    <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                    More options
                  </summary>
                  <div className="mt-2 space-y-2 pl-5">
                    {otherRanges.map((range) => {
                      const IconComponent = range.icon;
                      return (
                        <button
                          key={range.value}
                          onClick={() => updateState({ date_range_type: range.value as ScheduleBuilderState['date_range_type'] })}
                          className={`w-full p-3 rounded-xl border text-left transition-all ${
                            state.date_range_type === range.value
                              ? 'border-rocket-500 bg-rocket-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent className={`w-5 h-5 ${
                              state.date_range_type === range.value ? 'text-rocket-600' : 'text-gray-400'
                            }`} />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{range.label}</div>
                              <div className="text-sm text-gray-500">{range.description}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </details>
              )}

              {state.date_range_type === 'rolling' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Pull data from the last</span>
                    <input
                      type="number"
                      value={state.rolling_value}
                      onChange={(e) => updateState({ rolling_value: parseInt(e.target.value) || 7 })}
                      className="w-16 px-2 py-1 border rounded-lg text-center font-medium"
                      min="1"
                    />
                    <select
                      value={state.rolling_unit}
                      onChange={(e) => updateState({ rolling_unit: e.target.value as 'days' | 'weeks' | 'months' })}
                      className="px-3 py-1 border rounded-lg"
                    >
                      <option value="days">days</option>
                      <option value="weeks">weeks</option>
                      <option value="months">months</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-500" />
              <span className="text-base font-semibold text-gray-900">When to send</span>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frequency
              </label>
              <div className="grid grid-cols-4 gap-2">
                {FREQUENCIES.map((freq) => (
                  <button
                    key={freq.value}
                    onClick={() => updateState({ frequency: freq.value as ScheduleBuilderState['frequency'] })}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      state.frequency === freq.value
                        ? 'bg-rocket-600 text-white border-rocket-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-rocket-400'
                    }`}
                  >
                    {freq.label}
                  </button>
                ))}
              </div>
            </div>

            {state.frequency === 'weekly' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Day of Week
                </label>
                <div className="flex gap-1">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => updateState({ day_of_week: day.value })}
                      className={`flex-1 px-2 py-2 text-sm rounded-lg border transition-colors ${
                        state.day_of_week === day.value
                          ? 'bg-rocket-600 text-white border-rocket-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-rocket-400'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {['monthly', 'quarterly'].includes(state.frequency) && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Day of Month
                </label>
                <select
                  value={state.day_of_month}
                  onChange={(e) => updateState({ day_of_month: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day === 1 ? '1st' : day === 2 ? '2nd' : day === 3 ? '3rd' : `${day}th`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send To
            </label>
            <div className="space-y-2">
              {state.email_recipients.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateRecipient(index, e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  {state.email_recipients.length > 1 && (
                    <button
                      onClick={() => removeRecipient(index)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addRecipient}
                className="text-sm text-rocket-600 hover:text-rocket-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add recipient
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-rocket-50 to-orange-50 rounded-xl p-4 border border-rocket-200">
            <div className="text-sm font-medium text-rocket-800 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Schedule Preview
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-rocket-700">
                <Calendar className="w-4 h-4" />
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
                <span>Next delivery: <strong>{formatDate(nextRunDate)}</strong></span>
              </div>
              {!isAIReport && dateRange && (
                <div className="flex items-center gap-2 text-rocket-600">
                  <FileText className="w-4 h-4" />
                  <span>
                    Will include data from: <strong>{formatDate(dateRange.start)} - {formatDate(dateRange.end)}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

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
                  <p className="text-slate-500 text-xs mt-0.5">Full report with charts - Export to PDF available</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Advanced options
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule Name
                  </label>
                  <input
                    type="text"
                    value={state.name}
                    onChange={(e) => updateState({ name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={state.run_time}
                    onChange={(e) => updateState({ run_time: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={state.timezone}
                    onChange={(e) => updateState({ timezone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="America/Phoenix">Arizona (no DST)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={state.email_subject}
                    onChange={(e) => updateState({ email_subject: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="{{schedule_name}} - {{date_range}}"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Variables: {'{{schedule_name}}'}, {'{{date_range}}'}, {'{{report_name}}'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notification"
                    checked={state.delivery_notification}
                    onChange={(e) => updateState({ delivery_notification: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="notification" className="text-sm text-gray-700">
                    Also send in-app notification
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
            <Command className="w-3 h-3" />
            <span>Enter to save</span>
          </span>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isValid()}
              className="px-4 py-2 text-sm font-medium text-white bg-rocket-600 rounded-lg hover:bg-rocket-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                existingSchedule ? 'Save Changes' : 'Create Schedule'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
