import React from 'react';
import { RefreshCw, Camera } from 'lucide-react';
import { WidgetConfig, FieldInfo } from './saveAsWidgetUtils';

export interface ConfigurationStepProps {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  availableFields: FieldInfo[];
  numericFields: FieldInfo[];
  categoryFields: FieldInfo[];
  dateFields: FieldInfo[];
}

export interface TableConfigProps {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  availableFields: FieldInfo[];
}

export interface ChartConfigProps {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  categoryFields: FieldInfo[];
  numericFields: FieldInfo[];
}

export interface LineChartConfigProps {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  dateFields: FieldInfo[];
  numericFields: FieldInfo[];
}

export interface KpiConfigProps {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  numericFields: FieldInfo[];
  availableFields: FieldInfo[];
}

export function ConfigurationStep({ config, setConfig, availableFields, numericFields, categoryFields, dateFields }: ConfigurationStepProps) {
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

export function TableConfig({ config, setConfig, availableFields }: TableConfigProps) {
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

export function ChartConfig({ config, setConfig, categoryFields, numericFields }: ChartConfigProps) {
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
          onChange={(e) => setConfig({ ...config, aggregation: e.target.value as WidgetConfig['aggregation'] })}
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

export function LineChartConfig({ config, setConfig, dateFields, numericFields }: LineChartConfigProps) {
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
          onChange={(e) => setConfig({ ...config, aggregation: e.target.value as WidgetConfig['aggregation'] })}
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

export function KpiConfig({ config, setConfig, numericFields }: KpiConfigProps) {
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
            onChange={(e) => setConfig({ ...config, kpiAggregation: e.target.value as WidgetConfig['kpiAggregation'] })}
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
            onChange={(e) => setConfig({ ...config, kpiFormat: e.target.value as WidgetConfig['kpiFormat'] })}
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
