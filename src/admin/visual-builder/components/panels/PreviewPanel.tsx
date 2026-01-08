import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Loader2, Maximize2, Calendar } from 'lucide-react';
import { useBuilder } from '../BuilderContext';
import { compileLogicBlocks } from '../../logic/compileLogic';
import { validateBuilderSchema } from '../../types/BuilderSchema';
import { supabase } from '../../../../lib/supabase';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

export function PreviewPanel() {
  const { state, setPreviewLoading, setPreviewError, setExecutionParams } = useBuilder();
  const [data, setData] = useState<any[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const validation = validateBuilderSchema(state);

  const fetchPreviewData = async () => {
    if (!validation.valid && validation.errors.length > 0) {
      setPreviewError(validation.errors[0]);
      return;
    }

    setPreviewLoading(true);
    setPreviewError(undefined);

    try {
      const compiledParams = compileLogicBlocks(state.logicBlocks, state.executionParams);
      const vizType = state.visualization.type;

      let query = supabase
        .from('shipment_report_view')
        .select('*')
        .gte('created_date', compiledParams.dateRange.start)
        .lte('created_date', compiledParams.dateRange.end)
        .limit(compiledParams.limit || 1000);

      if (compiledParams.filters) {
        for (const [field, filter] of Object.entries(compiledParams.filters)) {
          const { op, value } = filter as { op: string; value: any };
          switch (op) {
            case 'eq': query = query.eq(field, value); break;
            case 'neq': query = query.neq(field, value); break;
            case 'gt': query = query.gt(field, value); break;
            case 'gte': query = query.gte(field, value); break;
            case 'lt': query = query.lt(field, value); break;
            case 'lte': query = query.lte(field, value); break;
            case 'in': if (Array.isArray(value)) query = query.in(field, value); break;
          }
        }
      }

      const { data: rawData, error } = await query;

      if (error) throw error;

      const processedData = processDataForVisualization(rawData || [], state.visualization);
      setData(processedData);
      setLastRefresh(new Date());
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchPreviewData();
    }, 500);

    return () => clearTimeout(debounce);
  }, [state.visualization, state.logicBlocks, state.executionParams.dateRange]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-700">Live Preview</h3>
          {lastRefresh && (
            <span className="text-xs text-slate-400">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DateRangeControls />
          <button
            onClick={fetchPreviewData}
            disabled={state.ui.previewLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {state.ui.previewLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        {validation.warnings.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
              <div className="text-sm text-amber-700">
                {validation.warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {state.ui.previewError ? (
          <div className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
            <p className="text-sm text-slate-600 mb-1">Preview Error</p>
            <p className="text-xs text-red-500">{state.ui.previewError}</p>
          </div>
        ) : state.ui.previewLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-3" />
            <p className="text-sm text-slate-500">Loading preview...</p>
          </div>
        ) : (
          <PreviewChart type={state.visualization.type} data={data} config={state.visualization} />
        )}
      </div>
    </div>
  );
}

function DateRangeControls() {
  const { state, setExecutionParams } = useBuilder();
  const { start, end } = state.executionParams.dateRange;

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-slate-400" />
      <input
        type="date"
        value={start}
        onChange={(e) => setExecutionParams({ dateRange: { start: e.target.value, end } })}
        className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
      />
      <span className="text-slate-400">to</span>
      <input
        type="date"
        value={end}
        onChange={(e) => setExecutionParams({ dateRange: { start, end: e.target.value } })}
        className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
      />
    </div>
  );
}

function processDataForVisualization(rawData: any[], config: any): any[] {
  const { type, xField, yField, aggregation = 'sum' } = config;

  if (!xField || !yField || rawData.length === 0) {
    return rawData.slice(0, 10);
  }

  const grouped = rawData.reduce((acc, row) => {
    const key = row[xField] || 'Unknown';
    if (!acc[key]) {
      acc[key] = { [xField]: key, values: [] };
    }
    const val = parseFloat(row[yField]) || 0;
    acc[key].values.push(val);
    return acc;
  }, {} as Record<string, any>);

  return Object.values(grouped).map((group: any) => {
    let value: number;
    switch (aggregation) {
      case 'sum': value = group.values.reduce((a: number, b: number) => a + b, 0); break;
      case 'avg': value = group.values.reduce((a: number, b: number) => a + b, 0) / group.values.length; break;
      case 'count': value = group.values.length; break;
      case 'min': value = Math.min(...group.values); break;
      case 'max': value = Math.max(...group.values); break;
      default: value = group.values.reduce((a: number, b: number) => a + b, 0);
    }
    return { name: group[xField], value: Math.round(value * 100) / 100 };
  }).slice(0, 20);
}

interface PreviewChartProps {
  type: string;
  data: any[];
  config: any;
}

function PreviewChart({ type, data, config }: PreviewChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <p className="text-sm">No data to display</p>
        <p className="text-xs mt-1">Configure fields and add data to see preview</p>
      </div>
    );
  }

  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {config.showLegend && <Legend />}
            <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {config.showLegend && <Legend />}
            <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316' }} />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {config.showLegend && <Legend />}
            <Area type="monotone" dataKey="value" fill="#fed7aa" stroke="#f97316" />
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'pie':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={config.showLabels}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            {config.showLegend && <Legend />}
          </PieChart>
        </ResponsiveContainer>
      );

    case 'kpi':
      const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
      const format = config.kpi?.format || 'number';
      const formatted = format === 'currency'
        ? `$${total.toLocaleString()}`
        : format === 'percent'
          ? `${total.toFixed(1)}%`
          : total.toLocaleString();

      return (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-5xl font-bold text-slate-900">{formatted}</div>
          <div className="text-sm text-slate-500 mt-2">{config.yField || 'Total'}</div>
        </div>
      );

    case 'table':
      return (
        <div className="overflow-auto max-h-80">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                {Object.keys(data[0] || {}).map((key) => (
                  <th key={key} className="px-3 py-2 text-left font-medium text-slate-600 border-b">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 20).map((row, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  {Object.values(row).map((val: any, j) => (
                    <td key={j} className="px-3 py-2 text-slate-700">
                      {typeof val === 'number' ? val.toLocaleString() : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <p className="text-sm">Preview not available for {type}</p>
        </div>
      );
  }
}

export default PreviewPanel;
