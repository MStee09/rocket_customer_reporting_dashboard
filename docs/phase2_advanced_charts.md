# PHASE 2: ADVANCED CHARTS - Bolt Prompt

Copy everything below into Bolt:

---

I want to add 5 new advanced chart components to my dashboard. These are NEW components (not replacements). Please create these files:

1. **RadarComparisonChart** - For comparing carriers/customers across multiple metrics
2. **WaterfallChart** - For showing cost breakdowns and how components add up
3. **TreemapChart** - For showing spend composition hierarchically  
4. **CalendarHeatmap** - For showing daily shipment patterns
5. **BumpChart** - For showing ranking changes over time

All components should use my existing recharts library and match my app's styling (slate colors, rounded corners, shadow-xl for tooltips).

---

## FILE: src/components/dashboard/charts/RadarComparisonChart.tsx

```tsx
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Loader2 } from 'lucide-react';

export interface RadarMetric {
  metric: string;
  fullMark?: number;
  [key: string]: string | number | undefined;
}

export interface RadarEntity {
  key: string;
  name: string;
  color: string;
}

interface RadarComparisonChartProps {
  data: RadarMetric[];
  entities: RadarEntity[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  height?: number;
  showLegend?: boolean;
  className?: string;
}

export function RadarComparisonChart({
  data,
  entities,
  isLoading = false,
  title = 'Multi-Dimensional Comparison',
  subtitle,
  height = 400,
  showLegend = true,
  className = '',
}: RadarComparisonChartProps) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }
  
  if (!data.length) {
    return (
      <div className={`flex items-center justify-center text-slate-500 ${className}`} style={{ height }}>
        No comparison data available
      </div>
    );
  }
  
  return (
    <div className={className}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
          
          {entities.map((entity) => (
            <Radar
              key={entity.key}
              name={entity.name}
              dataKey={entity.key}
              stroke={entity.color}
              fill={entity.color}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}
          
          <Tooltip
            content={({ payload, label }) => {
              if (!payload || !payload.length) return null;
              return (
                <div className="bg-white px-3 py-2 rounded-lg shadow-xl border border-slate-200 text-xs">
                  <div className="font-medium text-slate-800 mb-1">{label}</div>
                  {payload.map((entry: any) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-slate-600">{entry.name}:</span>
                      <span className="font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          
          {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Helper function to build carrier comparison data
export function buildCarrierRadarData(carriers: Array<{
  name: string;
  onTimePercent: number;
  claimRate: number;
  avgCost: number;
  coverage: number;
  responseTime: number;
}>): { data: RadarMetric[]; entities: RadarEntity[] } {
  const colors = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444'];
  
  const entities = carriers.map((c, i) => ({
    key: c.name.toLowerCase().replace(/\s+/g, '_'),
    name: c.name,
    color: colors[i % colors.length],
  }));
  
  const maxCost = Math.max(...carriers.map(c => c.avgCost));
  
  const data: RadarMetric[] = [
    {
      metric: 'On-Time %',
      fullMark: 100,
      ...Object.fromEntries(entities.map((e, i) => [e.key, carriers[i].onTimePercent])),
    },
    {
      metric: 'Low Claims',
      fullMark: 100,
      ...Object.fromEntries(entities.map((e, i) => [e.key, Math.max(0, 100 - carriers[i].claimRate * 10)])),
    },
    {
      metric: 'Cost Efficiency',
      fullMark: 100,
      ...Object.fromEntries(entities.map((e, i) => [e.key, Math.max(0, 100 - (carriers[i].avgCost / maxCost) * 100)])),
    },
    {
      metric: 'Coverage',
      fullMark: 100,
      ...Object.fromEntries(entities.map((e, i) => [e.key, carriers[i].coverage])),
    },
    {
      metric: 'Response Time',
      fullMark: 100,
      ...Object.fromEntries(entities.map((e, i) => [e.key, Math.max(0, 100 - carriers[i].responseTime * 10)])),
    },
  ];
  
  return { data, entities };
}

export default RadarComparisonChart;
```

---

## FILE: src/components/dashboard/charts/WaterfallChart.tsx

```tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Loader2 } from 'lucide-react';

export interface WaterfallItem {
  name: string;
  value: number;
  isTotal?: boolean;
  isSubtotal?: boolean;
}

interface WaterfallChartProps {
  data: WaterfallItem[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  height?: number;
  valuePrefix?: string;
  valueSuffix?: string;
  className?: string;
}

export function WaterfallChart({
  data,
  isLoading = false,
  title = 'Cost Breakdown',
  subtitle,
  height = 400,
  valuePrefix = '$',
  valueSuffix = '',
  className = '',
}: WaterfallChartProps) {
  // Transform data for waterfall display
  const chartData = data.map((item, index) => {
    if (index === 0 || item.isTotal) {
      return {
        ...item,
        start: 0,
        end: item.value,
        displayValue: item.value,
      };
    }
    
    let runningTotal = 0;
    for (let i = 0; i < index; i++) {
      if (!data[i].isTotal && !data[i].isSubtotal) {
        runningTotal += data[i].value;
      }
    }
    
    return {
      ...item,
      start: runningTotal,
      end: runningTotal + item.value,
      displayValue: item.value,
    };
  });
  
  const getBarColor = (item: typeof chartData[0]) => {
    if (item.isTotal || item.isSubtotal) return '#3b82f6';
    return item.value >= 0 ? '#ef4444' : '#22c55e';
  };
  
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }
  
  if (!data.length) {
    return (
      <div className={`flex items-center justify-center text-slate-500 ${className}`} style={{ height }}>
        No breakdown data available
      </div>
    );
  }
  
  return (
    <div className={className}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
            tickFormatter={(value) => `${valuePrefix}${value.toLocaleString()}${valueSuffix}`}
          />
          <Tooltip
            content={({ payload }) => {
              if (!payload || !payload.length) return null;
              const item = payload[0].payload;
              return (
                <div className="bg-white px-3 py-2 rounded-lg shadow-xl border border-slate-200 text-xs">
                  <div className="font-medium text-slate-800">{item.name}</div>
                  <div className={`font-bold ${item.displayValue >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {item.displayValue >= 0 ? '+' : ''}{valuePrefix}{item.displayValue.toLocaleString()}{valueSuffix}
                  </div>
                  {!item.isTotal && (
                    <div className="text-slate-500 mt-1">
                      Running: {valuePrefix}{item.end.toLocaleString()}{valueSuffix}
                    </div>
                  )}
                </div>
              );
            }}
          />
          <ReferenceLine y={0} stroke="#94a3b8" />
          
          <Bar dataKey="start" stackId="stack" fill="transparent" />
          <Bar dataKey="displayValue" stackId="stack" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      <div className="flex items-center justify-center gap-6 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-slate-600">Increase</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-slate-600">Decrease</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-slate-600">Total</span>
        </div>
      </div>
    </div>
  );
}

// Helper function to build cost breakdown data
export function buildCostWaterfallData(costs: {
  baseRate: number;
  fuelSurcharge: number;
  accessorials: number;
  insurance: number;
  discount: number;
}): WaterfallItem[] {
  const total = costs.baseRate + costs.fuelSurcharge + costs.accessorials + costs.insurance + costs.discount;
  
  return [
    { name: 'Base Rate', value: costs.baseRate },
    { name: 'Fuel Surcharge', value: costs.fuelSurcharge },
    { name: 'Accessorials', value: costs.accessorials },
    { name: 'Insurance', value: costs.insurance },
    { name: 'Volume Discount', value: costs.discount },
    { name: 'Total Cost', value: total, isTotal: true },
  ];
}

export default WaterfallChart;
```

---

## FILE: src/components/dashboard/charts/TreemapChart.tsx

```tsx
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { Loader2 } from 'lucide-react';

export interface TreemapNode {
  name: string;
  value: number;
  children?: TreemapNode[];
  color?: string;
}

interface TreemapChartProps {
  data: TreemapNode[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  height?: number;
  valuePrefix?: string;
  valueSuffix?: string;
  colorScale?: string[];
  className?: string;
}

const TreemapContent = ({ x, y, width, height, name, value, depth, colors, valuePrefix, valueSuffix }: any) => {
  if (width < 30 || height < 30) return null;
  
  const color = colors[depth % colors.length];
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        rx={4}
        ry={4}
      />
      {width > 50 && height > 40 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="#fff"
            fontSize={width > 80 ? 12 : 10}
            fontWeight={600}
          >
            {name.length > 15 ? name.substring(0, 12) + '...' : name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize={10}
          >
            {valuePrefix}{value.toLocaleString()}{valueSuffix}
          </text>
        </>
      )}
    </g>
  );
};

