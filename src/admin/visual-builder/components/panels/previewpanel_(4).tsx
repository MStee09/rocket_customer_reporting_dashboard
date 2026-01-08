/**
 * Preview Panel - Integrated Version
 *
 * LOCATION: /src/admin/visual-builder/components/panels/PreviewPanel.tsx
 *
 * This version:
 * - Fixes Map icon shadow (MapIcon alias)
 * - Adds professional styling from v2
 * - Keeps working filter processing from existing code
 * - Adds `contains_any` operator support
 * - Removes date range filtering (preview shows sample data)
 */

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Maximize2,
  Minimize2,
  AlertCircle,
  Loader2,
  BarChart3,
  LineChart,
  PieChart,
  Table2,
  Map as MapIcon,
  TrendingUp,
  Database,
} from 'lucide-react';
import { useBuilder } from '../BuilderContext';
import { supabase } from '../../../../lib/supabase';
import {
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';

const CHART_COLORS = [
  '#f97316', '#3b82f6', '#10b981', '#8b5cf6',
  '#f59e0b', '#ec4899', '#06b6d4', '#84cc16',
];

export function PreviewPanel() {
  const { state } = useBuilder();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState<number | null>(null);

  const fetchPreviewData = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('shipment_report_view')
        .select('*', { count: 'exact' })
        .limit(1000);

      if (state.logicBlocks && state.logicBlocks.length > 0) {
        for (const block of state.logicBlocks) {
          if (block.type === 'filter' && block.conditions) {
            for (const condition of block.conditions) {
              const { field, operator, value } = condition;
              if (!field || value === undefined || value === '') continue;

              switch (operator) {
                case 'eq':
                  query = query.eq(field, value);
                  break;
                case 'neq':
                  query = query.neq(field, value);
                  break;
                case 'gt':
                  query = query.gt(field, value);
                  break;
                case 'gte':
                  query = query.gte(field, value);
                  break;
                case 'lt':
                  query = query.lt(field, value);
                  break;
                case 'lte':
                  query = query.lte(field, value);
                  break;
                case 'contains':
                  query = query.ilike(field, `%${value}%`);
                  break;
                case 'in':
                  if (Array.isArray(value)) {
                    query = query.in(field, value);
                  }
                  break;
                case 'is_null':
                  query = query.is(field, null);
                  break;
                case 'is_not_null':
                  query = query.not(field, 'is', null);
                  break;
                case 'between':
                  if (Array.isArray(value) && value.length === 2) {
                    query = query.gte(field, value[0]).lte(field, value[1]);
                  }
                  break;
                case 'contains_any':
                  if (Array.isArray(value) && value.length > 0) {
                    const orConditions = value
                      .map(v => `${field}.ilike.%${v}%`)
                      .join(',');
                    query = query.or(orConditions);
                  }
                  break;
              }
            }
          }
        }
      }

      const { data: rawData, error: queryError, count } = await query;
      if (queryError) throw queryError;

      setRowCount(count);
      setData(processDataForVisualization(rawData || [], state.visualization));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch preview data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchPreviewData, 500);
    return () => clearTimeout(timer);
  }, [
    state.visualization.type,
    state.visualization.xField,
    state.visualization.yField,
    state.visualization.groupBy,
    state.visualization.aggregation,
    state.visualization.geo,
    state.visualization.flow,
    state.logicBlocks,
  ]);

  const containerClass = isFullscreen ? 'fixed inset-0 z-50 bg-white p-6' : 'p-4';

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            Preview
            {loading && <Loader2 className="w-3 h-3 animate-spin text-orange-500" />}
          </h3>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            {rowCount !== null && (
              <>
                <Database className="w-3 h-3" />
                {rowCount.toLocaleString()} rows (sample)
              </>
            )}
            {!state.visualization.xField && state.visualization.type !== 'kpi' && (
              <span className="text-amber-500 ml-2">⚠️ Select X-axis field</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchPreviewData}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className={`bg-slate-50 rounded-xl border border-slate-200 ${isFullscreen ? 'h-[calc(100vh-180px)]' : 'h-80'}`}>
        {loading ? (
          <LoadingSkeleton type={state.visualization.type} />
        ) : error ? (
          <ErrorState error={error} onRetry={fetchPreviewData} />
        ) : data.length === 0 ? (
          <EmptyState hasFilters={state.logicBlocks.length > 0} />
        ) : (
          <ChartRenderer type={state.visualization.type} data={data} config={state.visualization} />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <ChartTypeIcon type={state.visualization.type} />
            {state.visualization.type}
          </span>
          {state.visualization.xField && <span>X: {formatFieldName(state.visualization.xField)}</span>}
          {state.visualization.yField && <span>Y: {formatFieldName(state.visualization.yField)}</span>}
          {state.visualization.aggregation && (
            <span className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">
              {state.visualization.aggregation.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-400 italic">
        Preview shows sample data. Published widget will use Analytics Hub date range.
      </p>
    </div>
  );
}

function LoadingSkeleton({ type }: { type: string }) {
  if (type === 'kpi') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-32 bg-slate-200 rounded animate-pulse mx-auto" />
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mx-auto mt-2" />
        </div>
      </div>
    );
  }
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="w-full h-full flex items-end justify-around gap-2">
        {[0.6, 0.8, 0.4, 0.9, 0.5, 0.7].map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-200 rounded-t animate-pulse"
            style={{ height: `${height * 100}%`, animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-sm">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-red-600 font-medium">Preview Error</p>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg">
          Try Again
        </button>
      </div>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <Database className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-600 font-medium">No data to display</p>
        <p className="text-xs text-slate-400 mt-1">
          {hasFilters ? 'Try adjusting your filter criteria' : 'Configure fields above to see a preview'}
        </p>
      </div>
    </div>
  );
}

function ChartRenderer({ type, data, config }: { type: string; data: any[]; config: any }) {
  const colors = CHART_COLORS;

  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-45} textAnchor="end" height={60} tickFormatter={(v) => truncateLabel(v, 15)} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={formatNumber} />
            <Tooltip formatter={(value: number) => formatNumber(value)} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <Legend />
            <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]} name="Value">
              {data.map((_, i) => <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-45} textAnchor="end" height={60} tickFormatter={formatDateLabel} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={formatNumber} />
            <Tooltip formatter={(value: number) => formatNumber(value)} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <Legend />
            <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} dot={{ fill: colors[0], strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} name="Value" />
          </RechartsLineChart>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-45} textAnchor="end" height={60} tickFormatter={formatDateLabel} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={formatNumber} />
            <Tooltip formatter={(value: number) => formatNumber(value)} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <Legend />
            <Area type="monotone" dataKey="value" fill={colors[0]} fillOpacity={0.3} stroke={colors[0]} strokeWidth={2} name="Value" />
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'pie':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${truncateLabel(name, 10)}: ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {data.map((_, i) => <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(value: number) => formatNumber(value)} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <Legend />
          </RechartsPieChart>
        </ResponsiveContainer>
      );

    case 'scatter':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis dataKey="y" tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <Scatter data={data} fill={colors[0]} />
          </ScatterChart>
        </ResponsiveContainer>
      );

    case 'kpi':
      return <KPIPreview data={data} config={config} />;
    case 'table':
      return <TablePreview data={data} />;
    case 'choropleth':
      return <ChoroplethPreview data={data} config={config} />;
    case 'flow':
      return <FlowMapPreview data={data} />;
    case 'histogram':
      return <HistogramPreview data={data} colors={colors} />;
    case 'treemap':
      return <TreemapPreview data={data} colors={colors} />;
    case 'funnel':
      return <FunnelPreview data={data} colors={colors} />;
    default:
      return (
        <div className="h-full flex items-center justify-center text-slate-400">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Preview not available for {type}</p>
          </div>
        </div>
      );
  }
}

