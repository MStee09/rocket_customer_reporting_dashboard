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
  Treemap,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine,
} from 'recharts';
import { chartColors, formatValue } from './colors';
import { getTheme, ReportTheme } from './reportTheme';
import { Card } from '../../ui/Card';
import type { ChartType } from '../../../types/aiReport';

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
  children?: ChartDataPoint[];
  date?: string;
  rank?: number;
  isTotal?: boolean;
}

export interface ReportChartProps {
  type: ChartType;
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

interface TreemapContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  value: number;
  index: number;
  colors: string[];
  format?: 'currency' | 'number' | 'percent';
}

function TreemapContent({ x, y, width, height, name, value, index, colors, format }: TreemapContentProps) {
  const showLabel = width > 60 && height > 40;
  const showValue = width > 60 && height > 55;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={colors[index % colors.length]}
        stroke="#fff"
        strokeWidth={2}
        rx={4}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showValue ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={12}
          fontWeight={600}
        >
          {name.length > 12 ? `${name.slice(0, 12)}...` : name}
        </text>
      )}
      {showValue && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.8)"
          fontSize={11}
        >
          {formatValue(value, format)}
        </text>
      )}
    </g>
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

      case 'treemap':
        return (
          <Treemap
            data={chartData}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="#fff"
            content={({ x, y, width, height, name, value, index }: TreemapContentProps) => (
              <TreemapContent
                x={x}
                y={y}
                width={width}
                height={height}
                name={name}
                value={value}
                index={index}
                colors={effectiveColors}
                format={format}
              />
            )}
          >
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const item = payload[0].payload;
                return (
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">{formatValue(item.value, format)}</p>
                  </div>
                );
              }}
            />
          </Treemap>
        );

      case 'radar': {
        const radarData = chartData.map(d => ({
          metric: d.name,
          value: d.value,
          fullMark: Math.max(...chartData.map(c => c.value)) * 1.1,
        }));

        return (
          <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
            <PolarRadiusAxis angle={30} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Radar
              name="Value"
              dataKey="value"
              stroke={effectiveColors[0]}
              fill={effectiveColors[0]}
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const item = payload[0].payload;
                return (
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                    <p className="text-sm font-medium text-gray-900">{item.metric}</p>
                    <p className="text-sm text-gray-600">{formatValue(item.value, format)}</p>
                  </div>
                );
              }}
            />
            {showLegend && <Legend />}
          </RadarChart>
        );
      }

      case 'calendar': {
        const weeks: { [key: string]: number } = {};
        chartData.forEach(d => {
          const dateStr = d.date || d.name;
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const weekNum = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
            const weekKey = `Week ${weekNum + 1}`;
            weeks[weekKey] = (weeks[weekKey] || 0) + d.value;
          }
        });

        const weekData = Object.entries(weeks)
          .slice(0, 12)
          .map(([name, value]) => ({ name, value }));

        return (
          <BarChart data={weekData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatYAxis(v, format)}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip format={format} />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {weekData.map((_, index) => (
                <Cell key={index} fill={effectiveColors[index % effectiveColors.length]} />
              ))}
            </Bar>
          </BarChart>
        );
      }

      case 'bump': {
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis
              reversed
              domain={[1, 'dataMax']}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Rank', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#9CA3AF' }}
            />
            <Tooltip content={<CustomTooltip format={format} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={effectiveColors[0]}
              strokeWidth={3}
              dot={{ fill: effectiveColors[0], strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8 }}
            />
            {showLegend && <Legend />}
          </LineChart>
        );
      }

      case 'waterfall': {
        let runningTotal = 0;
        const waterfallData = chartData.map((item, index) => {
          if (index === 0 || item.isTotal) {
            return {
              ...item,
              start: 0,
              displayValue: item.value,
            };
          }

          const start = runningTotal;
          runningTotal += item.value;

          return {
            ...item,
            start,
            displayValue: item.value,
          };
        });

        const getBarColor = (item: typeof waterfallData[0]) => {
          if (item.isTotal) return effectiveColors[0];
          return item.value >= 0 ? '#ef4444' : '#22c55e';
        };

        return (
          <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(value) => formatYAxis(value, format)}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const item = payload[0].payload;
                return (
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className={`text-sm font-bold ${item.displayValue >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {item.displayValue >= 0 ? '+' : ''}{formatValue(item.displayValue, format)}
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <Bar dataKey="start" stackId="stack" fill="transparent" />
            <Bar dataKey="displayValue" stackId="stack" radius={[4, 4, 0, 0]}>
              {waterfallData.map((entry, index) => (
                <Cell key={index} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        );
      }

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
