import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
  AreaChart, Area,
} from 'recharts';
import { Loader2 } from 'lucide-react';

export interface WidgetData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface GroupedWidgetData {
  primaryGroup: string;
  [secondaryGroup: string]: string | number;
}

export interface WidgetRenderProps {
  type: string;
  data: WidgetData[] | GroupedWidgetData[];
  title?: string;
  height?: number | string;
  showLegend?: boolean;
  showTooltip?: boolean;
  showLabels?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  valueFormatter?: (value: number) => string;
  colorScheme?: string[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  className?: string;
  secondaryGroups?: string[];
}

import { chartColors } from '../../config/chartTheme';
const DEFAULT_COLORS = chartColors.primary;

const DEFAULT_HEIGHT = 256;

const defaultValueFormatter = (value: number, prefix = '', suffix = ''): string => {
  if (value === null || value === undefined) return '-';

  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return `${prefix}${formatted}${suffix}`;
};

export const WidgetRenderer: React.FC<WidgetRenderProps> = ({
  type,
  data,
  title,
  height = DEFAULT_HEIGHT,
  showLegend = true,
  showTooltip = true,
  showLabels = false,
  valuePrefix = '',
  valueSuffix = '',
  valueFormatter,
  colorScheme = DEFAULT_COLORS,
  loading = false,
  error = null,
  emptyMessage = 'No data available',
  className = '',
}) => {
  const formatValue = valueFormatter || ((v: number) => defaultValueFormatter(v, valuePrefix, valueSuffix));

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-red-500 text-center">
          <div className="text-lg mb-1">Error</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-slate-400 text-center">
          <div className="text-3xl mb-2">--</div>
          <div className="text-sm">{emptyMessage}</div>
        </div>
      </div>
    );
  }

  const normalizedType = type?.toLowerCase().replace(/[-_\s]/g, '') || 'table';

  switch (normalizedType) {
    case 'piechart':
    case 'pie':
      return (
        <div className={className} style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="70%"
                label={showLabels ? ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)` : false}
                labelLine={showLabels}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colorScheme[index % colorScheme.length]} />
                ))}
              </Pie>
              {showTooltip && (
                <Tooltip
                  formatter={(value: number) => formatValue(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
              )}
              {showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        </div>
      );

    case 'barchart':
    case 'bar':
      return (
        <div className={className} style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                tickFormatter={(v) => formatValue(v)}
              />
              {showTooltip && (
                <Tooltip
                  formatter={(value: number) => formatValue(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
              )}
              {showLegend && <Legend />}
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colorScheme[index % colorScheme.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case 'linechart':
    case 'line':
      return (
        <div className={className} style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                tickFormatter={(v) => formatValue(v)}
              />
              {showTooltip && (
                <Tooltip
                  formatter={(value: number) => formatValue(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
              )}
              {showLegend && <Legend />}
              <Line
                type="monotone"
                dataKey="value"
                stroke={colorScheme[0]}
                strokeWidth={2}
                dot={{ fill: colorScheme[0], strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );

    case 'areachart':
    case 'area':
      return (
        <div className={className} style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatValue(v)} />
              {showTooltip && (
                <Tooltip
                  formatter={(value: number) => formatValue(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke={colorScheme[0]}
                fill={colorScheme[0]}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );

    case 'groupedbar':
    case 'grouped_bar':
    case 'stackedbar':
    case 'stacked_bar': {
      const groupedData = data as GroupedWidgetData[];
      const groups = secondaryGroups || [];
      const GROUPED_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

      return (
        <div className={className} style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={groupedData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="primaryGroup"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                tickFormatter={(v) => formatValue(v)}
              />
              {showTooltip && (
                <Tooltip
                  formatter={(value: number) => formatValue(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
              )}
              {showLegend && <Legend />}
              {groups.map((group, index) => (
                <Bar
                  key={group}
                  dataKey={group}
                  fill={GROUPED_COLORS[index % GROUPED_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    case 'kpi':
    case 'metric':
    case 'number':
    case 'featuredkpi':
      const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
      return (
        <div className={`flex flex-col items-center justify-center ${className}`} style={{ height }}>
          <div className="text-4xl font-bold text-rocket-600">
            {formatValue(total)}
          </div>
          {title && <div className="text-slate-500 mt-2 text-sm">{title}</div>}
          {data.length > 1 && (
            <div className="text-xs text-slate-400 mt-1">
              ({data.length} items)
            </div>
          )}
        </div>
      );

    case 'table':
    case 'grid':
    default:
      return (
        <div className={`overflow-auto ${className}`} style={{ maxHeight: height }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium text-slate-600">Name</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Value</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-2">{item.name}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {formatValue(item.value)}
                  </td>
                </tr>
              ))}
            </tbody>
            {data.length > 1 && (
              <tfoot className="bg-slate-50">
                <tr className="border-t-2">
                  <td className="px-4 py-2 font-medium">Total</td>
                  <td className="px-4 py-2 text-right font-mono font-medium">
                    {formatValue(data.reduce((sum, item) => sum + (item.value || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      );
  }
};

export const PieChartWidget: React.FC<Omit<WidgetRenderProps, 'type'>> = (props) => (
  <WidgetRenderer {...props} type="pie_chart" />
);

export const BarChartWidget: React.FC<Omit<WidgetRenderProps, 'type'>> = (props) => (
  <WidgetRenderer {...props} type="bar_chart" />
);

export const LineChartWidget: React.FC<Omit<WidgetRenderProps, 'type'>> = (props) => (
  <WidgetRenderer {...props} type="line_chart" />
);

export const KPIWidget: React.FC<Omit<WidgetRenderProps, 'type'>> = (props) => (
  <WidgetRenderer {...props} type="kpi" />
);

export const TableWidget: React.FC<Omit<WidgetRenderProps, 'type'>> = (props) => (
  <WidgetRenderer {...props} type="table" />
);

export const getWidgetDisplayType = (widget: any): string => {
  const type = widget?.displayType
    || (widget?.type !== 'chart' ? widget?.type : null)
    || widget?.chartType
    || widget?.visualization?.type
    || widget?.config?.type
    || widget?.config?.displayType
    || 'table';
  return type;
};

export default WidgetRenderer;
