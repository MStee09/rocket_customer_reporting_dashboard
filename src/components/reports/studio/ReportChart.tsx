import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
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
import { chartColors, formatValue } from './colors';
import { getTheme, ReportTheme } from './reportTheme';
import { Card } from '../../ui/Card';

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface ReportChartProps {
  type: 'bar' | 'line' | 'pie' | 'area';
  data: ChartDataPoint[];
  title?: string;
  height?: number;
  format?: 'currency' | 'number' | 'percent';
  colors?: string[];
  theme?: ReportTheme;
  showLegend?: boolean;
  horizontal?: boolean;
  compact?: boolean;
}

const formatYAxis = (value: number, format?: 'currency' | 'number' | 'percent') => {
  if (format === 'currency') {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  }
  if (format === 'percent') return `${value}%`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  format?: 'currency' | 'number' | 'percent';
}

function CustomTooltip({ active, payload, label, format }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
      <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {formatValue(entry.value, format)}
        </p>
      ))}
    </div>
  );
}

export function ReportChart({
  type,
  data,
  title,
  height = 300,
  format = 'number',
  colors,
  theme = 'blue',
  showLegend = false,
  horizontal = false,
  compact = false,
}: ReportChartProps) {
  const themeColors = getTheme(theme);
  const effectiveColors = colors || themeColors.chartColors || chartColors;
  const chartData = data.map((d, i) => ({
    ...d,
    fill: d.color || effectiveColors[i % effectiveColors.length],
  }));

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return horizontal ? (
          <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => formatYAxis(v, format)}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: '#374151' }}
              axisLine={{ stroke: '#E5E7EB' }}
              width={80}
            />
            <Tooltip content={<CustomTooltip format={format} />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatYAxis(v, format)}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip format={format} />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatYAxis(v, format)}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip format={format} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={effectiveColors[0]}
              strokeWidth={2}
              dot={{ fill: effectiveColors[0], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={effectiveColors[0]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={effectiveColors[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatYAxis(v, format)}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip format={format} />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={effectiveColors[0]}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip format={format} />} />
            {showLegend && <Legend />}
          </PieChart>
        );

      default:
        return null;
    }
  };

  const titleClasses = compact
    ? 'text-sm font-semibold text-gray-900 mb-2'
    : 'text-lg font-semibold text-gray-900 mb-4';

  return (
    <Card variant="default" padding={compact ? 'sm' : 'md'}>
      {title && (
        <h3 className={titleClasses}>{title}</h3>
      )}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
