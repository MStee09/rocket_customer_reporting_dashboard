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

interface StatusDistributionData {
  name: string;
  value: number;
}

interface StatusDistributionChartProps {
  data: StatusDistributionData[];
  isLoading: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function StatusDistributionChart({ data, isLoading }: StatusDistributionChartProps) {
  if (isLoading) {
    return (
      <Card variant="elevated" padding="lg">
        <div className="flex items-center justify-center h-[350px]">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card variant="elevated" padding="lg">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Status Distribution</h2>
        <div className="flex items-center justify-center h-[350px] text-slate-500">
          No status data available
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Status Distribution</h2>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="40%"
            labelLine={false}
            label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
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
