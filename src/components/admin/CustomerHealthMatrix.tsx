import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import type { CustomerHealthScore, HealthStatus } from '../../types/customerHealth';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  scores: CustomerHealthScore[];
  isLoading: boolean;
  selectedStatus: HealthStatus | 'all';
  statusCounts: Record<HealthStatus, number>;
  onStatusFilter: (status: HealthStatus | 'all') => void;
  onCustomerClick?: (customerId: number) => void;
}

const STATUS_CONFIG: Record<HealthStatus, { bg: string; text: string; bar: string }> = {
  thriving: { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  healthy: { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' },
  watch: { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' },
  'at-risk': { bg: 'bg-orange-100', text: 'text-orange-700', bar: 'bg-orange-500' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' },
};

export function CustomerHealthMatrix({
  scores,
  isLoading,
  selectedStatus,
  statusCounts,
  onStatusFilter,
  onCustomerClick
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const getTrendIcon = (volumeChange: number | null, revenueChange: number | null) => {
    const avgChange = ((volumeChange || 0) + (revenueChange || 0)) / 2;
    if (avgChange > 5) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
    if (avgChange < -5) return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-slate-400" />;
  };

  const getTriggers = (score: CustomerHealthScore): string[] => {
    const triggers: string[] = [];
    if (score.volume_change_percent && score.volume_change_percent < -30) {
      triggers.push(`Volume down ${Math.abs(Math.round(score.volume_change_percent))}%`);
    }
    if (score.days_since_last_shipment && score.days_since_last_shipment > 14) {
      triggers.push(`No activity ${score.days_since_last_shipment} days`);
    }
    if (score.revenue_change_percent && score.revenue_change_percent < -30) {
      triggers.push(`Revenue down ${Math.abs(Math.round(score.revenue_change_percent))}%`);
    }
    return triggers;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <div className="h-6 bg-slate-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-slate-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Customer Health Matrix</h3>
          <div className="flex items-center gap-1">
            {(['thriving', 'healthy', 'watch', 'at-risk', 'critical'] as HealthStatus[]).map(status => (
              <button
                key={status}
                onClick={() => onStatusFilter(selectedStatus === status ? 'all' : status)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  selectedStatus === status
                    ? `${STATUS_CONFIG[status].bg} ${STATUS_CONFIG[status].text}`
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].bar}`}></span>
                {statusCounts[status]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {scores.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No customers found. Run health score calculation to populate data.
          </div>
        ) : (
          scores.map(score => {
            const triggers = getTriggers(score);
            const config = STATUS_CONFIG[score.status];

            return (
              <div
                key={score.id}
                className={`flex items-center gap-3 p-4 border-b hover:bg-slate-50 cursor-pointer transition-colors ${
                  hoveredId === score.id ? 'bg-slate-50' : ''
                }`}
                onMouseEnter={() => setHoveredId(score.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onCustomerClick?.(score.customer_id)}
              >
                <div className={`w-1 h-14 rounded-full ${config.bar}`}></div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-800 truncate">
                      {score.customer_name}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{formatCurrency(score.revenue_current_period)}</span>
                      <span className="text-slate-300">|</span>
                      <span>{score.shipments_current_period} ships</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${config.bar} rounded-full transition-all`}
                        style={{ width: `${score.overall_score}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 w-8">
                      {score.overall_score}
                    </span>
                    {getTrendIcon(score.volume_change_percent, score.revenue_change_percent)}
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>

                  {triggers.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {triggers.map((trigger, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded"
                        >
                          {trigger}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