export function TreemapChart({
  data,
  isLoading = false,
  title = 'Composition Analysis',
  subtitle,
  height = 400,
  valuePrefix = '$',
  valueSuffix = '',
  colorScale = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b'],
  className = '',
}: TreemapChartProps) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }
  
  if (!data.length) {
    return (
      <div className={`flex items-center justify-center text-slate-500 ${className}`} style={{ height }}>
        No composition data available
      </div>
    );
  }
  
  const treemapData = [{ name: 'root', children: data }];
  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  return (
    <div className={className}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <Treemap
          data={treemapData}
          dataKey="value"
          aspectRatio={4 / 3}
          stroke="#fff"
          content={(props: any) => (
            <TreemapContent
              {...props}
              colors={colorScale}
              valuePrefix={valuePrefix}
              valueSuffix={valueSuffix}
            />
          )}
        >
          <Tooltip
            content={({ payload }) => {
              if (!payload || !payload.length) return null;
              const item = payload[0].payload;
              if (item.name === 'root') return null;
              
              const percent = ((item.value / total) * 100).toFixed(1);
              
              return (
                <div className="bg-white px-3 py-2 rounded-lg shadow-xl border border-slate-200 text-xs">
                  <div className="font-medium text-slate-800">{item.name}</div>
                  <div className="font-bold text-slate-900">
                    {valuePrefix}{item.value.toLocaleString()}{valueSuffix}
                  </div>
                  <div className="text-slate-500">{percent}% of total</div>
                </div>
              );
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

// Helper function to build spend treemap data
export function buildSpendTreemapData(spend: Array<{
  category: string;
  subcategories: Array<{ name: string; value: number }>;
}>): TreemapNode[] {
  return spend.map((category) => ({
    name: category.category,
    value: category.subcategories.reduce((sum, s) => sum + s.value, 0),
    children: category.subcategories.map(sub => ({
      name: sub.name,
      value: sub.value,
    })),
  }));
}

export default TreemapChart;
```

---

## FILE: src/components/dashboard/charts/CalendarHeatmap.tsx

```tsx
import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  value: number;
}

interface CalendarHeatmapProps {
  data: CalendarDay[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  height?: number;
  colorScale?: string[];
  valueLabel?: string;
  className?: string;
}

export function CalendarHeatmap({
  data,
  isLoading = false,
  title = 'Daily Activity',
  subtitle,
  height = 180,
  colorScale = ['#f0fdf4', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d'],
  valueLabel = 'shipments',
  className = '',
}: CalendarHeatmapProps) {
  const { weeks, stats, monthLabels } = useMemo(() => {
    if (!data.length) return { weeks: [], stats: { min: 0, max: 0 }, monthLabels: [] };
    
    const values = data.map(d => d.value);
    const stats = {
      min: Math.min(...values),
      max: Math.max(...values),
    };
    
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const dataMap = new Map(sorted.map(d => [d.date, d.value]));
    const startDate = new Date(sorted[0].date);
    const endDate = new Date(sorted[sorted.length - 1].date);
    
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const weeks: Array<Array<{ date: string; value: number | null; dayOfWeek: number }>> = [];
    let currentWeek: Array<{ date: string; value: number | null; dayOfWeek: number }> = [];
    const monthLabels: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;
    
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay();
      const month = current.getMonth();
      
      currentWeek.push({
        date: dateStr,
        value: dataMap.get(dateStr) ?? null,
        dayOfWeek,
      });
      
      if (dayOfWeek === 6 || current.getTime() === endDate.getTime()) {
        weeks.push(currentWeek);
        currentWeek = [];
        
        if (month !== lastMonth) {
          monthLabels.push({
            label: current.toLocaleDateString('en-US', { month: 'short' }),
            weekIndex: weeks.length - 1,
          });
          lastMonth = month;
        }
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return { weeks, stats, monthLabels };
  }, [data]);
  
  const getColor = (value: number | null): string => {
    if (value === null) return '#f1f5f9';
    const range = stats.max - stats.min || 1;
    const normalized = (value - stats.min) / range;
    const index = Math.min(Math.floor(normalized * colorScale.length), colorScale.length - 1);
    return colorScale[index];
  };
  
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }
  
  if (!data.length) {
    return (
      <div className={`flex items-center justify-center text-slate-500 ${className}`} style={{ height }}>
        No daily data available
      </div>
    );
  }
  
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const cellSize = 14;
  const cellGap = 3;
  
  return (
    <div className={className}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}
      
      <div className="overflow-x-auto">
        <div className="inline-block">
          <div className="flex mb-1 ml-8">
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="text-xs text-slate-500"
                style={{
                  marginLeft: i === 0 ? 0 : (m.weekIndex - (monthLabels[i - 1]?.weekIndex || 0)) * (cellSize + cellGap) - 30,
                  minWidth: 30,
                }}
              >
                {m.label}
              </div>
            ))}
          </div>
          
          <div className="flex">
            <div className="flex flex-col mr-2">
              {dayLabels.map((day, i) => (
                <div
                  key={day}
                  className="text-xs text-slate-400"
                  style={{ height: cellSize + cellGap, lineHeight: `${cellSize}px` }}
                >
                  {i % 2 === 1 ? day : ''}
                </div>
              ))}
            </div>
            
            <div className="flex gap-[3px]">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      className="rounded-sm cursor-pointer transition-transform hover:scale-110"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: getColor(day.value),
                      }}
                      title={`${day.date}: ${day.value !== null ? `${day.value} ${valueLabel}` : 'No data'}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-1 mt-3 text-xs text-slate-500">
            <span>Less</span>
            {colorScale.map((color, i) => (
              <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarHeatmap;
```

---

## FILE: src/components/dashboard/charts/BumpChart.tsx

```tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';

export interface BumpRanking {
  period: string;
  [entity: string]: string | number;
}

export interface BumpEntity {
  key: string;
  name: string;
  color: string;
}

interface BumpChartProps {
  data: BumpRanking[];
  entities: BumpEntity[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  height?: number;
  showLegend?: boolean;
  className?: string;
}

export function BumpChart({
  data,
  entities,
  isLoading = false,
  title = 'Ranking Changes Over Time',
  subtitle,
  height = 400,
  showLegend = true,
  className = '',
}: BumpChartProps) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }
  
  if (!data.length) {
    return (
      <div className={`flex items-center justify-center text-slate-500 ${className}`} style={{ height }}>
        No ranking data available
      </div>
    );
  }
  
  const maxRank = entities.length;
  
  return (
    <div className={className}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis
            reversed
            domain={[1, maxRank]}
            ticks={Array.from({ length: maxRank }, (_, i) => i + 1)}
            tick={{ fontSize: 11, fill: '#64748b' }}
            label={{
              value: 'Rank',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 11, fill: '#64748b' },
            }}
          />
          <Tooltip
            content={({ payload, label }) => {
              if (!payload || !payload.length) return null;
              return (
                <div className="bg-white px-3 py-2 rounded-lg shadow-xl border border-slate-200 text-xs">
                  <div className="font-medium text-slate-800 mb-2">{label}</div>
                  {payload
                    .sort((a: any, b: any) => a.value - b.value)
                    .map((entry: any) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 text-right font-bold" style={{ color: entry.color }}>
                          #{entry.value}
                        </div>
                        <span className="text-slate-600">{entry.name}</span>
                      </div>
                    ))}
                </div>
              );
            }}
          />
          
          {entities.map((entity) => (
            <Line
              key={entity.key}
              type="monotone"
              dataKey={entity.key}
              name={entity.name}
              stroke={entity.color}
              strokeWidth={3}
              dot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 8, strokeWidth: 2 }}
            />
          ))}
          
          {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Helper function to build carrier ranking data
export function buildCarrierBumpData(rankings: Array<{
  period: string;
  rankings: Array<{ carrier: string; rank: number }>;
}>): { data: BumpRanking[]; entities: BumpEntity[] } {
  const colors = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444', '#06b6d4'];
  
  const carriers = [...new Set(rankings.flatMap(r => r.rankings.map(c => c.carrier)))];
  
  const entities = carriers.map((carrier, i) => ({
    key: carrier.toLowerCase().replace(/\s+/g, '_'),
    name: carrier,
    color: colors[i % colors.length],
  }));
  
  const data: BumpRanking[] = rankings.map(r => ({
    period: r.period,
    ...Object.fromEntries(
      r.rankings.map(c => [c.carrier.toLowerCase().replace(/\s+/g, '_'), c.rank])
    ),
  }));
  
  return { data, entities };
}

export default BumpChart;
```

---

## FILE: src/components/dashboard/charts/index.ts

```typescript
export { RadarComparisonChart, buildCarrierRadarData } from './RadarComparisonChart';
export { WaterfallChart, buildCostWaterfallData } from './WaterfallChart';
export { TreemapChart, buildSpendTreemapData } from './TreemapChart';
export { CalendarHeatmap } from './CalendarHeatmap';
export { BumpChart, buildCarrierBumpData } from './BumpChart';

export type { RadarMetric, RadarEntity } from './RadarComparisonChart';
export type { WaterfallItem } from './WaterfallChart';
export type { TreemapNode } from './TreemapChart';
export type { CalendarDay } from './CalendarHeatmap';
export type { BumpRanking, BumpEntity } from './BumpChart';
```

---

That's Phase 2! These are 5 new chart components you can use in your dashboards.

Example usage:
```tsx
import { RadarComparisonChart, buildCarrierRadarData } from './components/dashboard/charts';

// In your component
const { data, entities } = buildCarrierRadarData([
  { name: 'XPO', onTimePercent: 94, claimRate: 0.8, avgCost: 450, coverage: 85, responseTime: 2 },
  { name: 'FedEx', onTimePercent: 96, claimRate: 0.5, avgCost: 520, coverage: 95, responseTime: 1 },
]);

<RadarComparisonChart data={data} entities={entities} title="Carrier Comparison" />
```
