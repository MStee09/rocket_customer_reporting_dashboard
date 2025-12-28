import { useState, useMemo } from 'react';
import {
  X,
  Save,
  Loader2,
  AlertCircle,
  Lock,
  Globe,
  Shield,
  BarChart3,
  PieChart,
  TrendingUp,
  Hash,
  Table,
  Activity,
  DollarSign,
  Truck,
  Package,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSupabase } from '../../hooks/useSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { saveCustomWidget } from '../../config/widgets/customWidgetStorage';
import { REPORT_COLUMNS, getGroupableColumns, getAggregatableColumns, getColumnById } from '../../config/reportColumns';

interface EditWidgetModalProps {
  widget: any;
  onClose: () => void;
  onSuccess: (updatedWidget: any) => void;
}

const ICON_OPTIONS = [
  { name: 'BarChart3', icon: BarChart3 },
  { name: 'PieChart', icon: PieChart },
  { name: 'TrendingUp', icon: TrendingUp },
  { name: 'Hash', icon: Hash },
  { name: 'Table', icon: Table },
  { name: 'Activity', icon: Activity },
  { name: 'DollarSign', icon: DollarSign },
  { name: 'Truck', icon: Truck },
  { name: 'Package', icon: Package },
  { name: 'MapPin', icon: MapPin },
  { name: 'Calendar', icon: Calendar },
  { name: 'Clock', icon: Clock },
];

