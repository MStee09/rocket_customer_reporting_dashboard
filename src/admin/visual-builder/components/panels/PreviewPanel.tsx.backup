/**
 * Preview Panel - FIXED VERSION
 *
 * LOCATION: /src/admin/visual-builder/components/panels/PreviewPanel.tsx
 *
 * FIXES:
 * 1. Renamed Map icon import to MapIcon to avoid shadowing native Map constructor
 * 2. Removed date range filtering - preview shows sample data
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
              }
            }
          }
        }
      }

      const { data: rawData, error: queryError, count } = await query;

      if (queryError) throw queryError;

      setRowCount(count);

      const processedData = processDataForVisualization(
        rawData || [],
        state.visualization
      );

      setData(processedData);
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

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-white p-6'
    : 'p-4';

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
          {rowCount !== null && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Database className="w-3 h-3" />
              {rowCount.toLocaleString()} rows (sample)
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPreviewData}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
            title="Refresh preview"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className={`bg-slate-50 rounded-lg ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-80'}`}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={fetchPreviewData}
                className="mt-2 text-sm text-orange-600 hover:text-orange-700"
              >
                Try again
              </button>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No data matches your filters</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filter criteria</p>
            </div>
          </div>
        ) : (
          <ChartRenderer
            type={state.visualization.type}
            data={data}
            config={state.visualization}
          />
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <VisualizationIcon type={state.visualization.type} />
          {state.visualization.type}
        </span>
        {state.visualization.xField && (
          <span>X: {state.visualization.xField}</span>
        )}
        {state.visualization.yField && (
          <span>Y: {state.visualization.yField}</span>
        )}
        {state.visualization.aggregation && (
          <span>Agg: {state.visualization.aggregation}</span>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-400 italic">
        Preview shows sample data. Published widget will use Analytics Hub date range.
      </p>
    </div>
  );
}

function VisualizationIcon({ type }: { type: string }) {
  const icons: Record<string, React.ElementType> = {
    bar: BarChart3,
    line: LineChart,
    pie: PieChart,
    area: LineChart,
    scatter: BarChart3,
    table: Table2,
    choropleth: MapIcon,
    flow: MapIcon,
    kpi: TrendingUp,
    histogram: BarChart3,
    treemap: BarChart3,
    funnel: BarChart3,
    sparkline: LineChart,
    heatmap: BarChart3,
  };
  const Icon = icons[type] || BarChart3;
  return <Icon className="w-3 h-3" />;
}

interface ChartRendererProps {
  type: string;
  data: any[];
  config: any;
}

function ChartRenderer({ type, data, config }: ChartRendererProps) {
  const colors = config.colors || ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6'];

  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip />
            {config.showLegend !== false && <Legend />}
            <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip />
            {config.showLegend !== false && <Legend />}
            <Line
              type="monotone"
              dataKey="value"
              stroke={colors[0]}
              strokeWidth={2}
              dot={{ fill: colors[0], strokeWidth: 2 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip />
            {config.showLegend !== false && <Legend />}
            <Area
              type="monotone"
              dataKey="value"
              fill={colors[0]}
              fillOpacity={0.3}
              stroke={colors[0]}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'pie':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={config.showLabels !== false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            {config.showLegend !== false && <Legend />}
          </RechartsPieChart>
        </ResponsiveContainer>
      );

    case 'scatter':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis dataKey="y" tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip />
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
      return <HistogramPreview data={data} config={config} colors={colors} />;

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
  const formatted = formatKPIValue(value, config.kpi);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl font-bold text-slate-900">
          {config.kpi?.prefix}{formatted}{config.kpi?.suffix}
        </div>
      </div>
    </div>
  );
}

function formatKPIValue(value: number, kpiConfig: any): string {
  const format = kpiConfig?.format || 'number';

  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }
  if (format === 'percent') {
    return `${(value * 100).toFixed(1)}%`;
  }
  return new Intl.NumberFormat('en-US').format(value);
}

function TablePreview({ data }: { data: any[] }) {
  if (data.length === 0) return null;

  const columns = Object.keys(data[0]);

  return (
    <div className="h-full overflow-auto p-2">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-100">
            {columns.map(col => (
              <th key={col} className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.slice(0, 10).map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {columns.map(col => (
                <td key={col} className="px-3 py-2 text-slate-700">
                  {String(row[col] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 10 && (
        <p className="text-xs text-slate-400 text-center mt-2">
          Showing 10 of {data.length} rows
        </p>
      )}
    </div>
  );
}

function ChoroplethPreview({ data, config }: { data: any[]; config: any }) {
  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="text-center">
        <MapIcon className="w-16 h-16 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-600">Choropleth Map Preview</p>
        <p className="text-xs text-slate-400 mt-1">
          {config.geo?.mapKey || 'us_states'} • {data.length} regions
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-1">
          {data.slice(0, 5).map((d, i) => (
            <div key={i} className="text-xs text-slate-500 px-2 py-1 bg-slate-100 rounded">
              {d.name}: {d.value?.toLocaleString()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FlowMapPreview({ data }: { data: any[] }) {
  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <MapIcon className="w-6 h-6 text-blue-500" />
          </div>
          <div className="text-2xl text-slate-300">→</div>
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <MapIcon className="w-6 h-6 text-orange-500" />
          </div>
        </div>
        <p className="text-sm text-slate-600">Flow Map Preview</p>
        <p className="text-xs text-slate-400 mt-1">
          {data.length} origin-destination pairs
        </p>
      </div>
    </div>
  );
}

function HistogramPreview({ data, config, colors }: { data: any[]; config: any; colors: string[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
        <XAxis dataKey="bin" tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip />
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
          <div
            key={i}
            className="rounded flex items-center justify-center text-white text-xs font-medium"
            style={{
              backgroundColor: colors[i % colors.length],
              gridColumn: i < 2 ? 'span 2' : 'span 1',
              gridRow: i < 2 ? 'span 2' : 'span 1',
            }}
          >
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelPreview({ data, colors }: { data: any[]; colors: string[] }) {
  const maxValue = Math.max(...data.map(d => d.value || 0), 1);

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 gap-1">
      {data.slice(0, 5).map((d, i) => {
        const width = 60 + (40 * ((d.value || 0) / maxValue));
        return (
          <div
            key={i}
            className="h-10 rounded flex items-center justify-center text-white text-sm font-medium transition-all"
            style={{
              width: `${width}%`,
              backgroundColor: colors[i % colors.length],
            }}
          >
            {d.name}: {(d.value || 0).toLocaleString()}
          </div>
        );
      })}
    </div>
  );
}

function processDataForVisualization(rawData: any[], config: any): any[] {
  const { type, xField, yField, aggregation, geo, flow } = config;

  if (rawData.length === 0) return [];

  if (type === 'kpi') {
    const value = aggregateValues(rawData, yField, aggregation);
    return [{ value }];
  }

  if (type === 'table') {
    return rawData.slice(0, 100);
  }

  if (type === 'scatter') {
    return rawData.slice(0, 200).map(row => ({
      x: row[xField] || 0,
      y: row[yField] || 0,
    }));
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
        grouped[key] = {
          origin: row[flow.originField],
          destination: row[flow.destinationField],
          value: Number(row[flow.valueField]) || 0,
        };
      }
    }

    return Object.values(grouped)
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
  }

  if (type === 'histogram' && xField) {
    const values = rawData.map(r => Number(r[xField])).filter(v => !isNaN(v));
    const binCount = config.histogram?.binCount || 10;
    return createHistogramBins(values, binCount);
  }

  if (xField) {
    return groupAndAggregate(rawData, xField, yField, aggregation);
  }

  return [];
}

function groupAndAggregate(
  data: any[],
  groupField: string,
  valueField: string | undefined,
  aggregation: string = 'sum'
): { name: string; value: number }[] {
  const groups: Record<string, number[]> = {};

  for (const row of data) {
    const key = String(row[groupField] || 'Unknown');
    const value = valueField ? Number(row[valueField]) || 0 : 1;

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(value);
  }

  const results = Object.entries(groups).map(([name, values]) => ({
    name,
    value: aggregateArray(values, aggregation),
  }));

  return results
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
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'count':
      return values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return values.reduce((a, b) => a + b, 0);
  }
}

function createHistogramBins(values: number[], binCount: number): { bin: string; count: number }[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ bin: String(min), count: values.length }];

  const binWidth = (max - min) / binCount;

  const bins = Array(binCount).fill(0).map((_, i) => ({
    bin: `${(min + i * binWidth).toFixed(0)}-${(min + (i + 1) * binWidth).toFixed(0)}`,
    count: 0,
  }));

  for (const value of values) {
    const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
    bins[binIndex].count++;
  }

  return bins;
}

export default PreviewPanel;
