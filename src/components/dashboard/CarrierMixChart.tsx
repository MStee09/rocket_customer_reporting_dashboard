import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { chartColors, rechartsTheme, getChartColor } from '../../config/chartTheme';

interface CarrierData {
  name: string;
  value: number;
}

interface CarrierMixChartProps {
  data: CarrierData[];
  isLoading?: boolean;
}

export function CarrierMixChart({ data, isLoading }: CarrierMixChartProps) {
  if (isLoading) {
    return (
      <Card variant="elevated" padding="lg">
        <h2 className="text-xl font-bold text-charcoal-800 mb-6">Carrier Mix</h2>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 text-charcoal-400 animate-spin" />
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card variant="elevated" padding="lg">
        <h2 className="text-xl font-bold text-charcoal-800 mb-6">Carrier Mix</h2>
        <div className="flex items-center justify-center h-96 text-charcoal-500">
          No carrier data available
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg">
      <h2 className="text-xl font-bold text-charcoal-800 mb-6">Carrier Mix</h2>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            labelLine={false}
            label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
            outerRadius={100}
            fill={chartColors.primary[0]}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={getChartColor(index)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={rechartsTheme.tooltip.contentStyle}
            formatter={(value: number) => [value, 'Shipments']}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={rechartsTheme.legend.wrapperStyle}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