const COLOR_OPTIONS = [
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Emerald', value: 'bg-emerald-500' },
  { name: 'Amber', value: 'bg-amber-500' },
  { name: 'Rose', value: 'bg-rose-500' },
  { name: 'Slate', value: 'bg-slate-500' },
  { name: 'Cyan', value: 'bg-cyan-500' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Teal', value: 'bg-teal-500' },
];

const SIZE_OPTIONS = [
  { label: 'Small (1 column)', value: 'small' },
  { label: 'Medium (2 columns)', value: 'medium' },
  { label: 'Wide (2 columns)', value: 'wide' },
  { label: 'Full (3 columns)', value: 'full' },
];

export default function EditWidgetModal({ widget, onClose, onSuccess }: EditWidgetModalProps) {
  const supabase = useSupabase();
  const { effectiveCustomerId, isAdmin } = useAuth();

  const [step, setStep] = useState(1);
  const [name, setName] = useState(widget.name || '');
  const [description, setDescription] = useState(widget.description || '');
  const [selectedIcon, setSelectedIcon] = useState(widget.display?.icon || widget.icon || 'BarChart3');
  const [selectedColor, setSelectedColor] = useState(widget.display?.iconColor || widget.iconColor || 'bg-blue-500');
  const [selectedSize, setSelectedSize] = useState(widget.display?.defaultSize || widget.defaultSize || 'medium');
  const [visibility, setVisibility] = useState<'private' | 'all_customers' | 'admin_only'>(
    widget.visibility?.type || 'private'
  );

  const widgetType = widget.type || 'table';
  const query = widget.dataSource?.query || {};
  const visualization = widget.visualization || {};

  const extractGroupBy = () => {
    if (query.groupBy && query.groupBy.length > 0) return query.groupBy[0];
    if (visualization.categoryField) return visualization.categoryField;
    return '';
  };

  const extractValueField = () => {
    if (visualization.valueField) return visualization.valueField;
    const aggCol = query.columns?.find((c: any) => c.aggregate);
    if (aggCol) return aggCol.field === '*' ? 'count' : aggCol.field;
    return 'count';
  };

  const extractAggregation = () => {
    const aggCol = query.columns?.find((c: any) => c.aggregate);
    return aggCol?.aggregate || 'count';
  };

  const extractXAxisField = () => {
    if (query.orderBy && query.orderBy.length > 0) return query.orderBy[0].field;
    if (query.groupBy && query.groupBy.length > 0) return query.groupBy[0];
    return '';
  };

  const extractTableColumns = () => {
    if (visualization.columns) return visualization.columns.map((c: any) => c.field || c.key);
    if (query.columns) return query.columns.filter((c: any) => !c.aggregate).map((c: any) => c.field);
    return [];
  };

  const [groupByField, setGroupByField] = useState(extractGroupBy());
  const [valueField, setValueField] = useState(extractValueField());
  const [aggregation, setAggregation] = useState(extractAggregation());
  const [xAxisField, setXAxisField] = useState(extractXAxisField());
  const [tableColumns, setTableColumns] = useState<string[]>(extractTableColumns());
  const [rowLimit, setRowLimit] = useState(query.limit || 10);
  const [kpiFormat, setKpiFormat] = useState(visualization.format || 'number');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportColumns = widget.dataSource?.reportColumns || [];
  const hasReportColumns = reportColumns.length > 0;

  const groupableColumns = useMemo(() => {
    if (hasReportColumns) {
      const reportColumnIds = new Set(reportColumns.map((c: any) => c.id));
      return getGroupableColumns(isAdmin()).filter(c => reportColumnIds.has(c.id));
    }
    return getGroupableColumns(isAdmin());
  }, [isAdmin, hasReportColumns, reportColumns]);

  const aggregatableColumns = useMemo(() => {
    if (hasReportColumns) {
      const reportColumnIds = new Set(reportColumns.map((c: any) => c.id));
      return getAggregatableColumns(isAdmin()).filter(c => reportColumnIds.has(c.id));
    }
    return getAggregatableColumns(isAdmin());
  }, [isAdmin, hasReportColumns, reportColumns]);

  const dateColumns = useMemo(() => {
    if (hasReportColumns) {
      const reportColumnIds = new Set(reportColumns.map((c: any) => c.id));
      return REPORT_COLUMNS.filter(c => c.type === 'date' && reportColumnIds.has(c.id));
    }
    return REPORT_COLUMNS.filter(c => c.type === 'date');
  }, [hasReportColumns, reportColumns]);

  const allColumns = useMemo(() => {
    if (hasReportColumns) {
      const reportColumnIds = new Set(reportColumns.map((c: any) => c.id));
      return REPORT_COLUMNS.filter(c => (!c.adminOnly || isAdmin()) && reportColumnIds.has(c.id));
    }
    return REPORT_COLUMNS.filter(c => !c.adminOnly || isAdmin());
  }, [isAdmin, hasReportColumns, reportColumns]);

  const buildUpdatedQuery = () => {
    const baseQuery = { ...query };

    if (widgetType === 'bar_chart' || widgetType === 'pie_chart') {
      baseQuery.columns = [
        { field: groupByField },
        { field: valueField === 'count' ? '*' : valueField, aggregate: aggregation },
      ];
      baseQuery.groupBy = [groupByField];
    } else if (widgetType === 'line_chart') {
      baseQuery.columns = [
        { field: xAxisField },
        { field: valueField === 'count' ? '*' : valueField, aggregate: aggregation },
      ];
      baseQuery.groupBy = [xAxisField];
      baseQuery.orderBy = [{ field: xAxisField, direction: 'asc' }];
    } else if (widgetType === 'kpi') {
      baseQuery.columns = [
        { field: valueField === 'count' ? '*' : valueField, aggregate: aggregation },
      ];
    } else if (widgetType === 'table') {
      baseQuery.columns = tableColumns.map(f => ({ field: f }));
      baseQuery.limit = rowLimit;
    }

    return baseQuery;
  };

  const buildUpdatedVisualization = () => {
    const baseViz = { ...visualization, type: widgetType };

    if (widgetType === 'bar_chart' || widgetType === 'pie_chart') {
      baseViz.categoryField = groupByField;
      baseViz.valueField = valueField;
    } else if (widgetType === 'line_chart') {
      baseViz.xAxis = xAxisField;
      baseViz.valueField = valueField;
    } else if (widgetType === 'kpi') {
      baseViz.valueField = valueField;
      baseViz.format = kpiFormat;
    } else if (widgetType === 'table') {
      baseViz.columns = tableColumns.map(f => {
        const col = getColumnById(f);
        return { field: f, key: f, label: col?.label || f };
      });
    }

    return baseViz;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Widget name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updatedWidget = {
        ...widget,
        name: name.trim(),
        description: description.trim(),
        dataSource: {
          ...widget.dataSource,
          query: buildUpdatedQuery(),
        },
        visualization: buildUpdatedVisualization(),
        display: {
          ...widget.display,
          icon: selectedIcon,
          iconColor: selectedColor,
          defaultSize: selectedSize,
        },
        icon: selectedIcon,
        iconColor: selectedColor,
        defaultSize: selectedSize,
        visibility: { type: visibility },
        updatedAt: new Date().toISOString(),
        version: (widget.version || 1) + 1,
      };

      const customerId = widget.createdBy?.customerId || effectiveCustomerId;
      const result = await saveCustomWidget(supabase, updatedWidget, customerId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save widget');
      }

      onSuccess(updatedWidget);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save widget');
    } finally {
      setSaving(false);
    }
  };

  const SelectedIconComponent = ICON_OPTIONS.find(i => i.name === selectedIcon)?.icon || BarChart3;

  const getWidgetTypeLabel = () => {
    switch (widgetType) {
      case 'bar_chart': return 'Bar Chart';
      case 'pie_chart': return 'Pie Chart';
      case 'line_chart': return 'Line Chart';
      case 'kpi': return 'KPI';
      case 'table': return 'Table';
      default: return 'Widget';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${selectedColor} flex items-center justify-center`}>
              <SelectedIconComponent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Edit Widget</h2>
              <p className="text-sm text-slate-500">{getWidgetTypeLabel()} Configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-3 border-b bg-slate-50 flex-shrink-0">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {[
              { num: 1, label: 'Details' },
              { num: 2, label: 'Data Config' },
              { num: 3, label: 'Appearance' },
            ].map((s, i) => (
              <div key={s.num} className="flex items-center">
                <button
                  onClick={() => setStep(s.num)}
                  className={`flex items-center gap-2 ${step >= s.num ? 'text-blue-600' : 'text-slate-400'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                    step > s.num ? 'bg-blue-600 text-white' :
                    step === s.num ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-600' :
                    'bg-slate-200 text-slate-500'
                  }`}>
                    {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
                </button>
                {i < 2 && (
                  <div className={`w-12 h-0.5 mx-2 ${step > s.num ? 'bg-blue-600' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium text-slate-900">Widget Details</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Widget Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter widget name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Describe what this widget shows"
                />
              </div>

              {isAdmin() && (
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium text-slate-900">Visibility</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                      <input type="radio" name="visibility" checked={visibility === 'private'} onChange={() => setVisibility('private')} className="text-blue-600" />
                      <Lock className="w-4 h-4 text-slate-500" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">Private</div>
                        <div className="text-xs text-slate-500">Only visible to the creator</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                      <input type="radio" name="visibility" checked={visibility === 'all_customers'} onChange={() => setVisibility('all_customers')} className="text-blue-600" />
                      <Globe className="w-4 h-4 text-slate-500" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">All Customers</div>
                        <div className="text-xs text-slate-500">Visible to all customers</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                      <input type="radio" name="visibility" checked={visibility === 'admin_only'} onChange={() => setVisibility('admin_only')} className="text-blue-600" />
                      <Shield className="w-4 h-4 text-slate-500" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">Admin Only</div>
                        <div className="text-xs text-slate-500">Only visible to administrators</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium text-slate-900">{getWidgetTypeLabel()} Configuration</h3>

              {(widgetType === 'bar_chart' || widgetType === 'pie_chart') && (
                <>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <strong>Note:</strong> Charts require grouping your data. Choose a category to group by and a value to aggregate.
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Group By *</label>
                      <select
                        value={groupByField}
                        onChange={(e) => setGroupByField(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select field...</option>
                        {groupableColumns.map(col => (
                          <option key={col.id} value={col.id}>{col.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Value Field *</label>
                      <select
                        value={valueField}
                        onChange={(e) => setValueField(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="count">Count of records</option>
                        {aggregatableColumns.map(col => (
                          <option key={col.id} value={col.id}>{col.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Aggregation</label>
                    <select
                      value={aggregation}
                      onChange={(e) => setAggregation(e.target.value)}
                      disabled={valueField === 'count'}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    >
                      <option value="count">COUNT</option>
                      <option value="sum">SUM</option>
                      <option value="avg">AVERAGE</option>
                      <option value="min">MIN</option>
                      <option value="max">MAX</option>
                    </select>
                  </div>
                </>
              )}

              {widgetType === 'line_chart' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">X Axis (Date) *</label>
                      <select
                        value={xAxisField}
                        onChange={(e) => setXAxisField(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select date field...</option>
                        {dateColumns.map(col => (
                          <option key={col.id} value={col.id}>{col.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Value Field *</label>
                      <select
                        value={valueField}
                        onChange={(e) => setValueField(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="count">Count of records</option>
                        {aggregatableColumns.map(col => (
                          <option key={col.id} value={col.id}>{col.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Aggregation</label>
                    <select
                      value={aggregation}
                      onChange={(e) => setAggregation(e.target.value)}
                      disabled={valueField === 'count'}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    >
                      <option value="count">COUNT</option>
                      <option value="sum">SUM</option>
                      <option value="avg">AVERAGE</option>
                    </select>
                  </div>
                </>
              )}

              {widgetType === 'kpi' && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Value Field *</label>
                      <select
                        value={valueField}
                        onChange={(e) => setValueField(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="count">Count of records</option>
                        {aggregatableColumns.map(col => (
                          <option key={col.id} value={col.id}>{col.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Aggregation</label>
                      <select
                        value={aggregation}
                        onChange={(e) => setAggregation(e.target.value)}
                        disabled={valueField === 'count'}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                      >
                        <option value="count">COUNT</option>
                        <option value="sum">SUM</option>
                        <option value="avg">AVERAGE</option>
                        <option value="min">MIN</option>
                        <option value="max">MAX</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Format</label>
                      <select
                        value={kpiFormat}
                        onChange={(e) => setKpiFormat(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="number">Number</option>
                        <option value="currency">Currency ($)</option>
                        <option value="percent">Percentage (%)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {widgetType === 'table' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Columns to Display</label>
                    <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-auto space-y-2">
                      {allColumns.map(col => (
                        <label key={col.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tableColumns.includes(col.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTableColumns([...tableColumns, col.id]);
                              } else {
                                setTableColumns(tableColumns.filter(c => c !== col.id));
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Row Limit</label>
                    <select
                      value={rowLimit}
                      onChange={(e) => setRowLimit(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={5}>5 rows</option>
                      <option value={10}>10 rows</option>
                      <option value={20}>20 rows</option>
                      <option value={50}>50 rows</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium text-slate-900">Appearance</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {ICON_OPTIONS.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <button
                        key={option.name}
                        onClick={() => setSelectedIcon(option.name)}
                        className={`p-3 rounded-lg border-2 transition ${
                          selectedIcon === option.name
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <IconComponent className={`w-5 h-5 mx-auto ${
                          selectedIcon === option.name ? 'text-blue-600' : 'text-slate-500'
                        }`} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedColor(option.value)}
                      className={`w-10 h-10 rounded-lg ${option.value} flex items-center justify-center transition ring-offset-2 ${
                        selectedColor === option.value ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      {selectedColor === option.value && (
                        <CheckCircle className="w-5 h-5 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Default Size</label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between rounded-b-2xl flex-shrink-0">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-slate-600 hover:bg-white rounded-lg flex items-center gap-2 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-white rounded-lg transition"
            >
              Cancel
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
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
