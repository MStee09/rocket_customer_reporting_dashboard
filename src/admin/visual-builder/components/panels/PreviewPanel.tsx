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
  const [usingMCP, setUsingMCP] = useState(false);

  const needsMCPQuery = (): boolean => {
    if (!state.logicBlocks) return false;

    for (const block of state.logicBlocks) {
      if ((block as any).mcpQuery) return true;

      if (block.type === 'filter' && block.conditions) {
        for (const condition of block.conditions) {
          const field = condition.field?.toLowerCase() || '';
          if (
            field.includes('shipment_item.') ||
            field.includes('description') ||
            field.includes('item_') ||
            field.includes('carrier.') ||
            field.includes('accessorial')
          ) {
            return true;
          }
        }
      }
    }

    return false;
  };

  const fetchPreviewDataWithMCP = async () => {
    setLoading(true);
    setError(null);
    setUsingMCP(true);

    try {
      let productFilters: string[] = [];

      for (const block of state.logicBlocks || []) {
        if (block.type === 'filter' && block.conditions) {
          for (const condition of block.conditions) {
            if (condition.field?.includes('description') || condition.field?.includes('shipment_item')) {
              if (typeof condition.value === 'string') {
                productFilters.push(condition.value);
              } else if (Array.isArray(condition.value)) {
                productFilters.push(...condition.value);
              }
            }
          }
        }
      }

      const filters = productFilters.map(term => ({
        field: 'shipment_item.description',
        operator: 'ilike',
        value: `%${term}%`,
      }));

      const { data: response, error: funcError } = await supabase.functions.invoke('generate-report', {
        body: {
          prompt: 'Execute MCP query for widget preview',
          customerId: state.customerId || '',
          useTools: true,
          mode: 'investigate',
          directQuery: {
            base_table: 'shipment',
            joins: [{ table: 'shipment_item' }],
            select: [
              'shipment.load_id',
              'shipment.retail',
              'shipment_item.description',
              'shipment_item.weight',
            ],
            filters,
            limit: 500,
          },
        },
      });

      if (funcError) throw funcError;

      let rawData: any[] = [];

      if (response?.toolExecutions) {
        const queryResult = response.toolExecutions.find(
          (t: any) => t.toolName === 'query_with_join' || t.toolName === 'query_table'
        );
        if (queryResult?.result?.data) {
          rawData = queryResult.result.data;
        }
      } else if (response?.data) {
        rawData = response.data;
      }

      setRowCount(rawData.length);

      const processedData = processDataForVisualization(rawData, state.visualization);
      setData(processedData);

    } catch (err) {
      console.error('MCP query failed:', err);
      setError(err instanceof Error ? err.message : 'MCP query failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviewDataDirect = async () => {
    setLoading(true);
    setError(null);
    setUsingMCP(false);

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

              if (field.includes('.') && !field.startsWith('shipment_report_view')) {
                continue;
              }

              const cleanField = field.replace('shipment_report_view.', '');

              switch (operator) {
                case 'eq':
                  query = query.eq(cleanField, value);
                  break;
                case 'neq':
                  query = query.neq(cleanField, value);
                  break;
                case 'gt':
                  query = query.gt(cleanField, value);
                  break;
                case 'gte':
                  query = query.gte(cleanField, value);
                  break;
                case 'lt':
                  query = query.lt(cleanField, value);
                  break;
                case 'lte':
                  query = query.lte(cleanField, value);
                  break;
                case 'contains':
                case 'ilike':
                  query = query.ilike(cleanField, `%${value}%`);
                  break;
                case 'in':
                  if (Array.isArray(value)) {
                    query = query.in(cleanField, value);
                  }
                  break;
                case 'is_null':
                  query = query.is(cleanField, null);
                  break;
                case 'is_not_null':
                  query = query.not(cleanField, 'is', null);
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

  const fetchPreviewData = async () => {
    if (needsMCPQuery()) {
      await fetchPreviewDataWithMCP();
    } else {
      await fetchPreviewDataDirect();
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
              {usingMCP && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px]">
                  MCP
                </span>
              )}
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
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
              {usingMCP && (
                <p className="text-xs text-slate-500 mt-2">Querying with MCP...</p>
              )}
            </div>
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
            <div className="text-center text-slate-400">
              <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No data matches your filters</p>
              <p className="text-xs mt-1">Try adjusting your filter criteria</p>
            </div>
          </div>
        ) : (
          <VisualizationRenderer
            type={state.visualization.type}
            data={data}
            config={state.visualization}
          />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3 h-3" />
          <span>{state.visualization.type}</span>
          {state.visualization.aggregation && (
            <span className="px-1.5 py-0.5 bg-slate-100 rounded">
              Agg: {state.visualization.aggregation}
            </span>
          )}
        </div>
        <span>Preview shows sample data. Published widget will use Analytics Hub date range.</span>
      </div>
    </div>
  );
}

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1'];

function VisualizationRenderer({ type, data, config }: { type: string; data: any[]; config: any }) {
  const colors = config.colors || COLORS;

  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 80, bottom: 20 }}>
            {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={70} />
            <Tooltip formatter={(value: number) => value.toLocaleString()} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
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
          <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} dot={{ r: 4 }} />
          </RechartsLineChart>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'pie':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </RechartsPieChart>
        </ResponsiveContainer>
      );

    case 'kpi':
      return <KPIPreview data={data} config={config} />;

    case 'table':
      return <TablePreview data={data} />;

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

    case 'choropleth':
      return <ChoroplethPreview data={data} config={config} />;

    case 'flow':
      return <FlowMapPreview data={data} />;

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
          {config.geo?.mapKey || 'us_states'} - {data.length} regions
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
          <div className="text-2xl text-slate-300">-&gt;</div>
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

  if (xField) {
    return groupAndAggregate(rawData, xField, yField, aggregation);
  }

  if (rawData[0]?.description) {
    return groupAndAggregate(rawData, 'description', yField || 'retail', aggregation);
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
    let key = String(row[groupField] || 'Unknown');

    if (groupField === 'description' && key.length > 30) {
      const match = key.match(/^([^\/\-\d]+)/);
      key = match ? match[1].trim() : key.substring(0, 25);
    }

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

export default PreviewPanel;
