import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AlertCircle, Loader2, Package, Truck, CheckCircle, DollarSign, TrendingUp, LineChart as LineChartIcon, PieChart as PieChartIcon, Map, Clock, Calendar, BarChart3, BarChart, Globe, Route, Navigation, Receipt, Award, Percent, Camera, RefreshCw, FileText, Table2 } from 'lucide-react';
import { WidgetDefinition, DateRange, WidgetSizeLevel } from '../types/widgets';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart as RechartsBarChart, Bar } from 'recharts';
import { ShipmentFlowMap } from './dashboard/ShipmentFlowMap';
import { CostPerStateMap } from './dashboard/CostPerStateMap';
import { WidgetContextFooter } from './dashboard/WidgetContextFooter';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { WidgetRenderer, getWidgetDisplayType } from './widgets/WidgetRenderer';
import { WidgetAlertBadge } from './dashboard/widgets';
import { executeCustomWidgetQuery } from '../utils/customWidgetExecutor';
import { getColumnById } from '../config/reportColumns';
import { useLookupTables } from '../hooks/useLookupTables';
import { format } from 'date-fns';
import { AskAIButton } from './ui/AskAIButton';

interface DashboardWidgetCardProps {
  widget: WidgetDefinition | any;
  customerId: string | undefined;
  dateRange: DateRange;
  comparisonDateRange?: DateRange;
  isEditing: boolean;
  isCustomWidget?: boolean;
  sizeLevel?: WidgetSizeLevel;
  scaleFactor?: number;
  onRemove: () => void;
  onCycleSize?: () => void;
  onResetSize?: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  Package,
  Truck,
  CheckCircle,
  DollarSign,
  TrendingUp,
  LineChart: LineChartIcon,
  PieChart: PieChartIcon,
  Map,
  Clock,
  Calendar,
  BarChart3,
  BarChart,
  Globe,
  Route,
  Navigation,
  Receipt,
  Award,
  Percent,
};

import { chartColors } from '../config/chartTheme';
const COLORS = chartColors.primary;

