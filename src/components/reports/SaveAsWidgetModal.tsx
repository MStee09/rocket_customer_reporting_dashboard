import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  LayoutGrid,
  BarChart3,
  PieChart,
  TrendingUp,
  Hash,
  Table,
  Sparkles,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Plus,
  LucideIcon,
} from 'lucide-react';
import { getColumnById } from '../../config/reportColumns';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../hooks/useSupabase';
import { logger } from '../../utils/logger';
import { SimpleReportConfig } from '../../types/reports';
import {
  detectColumnCapabilities,
  getAvailableWidgetTypes,
} from '../../utils/columnCapabilities';
import {
  WidgetType,
  FieldInfo,
  WidgetConfig,
  formatWidgetType,
  generateLocalAiSuggestion,
} from './saveAsWidgetUtils';
import { ConfigurationStep } from './SaveAsWidgetConfigSteps';
import { PreviewStep } from './SaveAsWidgetPreview';
import { useSaveAsWidget } from './useSaveAsWidget';

interface SaveAsWidgetModalProps {
  report: SimpleReportConfig & { id: string };
  onClose: () => void;
  onSuccess: (widgetId: string) => void;
}

export default function SaveAsWidgetModal({ report, onClose, onSuccess }: SaveAsWidgetModalProps) {
  const supabase = useSupabase();
  const navigate = useNavigate();
  const { user, effectiveCustomerId, isAdmin } = useAuth();
  const customerId = effectiveCustomerId;

  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<WidgetConfig>({
    type: 'table',
    name: report.name,
    description: report.description || '',
    tableColumns: report.columns.slice(0, 5).map(c => c.id),
    limit: 10,
    dataMode: 'dynamic',
  });

  const [customerName, setCustomerName] = useState<string>('');

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<WidgetConfig | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setValidationError(null);
  }, [config]);

  useEffect(() => {
    const loadCustomerName = async () => {
      if (customerId) {
        const { data } = await supabase
          .from('customer')
          .select('company_name')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (data) {
          setCustomerName(data.company_name);
        }
      }
    };
    loadCustomerName();
  }, [customerId, supabase]);

  const columnCaps = detectColumnCapabilities(report.columns);
  const widgetTypeOptions = getAvailableWidgetTypes(report.columns);

  const availableFields: FieldInfo[] = report.columns.map(c => {
    const columnDef = getColumnById(c.id);
    return {
      field: c.id,
      label: c.label,
      type: columnDef?.type || 'string',
    };
  });

  const numericFields = columnCaps.aggregatableColumns.map(c => ({
    field: c.id,
    label: c.label,
    type: 'number',
  }));

  const categoryFields = columnCaps.groupableColumns.map(c => ({
    field: c.id,
    label: c.label,
    type: 'string',
  }));

  const dateFields = columnCaps.dateColumns.map(c => ({
    field: c.id,
    label: c.label,
    type: 'date',
  }));

  const widgetTypeIcons: Record<string, LucideIcon> = {
    table: Table,
    bar_chart: BarChart3,
    pie_chart: PieChart,
    line_chart: TrendingUp,
    kpi: Hash,
  };

  const widgetTypes = widgetTypeOptions.map(wt => ({
    type: wt.id as WidgetType,
    label: wt.label,
    icon: widgetTypeIcons[wt.id] || Table,
    description: wt.description,
    available: wt.available,
    reason: wt.reason,
  }));

  const handleTypeSelect = (type: WidgetType) => {
    const newConfig: WidgetConfig = {
      ...config,
      type,
    };

    switch (type) {
      case 'table':
        newConfig.tableColumns = report.columns.slice(0, 5).map(c => c.id);
        newConfig.limit = 10;
        break;
      case 'bar_chart':
      case 'pie_chart':
        newConfig.groupByField = categoryFields[0]?.field;
        newConfig.valueField = numericFields[0]?.field || 'count';
        newConfig.aggregation = numericFields.length > 0 ? 'sum' : 'count';
        break;
      case 'line_chart':
        newConfig.xAxisField = dateFields[0]?.field;
        newConfig.valueField = numericFields[0]?.field || 'count';
        newConfig.aggregation = numericFields.length > 0 ? 'sum' : 'count';
        break;
      case 'kpi':
        newConfig.kpiField = numericFields[0]?.field || 'count';
        newConfig.kpiAggregation = numericFields.length > 0 ? 'sum' : 'count';
        newConfig.kpiFormat = numericFields[0]?.label.toLowerCase().includes('cost') ||
                             numericFields[0]?.label.toLowerCase().includes('retail') ? 'currency' : 'number';
        break;
    }

    setConfig(newConfig);
  };

  const handleAiSuggest = async () => {
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiError(null);
    setAiSuggestion(null);

    try {
      const suggestion = generateLocalAiSuggestion(aiPrompt, {
        reportName: report.name,
        availableFields,
        numericFields,
        categoryFields,
        dateFields,
      });

      setAiSuggestion(suggestion);

    } catch (err) {
      setAiError('Failed to generate suggestion. Please try again or configure manually.');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestion = () => {
    if (aiSuggestion) {
      logger.log('Applying AI suggestion:', aiSuggestion);

      setConfig(prev => ({
        ...prev,
        type: aiSuggestion.type,
        name: aiSuggestion.name || prev.name,
        description: aiSuggestion.description || prev.description,
        tableColumns: aiSuggestion.tableColumns || prev.tableColumns,
        limit: aiSuggestion.limit || prev.limit,
        groupByField: aiSuggestion.groupByField || prev.groupByField,
        valueField: aiSuggestion.valueField || prev.valueField,
        aggregation: aiSuggestion.aggregation || prev.aggregation,
        xAxisField: aiSuggestion.xAxisField || prev.xAxisField,
        kpiField: aiSuggestion.kpiField || prev.kpiField,
        kpiAggregation: aiSuggestion.kpiAggregation || prev.kpiAggregation,
        kpiFormat: aiSuggestion.kpiFormat || prev.kpiFormat,
      }));

      setStep(2);
    }
  };

  const validateStep = (currentStep: number): { valid: boolean; error?: string } => {
    if (currentStep === 1) {
      if (!config.type) {
        return { valid: false, error: 'Please select a widget type' };
      }
    }

    if (currentStep === 2) {
      if (!config.name?.trim()) {
        return { valid: false, error: 'Widget name is required' };
      }

      if (config.type === 'bar_chart' || config.type === 'pie_chart') {
        if (!config.groupByField) {
          return { valid: false, error: 'Please select a "Group By" field for charts' };
        }
        if (!config.valueField) {
          return { valid: false, error: 'Please select a "Value" field' };
        }
      }

      if (config.type === 'line_chart') {
        if (!config.xAxisField) {
          return { valid: false, error: 'Please select an X-Axis (date) field' };
        }
        if (!config.valueField) {
          return { valid: false, error: 'Please select a "Value" field' };
        }
      }

      if (config.type === 'kpi') {
        if (!config.kpiField) {
          return { valid: false, error: 'Please select a value field for the KPI' };
        }
      }

      if (config.type === 'table') {
        if (!config.tableColumns || config.tableColumns.length === 0) {
          return { valid: false, error: 'Please select at least one column for the table' };
        }
      }
    }

    return { valid: true };
  };

  const {
    saving,
    error,
    createdWidgetId,
    showSuccessOptions,
    setShowSuccessOptions,
    saveWidget,
  } = useSaveAsWidget({
    config,
    report,
    customerId,
    customerName,
    user,
    isAdmin: isAdmin(),
    supabase,
    validateStep,
    setValidationError,
  });

  const handleContinue = () => {
    const validation = validateStep(step);

    if (!validation.valid) {
      setValidationError(validation.error || 'Please fill in required fields');
      return;
    }

    setValidationError(null);
    setStep(step + 1);
  };

  const handleAddToDashboard = (widgetId: string) => {
    navigate(`/dashboard?addWidget=${widgetId}`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">

        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rocket-500 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Save Report as Widget</h2>
              <p className="text-sm text-slate-500">Create a dashboard widget from "{report.name}"</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-3 border-b bg-slate-50 flex-shrink-0">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {[
              { num: 1, label: 'Widget Type' },
              { num: 2, label: 'Configure' },
              { num: 3, label: 'Preview & Save' },
            ].map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className={`flex items-center gap-2 ${step >= s.num ? 'text-rocket-600' : 'text-slate-400'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                    step > s.num ? 'bg-rocket-600 text-white' :
                    step === s.num ? 'bg-rocket-100 text-rocket-600 ring-2 ring-rocket-600' :
                    'bg-slate-200 text-slate-500'
                  }`}>
                    {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
                </div>
                {i < 2 && (
                  <div className={`w-12 h-0.5 mx-2 ${step > s.num ? 'bg-rocket-600' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">

          {step === 1 && (
            <div className="space-y-6">
              <div className="p-4 bg-rocket-50 border border-rocket-200 rounded-xl">
                <h3 className="font-medium text-rocket-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Suggestion (Optional)
                </h3>
                <p className="text-sm text-rocket-700 mb-3">
                  Describe what you want to see and AI will suggest the best widget type and configuration.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., Show me total retail by carrier as a pie chart"
                    className="flex-1 px-4 py-2 border border-rocket-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rocket-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAiSuggest()}
                  />
                  <button
                    onClick={handleAiSuggest}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Suggest
                  </button>
                </div>

                {aiError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    {aiError}
                  </div>
                )}

                {aiSuggestion && (
                  <div className="mt-3 p-4 bg-white border border-rocket-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900">AI Suggestion:</span>
                      <button
                        onClick={applyAiSuggestion}
                        className="px-3 py-1 bg-rocket-600 text-white text-sm rounded-lg hover:bg-rocket-700"
                      >
                        Apply & Continue
                      </button>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p><strong>Type:</strong> {formatWidgetType(aiSuggestion.type)}</p>
                      {aiSuggestion.groupByField && (
                        <p><strong>Group by:</strong> {availableFields.find(f => f.field === aiSuggestion.groupByField)?.label}</p>
                      )}
                      {aiSuggestion.valueField && aiSuggestion.valueField !== 'count' && (
                        <p><strong>Value:</strong> {aiSuggestion.aggregation?.toUpperCase()}({availableFields.find(f => f.field === aiSuggestion.valueField)?.label})</p>
                      )}
                      {aiSuggestion.kpiField && (
                        <p><strong>Show:</strong> {aiSuggestion.kpiAggregation?.toUpperCase()}({aiSuggestion.kpiField === 'count' ? 'records' : availableFields.find(f => f.field === aiSuggestion.kpiField)?.label})</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-medium text-slate-900 mb-3">Or choose widget type:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {widgetTypes.map(wt => (
                    <button
                      key={wt.type}
                      onClick={() => {
                        handleTypeSelect(wt.type);
                        setStep(2);
                      }}
                      disabled={!wt.available}
                      className={`p-4 rounded-xl border-2 text-left transition ${
                        !wt.available
                          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                          : config.type === wt.type
                            ? 'border-rocket-500 bg-rocket-50'
                            : 'border-slate-200 hover:border-rocket-300 hover:bg-slate-50'
                      }`}
                    >
                      <wt.icon className={`w-8 h-8 mb-2 ${
                        !wt.available ? 'text-slate-300' :
                        config.type === wt.type ? 'text-rocket-600' : 'text-slate-500'
                      }`} />
                      <div className="font-medium text-slate-900">{wt.label}</div>
                      <div className="text-xs text-slate-500 mt-1">{wt.description}</div>
                      {!wt.available && (
                        <div className="text-xs text-amber-600 mt-2">
                          {wt.reason || 'Missing required columns'}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <ConfigurationStep
              config={config}
              setConfig={setConfig}
              availableFields={availableFields}
              numericFields={numericFields}
              categoryFields={categoryFields}
              dateFields={dateFields}
            />
          )}

          {step === 3 && !showSuccessOptions && (
            <PreviewStep
              config={config}
              report={report}
              error={error}
            />
          )}

          {showSuccessOptions && createdWidgetId && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Widget Created Successfully!
              </h3>
              <p className="text-slate-600 mb-6">
                Your widget "{config.name}" is ready to use.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => handleAddToDashboard(createdWidgetId)}
                  className="px-6 py-3 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add to My Dashboard
                </button>
                <button
                  onClick={() => {
                    onSuccess(createdWidgetId);
                    navigate('/widget-library');
                  }}
                  className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2"
                >
                  <LayoutGrid className="w-5 h-5" />
                  View in Widget Library
                </button>
                <button
                  onClick={() => onSuccess(createdWidgetId)}
                  className="px-6 py-3 text-slate-500 hover:text-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {!showSuccessOptions && (
          <>
            {validationError && (
              <div className="mx-6 mb-0 p-3 bg-red-50 border-t border-red-200 flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{validationError}</span>
              </div>
            )}
            <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between rounded-b-2xl flex-shrink-0">
              <div>
                {step > 1 && (
                  <button
                    onClick={() => {
                      setValidationError(null);
                      setStep(step - 1);
                    }}
                    className="px-4 py-2 text-slate-600 hover:bg-white rounded-lg flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 hover:bg-white rounded-lg"
                >
                  Cancel
                </button>
                {step < 3 ? (
                  <button
                    onClick={handleContinue}
                    className="px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={saveWidget}
                    disabled={saving}
                    className="px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Create Widget
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
