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
  Eye,
  Loader2,
  RefreshCw,
  Plus,
  Camera,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../hooks/useSupabase';
import { saveCustomWidget } from '../../config/widgets/customWidgetStorage';
import { SimpleReportConfig } from '../../types/reports';
import { executeSimpleReport } from '../../utils/simpleQueryBuilder';
import { WidgetData } from '../../config/widgets/widgetTypes';
import { formatWidgetLabel } from '../../utils/dateUtils';
import { getColumnById } from '../../config/reportColumns';
import {
  detectColumnCapabilities,
  getAvailableWidgetTypes,
  ColumnCapabilities,
} from '../../utils/columnCapabilities';
import FilterSummary from './FilterSummary';

interface SaveAsWidgetModalProps {
  report: SimpleReportConfig & { id: string };
  onClose: () => void;
  onSuccess: (widgetId: string) => void;
}

type WidgetType = 'table' | 'bar_chart' | 'pie_chart' | 'line_chart' | 'kpi';

type DataMode = 'dynamic' | 'static';

interface WidgetConfig {
  type: WidgetType;
  name: string;
  description: string;
  tableColumns?: string[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  groupByField?: string;
  valueField?: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  xAxisField?: string;
  kpiField?: string;
  kpiAggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  kpiFormat?: 'number' | 'currency' | 'percent';
  dataMode: DataMode;
}

interface FieldInfo {
  field: string;
  label: string;
  type: string;
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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [createdWidgetId, setCreatedWidgetId] = useState<string | null>(null);
  const [showSuccessOptions, setShowSuccessOptions] = useState(false);

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

