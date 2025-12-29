import { Loader2 } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '../ui/Card';
import { chartColors, rechartsTheme, getChartColor } from '../../config/chartTheme';

interface ModeDistributionData {
  name: string;
  value: number;
}

interface ModeDistributionChartProps {
  data: ModeDistributionData[];
  isLoading: boolean;
}

export function ModeDistributionChart({ data, isLoading }: ModeDistributionChartProps) {
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
        <h2 className="text-xl font-bold text-charcoal-800 mb-4">Mode Distribution</h2>
        <div className="flex items-center justify-center h-[350px] text-charcoal-500">
          No mode data available
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg">
      <h2 className="text-xl font-bold text-charcoal-800 mb-4">Mode Distribution</h2>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="40%"
            labelLine={false}
            label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
            outerRadius={80}
            fill={chartColors.primary[0]}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={getChartColor(index)} />
            ))}
          </Pie>
          <Tooltip contentStyle={rechartsTheme.tooltip.contentStyle} />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
