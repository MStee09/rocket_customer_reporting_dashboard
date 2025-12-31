import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X, Plus, Trash2, ChevronDown, ChevronUp,
  FileSpreadsheet, Eye, Command
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
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const DATE_RANGES = [
  { value: 'previous_week', label: 'Previous Week', tooltip: 'Monday through Sunday of last week' },
  { value: 'previous_month', label: 'Previous Month', tooltip: 'The entire previous calendar month' },
  { value: 'previous_quarter', label: 'Previous Quarter', tooltip: 'The entire previous calendar quarter' },
  { value: 'mtd', label: 'Month to Date', tooltip: 'From the 1st of this month to yesterday' },
  { value: 'ytd', label: 'Year to Date', tooltip: 'From January 1st to yesterday' },
  { value: 'rolling', label: 'Rolling...', tooltip: 'Custom rolling window (e.g., last 7 days)' },
  { value: 'report_default', label: 'Report Default', tooltip: 'Use the date range defined in the report' },
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
      case 'daily': return 'previous_week';
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
    if (!existingSchedule) {
      const freqLabel = FREQUENCIES.find(f => f.value === state.frequency)?.label || 'Weekly';
      setState(prev => ({
        ...prev,
        name: `${freqLabel} ${report?.name || 'Report'}`,
        date_range_type: getSmartDateRange(prev.frequency),
      }));
    }
  }, [state.frequency, existingSchedule, report?.name]);

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

          {!isAIReport && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Window
              </label>
              <div className="flex flex-wrap gap-2">
                {DATE_RANGES.map((range) => (
                  <button
                    key={range.value}
                    title={range.tooltip}
                    onClick={() => updateState({ date_range_type: range.value as ScheduleBuilderState['date_range_type'] })}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      state.date_range_type === range.value
                        ? 'bg-rocket-600 text-white border-rocket-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-rocket-400'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
              {state.date_range_type === 'rolling' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-gray-600">Last</span>
                  <input
                    type="number"
                    value={state.rolling_value}
                    onChange={(e) => updateState({ rolling_value: parseInt(e.target.value) || 7 })}
                    className="w-16 px-2 py-1 border rounded text-sm"
                    min="1"
                  />
                  <select
                    value={state.rolling_unit}
                    onChange={(e) => updateState({ rolling_unit: e.target.value as 'days' | 'weeks' | 'months' })}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                    <option value="months">months</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frequency
            </label>
            <div className="flex gap-2">
              {FREQUENCIES.map((freq) => (
                <button
                  key={freq.value}
                  onClick={() => updateState({ frequency: freq.value as ScheduleBuilderState['frequency'] })}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
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
            <div>
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
            <div>
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

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Delivery includes:</div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                CSV attached
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-blue-600" />
                View Report link
              </span>
            </div>
          </div>

          <div className="bg-rocket-50 rounded-lg p-4 border border-rocket-200">
            <div className="text-sm text-rocket-800">
              <div className="font-medium mb-1">Schedule Preview</div>
              <div>
                {state.frequency === 'daily' && 'Every day'}
                {state.frequency === 'weekly' && `Every ${DAYS_OF_WEEK.find(d => d.value === state.day_of_week)?.label || 'Monday'}`}
                {state.frequency === 'monthly' && `Monthly on day ${state.day_of_month}`}
                {state.frequency === 'quarterly' && `Quarterly on day ${state.day_of_month}`}
                {' at '}
                {formatTime(state.run_time)} {getTimezoneLabel(state.timezone)}
              </div>
              <div className="text-rocket-600 mt-1">
                Next delivery: {formatDate(nextRunDate)}
                {!isAIReport && dateRange && (
                  <span className="ml-2">
                    - Data: {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
                  </span>
                )}
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
