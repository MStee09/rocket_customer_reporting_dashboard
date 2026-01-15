import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSupabase } from '../../../hooks/useSupabase';
import { isSystemWidget, customerWidgets, adminWidgets } from '../../../config/widgets';
import { executeCustomWidgetQuery } from '../../../utils/customWidgetExecutor';
import { WidgetRenderer, getWidgetDisplayType } from '../WidgetRenderer';
import { logger } from '../../../utils/logger';

interface QueryColumn {
  field: string;
  alias?: string;
  aggregate?: string;
  format?: string;
}

interface WidgetDataSource {
  query?: {
    columns: QueryColumn[];
    table?: string;
    filters?: unknown[];
    groupBy?: string[];
  };
}

interface WidgetVisualization {
  type?: string;
  format?: string;
}

interface WidgetConfig {
  id: string;
  name: string;
  type?: string;
  dataSource?: WidgetDataSource;
  visualization?: WidgetVisualization;
  calculate?: (params: {
    supabase: ReturnType<typeof useSupabase>;
    customerId?: number;
    dateRange: { start: string; end: string };
  }) => Promise<PreviewData>;
}

interface Customer {
  customer_id: number;
  company_name: string;
}

interface TableColumn {
  key: string;
  label: string;
  align: string;
  format?: string;
}

interface KpiPreviewData {
  type: 'kpi';
  value: number;
  format: string;
  label: string;
}

interface ChartPreviewData {
  type: 'chart';
  data: Record<string, unknown>[];
}

interface TablePreviewData {
  type: 'table';
  data: Record<string, unknown>[];
  columns: TableColumn[];
}

interface PlaceholderPreviewData {
  type: 'placeholder';
  message: string;
}

type PreviewData = KpiPreviewData | ChartPreviewData | TablePreviewData | PlaceholderPreviewData;

interface WidgetPreviewTabProps {
  widget: WidgetConfig;
  isAdmin: boolean;
}

