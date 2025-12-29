import { Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';

interface PerformanceMetricsProps {
  onTimePercentage?: number;
  avgTransitDays?: number;
  isLoading?: boolean;
}

export function PerformanceMetrics({
  onTimePercentage,
  avgTransitDays,
  isLoading,
}: PerformanceMetricsProps) {
  if (isLoading) {
    return (
      <Card variant="elevated" padding="lg">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Performance Metrics</h2>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
        </div>
      </Card>
    );
  }

  if (onTimePercentage === undefined && avgTransitDays === undefined) {
    return (
      <Card variant="elevated" padding="lg">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Performance Metrics</h2>
        <div className="flex items-center justify-center h-32 text-slate-500">
          No performance data available
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Performance Metrics</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {onTimePercentage !== undefined && (
          <div className="flex items-start gap-4">
            <div className="bg-green-500 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600 mb-1">On-Time Delivery</div>
              <div className="text-3xl font-bold text-slate-800">{onTimePercentage.toFixed(1)}%</div>
              <div className="text-xs text-slate-500 mt-1">
                Delivered by expected date
              </div>
            </div>
          </div>
        )}
        {avgTransitDays !== undefined && (
          <div className="flex items-start gap-4">
            <div className="bg-blue-500 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600 mb-1">Avg Transit Time</div>
              <div className="text-3xl font-bold text-slate-800">{avgTransitDays.toFixed(1)} days</div>
              <div className="text-xs text-slate-500 mt-1">
                From pickup to delivery
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
