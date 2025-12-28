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
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center justify-center h-[350px]">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold text-slate-800">Top 10 Customers by Volume</h2>
        </div>
        <div className="flex items-center justify-center h-[350px] text-slate-500">
          No customer data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-bold text-slate-800">Top 10 Customers by Volume</h2>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} fontSize={10} interval={0} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
