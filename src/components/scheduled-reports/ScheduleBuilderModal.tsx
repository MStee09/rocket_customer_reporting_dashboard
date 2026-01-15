import { useState, useMemo } from 'react';
import {
  X, Calendar, Clock, Mail, Bell, FileText,
  ChevronRight, ChevronLeft, Check, AlertCircle,
  Plus, Trash2, Info
} from 'lucide-react';
import {
  ScheduleBuilderState,
  ScheduledReport,
  calculateNextRun,
  calculateDateRange
} from '../../types/scheduledReports';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

interface ScheduleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: ScheduledReport) => void;
  report?: {
    id: string;
    name: string;
    type: 'ai_report' | 'custom_report';
    simpleReport?: any;
  };
  existingSchedule?: ScheduledReport;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'UTC', label: 'UTC' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'weekly', label: 'Weekly', description: 'Once per week' },
  { value: 'monthly', label: 'Monthly', description: 'Once per month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Once per quarter' },
];

const DATE_RANGES = [
  { value: 'rolling', label: 'Rolling Window', description: 'Last N days/weeks/months' },
  { value: 'previous_week', label: 'Previous Week', description: 'Mon-Sun of last week' },
  { value: 'previous_month', label: 'Previous Month', description: 'Full previous calendar month' },
  { value: 'previous_quarter', label: 'Previous Quarter', description: 'Full previous quarter' },
  { value: 'mtd', label: 'Month to Date', description: 'From 1st of month to yesterday' },
  { value: 'ytd', label: 'Year to Date', description: 'From Jan 1 to yesterday' },
  { value: 'report_default', label: 'Report Default', description: 'Use the date range defined in the report' },
];