export function DashboardWidgetCard({
  widget,
  customerId,
  dateRange,
  comparisonDateRange,
  isEditing,
  isCustomWidget = false,
  sizeLevel = 'default',
  scaleFactor = 1,
  onRemove,
  onCycleSize,
  onResetSize,
}: DashboardWidgetCardProps) {
  const navigate = useNavigate();
  const { isAdmin, effectiveCustomerIds, isViewingAsCustomer } = useAuth();
  const { lookups } = useLookupTables();
  const [showTableView, setShowTableView] = useState(false);

  const sourceReport = widget.sourceReport;
  const hasSourceReport = isCustomWidget && !!sourceReport?.id;

  const handleViewSourceReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sourceReport?.id) {
      navigate(`/custom-reports/${sourceReport.id}`);
    }
  };

  const isVisualBuilderWidget = isCustomWidget && widget.dataSource?.groupByColumn && widget.dataSource?.metricColumn;
  const isMultiDimensionWidget = isVisualBuilderWidget && widget.dataSource?.isMultiDimension && widget.dataSource?.secondaryGroupBy;

  if (isCustomWidget) {
    console.log('[DashboardWidgetCard] Custom widget check:', {
      widgetId: widget.id,
      widgetName: widget.name,
      isCustomWidget,
      hasDataSource: !!widget.dataSource,
      groupByColumn: widget.dataSource?.groupByColumn,
      metricColumn: widget.dataSource?.metricColumn,
      isVisualBuilderWidget,
      dataMode: widget.dataMode,
    });
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['widget', widget.id, effectiveCustomerIds, dateRange.start, dateRange.end, isViewingAsCustomer, isCustomWidget],
    queryFn: async () => {
      if (isCustomWidget) {
        if (widget.dataMode === 'static' && widget.snapshotData) {
          const snapshot = widget.snapshotData;

          const normalizeChartData = (data: any[]): any[] => {
            if (!data || data.length === 0) return [];
            const first = data[0];
            if ('name' in first && 'value' in first) {
              return data;
            }
            const keys = Object.keys(first);
            if (keys.length >= 2) {
              const nameKey = keys.find(k => typeof first[k] === 'string') || keys[0];
              const valueKey = keys.find(k => typeof first[k] === 'number' && k !== nameKey) || keys[1];
              return data.map(item => ({
                name: String(item[nameKey] ?? ''),
                value: Number(item[valueKey]) || 0,
              }));
            }
            if (keys.length === 1) {
              return data.map((item, idx) => ({
                name: `Item ${idx + 1}`,
                value: Number(item[keys[0]]) || 0,
              }));
            }
            return data;
          };

          if (snapshot.type === 'chart' && Array.isArray(snapshot.data)) {
            return { data: normalizeChartData(snapshot.data), type: 'chart' };
          }
          if (snapshot.type === 'table' && Array.isArray(snapshot.data)) {
            const columns = snapshot.columns || (snapshot.data[0] ? Object.keys(snapshot.data[0]).map(k => ({ field: k, label: k })) : []);
            return { data: snapshot.data, type: 'table', columns };
          }
          if (snapshot.type === 'kpi') {
            return snapshot;
          }
          if (Array.isArray(snapshot)) {
            return { data: normalizeChartData(snapshot), type: 'chart' };
          }
          const dataArray = snapshot.data || [];
          return { data: normalizeChartData(dataArray), type: snapshot.type || 'chart' };
        }

        if (isVisualBuilderWidget) {
          const { groupByColumn, metricColumn, aggregation, filters, aiConfig, secondaryGroupBy, isMultiDimension: isMultiDim } = widget.dataSource;

          console.log('[DashboardWidgetCard] Visual Builder query config:', {
            groupByColumn,
            secondaryGroupBy,
            isMultiDim,
            metricColumn,
            aggregation,
            filters,
            aiConfig,
            dateRange,
            customerId,
          });

          const isProductQuery = groupByColumn === 'item_description' || groupByColumn === 'description';
          const tableName = isProductQuery ? 'shipment_item' : 'shipment';
          const groupByField = isProductQuery ? 'description' : groupByColumn;

          if (isMultiDim && secondaryGroupBy && aiConfig?.searchTerms && aiConfig.searchTerms.length > 0) {
            console.log('[DashboardWidgetCard] Multi-dimension query - grouping by', groupByField, 'and', secondaryGroupBy);
            console.log('[DashboardWidgetCard] Search terms:', aiConfig.searchTerms);

            try {
              const allRawData: Array<{ primary_group: string; secondary_group: string; value: number; count: number }> = [];

              for (const term of aiConfig.searchTerms) {
                console.log(`[DashboardWidgetCard] Multi-dim querying: "${term}"`);
                const termFilters: Array<{ field: string; operator: string; value: string }> = [
                  { field: 'pickup_date', operator: 'gte', value: dateRange.start },
                  { field: 'pickup_date', operator: 'lte', value: dateRange.end },
                  { field: 'description', operator: 'ilike', value: term }
                ];

                const { data: termResult, error: termError } = await supabase.rpc('mcp_aggregate', {
                  p_table_name: tableName,
                  p_customer_id: customerId ? parseInt(customerId) : 0,
                  p_is_admin: isAdmin(),
                  p_group_by: `${groupByField},${secondaryGroupBy}`,
                  p_metric: metricColumn,
                  p_aggregation: aggregation || 'avg',
                  p_filters: termFilters,
                  p_limit: 100,
                });

                console.log(`[DashboardWidgetCard] Multi-dim "${term}" response:`, { termResult, termError });

                if (termError) {
                  console.error(`[DashboardWidgetCard] Multi-dim error for "${term}":`, termError);
                  continue;
                }

                const parsed = typeof termResult === 'string' ? JSON.parse(termResult) : termResult;
                const rows = parsed?.data || [];
                console.log(`[DashboardWidgetCard] Multi-dim "${term}" parsed rows:`, rows.length);

                const categoryStates = new Map<string, { total: number; count: number }>();
                for (const row of rows) {
                  const state = row.secondary_group || 'Unknown';
                  if (!categoryStates.has(state)) {
                    categoryStates.set(state, { total: 0, count: 0 });
                  }
                  const stateData = categoryStates.get(state)!;
                  if ((aggregation || 'avg') === 'avg') {
                    stateData.total += row.value * (row.count || 1);
                    stateData.count += (row.count || 1);
                  } else {
                    stateData.total += row.value;
                    stateData.count += (row.count || 1);
                  }
                }

                for (const [state, data] of categoryStates) {
                  const value = (aggregation || 'avg') === 'avg' && data.count > 0
                    ? data.total / data.count
                    : data.total;
                  allRawData.push({
                    primary_group: term,
                    secondary_group: state,
                    value: Math.round(value * 100) / 100,
                    count: data.count
                  });
                }
              }

              const secondaryGroups = [...new Set(allRawData.map(d => d.secondary_group))].filter(Boolean).sort();
              const groupedMap = new Map<string, Record<string, number | string>>();

              for (const row of allRawData) {
                if (!groupedMap.has(row.primary_group)) {
                  groupedMap.set(row.primary_group, { name: row.primary_group });
                }
                groupedMap.get(row.primary_group)![row.secondary_group] = row.value;
              }

              const chartData = Array.from(groupedMap.values());
              console.log('[DashboardWidgetCard] Multi-dim result:', chartData.length, 'categories,', secondaryGroups.length, 'states');
              console.log('[DashboardWidgetCard] Multi-dim chartData:', chartData);

              return {
                data: chartData,
                type: 'grouped_bar',
                secondaryGroups,
                isMultiDimension: true
              };
            } catch (err) {
              console.error('[DashboardWidgetCard] Multi-dim block exception:', err);
              throw err;
            }
          }

          const hasMultipleSearchTerms = aiConfig?.searchTerms && aiConfig.searchTerms.length > 1;

          if (hasMultipleSearchTerms && isProductQuery) {
            console.log('[DashboardWidgetCard] Multi-product query - querying each term separately');
            const allResults: Array<{ name: string; value: number }> = [];

            for (const term of aiConfig.searchTerms) {
              const termFilters: Array<{ field: string; operator: string; value: string }> = [
                { field: 'pickup_date', operator: 'gte', value: dateRange.start },
                { field: 'pickup_date', operator: 'lte', value: dateRange.end },
                { field: 'description', operator: 'ilike', value: term }
              ];

              const { data: termResult, error: termError } = await supabase.rpc('mcp_aggregate', {
                p_table_name: tableName,
                p_customer_id: customerId ? parseInt(customerId) : 0,
                p_is_admin: isAdmin(),
                p_group_by: groupByField,
                p_metric: metricColumn,
                p_aggregation: aggregation || 'avg',
                p_filters: termFilters,
                p_limit: 100,
              });

              if (termError) {
                console.error(`[DashboardWidgetCard] Error querying "${term}":`, termError);
                continue;
              }

              let termRows: any[] = [];
              if (typeof termResult === 'string') {
                const parsed = JSON.parse(termResult);
                termRows = parsed?.data || [];
              } else if (termResult?.data && Array.isArray(termResult.data)) {
                termRows = termResult.data;
              }

              console.log(`[DashboardWidgetCard] "${term}" returned ${termRows.length} rows`);

              if (termRows.length > 0) {
                let totalValue = 0;
                let count = 0;
                for (const row of termRows) {
                  if (row.value !== null && row.value !== undefined) {
                    totalValue += Number(row.value);
                    count++;
                  }
                }
                if (count > 0) {
                  const finalValue = (aggregation || 'avg') === 'avg' ? totalValue / count : totalValue;
                  allResults.push({
                    name: term,
                    value: Math.round(finalValue * 100) / 100
                  });
                  console.log(`[DashboardWidgetCard] ${term}: ${finalValue.toFixed(2)}`);
                }
              }
            }

            console.log('[DashboardWidgetCard] Combined results:', allResults);
            return { data: allResults, type: 'chart', rawData: allResults };
          }

          const queryFilters: Array<{ field: string; operator: string; value: string }> = [
            { field: 'pickup_date', operator: 'gte', value: dateRange.start },
            { field: 'pickup_date', operator: 'lte', value: dateRange.end },
          ];

          if (aiConfig?.searchTerms && aiConfig.searchTerms.length === 1) {
            queryFilters.push({
              field: isProductQuery ? 'description' : 'item_description',
              operator: 'ilike',
              value: aiConfig.searchTerms[0]
            });
          }

          if (filters && Array.isArray(filters)) {
            filters.forEach((f: any) => {
              if (f.value) {
                queryFilters.push({
                  field: f.field === 'item_description' ? 'description' : f.field,
                  operator: f.operator === 'contains' ? 'ilike' : f.operator,
                  value: f.operator === 'contains' ? `%${f.value}%` : f.value,
                });
              }
            });
          }

          console.log('[DashboardWidgetCard] Query params:', {
            tableName,
            groupByField,
            metricColumn,
            aggregation: aggregation || 'avg',
            queryFilters,
          });

          const { data: result, error: queryError } = await supabase.rpc('mcp_aggregate', {
            p_table_name: tableName,
            p_customer_id: customerId ? parseInt(customerId) : 0,
            p_is_admin: isAdmin(),
            p_group_by: groupByField,
            p_metric: metricColumn,
            p_aggregation: aggregation || 'avg',
            p_filters: queryFilters,
            p_limit: 20,
          });

          if (queryError) {
            console.error('[DashboardWidgetCard] Query error:', queryError);
            throw new Error(queryError.message);
          }

          console.log('[DashboardWidgetCard] Query result:', result);
          console.log('[DashboardWidgetCard] Result type:', typeof result);
          console.log('[DashboardWidgetCard] Result keys:', result ? Object.keys(result) : 'null');
          console.log('[DashboardWidgetCard] Result stringified:', JSON.stringify(result).substring(0, 1000));

          let rows: any[] = [];

          if (typeof result === 'string') {
            const parsed = JSON.parse(result);
            rows = parsed?.data || [];
          } else if (result?.data?.data && Array.isArray(result.data.data)) {
            console.log('[DashboardWidgetCard] Found nested data.data structure');
            rows = result.data.data;
          } else if (result?.data && Array.isArray(result.data)) {
            console.log('[DashboardWidgetCard] Found direct data array');
            rows = result.data;
          } else if (Array.isArray(result)) {
            console.log('[DashboardWidgetCard] Result is array');
            rows = result;
          } else if (result && typeof result === 'object') {
            console.log('[DashboardWidgetCard] Searching for data in object');
            const firstKey = Object.keys(result)[0];
            if (firstKey && result[firstKey]?.data) {
              rows = Array.isArray(result[firstKey].data) ? result[firstKey].data : [];
            } else if (firstKey && Array.isArray(result[firstKey])) {
              rows = result[firstKey];
            }
          }

          console.log('[DashboardWidgetCard] Parsed rows:', rows);
          console.log('[DashboardWidgetCard] Rows length:', rows.length);

          const chartData = rows.map((row: any) => ({
            name: String(row.label || row.name || 'Unknown'),
            value: Number(row.value || 0),
          }));

          console.log('[DashboardWidgetCard] Chart data:', chartData);

          return { data: chartData, type: 'chart', rawData: rows };
        }

        if (widget.dataSource?.query) {
          const result = await executeCustomWidgetQuery(
            supabase,
            widget.dataSource.query,
            {
              customerId: customerId ? parseInt(customerId) : undefined,
              dateRange: { start: dateRange.start, end: dateRange.end },
            }
          );

          if (result.error) {
            throw new Error(result.error);
          }

          return { data: result.data, type: 'chart' };
        }
      }

      return widget.calculate({
        supabase,
        customerId,
        effectiveCustomerIds,
        isAdmin: isAdmin(),
        isViewingAsCustomer,
        dateRange,
      });
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const Icon = iconMap[widget.icon || widget.display?.icon] || Package;
  const dataMode = widget.dataMode || 'dynamic';
  const isStaticWidget = isCustomWidget && dataMode === 'static';

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-sm text-red-600">Failed to load data</p>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          No data available
        </div>
      );
    }

    if (isCustomWidget && data.data) {
      const widgetType = getWidgetDisplayType(widget);
      const isCurrency = widget.visualization?.format === 'currency' ||
                         widget.dataSource?.query?.columns?.some((c: any) =>
                           c.field?.includes('retail') || c.field?.includes('cost') || c.field?.includes('margin')
                         ) ||
                         widget.dataSource?.metricColumn?.includes('cost') ||
                         widget.dataSource?.metricColumn?.includes('retail');

      if (isVisualBuilderWidget && showTableView && data.data.length > 0) {
        const metricLabel = widget.dataSource?.metricColumn || 'Value';
        const groupLabel = widget.dataSource?.groupByColumn || 'Category';

        return (
          <div className="overflow-auto" style={{ maxHeight: `${300 * scaleFactor}px` }}>
            <table className="w-full" style={{ fontSize: `${14 * scaleFactor}px` }}>
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 text-left text-slate-700 font-semibold border-b capitalize" style={{ paddingTop: `${12 * scaleFactor}px`, paddingBottom: `${12 * scaleFactor}px` }}>
                    {groupLabel.replace(/_/g, ' ')}
                  </th>
                  <th className="px-4 text-right text-slate-700 font-semibold border-b capitalize" style={{ paddingTop: `${12 * scaleFactor}px`, paddingBottom: `${12 * scaleFactor}px` }}>
                    {metricLabel.replace(/_/g, ' ')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((row: any, idx: number) => (
                  <tr key={idx} className="border-b hover:bg-slate-50">
                    <td className="px-4 text-slate-700" style={{ paddingTop: `${12 * scaleFactor}px`, paddingBottom: `${12 * scaleFactor}px` }}>
                      {row.name || row.label || 'Unknown'}
                    </td>
                    <td className="px-4 text-right text-slate-700 font-medium" style={{ paddingTop: `${12 * scaleFactor}px`, paddingBottom: `${12 * scaleFactor}px` }}>
                      {isCurrency
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.value)
                        : typeof row.value === 'number'
                        ? row.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      if ((widgetType === 'table' || data.type === 'table') && data.columns) {
        const columns = data.columns;

        const formatTableCell = (value: any, columnId: string): string => {
          if (value === null || value === undefined) return '-';

          const columnDef = getColumnById(columnId);
          const type = columnDef?.type;
          const formatType = columnDef?.format;

          if (type === 'lookup' && lookups) {
            const numVal = typeof value === 'number' ? value : parseInt(String(value), 10);
            if (columnId === 'mode_id') {
              return lookups.modes.get(numVal)?.code || lookups.modes.get(numVal)?.name || String(value);
            }
            if (columnId === 'status_id') {
              return lookups.statuses.get(numVal)?.code || lookups.statuses.get(numVal)?.name || String(value);
            }
            if (columnId === 'equipment_type_id') {
              return lookups.equipmentTypes.get(numVal)?.code || lookups.equipmentTypes.get(numVal)?.name || String(value);
            }
            return String(value);
          }

          if (type === 'date') {
            try {
              return format(new Date(value), 'MMM dd, yyyy');
            } catch {
              return String(value);
            }
          }

          if (type === 'number') {
            if (formatType === 'currency') {
              return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }).format(value);
            }
            if (formatType === 'integer' || columnId.endsWith('_id') || columnId === 'load_id') {
              return String(value);
            }
            return new Intl.NumberFormat('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }).format(value);
          }

          if (type === 'boolean') {
            return value ? 'Yes' : 'No';
          }

          return String(value);
        };

        return (
          <div className="overflow-auto" style={{ maxHeight: `${300 * scaleFactor}px` }}>
            <table className="w-full" style={{ fontSize: `${14 * scaleFactor}px` }}>
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {columns.map((col: any, i: number) => {
                    const columnDef = getColumnById(col.field);
                    return (
                      <th key={i} className="px-4 text-left text-slate-700 font-semibold border-b" style={{ paddingTop: `${12 * scaleFactor}px`, paddingBottom: `${12 * scaleFactor}px` }}>
                        {columnDef?.label || col.label || col.field}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.data.slice(0, 10).map((row: any, idx: number) => (
                  <tr key={idx} className="border-b hover:bg-slate-50">
                    {columns.map((col: any, j: number) => (
                      <td key={j} className="px-4 text-slate-700" style={{ paddingTop: `${12 * scaleFactor}px`, paddingBottom: `${12 * scaleFactor}px` }}>
                        {formatTableCell(row[col.field], col.field)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.data.length > 10 && (
              <p className="text-xs text-slate-400 text-center py-2">...and {data.data.length - 10} more rows</p>
            )}
          </div>
        );
      }

      return (
        <WidgetRenderer
          type={widgetType}
          data={data.data}
          valuePrefix={isCurrency ? '$' : ''}
          height={240 * scaleFactor}
          showLegend={widgetType === 'pie' || widgetType === 'pie_chart' || widgetType === 'grouped_bar'}
          loading={false}
          secondaryGroups={data.secondaryGroups}
        />
      );
    }

    switch (widget.type) {
      case 'kpi':
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <p style={{ fontSize: `${36 * scaleFactor}px` }} className="font-bold text-slate-800">
              {data.format === 'currency'
                ? `$${typeof data.value === 'number' ? data.value.toFixed(2) : data.value}`
                : data.format === 'percentage'
                ? `${typeof data.value === 'number' ? data.value.toFixed(1) : data.value}%`
                : typeof data.value === 'number'
                ? data.value.toLocaleString()
                : data.value}
            </p>
            {data.label && <p style={{ fontSize: `${14 * scaleFactor}px` }} className="text-slate-600 mt-2">{data.label}</p>}
          </div>
        );

      case 'featured_kpi':
        return (
          <div className={`flex flex-col items-center justify-center h-full bg-gradient-to-br ${widget.gradient} rounded-lg -m-4 text-white`}>
            <p style={{ fontSize: `${48 * scaleFactor}px` }} className="font-bold">
              {data.format === 'currency'
                ? `$${typeof data.value === 'number' ? data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : data.value}`
                : typeof data.value === 'number'
                ? data.value.toLocaleString()
                : data.value}
            </p>
            {data.label && <p style={{ fontSize: `${14 * scaleFactor}px` }} className="opacity-90 mt-2">{data.label}</p>}
          </div>
        );

      case 'line_chart':
        if (!data.data || data.data.length === 0) {
          return (
            <div className="flex items-center justify-center" style={{ minHeight: `${240 * scaleFactor}px` }}>
              <span className="text-slate-500" style={{ fontSize: `${14 * scaleFactor}px` }}>No data for this period</span>
            </div>
          );
        }
        return (
          <div className="w-full" style={{ height: `${240 * scaleFactor}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12 * scaleFactor} />
                <YAxis stroke="#64748b" fontSize={12 * scaleFactor} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="total" stroke={chartColors.primary[0]} strokeWidth={2 * scaleFactor} dot={{ r: 4 * scaleFactor }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case 'bar_chart':
        if (!data.data || data.data.length === 0) {
          return (
            <div className="flex items-center justify-center" style={{ minHeight: `${240 * scaleFactor}px` }}>
              <span className="text-slate-500" style={{ fontSize: `${14 * scaleFactor}px` }}>No data for this period</span>
            </div>
          );
        }
        return (
          <div className="w-full" style={{ height: `${240 * scaleFactor}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={data.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey={Object.keys(data.data[0])[0]} stroke="#64748b" fontSize={12 * scaleFactor} />
                <YAxis stroke="#64748b" fontSize={12 * scaleFactor} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey={Object.keys(data.data[0])[1]} fill={chartColors.primary[0]} radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'pie_chart':
        if (!data.data || data.data.length === 0) {
          return (
            <div className="flex items-center justify-center" style={{ minHeight: `${200 * scaleFactor}px` }}>
              <span className="text-slate-500" style={{ fontSize: `${14 * scaleFactor}px` }}>No data for this period</span>
            </div>
          );
        }

        const pieData = data.data;
        const chartSize = 200 * scaleFactor;
        const innerRadius = 55 * scaleFactor;
        const outerRadius = 80 * scaleFactor;

        return (
          <div className="flex flex-col">
            <div style={{ height: `${chartSize}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={`${innerRadius}px`}
                    outerRadius={`${outerRadius}px`}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="pt-4 border-t mt-4">
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                {pieData.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-2" style={{ fontSize: `${14 * scaleFactor}px` }}>
                    <div
                      className="rounded-full flex-shrink-0"
                      style={{
                        width: `${12 * scaleFactor}px`,
                        height: `${12 * scaleFactor}px`,
                        backgroundColor: COLORS[index % COLORS.length]
                      }}
                    />
                    <span className="text-slate-700">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'table':
        if (!data.data || data.data.length === 0) {
          return (
            <div className="flex items-center justify-center" style={{ minHeight: `${200 * scaleFactor}px` }}>
              <span className="text-slate-500" style={{ fontSize: `${14 * scaleFactor}px` }}>No data for this period</span>
            </div>
          );
        }
        const columns = Object.keys(data.data[0]);
        const fontSize = 14 * scaleFactor;
        const showsAllData = data.data.length <= 8;
        const maxTableHeight = 400 * scaleFactor;

        return (
          <div className={`flex flex-col ${showsAllData ? '' : 'h-[400px]'}`}>
            <div className={`flex-1 overflow-x-auto ${showsAllData ? '' : 'overflow-y-auto'}`}>
              <table className="w-full" style={{ fontSize: `${fontSize}px` }}>
                <thead className={`bg-slate-50 ${showsAllData ? '' : 'sticky top-0 z-10'}`}>
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-4 text-left text-slate-700 font-semibold border-b capitalize" style={{ paddingTop: `${12 * scaleFactor}px`, paddingBottom: `${12 * scaleFactor}px` }}>
                        {col.replace(/([A-Z])/g, ' $1').trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      {columns.map((col) => (
                        <td key={col} className="px-4 text-slate-700" style={{ paddingTop: `${12 * scaleFactor}px`, paddingBottom: `${12 * scaleFactor}px` }}>
                          {typeof row[col] === 'number' && col.toLowerCase().includes('cost')
                            ? `$${row[col].toFixed(2)}`
                            : typeof row[col] === 'number'
                            ? row[col].toLocaleString()
                            : row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'map':
        if (widget.id === 'flow_map') {
          const mapHeight = 400 * scaleFactor;
          return (
            <div className="w-full" style={{ aspectRatio: '16/9', minHeight: `${mapHeight}px` }}>
              <ShipmentFlowMap
                effectiveCustomerIds={data.effectiveCustomerIds || []}
                isAdmin={data.isAdmin || false}
                isViewingAsCustomer={data.isViewingAsCustomer || false}
                startDate={data.startDate || dateRange.start}
                endDate={data.endDate || dateRange.end}
              />
            </div>
          );
        } else if (widget.id === 'cost_by_state') {
          const mapHeight = 400 * scaleFactor;
          if (!data.data || data.data.length === 0) {
            return (
              <div className="flex items-center justify-center" style={{ minHeight: `${mapHeight}px` }}>
                <span className="text-slate-500" style={{ fontSize: `${14 * scaleFactor}px` }}>No data for this period</span>
              </div>
            );
          }
          return (
            <div className="w-full" style={{ aspectRatio: '4/3', minHeight: `${mapHeight}px` }}>
              <CostPerStateMap data={data.data} />
            </div>
          );
        }
        return (
          <div className="text-slate-500" style={{ fontSize: `${14 * scaleFactor}px` }}>Map not configured</div>
        );

      default:
        return <div className="text-slate-500 text-sm">Unsupported widget type: {widget.type}</div>;
    }
  };

  const isHeroWidget = widget.size === 'hero';

  const getWidgetMinHeight = () => {
    const baseHeights = {
      kpi: 160,
      featured_kpi: 180,
      line_chart: 320,
      bar_chart: 320,
      map: widget.size === 'hero' ? 500 : 400,
    };

    const baseHeight = baseHeights[widget.type as keyof typeof baseHeights];
    if (!baseHeight) return '';

    const scaledHeight = Math.round(baseHeight * scaleFactor);
    return `min-h-[${scaledHeight}px]`;
  };

  const formatSnapshotDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-md border border-slate-200 flex flex-col relative ${getWidgetMinHeight()}`}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <div className={`${isHeroWidget ? 'w-10 h-10' : 'w-8 h-8'} rounded-xl ${widget.iconColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`${isHeroWidget ? 'w-5 h-5' : 'w-4 h-4'} text-white`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`${isHeroWidget ? 'text-base' : 'text-sm'} font-semibold text-slate-900 truncate`}>{widget.name}</h3>
            {isStaticWidget && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded"
                title={widget.snapshotDate ? `Snapshot from ${formatSnapshotDate(widget.snapshotDate)}` : 'Static snapshot'}
              >
                <Camera className="w-3 h-3" />
              </span>
            )}
            <WidgetAlertBadge widgetKey={widget.id} />
          </div>
          {isHeroWidget && <p className="text-xs text-slate-500 truncate">{widget.description}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isVisualBuilderWidget && !isLoading && data && (
            <button
              onClick={() => setShowTableView(!showTableView)}
              className={`p-1.5 rounded-lg transition-colors ${
                showTableView
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
              }`}
              title={showTableView ? 'Show chart view' : 'Show table view'}
            >
              <Table2 className="w-4 h-4" />
            </button>
          )}
          {!isLoading && !error && data && customerId && (
            <AskAIButton
              context={{
                type: 'widget',
                title: widget.name,
                data: data,
                dateRange: {
                  start: dateRange.start || '',
                  end: dateRange.end || '',
                },
                customerId: parseInt(customerId),
              }}
              suggestedPrompt={`Analyze my ${widget.name} data and provide insights`}
              variant="icon"
              size="sm"
            />
          )}
          {hasSourceReport && (
            <button
              onClick={handleViewSourceReport}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors"
              title="View full report"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className={`${widget.type === 'map' ? '' : 'p-4'} flex-1 flex flex-col`}>
        <div className="flex-1">
          <WidgetErrorBoundary widgetName={widget.name}>
            {renderContent()}
          </WidgetErrorBoundary>
        </div>

        {data && (data.type === 'kpi' || widget.type === 'kpi' || widget.type === 'featured_kpi') && (
          <WidgetContextFooter
            recordCount={data.metadata?.recordCount}
            dateRange={data.metadata?.dateRange || { start: dateRange.start, end: dateRange.end }}
            tooltip={widget.tooltip}
            dataDefinition={widget.dataDefinition}
          />
        )}
      </div>
    </div>
  );
}
