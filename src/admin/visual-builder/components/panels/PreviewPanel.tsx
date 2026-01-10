import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Maximize2,
  Minimize2,
  AlertCircle,
  Loader2,
  BarChart3,
  Database,
  Map as MapIcon,
} from 'lucide-react';
import { useBuilder } from '../BuilderContext';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';
import type { LogicBlock, AILogicBlock, FilterBlock } from '../../types/BuilderSchema';
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

function formatFieldLabel(field: string | undefined): string {
  if (!field) return '';

  const labels: Record<string, string> = {
    retail: 'Revenue',
    cost: 'Cost',
    weight: 'Weight (lbs)',
    total_weight: 'Total Weight',
    carrier_name: 'Carrier',
    origin_state: 'Origin State',
    destination_state: 'Destination State',
    description: 'Product',
    item_descriptions: 'Product',
    load_id: 'Shipments',
    customer_name: 'Customer',
    service_type: 'Service Type',
    pickup_date: 'Pickup Date',
    delivery_date: 'Delivery Date',
    primary_commodity: 'Commodity',
    freight_classes: 'Freight Class',
  };

  return labels[field] || field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatAggregation(agg: string | undefined): string {
  const labels: Record<string, string> = {
    sum: 'Total',
    avg: 'Average',
    count: 'Count of',
    min: 'Minimum',
    max: 'Maximum',
  };
  return labels[agg || 'sum'] || 'Total';
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toFixed(0);
}

export function PreviewPanel() {
  const { state } = useBuilder();
  const { role } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [usingJoin, setUsingJoin] = useState(false);

  const customerScope = state.customerScope || { mode: 'admin' };

  const needsJoinQuery = (): boolean => {
    if (!state.logicBlocks) return false;

    for (const block of state.logicBlocks) {
      if (!block.enabled) continue;

      if (block.type === 'filter') {
        const filterBlock = block as FilterBlock;
        for (const condition of filterBlock.conditions || []) {
          const field = (condition.field || '').toLowerCase();
          if (
            field.includes('shipment_item') ||
            field.includes('description') ||
            field.includes('item_description') ||
            field.includes('shipment_description') ||
            field.includes('item_') ||
            field.includes('commodity') ||
            field.includes('freight_class')
          ) {
            return true;
          }
        }
      }

      if (block.type === 'ai') {
        const aiBlock = block as AILogicBlock;
        if (aiBlock.compiledRule?.filters) {
          for (const filter of aiBlock.compiledRule.filters) {
            const field = (filter.field || '').toLowerCase();
            if (
              field.includes('shipment_item') ||
              field.includes('description') ||
              field.includes('item_description') ||
              field.includes('shipment_description') ||
              field.includes('item_') ||
              field.includes('commodity') ||
              field.includes('freight_class')
            ) {
              return true;
            }
          }
        }
      }
    }

    return false;
  };

  const extractProductFilters = (): string[] => {
    const productFilters: string[] = [];

    for (const block of state.logicBlocks || []) {
      if (!block.enabled) continue;

      if (block.type === 'filter') {
        const filterBlock = block as FilterBlock;
        for (const condition of filterBlock.conditions || []) {
          const field = (condition.field || '').toLowerCase();
          if (
            field.includes('description') ||
            field.includes('item_description') ||
            field.includes('shipment_item')
          ) {
            if (typeof condition.value === 'string') {
              const values = condition.value
                .split('|')
                .map(v => v.trim().replace(/%/g, ''))
                .filter(v => v.length > 0);
              productFilters.push(...values);
            } else if (Array.isArray(condition.value)) {
              productFilters.push(
                ...condition.value
                  .map(v => String(v).replace(/%/g, ''))
                  .filter(v => v.length > 0)
              );
            }
          }
        }
      }

      if (block.type === 'ai') {
        const aiBlock = block as AILogicBlock;
        if (aiBlock.compiledRule?.filters) {
          for (const filter of aiBlock.compiledRule.filters) {
            const field = (filter.field || '').toLowerCase();
            if (
              field.includes('description') ||
              field.includes('item_description') ||
              field.includes('shipment_item')
            ) {
              if (typeof filter.value === 'string') {
                const values = filter.value
                  .split('|')
                  .map(v => v.trim().replace(/%/g, ''))
                  .filter(v => v.length > 0);
                productFilters.push(...values);
              } else if (Array.isArray(filter.value)) {
                productFilters.push(
                  ...filter.value
                    .map(v => String(v).replace(/%/g, ''))
                    .filter(v => v.length > 0)
                );
              }
            }
          }
        }
      }
    }

    return [...new Set(productFilters)];
  };

  const fetchPreviewDataWithJoin = async () => {
    setLoading(true);
    setError(null);
    setUsingJoin(true);

    try {
      const productFilters = extractProductFilters();

      let query = supabase
        .from('shipment_report_view')
        .select('*', { count: 'exact' })
        .limit(500);

      if (customerScope.mode === 'customer' && customerScope.customerId) {
        query = query.eq('customer_id', customerScope.customerId);
      }

      if (state.executionParams?.dateRange) {
        query = query
          .gte('pickup_date', state.executionParams.dateRange.start)
          .lte('pickup_date', state.executionParams.dateRange.end);
      }

      if (productFilters.length > 0) {
        const orFilters = productFilters.map(p => `item_descriptions.ilike.%${p}%`).join(',');
        query = query.or(orFilters);
      }

      const { data: rawData, count, error: queryError } = await query;

      if (queryError) throw queryError;

      setRowCount(count || rawData?.length || 0);
      const aggregatedData = aggregateData(rawData || []);
      setData(aggregatedData);

    } catch (err) {
      console.error('[PreviewPanel] Join query error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviewDataDirect = async () => {
    setLoading(true);
    setError(null);
    setUsingJoin(false);

    try {
      let query = supabase
        .from('shipment_report_view')
        .select('*', { count: 'exact' })
        .limit(500);

      if (customerScope.mode === 'customer' && customerScope.customerId) {
        query = query.eq('customer_id', customerScope.customerId);
      }

      if (state.executionParams?.dateRange) {
        query = query
          .gte('pickup_date', state.executionParams.dateRange.start)
          .lte('pickup_date', state.executionParams.dateRange.end);
      }

      const { data: rawData, count, error: queryError } = await query;

      if (queryError) throw queryError;

      setRowCount(count || rawData?.length || 0);
      const aggregatedData = aggregateData(rawData || []);
      setData(aggregatedData);

    } catch (err) {
      console.error('[PreviewPanel] Direct query error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const aggregateData = (rawData: any[]): any[] => {
    const { xField, yField, aggregation = 'sum' } = state.visualization;

    if (!xField || !yField) {
      if (state.visualization.type === 'kpi') {
        const total = rawData.reduce((sum, row) => sum + (parseFloat(row[yField || 'retail']) || 0), 0);
        return [{ name: 'Total', value: aggregation === 'avg' ? total / rawData.length : total }];
      }
      return rawData.slice(0, 20);
    }

    const groups = new Map<string, number[]>();

    for (const row of rawData) {
      const key = String(row[xField] || 'Unknown');
      const value = parseFloat(row[yField]) || 0;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(value);
    }

    const result = Array.from(groups.entries()).map(([name, values]) => {
      let value: number;
      switch (aggregation) {
        case 'sum':
          value = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          value = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'count':
          value = values.length;
          break;
        case 'min':
          value = Math.min(...values);
          break;
        case 'max':
          value = Math.max(...values);
          break;
        default:
          value = values.reduce((a, b) => a + b, 0);
      }
      return { name, value };
    });

    return result
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  };

  const fetchPreviewData = async () => {
    const needsJoin = needsJoinQuery();

    if (needsJoin) {
      await fetchPreviewDataWithJoin();
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
    state.logicBlocks,
    state.customerScope,
    state.executionParams?.dateRange,
  ]);

  const containerClass = isFullscreen ? 'fixed inset-0 z-50 bg-white p-6' : '';

  return (
    <div className={containerClass}>
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-orange-500" />
          <div>
            <h3 className="font-medium text-slate-900">
              {state.title || 'Preview'}
            </h3>
            <p className="text-xs text-slate-500">
              {formatAggregation(state.visualization.aggregation)} {formatFieldLabel(state.visualization.yField)}
              {state.visualization.xField && ` by ${formatFieldLabel(state.visualization.xField)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
            <Database className="w-3.5 h-3.5" />
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <span>{rowCount?.toLocaleString() || 0} rows</span>
            )}
            {usingJoin && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium ml-1">
                FILTERED
              </span>
            )}
          </div>

          <button
            onClick={fetchPreviewData}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-blue-700">
            <strong>Preview:</strong> {state.executionParams?.dateRange?.start} to {state.executionParams?.dateRange?.end}
            {customerScope.mode === 'customer' && customerScope.customerName && (
              <span className="ml-2 px-1.5 py-0.5 bg-blue-100 rounded">
                {customerScope.customerName}
              </span>
            )}
          </span>
          <span className="text-blue-600">
            Published widget uses page date selector
          </span>
        </div>
      </div>

      <div className={`mx-4 my-4 bg-slate-50 rounded-lg ${isFullscreen ? 'h-[calc(100vh-180px)]' : 'h-80'}`}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 mt-2">
                {usingJoin ? 'Filtering by products...' : 'Loading preview...'}
              </p>
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

      <div className="px-4 py-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3 h-3" />
          <span>{state.visualization.type}</span>
          {state.visualization.aggregation && (
            <span className="px-1.5 py-0.5 bg-slate-100 rounded">
              {state.visualization.aggregation.toUpperCase()}
            </span>
          )}
        </div>
        <span>Preview shows sample data</span>
      </div>
    </div>
  );
}

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1'];

function VisualizationRenderer({ type, data, config }: { type: string; data: any[]; config: any }) {
  const colors = config.colors || COLORS;
  const isCurrency = config.yField === 'retail' || config.yField === 'cost';

  const formatValue = (value: number) => {
    if (isCurrency) {
      return formatCurrency(value);
    }
    return formatNumber(value);
  };

  const formatTooltip = (value: number) => {
    if (isCurrency) {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value.toLocaleString();
  };

  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
            {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={formatValue}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 11, fill: '#64748b' }}
              width={90}
            />
            <Tooltip
              formatter={(value: number) => [formatTooltip(value), formatFieldLabel(config.yField)]}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend />
            <Bar
              dataKey="value"
              name={formatFieldLabel(config.yField)}
              radius={[0, 4, 4, 0]}
            >
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
              height={80}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={formatValue}
            />
            <Tooltip
              formatter={(value: number) => [formatTooltip(value), formatFieldLabel(config.yField)]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              name={formatFieldLabel(config.yField)}
              stroke={colors[0]}
              strokeWidth={2}
              dot={{ r: 4 }}
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
              height={80}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={formatValue}
            />
            <Tooltip
              formatter={(value: number) => [formatTooltip(value), formatFieldLabel(config.yField)]}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="value"
              name={formatFieldLabel(config.yField)}
              stroke={colors[0]}
              fill={colors[0]}
              fillOpacity={0.3}
            />
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
            <Tooltip formatter={(value: number) => formatTooltip(value)} />
            <Legend />
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

    case 'treemap':
      return <TreemapPreview data={data} colors={colors} />;

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
  const format = config.kpi?.format || (config.yField === 'retail' || config.yField === 'cost' ? 'currency' : 'number');

  let formatted: string;
  if (format === 'currency') {
    formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  } else if (format === 'percent') {
    formatted = `${(value * 100).toFixed(1)}%`;
  } else {
    formatted = new Intl.NumberFormat('en-US').format(value);
  }

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl font-bold text-slate-900">
          {config.kpi?.prefix}{formatted}{config.kpi?.suffix}
        </div>
        <div className="text-sm text-slate-500 mt-2">
          {formatFieldLabel(config.yField)}
        </div>
      </div>
    </div>
  );
}

function TablePreview({ data }: { data: any[] }) {
  if (data.length === 0) return null;

  return (
    <div className="h-full overflow-auto p-2">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
              Category
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">
              Value
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.slice(0, 15).map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              <td className="px-3 py-2 text-slate-700">{row.name}</td>
              <td className="px-3 py-2 text-right text-slate-900 font-medium">
                {typeof row.value === 'number'
                  ? row.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : row.value
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChoroplethPreview({ data, config }: { data: any[]; config: any }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-slate-400">
        <MapIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-medium">Map Preview</p>
        <p className="text-xs mt-1">{data.length} regions with data</p>
        <div className="mt-4 text-xs">
          {data.slice(0, 5).map((d, i) => (
            <div key={i} className="flex justify-between gap-4">
              <span>{d.name}</span>
              <span className="font-medium">{formatCurrency(d.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TreemapPreview({ data, colors }: { data: any[]; colors: string[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="h-full p-4 grid grid-cols-4 gap-2">
      {data.slice(0, 8).map((d, i) => {
        const percent = ((d.value / total) * 100).toFixed(0);
        return (
          <div
            key={i}
            className="rounded-lg p-3 flex flex-col justify-end"
            style={{
              backgroundColor: colors[i % colors.length],
              opacity: 0.8 + (0.2 * (1 - i / data.length))
            }}
          >
            <div className="text-white text-xs font-medium truncate">{d.name}</div>
            <div className="text-white text-lg font-bold">{percent}%</div>
          </div>
        );
      })}
    </div>
  );
}

export default PreviewPanel;
