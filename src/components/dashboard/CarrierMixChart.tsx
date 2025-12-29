import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';

interface CarrierData {
  name: string;
  value: number;
}

interface CarrierMixChartProps {
  data: CarrierData[];
  isLoading?: boolean;
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function CarrierMixChart({ data, isLoading }: CarrierMixChartProps) {
  if (isLoading) {
    return (
      <Card variant="elevated" padding="lg">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Carrier Mix</h2>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card variant="elevated" padding="lg">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Carrier Mix</h2>
        <div className="flex items-center justify-center h-96 text-slate-500">
          No carrier data available
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Carrier Mix</h2>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            labelLine={false}
            label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any) => [value, 'Shipments']} />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ paddingTop: '20px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