export function ScheduleBuilderModal({
  isOpen,
  onClose,
  onSave,
  report,
  existingSchedule
}: ScheduleBuilderModalProps) {
  const { user, effectiveCustomerId } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAIReport = (report?.type || existingSchedule?.report_type) === 'ai_report';

  const STEPS = useMemo(() =>
    isAIReport
      ? [
          { id: 'timing', label: 'Schedule' },
          { id: 'delivery', label: 'Delivery' },
          { id: 'review', label: 'Review' },
        ]
      : [
          { id: 'timing', label: 'Schedule' },
          { id: 'daterange', label: 'Date Range' },
          { id: 'delivery', label: 'Delivery' },
          { id: 'review', label: 'Review' },
        ],
    [isAIReport]
  );

  const [state, setState] = useState<ScheduleBuilderState>({
    report_type: report?.type || existingSchedule?.report_type || 'ai_report',
    report_id: report?.id || existingSchedule?.report_id || '',
    report_name: report?.name || existingSchedule?.report_name || '',

    name: existingSchedule?.name || `${report?.name || 'Report'} - Weekly`,
    description: existingSchedule?.description || '',

    frequency: existingSchedule?.frequency || 'weekly',
    timezone: existingSchedule?.timezone || 'America/Chicago',
    day_of_week: existingSchedule?.day_of_week ?? 1,
    day_of_month: existingSchedule?.day_of_month ?? 1,
    run_time: existingSchedule?.run_time || '07:00',

    date_range_type: existingSchedule?.date_range_type || (isAIReport ? 'report_default' : 'previous_week'),
    rolling_value: existingSchedule?.rolling_value ?? 7,
    rolling_unit: existingSchedule?.rolling_unit || 'days',

    delivery_email: existingSchedule?.delivery_email ?? true,
    delivery_notification: existingSchedule?.delivery_notification ?? true,
    email_recipients: existingSchedule?.email_recipients || [user?.email || ''],
    email_subject: existingSchedule?.email_subject || '{{schedule_name}} - {{date_range}}',
    email_body: existingSchedule?.email_body || '',
    format_pdf: existingSchedule?.format_pdf ?? true,
    format_csv: existingSchedule?.format_csv ?? false,
  });

  const nextRunDate = useMemo(() => calculateNextRun(state), [state]);
  const dateRange = useMemo(() => calculateDateRange(state, nextRunDate), [state, nextRunDate]);

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const formatDateTime = (date: Date) => date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const updateState = (updates: Partial<ScheduleBuilderState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const addRecipient = () => {
    updateState({ email_recipients: [...state.email_recipients, ''] });
  };

  const removeRecipient = (index: number) => {
    updateState({
      email_recipients: state.email_recipients.filter((_, i) => i !== index)
    });
  };

  const updateRecipient = (index: number, value: string) => {
    const newRecipients = [...state.email_recipients];
    newRecipients[index] = value;
    updateState({ email_recipients: newRecipients });
  };

  const validateStep = (step: number): boolean => {
    const stepId = STEPS[step]?.id;

    switch (stepId) {
      case 'timing':
        return state.name.trim().length > 0;
      case 'daterange':
        if (state.date_range_type === 'rolling') {
          return state.rolling_value > 0;
        }
        return true;
      case 'delivery':
        if (state.delivery_email) {
          return state.email_recipients.some(r => r.includes('@'));
        }
        return state.delivery_notification;
      case 'review':
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSave = async () => {
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
          logger.error('Failed to save custom report to storage:', uploadError);
          throw new Error('Failed to save report for scheduling. Please try again.');
        }

        logger.log('Custom report saved to storage:', storagePath);
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

        delivery_email: state.delivery_email,
        delivery_notification: state.delivery_notification,
        email_recipients: state.email_recipients.filter(r => r.includes('@')),
        email_subject: state.email_subject,
        email_body: state.email_body || null,
        format_pdf: state.format_pdf,
        format_csv: state.format_csv,

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
      logger.error('Failed to save schedule:', err);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
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

        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    index < currentStep
                      ? 'bg-green-600 text-white'
                      : index === currentStep
                      ? 'bg-rocket-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span className={`ml-2 text-sm ${index === currentStep ? 'font-medium' : 'text-gray-500'}`}>
                  {step.label}
                </span>
                {index < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 mx-3 ${index < currentStep ? 'bg-green-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {STEPS[currentStep]?.id === 'timing' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Name *
                </label>
                <input
                  type="text"
                  value={state.name}
                  onChange={(e) => updateState({ name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                  placeholder="e.g., Weekly Lane Performance"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={state.description}
                  onChange={(e) => updateState({ description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                  rows={2}
                  placeholder="What is this schedule for?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {FREQUENCIES.map(freq => (
                    <button
                      key={freq.value}
                      onClick={() => updateState({ frequency: freq.value as ScheduleBuilderState['frequency'] })}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        state.frequency === freq.value
                          ? 'border-rocket-500 bg-rocket-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium">{freq.label}</div>
                      <div className="text-sm text-gray-500">{freq.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {state.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day of Week
                  </label>
                  <select
                    value={state.day_of_week}
                    onChange={(e) => updateState({ day_of_week: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                  >
                    {DAYS_OF_WEEK.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {['monthly', 'quarterly'].includes(state.frequency) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day of Month
                  </label>
                  <select
                    value={state.day_of_month}
                    onChange={(e) => updateState({ day_of_month: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Using 1-28 to avoid month-end issues
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={state.run_time}
                    onChange={(e) => updateState({ run_time: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={state.timezone}
                    onChange={(e) => updateState({ timezone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-rocket-50 border border-rocket-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-rocket-700">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">Next Run</span>
                </div>
                <p className="text-rocket-900 mt-1">{formatDateTime(nextRunDate)}</p>
              </div>

              {isAIReport && (
                <div className="bg-rocket-50 border border-rocket-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-rocket-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-rocket-700">
                      This report will use its built-in date range. To change the date range, edit the report in AI Report Studio.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {STEPS[currentStep]?.id === 'daterange' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range Type
                </label>
                <div className="space-y-2">
                  {DATE_RANGES.map(range => (
                    <button
                      key={range.value}
                      onClick={() => updateState({ date_range_type: range.value as ScheduleBuilderState['date_range_type'] })}
                      className={`w-full p-3 border rounded-lg text-left transition-colors ${
                        state.date_range_type === range.value
                          ? 'border-rocket-500 bg-rocket-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium">{range.label}</div>
                      <div className="text-sm text-gray-500">{range.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {state.date_range_type === 'rolling' && (
                <div className="bg-gray-50 border rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rolling Window
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600">Last</span>
                    <input
                      type="number"
                      value={state.rolling_value}
                      onChange={(e) => updateState({ rolling_value: Number(e.target.value) })}
                      className="w-20 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                      min={1}
                      max={365}
                    />
                    <select
                      value={state.rolling_unit}
                      onChange={(e) => updateState({ rolling_unit: e.target.value as ScheduleBuilderState['rolling_unit'] })}
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                    >
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <Info className="w-5 h-5" />
                  <span className="font-medium">Preview for Next Run</span>
                </div>
                <p className="text-green-900 mt-1">
                  {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  This range will be recalculated each time the report runs.
                </p>
              </div>
            </div>
          )}

          {STEPS[currentStep]?.id === 'delivery' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Methods
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={state.delivery_email}
                      onChange={(e) => updateState({ delivery_email: e.target.checked })}
                      className="w-5 h-5 text-rocket-600 rounded"
                    />
                    <Mail className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium">Email</div>
                      <div className="text-sm text-gray-500">Send as attachment</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={state.delivery_notification}
                      onChange={(e) => updateState({ delivery_notification: e.target.checked })}
                      className="w-5 h-5 text-rocket-600 rounded"
                    />
                    <Bell className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium">In-App Notification</div>
                      <div className="text-sm text-gray-500">See it in the dashboard</div>
                    </div>
                  </label>
                </div>
              </div>

              {state.delivery_email && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      File Format
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={state.format_pdf}
                          onChange={(e) => updateState({ format_pdf: e.target.checked })}
                          className="w-4 h-4 text-rocket-600 rounded"
                        />
                        <FileText className="w-4 h-4 text-red-500" />
                        <span>PDF</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={state.format_csv}
                          onChange={(e) => updateState({ format_csv: e.target.checked })}
                          className="w-4 h-4 text-rocket-600 rounded"
                        />
                        <FileText className="w-4 h-4 text-green-500" />
                        <span>CSV</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipients
                    </label>
                    <div className="space-y-2">
                      {state.email_recipients.map((recipient, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="email"
                            value={recipient}
                            onChange={(e) => updateRecipient(index, e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                            placeholder="email@example.com"
                          />
                          {state.email_recipients.length > 1 && (
                            <button
                              onClick={() => removeRecipient(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={addRecipient}
                        className="flex items-center gap-2 text-rocket-600 hover:text-rocket-700 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add recipient
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={state.email_subject}
                      onChange={(e) => updateState({ email_subject: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Variables: {'{{schedule_name}}'}, {'{{report_name}}'}, {'{{date_range}}'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Body (optional)
                    </label>
                    <textarea
                      value={state.email_body}
                      onChange={(e) => updateState({ email_body: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                      rows={3}
                      placeholder="Custom message to include in the email..."
                    />
                  </div>
                </>
              )}

              {!state.delivery_email && !state.delivery_notification && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <AlertCircle className="w-5 h-5" />
                    <span>Please select at least one delivery method</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {STEPS[currentStep]?.id === 'review' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">{state.name}</h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Report:</span>
                    <p className="font-medium">{state.report_name}</p>
                  </div>

                  <div>
                    <span className="text-gray-500">Frequency:</span>
                    <p className="font-medium capitalize">
                      {state.frequency}
                      {state.frequency === 'weekly' && ` on ${DAYS_OF_WEEK.find(d => d.value === state.day_of_week)?.label}`}
                      {['monthly', 'quarterly'].includes(state.frequency) && ` on day ${state.day_of_month}`}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500">Time:</span>
                    <p className="font-medium">
                      {state.run_time} {TIMEZONES.find(t => t.value === state.timezone)?.label}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500">Date Range:</span>
                    <p className="font-medium">
                      {isAIReport
                        ? 'Uses report settings'
                        : `${DATE_RANGES.find(r => r.value === state.date_range_type)?.label}${
                            state.date_range_type === 'rolling' ? ` (${state.rolling_value} ${state.rolling_unit})` : ''
                          }`}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500">Delivery:</span>
                    <p className="font-medium">
                      {[
                        state.delivery_email && 'Email',
                        state.delivery_notification && 'Notification'
                      ].filter(Boolean).join(', ') || 'None'}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500">Format:</span>
                    <p className="font-medium">
                      {[
                        state.format_pdf && 'PDF',
                        state.format_csv && 'CSV'
                      ].filter(Boolean).join(', ') || 'None'}
                    </p>
                  </div>
                </div>

                {state.delivery_email && state.email_recipients.length > 0 && (
                  <div>
                    <span className="text-gray-500 text-sm">Recipients:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {state.email_recipients.filter(r => r).map((r, i) => (
                        <span key={i} className="px-2 py-1 bg-rocket-100 text-rocket-700 rounded text-sm">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-rocket-50 border border-rocket-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-rocket-700 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">First Run</span>
                </div>
                <p className="text-rocket-900">{formatDateTime(nextRunDate)}</p>
                {!isAIReport && (
                  <p className="text-sm text-rocket-700 mt-1">
                    Data range: {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
                  </p>
                )}
                {isAIReport && (
                  <p className="text-sm text-rocket-700 mt-1">
                    Will use report's built-in date range
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!validateStep(currentStep)}
                className="flex items-center gap-2 px-6 py-2 bg-rocket-600 hover:bg-rocket-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {existingSchedule ? 'Save Changes' : 'Create Schedule'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