  const widgetTypeIcons: Record<string, any> = {
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
      console.log('Applying AI suggestion:', aiSuggestion);

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

  const handleContinue = () => {
    const validation = validateStep(step);

    if (!validation.valid) {
      setValidationError(validation.error || 'Please fill in required fields');
      return;
    }

    setValidationError(null);
    setStep(step + 1);
  };

  const handleSave = async () => {
    const validation = validateStep(2);
    if (!validation.valid) {
      setValidationError(validation.error || 'Please fill in required fields');
      return;
    }

    if (!customerId) {
      setError('No customer selected. Please select a customer to save the widget.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const reportPath = `customer/${customerId}/${report.id}.json`;

      const widgetDefinition: any = {
        id: widgetId,
        name: config.name,
        description: config.description,
        type: config.type,
        category: inferCategory(config),
        source: 'report',
        visibility: { type: 'private' as const },
        createdBy: {
          userId: user?.id || '',
          userEmail: user?.email || '',
          isAdmin: isAdmin(),
          customerId: customerId,
          customerName: customerName,
          timestamp: new Date().toISOString(),
        },
        sourceReport: {
          id: report.id,
          name: report.name,
          path: reportPath,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        dataSource: {
          type: 'query' as const,
          reportReference: {
            reportId: report.id,
            reportName: report.name,
          },
          reportColumns: report.columns.map(c => ({
            id: c.id,
            label: c.label,
          })),
          query: buildQueryConfig(config, report),
        },
        visualization: buildVisualizationConfig(config),
        display: {
          icon: getWidgetIcon(config.type),
          iconColor: getWidgetColor(config.type),
          defaultSize: getDefaultSize(config.type),
        },
        whatItShows: buildWhatItShows(config, report),
        dataMode: config.dataMode,
      };

      if (config.dataMode === 'static') {
        try {
          const rawData = await executeSimpleReport(report, String(customerId));
          const snapshotData = transformRawDataToWidgetData(rawData, config);
          widgetDefinition.snapshotData = snapshotData;
          widgetDefinition.snapshotDate = new Date().toISOString();
        } catch (err) {
          console.error('Failed to capture snapshot:', err);
          throw new Error('Failed to capture data snapshot for static widget');
        }
      }

      const result = await saveCustomWidget(supabase, widgetDefinition, customerId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save widget');
      }

      setCreatedWidgetId(widgetId);
      setShowSuccessOptions(true);

    } catch (err) {
      console.error('Save error:', err);
      setError(String(err));
    } finally {
      setSaving(false);
    }
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
                    onClick={handleSave}
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

function ConfigurationStep({ config, setConfig, availableFields, numericFields, categoryFields, dateFields }: any) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-medium text-slate-900">Widget Details</h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Widget Name *
          </label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rocket-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={config.description}
            onChange={(e) => setConfig({ ...config, description: e.target.value })}
            placeholder="Optional description"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rocket-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Data Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setConfig({ ...config, dataMode: 'dynamic' })}
              className={`p-4 rounded-xl border-2 text-left transition ${
                config.dataMode === 'dynamic'
                  ? 'border-rocket-500 bg-rocket-50'
                  : 'border-slate-200 hover:border-rocket-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className={`w-5 h-5 ${config.dataMode === 'dynamic' ? 'text-rocket-600' : 'text-slate-500'}`} />
                <span className="font-medium text-slate-900">Dynamic</span>
              </div>
              <p className="text-xs text-slate-500">Updates automatically with new data</p>
            </button>
            <button
              type="button"
              onClick={() => setConfig({ ...config, dataMode: 'static' })}
              className={`p-4 rounded-xl border-2 text-left transition ${
                config.dataMode === 'static'
                  ? 'border-rocket-500 bg-rocket-50'
                  : 'border-slate-200 hover:border-rocket-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Camera className={`w-5 h-5 ${config.dataMode === 'static' ? 'text-rocket-600' : 'text-slate-500'}`} />
                <span className="font-medium text-slate-900">Static</span>
              </div>
              <p className="text-xs text-slate-500">Snapshot frozen at creation time</p>
            </button>
          </div>
        </div>
      </div>

      {config.type === 'table' && (
        <TableConfig
          config={config}
          setConfig={setConfig}
          availableFields={availableFields}
        />
      )}

      {(config.type === 'bar_chart' || config.type === 'pie_chart') && (
        <ChartConfig
          config={config}
          setConfig={setConfig}
          categoryFields={categoryFields}
          numericFields={numericFields}
        />
      )}

      {config.type === 'line_chart' && (
        <LineChartConfig
          config={config}
          setConfig={setConfig}
          dateFields={dateFields}
          numericFields={numericFields}
        />
      )}

      {config.type === 'kpi' && (
        <KpiConfig
          config={config}
          setConfig={setConfig}
          numericFields={numericFields}
          availableFields={availableFields}
        />
      )}
    </div>
  );
}

function TableConfig({ config, setConfig, availableFields }: any) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-900">Table Configuration</h3>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Columns to Display
        </label>
        <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-auto space-y-2">
          {availableFields.map((field: FieldInfo) => (
            <label key={field.field} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.tableColumns?.includes(field.field)}
                onChange={(e) => {
                  const cols = config.tableColumns || [];
                  if (e.target.checked) {
                    setConfig({ ...config, tableColumns: [...cols, field.field] });
                  } else {
                    setConfig({ ...config, tableColumns: cols.filter((c: string) => c !== field.field) });
                  }
                }}
                className="rounded border-slate-300 text-rocket-600 focus:ring-rocket-500"
              />
              <span className="text-sm text-slate-700">{field.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Row Limit
          </label>
          <select
            value={config.limit || 10}
            onChange={(e) => setConfig({ ...config, limit: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          >
            <option value={5}>5 rows</option>
            <option value={10}>10 rows</option>
            <option value={20}>20 rows</option>
            <option value={50}>50 rows</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ChartConfig({ config, setConfig, categoryFields, numericFields }: any) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-900">
        {config.type === 'bar_chart' ? 'Bar Chart' : 'Pie Chart'} Configuration
      </h3>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <strong>Note:</strong> Charts require grouping your data. Choose a category to group by and a value to aggregate.
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Group By *
          </label>
          <select
            value={config.groupByField || ''}
            onChange={(e) => setConfig({ ...config, groupByField: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          >
            <option value="">Select field...</option>
            {categoryFields.map((f: FieldInfo) => (
              <option key={f.field} value={f.field}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Value Field *
          </label>
          <select
            value={config.valueField || ''}
            onChange={(e) => setConfig({ ...config, valueField: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          >
            <option value="count">Count of records</option>
            {numericFields.map((f: FieldInfo) => (
              <option key={f.field} value={f.field}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Aggregation
        </label>
        <select
          value={config.aggregation || 'sum'}
          onChange={(e) => setConfig({ ...config, aggregation: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          disabled={config.valueField === 'count'}
        >
          <option value="count">COUNT</option>
          <option value="sum">SUM</option>
          <option value="avg">AVERAGE</option>
          <option value="min">MIN</option>
          <option value="max">MAX</option>
        </select>
      </div>
    </div>
  );
}

function LineChartConfig({ config, setConfig, dateFields, numericFields }: any) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-900">Line Chart Configuration</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            X Axis (Date) *
          </label>
          <select
            value={config.xAxisField || ''}
            onChange={(e) => setConfig({ ...config, xAxisField: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          >
            <option value="">Select date field...</option>
            {dateFields.map((f: FieldInfo) => (
              <option key={f.field} value={f.field}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Value Field *
          </label>
          <select
            value={config.valueField || ''}
            onChange={(e) => setConfig({ ...config, valueField: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          >
            <option value="count">Count of records</option>
            {numericFields.map((f: FieldInfo) => (
              <option key={f.field} value={f.field}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Aggregation
        </label>
        <select
          value={config.aggregation || 'sum'}
          onChange={(e) => setConfig({ ...config, aggregation: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          disabled={config.valueField === 'count'}
        >
          <option value="count">COUNT</option>
          <option value="sum">SUM</option>
          <option value="avg">AVERAGE</option>
        </select>
      </div>
    </div>
  );
}

function KpiConfig({ config, setConfig, numericFields, availableFields }: any) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-900">KPI Configuration</h3>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Value Field *
          </label>
          <select
            value={config.kpiField || ''}
            onChange={(e) => setConfig({ ...config, kpiField: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          >
            <option value="count">Count of records</option>
            {numericFields.map((f: FieldInfo) => (
              <option key={f.field} value={f.field}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Aggregation
          </label>
          <select
            value={config.kpiAggregation || 'sum'}
            onChange={(e) => setConfig({ ...config, kpiAggregation: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            disabled={config.kpiField === 'count'}
          >
            <option value="count">COUNT</option>
            <option value="sum">SUM</option>
            <option value="avg">AVERAGE</option>
            <option value="min">MIN</option>
            <option value="max">MAX</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Format
          </label>
          <select
            value={config.kpiFormat || 'number'}
            onChange={(e) => setConfig({ ...config, kpiFormat: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          >
            <option value="number">Number</option>
            <option value="currency">Currency ($)</option>
            <option value="percent">Percentage (%)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function PreviewStep({ config, report, error }: any) {
  const whatItShows = buildWhatItShows(config, report);
  const activeFilters = report.filters?.filter((f: any) => f.enabled) || [];

  return (
    <div className="space-y-6">
      <div className="p-4 bg-rocket-50 border border-rocket-200 rounded-xl">
        <h3 className="font-medium text-rocket-900 mb-2 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          What This Widget Will Show
        </h3>
        <p className="text-sm text-rocket-800 mb-3">{whatItShows.summary}</p>

        {whatItShows.columns.length > 0 && (
          <div className="mb-3">
            <span className="text-xs font-semibold text-rocket-700 uppercase">Data Displayed</span>
            <ul className="mt-1 space-y-1">
              {whatItShows.columns.map((col: any, i: number) => (
                <li key={i} className="text-sm text-rocket-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-rocket-500 rounded-full" />
                  <strong>{col.name}</strong> — {col.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-rocket-700">
          {config.dataMode === 'static' ? (
            <>
              <Camera className="w-3 h-3" />
              Snapshot frozen at creation time
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />
              Updates automatically with new data
            </>
          )}
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Inherited Filters</h4>
          <FilterSummary filters={report.filters} />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
    </div>
  );
}

function formatWidgetType(type: WidgetType): string {
  switch (type) {
    case 'bar_chart': return 'Bar Chart';
    case 'pie_chart': return 'Pie Chart';
    case 'line_chart': return 'Line Chart';
    case 'kpi': return 'KPI';
    case 'table': return 'Table';
    default: return 'Widget';
  }
}

function generateLocalAiSuggestion(prompt: string, context: any): WidgetConfig {
  const lower = prompt.toLowerCase();

  let type: WidgetType = 'table';
  if (lower.includes('pie') || lower.includes('breakdown') || lower.includes('distribution')) {
    type = 'pie_chart';
  } else if (lower.includes('bar') || lower.includes('compare') || lower.includes('comparison')) {
    type = 'bar_chart';
  } else if (lower.includes('trend') || lower.includes('over time') || lower.includes('line')) {
    type = 'line_chart';
  } else if (lower.includes('total') || lower.includes('sum') || lower.includes('count') || lower.includes('average') || lower.includes('kpi')) {
    type = 'kpi';
  }

  let groupByField = '';
  const byPatterns = [
    { pattern: /by\s+mode/i, keywords: ['mode', 'transport'] },
    { pattern: /by\s+carrier/i, keywords: ['carrier', 'scac', 'carrier_name'] },
    { pattern: /by\s+state/i, keywords: ['state', 'origin_state', 'destination_state'] },
    { pattern: /by\s+origin\s+state/i, keywords: ['origin_state'] },
    { pattern: /by\s+destination\s+state/i, keywords: ['destination_state'] },
    { pattern: /by\s+origin\s+city/i, keywords: ['origin_city'] },
    { pattern: /by\s+destination\s+city/i, keywords: ['destination_city'] },
    { pattern: /by\s+origin/i, keywords: ['origin', 'origin_city', 'origin_state'] },
    { pattern: /by\s+destination/i, keywords: ['destination', 'destination_city', 'destination_state'] },
    { pattern: /by\s+status/i, keywords: ['status', 'status_code', 'status_description'] },
    { pattern: /by\s+customer/i, keywords: ['customer', 'customer_name'] },
    { pattern: /by\s+city/i, keywords: ['city', 'origin_city', 'destination_city'] },
  ];

  for (const { pattern, keywords } of byPatterns) {
    if (pattern.test(lower)) {
      for (const keyword of keywords) {
        const match = context.availableFields.find((f: FieldInfo) =>
          f.field.toLowerCase().includes(keyword) ||
          f.label.toLowerCase().includes(keyword)
        );
        if (match) {
          groupByField = match.field;
          break;
        }
      }
      if (groupByField) break;
    }
  }

  if (!groupByField && (type === 'pie_chart' || type === 'bar_chart')) {
    const categoryCol = context.categoryFields.find((f: FieldInfo) =>
      f.type === 'string' || f.type === 'category'
    );
    groupByField = categoryCol?.field || '';
  }

  let valueField = 'count';
  let aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' = 'count';

  if (lower.includes('retail') || lower.includes('revenue')) {
    const match = context.availableFields.find((f: FieldInfo) =>
      f.field.toLowerCase().includes('retail') ||
      f.field.toLowerCase().includes('revenue')
    );
    if (match) {
      valueField = match.field;
      aggregation = 'sum';
    }
  } else if (lower.includes('cost') || lower.includes('spend') || lower.includes('amount')) {
    const match = context.availableFields.find((f: FieldInfo) =>
      f.field.toLowerCase().includes('cost') ||
      f.field.toLowerCase().includes('spend') ||
      f.field.toLowerCase().includes('amount')
    );
    if (match) {
      valueField = match.field;
      aggregation = 'sum';
    }
  } else if (lower.includes('miles') || lower.includes('distance')) {
    const match = context.availableFields.find((f: FieldInfo) =>
      f.field.toLowerCase().includes('miles') ||
      f.field.toLowerCase().includes('distance')
    );
    if (match) {
      valueField = match.field;
      aggregation = lower.includes('average') || lower.includes('avg') ? 'avg' : 'sum';
    }
  } else if (lower.includes('count') || lower.includes('how many') || lower.includes('number of')) {
    valueField = 'count';
    aggregation = 'count';
  }

  const suggestion: WidgetConfig = {
    type,
    name: `${context.reportName} - ${formatWidgetType(type)}`,
    description: `Widget created from "${context.reportName}"`,
  };

  if (type === 'table') {
    suggestion.tableColumns = context.availableFields.slice(0, 5).map((f: FieldInfo) => f.field);
    suggestion.limit = 10;
  } else if (type === 'bar_chart' || type === 'pie_chart') {
    suggestion.groupByField = groupByField;
    suggestion.valueField = valueField;
    suggestion.aggregation = aggregation;
  } else if (type === 'line_chart') {
    const dateField = context.dateFields.find((f: FieldInfo) => f.type === 'date');
    suggestion.xAxisField = dateField?.field || '';
    suggestion.valueField = valueField;
    suggestion.aggregation = aggregation;
  } else if (type === 'kpi') {
    suggestion.kpiField = valueField;
    suggestion.kpiAggregation = aggregation;
    suggestion.kpiFormat = valueField.toLowerCase().includes('retail') || valueField.toLowerCase().includes('cost') ? 'currency' : 'number';
  }

  console.log('AI Suggestion generated:', suggestion);

  return suggestion;
}

function buildQueryConfig(config: WidgetConfig, report: any) {
  const query: any = {
    baseTable: 'shipment',
    columns: [],
    filters: [
      { field: 'customer_id', operator: 'eq', value: 'customerId', isDynamic: true },
    ],
    reportFilters: report.filters || [],
  };

  if (config.type === 'table') {
    query.columns = config.tableColumns?.map(f => ({ field: f })) || [];
    if (config.limit) {
      query.limit = config.limit;
    }
  } else if (config.type === 'bar_chart' || config.type === 'pie_chart') {
    query.columns = [
      { field: config.groupByField },
      { field: config.valueField === 'count' ? '*' : config.valueField, aggregate: config.aggregation || 'count' },
    ];
    query.groupBy = [config.groupByField];
  } else if (config.type === 'line_chart') {
    query.columns = [
      { field: config.xAxisField },
      { field: config.valueField === 'count' ? '*' : config.valueField, aggregate: config.aggregation || 'count' },
    ];
    query.groupBy = [config.xAxisField];
    query.orderBy = [{ field: config.xAxisField, direction: 'asc' }];
  } else if (config.type === 'kpi') {
    query.columns = [
      { field: config.kpiField === 'count' ? '*' : config.kpiField, aggregate: config.kpiAggregation || 'count' },
    ];
  }

  return query;
}

function buildVisualizationConfig(config: WidgetConfig) {
  return {
    type: config.type,
    ...(config.type === 'table' && {
      columns: config.tableColumns?.map(f => ({ field: f, label: f })),
    }),
    ...(config.groupByField && { categoryField: config.groupByField }),
    ...(config.valueField && { valueField: config.valueField }),
    ...(config.kpiFormat && { format: config.kpiFormat }),
  };
}

function buildWhatItShows(config: WidgetConfig, report: any) {
  const whatItShows: any = {
    summary: '',
    columns: [],
    filters: ['Your shipments only', 'Within selected date range'],
    updateBehavior: 'live',
  };

  switch (config.type) {
    case 'table':
      whatItShows.summary = `Shows a table of shipment data from your "${report.name}" report.`;
      whatItShows.columns = config.tableColumns?.map(f => {
        const col = getColumnById(f);
        return {
          name: col?.label || f,
          description: col?.description || `${col?.label || f} value`,
        };
      }) || [];
      if (config.limit) {
        whatItShows.limit = `${config.limit} rows`;
      }
      break;

    case 'bar_chart':
    case 'pie_chart':
      const groupField = getColumnById(config.groupByField || '');
      const valueField = config.valueField === 'count' ? null : getColumnById(config.valueField || '');
      whatItShows.summary = `Shows ${config.aggregation?.toUpperCase() || 'COUNT'} of ${valueField?.label || 'records'} grouped by ${groupField?.label || config.groupByField}.`;
      whatItShows.columns = [
        { name: groupField?.label || config.groupByField, description: 'Category grouping' },
        { name: `${config.aggregation?.toUpperCase()}(${valueField?.label || 'records'})`, description: 'Aggregated value' },
      ];
      break;

    case 'line_chart':
      const xField = getColumnById(config.xAxisField || '');
      const lineValueField = config.valueField === 'count' ? null : getColumnById(config.valueField || '');
      whatItShows.summary = `Shows ${config.aggregation?.toUpperCase() || 'COUNT'} of ${lineValueField?.label || 'records'} over time.`;
      whatItShows.columns = [
        { name: xField?.label || config.xAxisField, description: 'Time period' },
        { name: `${config.aggregation?.toUpperCase()}(${lineValueField?.label || 'records'})`, description: 'Aggregated value' },
      ];
      break;

    case 'kpi':
      const kpiField = config.kpiField === 'count' ? null : getColumnById(config.kpiField || '');
      whatItShows.summary = `Shows the ${config.kpiAggregation?.toUpperCase() || 'total'} of ${kpiField?.label || 'records'}.`;
      whatItShows.columns = [
        { name: `${config.kpiAggregation?.toUpperCase()}(${kpiField?.label || 'records'})`, description: 'Single aggregated value' },
      ];
      break;
  }

  if (report.filters && report.filters.length > 0) {
    const activeFilters = report.filters.filter((f: any) => f.enabled);
    if (activeFilters.length > 0) {
      whatItShows.filters.push(`${activeFilters.length} data filter${activeFilters.length !== 1 ? 's' : ''} applied`);
    }
  }

  return whatItShows;
}

function inferCategory(config: WidgetConfig): string {
  if (config.valueField?.toLowerCase().includes('cost') || config.kpiField?.toLowerCase().includes('cost')) {
    return 'financial';
  }
  if (config.groupByField?.toLowerCase().includes('carrier')) {
    return 'breakdown';
  }
  return 'volume';
}

function getWidgetIcon(type: WidgetType): string {
  const icons: Record<WidgetType, string> = {
    table: 'Table',
    bar_chart: 'BarChart3',
    pie_chart: 'PieChart',
    line_chart: 'TrendingUp',
    kpi: 'Hash',
  };
  return icons[type] || 'LayoutGrid';
}

function getWidgetColor(type: WidgetType): string {
  const colors: Record<WidgetType, string> = {
    table: 'bg-slate-500',
    bar_chart: 'bg-rocket-600',
    pie_chart: 'bg-amber-500',
    line_chart: 'bg-green-500',
    kpi: 'bg-emerald-500',
  };
  return colors[type] || 'bg-slate-500';
}

function getDefaultSize(type: WidgetType): string {
  const sizes: Record<WidgetType, string> = {
    table: 'wide',
    bar_chart: 'wide',
    pie_chart: 'medium',
    line_chart: 'wide',
    kpi: 'small',
  };
  return sizes[type] || 'medium';
}

function transformRawDataToWidgetData(rawData: any[], config: WidgetConfig): WidgetData {
  switch (config.type) {
    case 'table': {
      const columns = config.tableColumns || [];
      const tableData = rawData.slice(0, config.limit || 10).map(row => {
        const newRow: Record<string, unknown> = {};
        for (const col of columns) {
          newRow[col] = row[col];
        }
        return newRow;
      });
      return {
        type: 'table',
        data: tableData,
        columns: columns.map(f => ({ field: f, label: f })),
      };
    }

    case 'bar_chart':
    case 'pie_chart': {
      const groupField = config.groupByField || '';
      const valueField = config.valueField || '';
      const aggregation = config.aggregation || 'count';

      const grouped = new Map<string, number>();
      for (const row of rawData) {
        const key = String(row[groupField] ?? 'Unknown');
        const currentVal = grouped.get(key) || 0;

        if (aggregation === 'count') {
          grouped.set(key, currentVal + 1);
        } else if (aggregation === 'sum') {
          grouped.set(key, currentVal + (Number(row[valueField]) || 0));
        } else if (aggregation === 'avg') {
          const count = (grouped.get(`${key}_count`) || 0) + 1;
          const total = currentVal * (count - 1) + (Number(row[valueField]) || 0);
          grouped.set(key, total / count);
          grouped.set(`${key}_count`, count);
        }
      }

      const chartData = Array.from(grouped.entries())
        .filter(([k]) => !k.endsWith('_count'))
        .map(([name, value]) => ({ name: formatWidgetLabel(name), value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      return { type: 'chart', data: chartData };
    }

    case 'line_chart': {
      const xField = config.xAxisField || '';
      const valueField = config.valueField || '';
      const aggregation = config.aggregation || 'count';

      const grouped = new Map<string, { sum: number; count: number }>();
      for (const row of rawData) {
        const key = String(row[xField] ?? '');
        if (!key) continue;
        const current = grouped.get(key) || { sum: 0, count: 0 };
        current.count += 1;
        current.sum += Number(row[valueField]) || 0;
        grouped.set(key, current);
      }

      const chartData = Array.from(grouped.entries())
        .map(([name, { sum, count }]) => ({
          name: formatWidgetLabel(name),
          value: aggregation === 'count' ? count :
                 aggregation === 'avg' ? Math.round((sum / count) * 100) / 100 :
                 Math.round(sum * 100) / 100,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return { type: 'chart', data: chartData };
    }

    case 'kpi': {
      const kpiField = config.kpiField || '';
      const aggregation = config.kpiAggregation || 'count';

      let value = 0;
      if (aggregation === 'count') {
        value = rawData.length;
      } else if (aggregation === 'sum') {
        value = rawData.reduce((acc, row) => acc + (Number(row[kpiField]) || 0), 0);
      } else if (aggregation === 'avg') {
        const sum = rawData.reduce((acc, row) => acc + (Number(row[kpiField]) || 0), 0);
        value = rawData.length > 0 ? sum / rawData.length : 0;
      }

      return {
        type: 'kpi',
        value: Math.round(value * 100) / 100,
        label: config.name || 'Value',
        format: config.kpiFormat || 'number',
      };
    }

    default:
      return { type: 'chart', data: [] };
  }
}
