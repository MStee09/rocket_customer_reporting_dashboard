import { useState } from 'react';
import {
  X, Check, FileText, PlusCircle, DollarSign, TrendingUp,
  Truck, Route, Activity, AlertTriangle, Lock, Plus, Trash2,
  Users, Building2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CreateAdminReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  customers: Array<{ customer_id: number; customer_name: string }>;
}

const ADMIN_REPORT_TEMPLATES = [
  {
    id: 'weekly-revenue-summary',
    name: 'Weekly Customer Revenue Summary',
    description: 'Summary of revenue and shipment counts by customer for the past week',
    icon: 'dollar',
    tags: ['Revenue', 'Weekly', 'All Customers'],
    columns: ['customer_name', 'retail', 'cost', 'shipment_count'],
    groupBy: 'customer_name',
  },
  {
    id: 'monthly-spend-trends',
    name: 'Monthly Spend Trends',
    description: 'Month-over-month spend comparison across customers',
    icon: 'trending',
    tags: ['Spend', 'Monthly', 'Trends'],
    columns: ['customer_name', 'cost', 'retail', 'margin'],
    groupBy: 'customer_name',
  },
  {
    id: 'carrier-performance',
    name: 'Carrier Performance Report',
    description: 'Shipment counts and costs by carrier across all customers',
    icon: 'truck',
    tags: ['Carriers', 'Performance', 'Weekly'],
    columns: ['carrier_name', 'shipment_count', 'total_cost', 'avg_cost'],
    groupBy: 'carrier_name',
  },
  {
    id: 'top-lanes',
    name: 'Top Lanes Analysis',
    description: 'Most frequently used lanes with volume and cost data',
    icon: 'route',
    tags: ['Lanes', 'Volume', 'Costs'],
    columns: ['origin_city', 'origin_state', 'dest_city', 'dest_state', 'shipment_count', 'total_retail'],
    groupBy: 'lane',
  },
  {
    id: 'customer-activity',
    name: 'Customer Activity Summary',
    description: 'Shipment activity by customer with last ship date',
    icon: 'activity',
    tags: ['Activity', 'Customers', 'Summary'],
    columns: ['customer_name', 'shipment_count', 'last_ship_date', 'total_retail'],
    groupBy: 'customer_name',
  },
  {
    id: 'mode-breakdown',
    name: 'Mode Breakdown Report',
    description: 'Shipment volume and spend by transportation mode',
    icon: 'alert',
    tags: ['Modes', 'Volume', 'Analysis'],
    columns: ['mode_name', 'shipment_count', 'total_retail', 'total_cost', 'margin_percent'],
    groupBy: 'mode_name',
  },
];

function getTemplateIcon(icon: string) {
  switch (icon) {
    case 'dollar': return <DollarSign className="h-5 w-5 text-green-600" />;
    case 'trending': return <TrendingUp className="h-5 w-5 text-blue-600" />;
    case 'truck': return <Truck className="h-5 w-5 text-orange-600" />;
    case 'route': return <Route className="h-5 w-5 text-teal-600" />;
    case 'activity': return <Activity className="h-5 w-5 text-cyan-600" />;
    case 'alert': return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    default: return <FileText className="h-5 w-5 text-gray-600" />;
  }
}

