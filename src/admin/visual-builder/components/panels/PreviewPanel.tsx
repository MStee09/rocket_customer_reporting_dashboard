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
  Bug,
} from 'lucide-react';
import { useBuilder } from '../BuilderContext';
import { usePreviewCustomer } from '../VisualBuilderPage';
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
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';

export function PreviewPanel() {
  const { state } = useBuilder();
  const { previewCustomerId } = usePreviewCustomer();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(true);

  const isAllCustomers = previewCustomerId === null;

  const addDebug = (msg: string) => {
    console.log('[PreviewPanel DEBUG]', msg);
    setDebugInfo(prev => [...prev.slice(-9), msg]);
  };

  const needsJoinQuery = (): boolean => {
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

  const extractProductFilters = (): string[] => {
    const productFilters: string[] = [];

    for (const block of state.logicBlocks || []) {
      if (block.type === 'filter' && block.conditions) {
        for (const condition of block.conditions) {
          if (condition.field?.includes('description') || condition.field?.includes('shipment_item')) {
            if (typeof condition.value === 'string') {
              const values = condition.value.split('|').map(v => v.trim()).filter(v => v);
              productFilters.push(...values);
            } else if (Array.isArray(condition.value)) {
              productFilters.push(...condition.value.filter(v => v));
            }
          }
        }
      }
    }

    return productFilters;
  };

  const fetchPreviewData = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo([]);

    const productFilters = extractProductFilters();
    const needsJoin = needsJoinQuery();

    addDebug(`Starting fetch - needsJoin: ${needsJoin}, filters: ${productFilters.join(', ') || 'none'}`);
    addDebug(`Customer: ${previewCustomerId ?? 'ALL'}`);

    try {
      addDebug('Step 1: Checking shipment_item table...');
      const { data: itemCheck, error: itemError, count: itemCount } = await supabase
        .from('shipment_item')
        .select('load_id, description', { count: 'exact' })
        .limit(3);

      if (itemError) {
        addDebug(`ERROR: shipment_item query failed: ${itemError.message}`);
        throw new Error(`shipment_item check failed: ${itemError.message}`);
      }

      addDebug(`shipment_item has ${itemCount ?? 0} rows. Sample: ${JSON.stringify(itemCheck?.slice(0, 2))}`);

      addDebug('Step 2: Checking shipment table...');
      let shipmentQuery = supabase
        .from('shipment')
        .select('load_id, customer_id, retail', { count: 'exact' })
        .limit(3);

      if (!isAllCustomers && previewCustomerId) {
        shipmentQuery = shipmentQuery.eq('customer_id', previewCustomerId);
      }

      const { data: shipmentCheck, error: shipmentError, count: shipmentCount } = await shipmentQuery;

      if (shipmentError) {
        addDebug(`ERROR: shipment query failed: ${shipmentError.message}`);
        throw new Error(`shipment check failed: ${shipmentError.message}`);
      }

      addDebug(`shipment has ${shipmentCount ?? 0} rows for customer ${previewCustomerId ?? 'ALL'}`);

      if (needsJoin && (itemCount ?? 0) > 0) {
        addDebug('Step 3: Attempting join query...');

        let joinQuery = supabase
          .from('shipment')
          .select(`
            load_id,
            retail,
            customer_id,
            shipment_item (
              description,
              weight
            )
          `)
          .limit(20);

        if (!isAllCustomers && previewCustomerId) {
          joinQuery = joinQuery.eq('customer_id', previewCustomerId);
        }

        const { data: joinData, error: joinError } = await joinQuery;

        if (joinError) {
          addDebug(`ERROR: Join query failed: ${joinError.message}`);
        } else {
          addDebug(`Join returned ${joinData?.length ?? 0} shipments`);

          const withItems = (joinData || []).filter(s =>
            s.shipment_item && (Array.isArray(s.shipment_item) ? s.shipment_item.length > 0 : true)
          );
          addDebug(`${withItems.length} shipments have items`);

          if (withItems.length > 0) {
            let rawData = (joinData || []).flatMap(ship => {
              const items = Array.isArray(ship.shipment_item) ? ship.shipment_item :
                ship.shipment_item ? [ship.shipment_item] : [];
              return items.filter(Boolean).map((item: any) => ({
                load_id: ship.load_id,
                retail: ship.retail,
                customer_id: ship.customer_id,
                description: item.description,
                weight: item.weight
              }));
            });

            addDebug(`Flattened to ${rawData.length} item rows`);

            if (productFilters.length > 0 && rawData.length > 0) {
              const beforeFilter = rawData.length;
              rawData = rawData.filter((row: any) => {
                const desc = (row.description || '').toLowerCase();
                return productFilters.some(term => desc.includes(term.toLowerCase()));
              });
              addDebug(`After filter: ${beforeFilter} -> ${rawData.length} rows`);
            }

            if (rawData.length > 0) {
              setRowCount(rawData.length);
              const processedData = processDataForVisualization(rawData, state.visualization, productFilters);
              addDebug(`Processed to ${processedData.length} chart items`);
              setData(processedData);
              setLoading(false);
              return;
            }
          }
        }
      }

      addDebug('Step 4: Using shipment_report_view fallback...');

      let query = supabase
        .from('shipment_report_view')
        .select('*', { count: 'exact' })
        .limit(500);

      if (!isAllCustomers && previewCustomerId) {
        query = query.eq('customer_id', previewCustomerId);
      }

      const { data: viewData, error: viewError, count: viewCount } = await query;

      if (viewError) {
        addDebug(`ERROR: shipment_report_view failed: ${viewError.message}`);
        throw viewError;
      }

      addDebug(`shipment_report_view returned ${viewCount ?? 0} rows`);

      if ((viewData?.length ?? 0) > 0) {
        setRowCount(viewCount);
        const processedData = processDataForVisualization(viewData || [], state.visualization, []);
        addDebug(`Processed to ${processedData.length} chart items`);
        setData(processedData);
      } else {
        addDebug('No data found in any source');
        setData([]);
        setRowCount(0);
      }

    } catch (err) {
      console.error('[PreviewPanel] Error:', err);
      addDebug(`FATAL ERROR: ${err instanceof Error ? err.message : String(err)}`);
      setError(err instanceof Error ? err.message : 'Query failed');
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
    state.logicBlocks,
    previewCustomerId,
  ]);

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-white p-6'
    : 'p-4';

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Database className="w-3 h-3" />
            {rowCount !== null ? `${rowCount.toLocaleString()} rows` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`p-1.5 rounded transition-colors ${showDebug ? 'text-orange-600 bg-orange-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            title="Toggle debug info"
          >
            <Bug className="w-4 h-4" />
          </button>
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
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {showDebug && (
        <div className="mb-4 p-2 bg-slate-800 text-green-400 rounded text-xs font-mono overflow-auto max-h-32">
          {debugInfo.length === 0 ? (
            <div className="text-slate-500">Waiting for query...</div>
          ) : (
            debugInfo.map((msg, i) => (
              <div key={i} className={msg.includes('ERROR') ? 'text-red-400' : ''}>{msg}</div>
            ))
          )}
        </div>
      )}

      <div className={`bg-slate-50 rounded-lg ${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-64'}`}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 mt-2">Loading preview...</p>
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
              <p className="text-xs mt-1">Check debug panel for details</p>
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
        <span>Customer: {previewCustomerId ?? 'All'}</span>
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
          <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
            {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={90} />
            <Tooltip formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
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
              outerRadius={80}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
          </RechartsPieChart>
        </ResponsiveContainer>
      );

    case 'kpi':
      const value = data[0]?.value || 0;
      const format = config.kpi?.format || 'number';
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
          </div>
        </div>
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

    case 'choropleth':
      return (
        <div className="h-full flex items-center justify-center p-4">
          <div className="text-center">
            <MapIcon className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600">Choropleth Map Preview</p>
            <p className="text-xs text-slate-400 mt-1">
              {config.geo?.mapKey || 'us_states'} - {data.length} regions
            </p>
          </div>
        </div>
      );

    case 'flow':
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
            <p className="text-xs text-slate-400 mt-1">{data.length} origin-destination pairs</p>
          </div>
        </div>
      );

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

function processDataForVisualization(rawData: any[], config: any, productFilters: string[]): any[] {
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

  if (productFilters.length > 0 && rawData[0]?.description) {
    const productGroups: Record<string, number[]> = {};

    for (const product of productFilters) {
      productGroups[product] = [];
    }

    for (const row of rawData) {
      const desc = (row.description || '').toLowerCase();
      for (const product of productFilters) {
        if (desc.includes(product.toLowerCase())) {
          const value = Number(row.retail) || 0;
          productGroups[product].push(value);
          break;
        }
      }
    }

    const results = Object.entries(productGroups).map(([name, values]) => ({
      name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      value: aggregateArray(values, aggregation || 'avg'),
    }));

    return results
      .filter(r => r.value > 0)
      .sort((a, b) => b.value - a.value);
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
    let key = String(row[groupField] || 'Unknown');

    if (key.length > 30) {
      key = key.substring(0, 27) + '...';
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
