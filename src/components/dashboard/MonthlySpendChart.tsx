import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { chartColors, rechartsTheme } from '../../config/chartTheme';

interface MonthlyDataPoint {
  month: string;
  totalCost: number;
  shipmentCount: number;
}

interface MonthlySpendChartProps {
  data: MonthlyDataPoint[];
  isLoading?: boolean;
}

export function MonthlySpendChart({ data, isLoading }: MonthlySpendChartProps) {
  if (isLoading) {
    return (
      <Card variant="elevated" padding="lg">
        <h2 className="text-xl font-bold text-charcoal-800 mb-6">Monthly Spend Trend</h2>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 text-charcoal-400 animate-spin" />
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card variant="elevated" padding="lg">
        <h2 className="text-xl font-bold text-charcoal-800 mb-6">Monthly Spend Trend</h2>
        <div className="flex items-center justify-center h-96 text-charcoal-500">
          No data available for selected period
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg">
      <h2 className="text-xl font-bold text-charcoal-800 mb-6">Monthly Spend Trend</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid {...rechartsTheme.cartesianGrid} />
          <XAxis
            dataKey="month"
            {...rechartsTheme.xAxis}
          />
          <YAxis
            {...rechartsTheme.yAxis}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={rechartsTheme.tooltip.contentStyle}
            labelStyle={rechartsTheme.tooltip.labelStyle}
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total Cost']}
          />
          <Legend wrapperStyle={rechartsTheme.legend.wrapperStyle} />
          <Line
            type="monotone"
            dataKey="totalCost"
            name="Total Cost"
            stroke={chartColors.primary[0]}
            strokeWidth={3}
            dot={{ fill: chartColors.primary[0], r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
