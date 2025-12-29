import { BarChart3, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '../ui/Card';
import { chartColors, rechartsTheme } from '../../config/chartTheme';

interface CustomerVolumeData {
  name: string;
  count: number;
}

interface TopCustomersByVolumeChartProps {
  data: CustomerVolumeData[];
  isLoading: boolean;
}

export function TopCustomersByVolumeChart({ data, isLoading }: TopCustomersByVolumeChartProps) {
  if (isLoading) {
    return (
      <Card variant="elevated" padding="lg">
        <div className="flex items-center justify-center h-[350px]">
          <Loader2 className="w-8 h-8 text-rocket-600 animate-spin" />
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card variant="elevated" padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-rocket-600" />
          <h2 className="text-xl font-bold text-charcoal-800">Top 10 Customers by Volume</h2>
        </div>
        <div className="flex items-center justify-center h-[350px] text-charcoal-500">
          No customer data available
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-rocket-600" />
        <h2 className="text-xl font-bold text-charcoal-800">Top 10 Customers by Volume</h2>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ bottom: 80 }}>
          <CartesianGrid {...rechartsTheme.cartesianGrid} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={120}
            fontSize={10}
            interval={0}
            {...rechartsTheme.xAxis}
          />
          <YAxis {...rechartsTheme.yAxis} />
          <Tooltip contentStyle={rechartsTheme.tooltip.contentStyle} />
          <Bar dataKey="count" fill={chartColors.primary[0]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