export const WidgetPreviewTab = ({ widget, isAdmin }: WidgetPreviewTabProps) => {
  const supabase = useSupabase();
  const { effectiveCustomerId } = useAuth();

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    effectiveCustomerId || null
  );
  const [dateRangeDays, setDateRangeDays] = useState(180);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateRange = {
    start: new Date(Date.now() - dateRangeDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  };

  useEffect(() => {
    if (effectiveCustomerId) {
      setSelectedCustomerId(effectiveCustomerId);
    }
  }, [effectiveCustomerId]);

  useEffect(() => {
    if (isAdmin) {
      const loadCustomers = async () => {
        const { data } = await supabase
          .from('customer')
          .select('customer_id, company_name')
          .order('company_name');
        setCustomers(data || []);
      };
      loadCustomers();
    }
  }, [isAdmin, supabase]);

  useEffect(() => {
    const loadPreview = async () => {
      setLoading(true);
      setError(null);

      try {
        logger.log('🔍 Loading preview for widget:', widget.name);
        logger.log('Widget structure:', widget);

        if (widget.dataSource?.query) {
          logger.log('📊 Custom widget detected - executing query config');
          logger.log('Using customerId:', selectedCustomerId || effectiveCustomerId || 'none');
          const result = await executeCustomWidgetQuery(
            supabase,
            widget.dataSource.query,
            {
              customerId: selectedCustomerId || effectiveCustomerId || undefined,
              dateRange,
            }
          );

          if (result.error) {
            setError(result.error);
            setPreviewData(null);
          } else {
            const vizType = widget.visualization?.type || widget.type;
            logger.log('✅ Query executed, formatting as:', vizType);

            if (vizType === 'kpi') {
              const total = result.data.reduce((sum, row) => sum + (row.value || 0), 0);
              const format = widget.visualization?.format || 'number';
              setPreviewData({
                type: 'kpi',
                value: total,
                format,
                label: widget.name,
              });
            } else if (vizType === 'pie_chart' || vizType === 'bar_chart' || vizType === 'line_chart') {
              setPreviewData({
                type: 'chart',
                data: result.data,
              });
            } else if (vizType === 'table') {
              const columns = widget.dataSource.query.columns.map((col: QueryColumn): TableColumn => ({
                key: col.alias || col.field,
                label: col.alias || col.field.replace(/_/g, ' ').toUpperCase(),
                align: col.aggregate ? 'right' : 'left',
                format: col.format,
              }));
              setPreviewData({
                type: 'table',
                data: result.data,
                columns,
              });
            } else {
              setPreviewData({
                type: 'chart',
                data: result.data,
              });
            }
          }
        } else {
          logger.log('🎨 System widget detected - using calculate function');
          const isSystem = isSystemWidget(widget.id);
          let widgetDef;

          if (isSystem) {
            widgetDef = customerWidgets[widget.id] || adminWidgets[widget.id];
          } else {
            widgetDef = widget;
          }

          if (widgetDef?.calculate) {
            logger.log('Using customerId for system widget:', selectedCustomerId || effectiveCustomerId || 'none');
            const result = await widgetDef.calculate({
              supabase,
              customerId: selectedCustomerId || effectiveCustomerId || undefined,
              dateRange,
            });
            setPreviewData(result);
          } else {
            setPreviewData({ type: 'placeholder', message: 'Preview not available for this widget type' });
          }
        }
      } catch (err) {
        console.error('❌ Preview error:', err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    if (selectedCustomerId !== null || isAdmin) {
      loadPreview();
    }
  }, [widget, selectedCustomerId, dateRangeDays, supabase, isAdmin]);

  const handleRefresh = () => {
    setLoading(true);
    setDateRangeDays(prev => prev);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-slate-50 rounded-xl">
        <div className="flex flex-wrap items-end gap-4">
          {isAdmin && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Preview as Customer
              </label>
              <select
                value={selectedCustomerId || ''}
                onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rocket-500"
              >
                <option value="">All Customers (Aggregated)</option>
                {customers.map(c => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Date Range
            </label>
            <select
              value={dateRangeDays}
              onChange={(e) => setDateRangeDays(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rocket-500"
            >
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={180}>Last 6 Months</option>
              <option value={365}>Last Year</option>
            </select>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-white rounded-lg border border-slate-200 flex items-center gap-2 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
          Live Preview
          {selectedCustomerId && (
            <span className="text-xs text-slate-500 font-normal">
              (showing data for {customers.find(c => c.customer_id === selectedCustomerId)?.company_name || 'selected customer'})
            </span>
          )}
        </h4>

        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-rocket-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading preview...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-sm text-red-600 font-medium">Failed to load preview</p>
              <p className="text-xs text-red-500 mt-1">{error}</p>
            </div>
          ) : (
            <div className="p-6">
              <PreviewRenderer widget={widget} data={previewData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PreviewRenderer = ({ widget, data }: { widget: WidgetConfig; data: PreviewData | null }) => {
  if (!data) {
    return <p className="text-slate-500 text-center py-8">No data available</p>;
  }

  if (data.type === 'placeholder') {
    return <p className="text-slate-500 text-center py-8">{data.message}</p>;
  }

  const widgetType = getWidgetDisplayType(widget);
  const vizType = widget.visualization?.type || widgetType;

  if (data.type === 'kpi') {
    const valuePrefix = data.format === 'currency' ? '$' : '';
    const valueSuffix = data.format === 'percent' ? '%' : '';

    return (
      <WidgetRenderer
        type="kpi"
        data={[{ name: data.label || widget.name, value: data.value }]}
        title={data.label || widget.name}
        valuePrefix={valuePrefix}
        valueSuffix={valueSuffix}
        height={150}
      />
    );
  }

  if (data.type === 'chart' && data.data) {
    const chartType = vizType === 'pie_chart' ? 'pie' :
                      vizType === 'bar_chart' ? 'bar' :
                      vizType === 'line_chart' ? 'line' : 'bar';

    const isCurrency = widget.visualization?.format === 'currency' ||
                       widget.dataSource?.query?.columns?.some((c: QueryColumn) =>
                         c.field?.includes('retail') || c.field?.includes('cost') || c.field?.includes('margin')
                       );

    return (
      <WidgetRenderer
        type={chartType}
        data={data.data}
        valuePrefix={isCurrency ? '$' : ''}
        height={280}
        showLegend={chartType === 'pie'}
      />
    );
  }

  if (data.type === 'table' && data.data) {
    return (
      <div className="max-h-64 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              {data.columns?.map((col: TableColumn, i: number) => (
                <th key={i} className={`px-3 py-2 font-medium text-slate-600 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {col.label}
                </th>
              )) || (
                Object.keys(data.data[0] || {}).map((key, i) => (
                  <th key={i} className="px-3 py-2 text-left font-medium text-slate-600">{key}</th>
                ))
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.data.slice(0, 10).map((row: Record<string, unknown>, i: number) => (
              <tr key={i}>
                {data.columns?.map((col: TableColumn, j: number) => (
                  <td key={j} className={`px-3 py-2 ${col.align === 'right' ? 'text-right' : 'text-left'} text-slate-700`}>
                    {formatCellValue(row[col.key], col.format)}
                  </td>
                )) || (
                  Object.values(row).map((val: unknown, j: number) => (
                    <td key={j} className="px-3 py-2 text-slate-700">{String(val)}</td>
                  ))
                )}
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
    <div className="p-4 bg-slate-50 rounded-lg overflow-auto max-h-64">
      <pre className="text-xs text-slate-600">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

const formatCellValue = (value: unknown, format?: string): string => {
  if (value === null || value === undefined) return '-';
  if (format === 'currency') return `$${Number(value).toLocaleString()}`;
  if (format === 'percent') return `${Number(value).toFixed(1)}%`;
  if (format === 'number') return Number(value).toLocaleString();
  return String(value);
};

export default WidgetPreviewTab;