function KPIPreview({ data, config }: { data: any[]; config: any }) {
  const value = data[0]?.value || 0;
  const formatted = config.kpi?.format === 'currency'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
    : formatNumber(value);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl font-bold text-slate-900">{config.kpi?.prefix}{formatted}{config.kpi?.suffix}</div>
        {config.yField && <div className="mt-2 text-sm text-slate-500">{config.aggregation || 'sum'} of {formatFieldName(config.yField)}</div>}
      </div>
    </div>
  );
}

function TablePreview({ data }: { data: any[] }) {
  if (data.length === 0) return null;
  const columns = Object.keys(data[0]).slice(0, 6);

  return (
    <div className="h-full overflow-auto p-4">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-100">
            {columns.map(col => (
              <th key={col} className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{formatFieldName(col)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.slice(0, 10).map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {columns.map(col => <td key={col} className="px-3 py-2 text-slate-700 whitespace-nowrap">{formatCellValue(row[col])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 10 && <p className="text-xs text-slate-400 text-center mt-3 py-2 border-t border-slate-100">Showing 10 of {data.length} rows</p>}
    </div>
  );
}

function ChoroplethPreview({ data, config }: { data: any[]; config: any }) {
  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="text-center">
        <MapIcon className="w-16 h-16 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">Choropleth Map Preview</p>
        <p className="text-xs text-slate-400 mt-1">{config.geo?.mapKey || 'us_states'} • {data.length} regions</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {data.slice(0, 5).map((d, i) => <div key={i} className="text-xs text-slate-600 px-2 py-1 bg-slate-100 rounded">{d.name}: {formatNumber(d.value)}</div>)}
          {data.length > 5 && <div className="text-xs text-slate-400 px-2 py-1">+{data.length - 5} more</div>}
        </div>
      </div>
    </div>
  );
}

function FlowMapPreview({ data }: { data: any[] }) {
  const maxValue = Math.max(...data.map(d => d.value || 0), 1);

  return (
    <div className="h-full p-6">
      <div className="h-full bg-white rounded-lg border border-slate-200 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-700">🚛 Top Lanes</span>
          <span className="text-xs text-slate-500">{data.length} routes</span>
        </div>
        <div className="flex-1 space-y-2 overflow-auto">
          {data.slice(0, 8).map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-16 text-xs font-medium text-slate-700 text-right truncate">{d.origin}</div>
              <div className="flex-1 relative h-6">
                <div className="absolute inset-y-0 left-0 bg-orange-500 rounded" style={{ width: `${(d.value / maxValue) * 100}%` }} />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                  <span className={d.value / maxValue > 0.5 ? 'text-white' : 'text-slate-700'}>{formatNumber(d.value)}</span>
                </div>
              </div>
              <div className="w-16 text-xs font-medium text-slate-700 truncate">{d.destination}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistogramPreview({ data, colors }: { data: any[]; colors: string[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="bin" tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
        <Bar dataKey="count" fill={colors[0]} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TreemapPreview({ data, colors }: { data: any[]; colors: string[] }) {
  return (
    <div className="h-full p-4">
      <div className="h-full grid grid-cols-4 gap-1">
        {data.slice(0, 12).map((d, i) => (
          <div key={i} className="rounded flex items-center justify-center text-white text-xs font-medium p-2" style={{ backgroundColor: colors[i % colors.length], gridColumn: i < 2 ? 'span 2' : 'span 1', gridRow: i < 2 ? 'span 2' : 'span 1' }}>
            <span className="truncate">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelPreview({ data, colors }: { data: any[]; colors: string[] }) {
  const maxValue = Math.max(...data.map(d => d.value || 0), 1);

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 gap-2">
      {data.slice(0, 5).map((d, i) => {
        const width = 60 + (40 * ((d.value || 0) / maxValue));
        return (
          <div key={i} className="h-12 rounded flex items-center justify-center text-white text-sm font-medium" style={{ width: `${width}%`, backgroundColor: colors[i % colors.length] }}>
            <span className="truncate px-2">{d.name}: {formatNumber(d.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChartTypeIcon({ type }: { type: string }) {
  const icons: Record<string, React.ElementType> = {
    bar: BarChart3, line: LineChart, pie: PieChart, area: LineChart, scatter: BarChart3,
    table: Table2, choropleth: MapIcon, flow: MapIcon, kpi: TrendingUp, histogram: BarChart3,
    treemap: BarChart3, funnel: BarChart3, sparkline: LineChart, heatmap: BarChart3,
  };
  const Icon = icons[type] || BarChart3;
  return <Icon className="w-3 h-3" />;
}

function truncateLabel(label: string, maxLength: number): string {
  if (!label) return '';
  return label.length <= maxLength ? label : label.substring(0, maxLength - 3) + '...';
}

function formatFieldName(field: string): string {
  return field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatNumber(value: number): string {
  if (value === null || value === undefined) return '-';
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDateLabel(value: string): string {
  if (!value) return '';
  if (value.includes('T')) {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return truncateLabel(value, 12);
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toLocaleDateString();
  return truncateLabel(String(value), 25);
}

function processDataForVisualization(rawData: any[], config: any): any[] {
  const { type, xField, yField, aggregation, geo, flow } = config;

  if (rawData.length === 0) return [];

  if (type === 'kpi') {
    return [{ value: aggregateValues(rawData, yField, aggregation) }];
  }

  if (type === 'table') return rawData.slice(0, 100);

  if (type === 'scatter') {
    return rawData.slice(0, 200).map(row => ({ x: row[xField] || 0, y: row[yField] || 0 }));
  }

  if (type === 'choropleth' && geo?.regionField && geo?.valueField) {
    return groupAndAggregate(rawData, geo.regionField, geo.valueField, aggregation);
  }

  if (type === 'flow' && flow?.originField && flow?.destinationField) {
    const grouped: Record<string, { origin: string; destination: string; value: number }> = {};
    for (const row of rawData) {
      const key = `${row[flow.originField]}-${row[flow.destinationField]}`;
      if (grouped[key]) {
        grouped[key].value += Number(row[flow.valueField]) || 0;
      } else {
        grouped[key] = { origin: row[flow.originField], destination: row[flow.destinationField], value: Number(row[flow.valueField]) || 0 };
      }
    }
    return Object.values(grouped).sort((a, b) => b.value - a.value).slice(0, 20);
  }

  if (type === 'histogram' && xField) {
    const values = rawData.map(r => Number(r[xField])).filter(v => !isNaN(v));
    return createHistogramBins(values, config.histogram?.binCount || 10);
  }

  if (xField) return groupAndAggregate(rawData, xField, yField, aggregation);

  return [];
}

function groupAndAggregate(data: any[], groupField: string, valueField: string | undefined, aggregation: string = 'sum'): { name: string; value: number }[] {
  const groups: Record<string, number[]> = {};
  for (const row of data) {
    const key = String(row[groupField] || 'Unknown');
    const value = valueField ? Number(row[valueField]) || 0 : 1;
    if (!groups[key]) groups[key] = [];
    groups[key].push(value);
  }
  return Object.entries(groups)
    .map(([name, values]) => ({ name, value: aggregateArray(values, aggregation) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
}

function aggregateValues(data: any[], field: string | undefined, aggregation: string): number {
  if (!field) return data.length;
  const values = data.map(r => Number(r[field])).filter(v => !isNaN(v));
  return aggregateArray(values, aggregation);
}

function aggregateArray(values: number[], aggregation: string): number {
  if (values.length === 0) return 0;
  switch (aggregation) {
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'count': return values.length;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
    default: return values.reduce((a, b) => a + b, 0);
  }
}

function createHistogramBins(values: number[], binCount: number): { bin: string; count: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ bin: String(min), count: values.length }];
  const binWidth = (max - min) / binCount;
  const bins = Array(binCount).fill(0).map((_, i) => ({
    bin: `${formatNumber(min + i * binWidth)}-${formatNumber(min + (i + 1) * binWidth)}`,
    count: 0,
  }));
  for (const value of values) {
    const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
    bins[binIndex].count++;
  }
  return bins;
}

export default PreviewPanel;
