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

interface ChartDataItem extends WaterfallItem {
  start: number;
  end: number;
  displayValue: number;
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
  const chartData: ChartDataItem[] = data.map((item, index) => {
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

  const getBarColor = (item: ChartDataItem) => {
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
              const item = payload[0].payload as ChartDataItem;
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
