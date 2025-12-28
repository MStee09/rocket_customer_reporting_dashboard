import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

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
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Monthly Spend Trend</h2>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Monthly Spend Trend</h2>
        <div className="flex items-center justify-center h-96 text-slate-500">
          No data available for selected period
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Monthly Spend Trend</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="month"
            stroke="#64748b"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px',
            }}
            formatter={(value: any) => [`$${value.toLocaleString()}`, 'Total Cost']}
            labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line
            type="monotone"
            dataKey="totalCost"
            name="Total Cost"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