export function CreateAdminReportModal({ isOpen, onClose, onCreated, customers }: CreateAdminReportModalProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    name: '',
    description: '',
    templateId: null as string | null,
    reportType: 'template' as 'template' | 'custom',
    scope: 'all' as 'all' | 'selected',
    selectedCustomerIds: [] as number[],
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    timeOfDay: '07:00',
    timezone: 'America/Chicago',
    recipients: [''],
    includeNotification: true,
    includeCsv: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedTemplate = ADMIN_REPORT_TEMPLATES.find(t => t.id === config.templateId);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const scheduleData = {
        name: config.name || selectedTemplate?.name || 'Admin Report',
        report_name: selectedTemplate?.name || config.name,
        report_type: 'custom_report',
        report_scope: 'admin',
        customer_id: customers[0]?.customer_id,
        target_customer_ids: config.scope === 'all' ? null : config.selectedCustomerIds,
        frequency: config.frequency,
        day_of_week: config.frequency === 'weekly' ? config.dayOfWeek : null,
        day_of_month: config.frequency === 'monthly' ? config.dayOfMonth : null,
        time_of_day: config.timeOfDay,
        timezone: config.timezone,
        recipients: config.recipients.filter(r => r.trim() !== ''),
        include_notification: config.includeNotification,
        include_csv: config.includeCsv,
        is_active: true,
        report_id: `admin-${Date.now()}`,
        created_by_user_id: userData.user?.id,
      };

      const { error } = await supabase
        .from('scheduled_reports')
        .insert(scheduleData);

      if (error) throw error;

      onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create admin report:', err);
      alert('Failed to create report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 1 && config.reportType === 'template' && !config.templateId) return false;
    if (step === 2 && config.scope === 'selected' && config.selectedCustomerIds.length === 0) return false;
    if (step === 4 && config.recipients.filter(r => r.trim()).length === 0) return false;
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Admin Report</h2>
            <p className="text-sm text-gray-500 mt-1">Internal reports for Go Rocket team</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            {['Template', 'Scope', 'Schedule', 'Recipients'].map((label, idx) => (
              <div key={label} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step > idx + 1 ? 'bg-green-500 text-white' :
                  step === idx + 1 ? 'bg-rocket-600 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {step > idx + 1 ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span className={`ml-2 text-sm ${step === idx + 1 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                  {label}
                </span>
                {idx < 3 && <div className="w-8 lg:w-16 h-0.5 mx-2 bg-gray-200" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          {step === 1 && (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setConfig(c => ({ ...c, reportType: 'template' }))}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    config.reportType === 'template' ? 'border-rocket-600 bg-rocket-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileText className="h-6 w-6 text-rocket-600 mb-2" />
                  <p className="font-medium">Start from Template</p>
                  <p className="text-sm text-gray-500">Choose from pre-built admin reports</p>
                </button>

                <button
                  onClick={() => setConfig(c => ({ ...c, reportType: 'custom', templateId: null }))}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    config.reportType === 'custom' ? 'border-rocket-600 bg-rocket-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <PlusCircle className="h-6 w-6 text-rocket-600 mb-2" />
                  <p className="font-medium">Build Custom Report</p>
                  <p className="text-sm text-gray-500">Create from scratch (coming soon)</p>
                </button>
              </div>

              {config.reportType === 'template' && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700">Available Templates</h4>
                  {ADMIN_REPORT_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setConfig(c => ({ ...c, templateId: template.id, name: template.name }))}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                        config.templateId === template.id ? 'border-rocket-600 bg-rocket-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          {getTemplateIcon(template.icon)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{template.name}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
                          <div className="flex gap-2 mt-2">
                            {template.tags.map(tag => (
                              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        {config.templateId === template.id && (
                          <Check className="h-5 w-5 text-rocket-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {config.reportType === 'custom' && (
                <div className="p-8 text-center bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Custom report builder coming in a future update.</p>
                  <p className="text-sm text-gray-400 mt-1">For now, please select a template.</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Select Customer Scope</h3>
              <p className="text-sm text-gray-500 mb-6">Choose which customers to include in this report.</p>

              <div className="space-y-4">
                <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  config.scope === 'all' ? 'border-rocket-600 bg-rocket-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    checked={config.scope === 'all'}
                    onChange={() => setConfig(c => ({ ...c, scope: 'all' }))}
                    className="h-4 w-4 text-rocket-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <p className="font-medium text-gray-900">All Customers</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">Include data from all {customers.length} active customers</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  config.scope === 'selected' ? 'border-rocket-600 bg-rocket-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    checked={config.scope === 'selected'}
                    onChange={() => setConfig(c => ({ ...c, scope: 'selected' }))}
                    className="h-4 w-4 text-rocket-600 mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <p className="font-medium text-gray-900">Selected Customers</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">Choose specific customers to include</p>

                    {config.scope === 'selected' && (
                      <div className="mt-4 max-h-48 overflow-y-auto border rounded-lg bg-white">
                        {customers.map(customer => (
                          <label
                            key={customer.customer_id}
                            className="flex items-center gap-2 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={config.selectedCustomerIds.includes(customer.customer_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setConfig(c => ({
                                    ...c,
                                    selectedCustomerIds: [...c.selectedCustomerIds, customer.customer_id]
                                  }));
                                } else {
                                  setConfig(c => ({
                                    ...c,
                                    selectedCustomerIds: c.selectedCustomerIds.filter(id => id !== customer.customer_id)
                                  }));
                                }
                              }}
                              className="h-4 w-4 text-rocket-600 rounded"
                            />
                            <span className="text-sm text-gray-700">{customer.customer_name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {config.scope === 'selected' && config.selectedCustomerIds.length > 0 && (
                <p className="text-sm text-rocket-600 mt-4">
                  {config.selectedCustomerIds.length} customer{config.selectedCustomerIds.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Set Schedule</h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                  <div className="flex gap-3">
                    {(['daily', 'weekly', 'monthly'] as const).map(freq => (
                      <button
                        key={freq}
                        onClick={() => setConfig(c => ({ ...c, frequency: freq }))}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          config.frequency === freq
                            ? 'border-rocket-600 bg-rocket-50 text-rocket-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {config.frequency === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
                    <select
                      value={config.dayOfWeek}
                      onChange={(e) => setConfig(c => ({ ...c, dayOfWeek: parseInt(e.target.value) }))}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value={0}>Sunday</option>
                      <option value={1}>Monday</option>
                      <option value={2}>Tuesday</option>
                      <option value={3}>Wednesday</option>
                      <option value={4}>Thursday</option>
                      <option value={5}>Friday</option>
                      <option value={6}>Saturday</option>
                    </select>
                  </div>
                )}

                {config.frequency === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Day of Month</label>
                    <select
                      value={config.dayOfMonth}
                      onChange={(e) => setConfig(c => ({ ...c, dayOfMonth: parseInt(e.target.value) }))}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      {[...Array(28)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time of Day</label>
                  <input
                    type="time"
                    value={config.timeOfDay}
                    onChange={(e) => setConfig(c => ({ ...c, timeOfDay: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Central Time (America/Chicago)</p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.includeCsv}
                      onChange={(e) => setConfig(c => ({ ...c, includeCsv: e.target.checked }))}
                      className="h-4 w-4 text-rocket-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Include CSV attachment</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.includeNotification}
                      onChange={(e) => setConfig(c => ({ ...c, includeNotification: e.target.checked }))}
                      className="h-4 w-4 text-rocket-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Send in-app notification</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Internal Recipients</h3>
              <p className="text-sm text-gray-500 mb-6">
                Add Go Rocket team members who should receive this report. These are internal emails only.
              </p>

              <div className="space-y-3">
                {config.recipients.map((email, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        const newRecipients = [...config.recipients];
                        newRecipients[idx] = e.target.value;
                        setConfig(c => ({ ...c, recipients: newRecipients }));
                      }}
                      placeholder="team@gorocketshipping.com"
                      className="flex-1 border rounded-lg px-3 py-2"
                    />
                    {config.recipients.length > 1 && (
                      <button
                        onClick={() => {
                          setConfig(c => ({
                            ...c,
                            recipients: c.recipients.filter((_, i) => i !== idx)
                          }));
                        }}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={() => setConfig(c => ({ ...c, recipients: [...c.recipients, ''] }))}
                  className="text-rocket-600 hover:text-rocket-800 text-sm flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Add another recipient
                </button>
              </div>

              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Report Summary</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Report:</dt>
                    <dd className="font-medium text-gray-900">{config.name || selectedTemplate?.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Scope:</dt>
                    <dd className="font-medium text-gray-900">
                      {config.scope === 'all' ? 'All Customers' : `${config.selectedCustomerIds.length} customers`}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Schedule:</dt>
                    <dd className="font-medium text-gray-900">
                      {config.frequency === 'daily' && `Daily at ${config.timeOfDay}`}
                      {config.frequency === 'weekly' && `Weekly on ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][config.dayOfWeek]} at ${config.timeOfDay}`}
                      {config.frequency === 'monthly' && `Monthly on day ${config.dayOfMonth} at ${config.timeOfDay}`}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Recipients:</dt>
                    <dd className="font-medium text-gray-900">{config.recipients.filter(r => r).length} email(s)</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <button
            onClick={() => step < 4 ? setStep(step + 1) : handleCreate()}
            disabled={!canProceed() || isSubmitting}
            className="px-6 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : step === 4 ? (
              <>
                <Lock className="h-4 w-4" />
                Create Admin Report
              </>
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
