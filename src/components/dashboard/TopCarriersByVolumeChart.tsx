import { TrendingUp, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CarrierVolumeData {
  name: string;
  count: number;
}

interface TopCarriersByVolumeChartProps {
  data: CarrierVolumeData[];
  isLoading: boolean;
}

export function TopCarriersByVolumeChart({ data, isLoading }: TopCarriersByVolumeChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center justify-center h-[350px]">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <h2 className="text-xl font-bold text-slate-800">Top 10 Carriers by Volume</h2>
        </div>
        <div className="flex items-center justify-center h-[350px] text-slate-500">
          No carrier data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-green-600" />
        <h2 className="text-xl font-bold text-slate-800">Top 10 Carriers by Volume</h2>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} fontSize={10} interval={0} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
