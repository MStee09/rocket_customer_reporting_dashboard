import { Loader2, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/dateUtils';
import { Card } from '../ui/Card';

interface LaneData {
  origin: string;
  destination: string;
  shipmentCount: number;
  avgCost: number;
  totalCost: number;
}

interface TopLanesTableProps {
  data: LaneData[];
  isLoading?: boolean;
}

export function TopLanesTable({ data, isLoading }: TopLanesTableProps) {
  if (isLoading) {
    return (
      <Card variant="elevated" padding="lg">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Top 10 Lanes</h2>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card variant="elevated" padding="lg">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Top 10 Lanes</h2>
        <div className="flex items-center justify-center h-96 text-slate-500">
          No lane data available
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-slate-600" />
        <h2 className="text-lg font-bold text-slate-800">Top 10 Lanes</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 text-xs font-semibold text-slate-600">Origin</th>
              <th className="text-left py-2 px-2 text-xs font-semibold text-slate-600">Destination</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-slate-600">Shipments</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-slate-600">Avg Cost</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-slate-600">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((lane, index) => (
              <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-2 px-2 text-xs font-medium text-slate-800">{lane.origin}</td>
                <td className="py-2 px-2 text-xs font-medium text-slate-800">{lane.destination}</td>
                <td className="py-2 px-2 text-xs text-slate-600 text-right">{lane.shipmentCount}</td>
                <td className="py-2 px-2 text-xs text-slate-600 text-right">{formatCurrency(lane.avgCost.toString())}</td>
                <td className="py-2 px-2 text-xs font-semibold text-slate-800 text-right">{formatCurrency(lane.totalCost.toString())}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
