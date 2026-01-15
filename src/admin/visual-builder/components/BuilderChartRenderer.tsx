import {
  BarChart,
  Bar,
  LineChart as RechartsLine,
  Line,
  PieChart as RechartsPie,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { ChartType, GroupedChartData } from '../types/visualBuilderTypes';

export const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#64748b', '#0891b2'];
export const GROUPED_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

export function formatValue(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) return '$0';
  if (Math.abs(value) >= 1000000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value);
  }
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

interface BuilderChartRendererProps {
  type: ChartType;
  data: Array<{ label: string; value: number }> | GroupedChartData[];
  barOrientation?: 'horizontal' | 'vertical';
  secondaryGroups?: string[];
  metricColumn?: string;
}

export function BuilderChartRenderer({
  type,
  data,
  barOrientation = 'horizontal',
  secondaryGroups,
  metricColumn,
}: BuilderChartRendererProps) {
  switch (type) {
    case 'grouped_bar':
      if (!secondaryGroups || secondaryGroups.length === 0) {
        return <div className="text-slate-500 text-sm">No secondary groups for grouped chart</div>;
      }
      const groupedData = data as GroupedChartData[];
      const isCurrencyMetric = metricColumn === 'retail' || metricColumn === 'cost';
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={groupedData} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="primaryGroup"
              tick={{ fontSize: 9 }}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(val) => {
                if (isCurrencyMetric) {
                  if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
                  return `$${val}`;
                }
                return val.toLocaleString();
              }}
              width={50}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                isCurrencyMetric
                  ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : value.toLocaleString(),
                name
              ]}
              contentStyle={{ fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 5 }} iconSize={8} />
            {secondaryGroups.map((group, index) => (
              <Bar
                key={group}
                dataKey={group}
                name={group}
                fill={GROUPED_COLORS[index % GROUPED_COLORS.length]}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    case 'bar': {
      const barData = data as Array<{ label: string; value: number }>;
      if (barOrientation === 'vertical') {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ left: 20, right: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tickFormatter={formatValue} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => formatValue(v)} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} layout="vertical" margin={{ left: 80, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={formatValue} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {barData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
    case 'line': {
      const lineData = data as Array<{ label: string; value: number }>;
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLine data={lineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} />
            <YAxis tickFormatter={formatValue} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
          </RechartsLine>
        </ResponsiveContainer>
      );
    }
    case 'area': {
      const areaData = data as Array<{ label: string; value: number }>;
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={areaData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} />
            <YAxis tickFormatter={formatValue} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Area type="monotone" dataKey="value" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
    case 'pie': {
      const pieData = data as Array<{ label: string; value: number }>;
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPie>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
              labelLine={{ strokeWidth: 1 }}
            >
              {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatValue(v)} />
          </RechartsPie>
        </ResponsiveContainer>
      );
    }
    case 'kpi': {
      const kpiData = data as Array<{ label: string; value: number }>;
      const total = kpiData.reduce((s, r) => s + r.value, 0);
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-4xl font-bold text-slate-900">{formatValue(total)}</div>
          <div className="text-sm text-slate-500 mt-2">Total ({kpiData.length} items)</div>
        </div>
      );
    }
    case 'table': {
      const tableData = data as Array<{ label: string; value: number }>;
      return (
        <div className="overflow-auto max-h-full w-full">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Label</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.map((row, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-slate-900">{row.label}</td>
                  <td className="px-3 py-2 text-slate-900 text-right font-medium">{formatValue(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return <div>Unknown chart type</div>;
  }
}
