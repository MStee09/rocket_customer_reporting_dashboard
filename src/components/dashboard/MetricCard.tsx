import { LucideIcon, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    positive: boolean;
  };
  icon: LucideIcon;
  iconColor?: 'orange' | 'gold' | 'coral' | 'charcoal' | 'success' | 'info' | 'warning';
  isLoading?: boolean;
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
  iconColor = 'orange',
  isLoading,
  onClick,
}: MetricCardProps) {
  const iconColors = {
    orange: 'bg-gradient-to-br from-rocket-400 to-rocket-600',
    gold: 'bg-gradient-to-br from-rocket-300 to-rocket-500',
    coral: 'bg-gradient-to-br from-coral-400 to-coral-600',
    charcoal: 'bg-gradient-to-br from-charcoal-600 to-charcoal-800',
    success: 'bg-gradient-to-br from-success to-success-dark',
    info: 'bg-gradient-to-br from-info to-info-dark',
    warning: 'bg-gradient-to-br from-amber-400 to-amber-600',
  };

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-lg border border-charcoal-200
        p-5
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-charcoal-300' : ''}
      `}
    >
      <div className={`
        w-11 h-11 rounded-lg
        flex items-center justify-center
        ${iconColors[iconColor]}
        shadow-sm
      `}>
        <Icon className="w-5 h-5 text-white" />
      </div>

      <p className="mt-4 text-sm font-medium text-charcoal-500">
        {label}
      </p>

      {isLoading ? (
        <div className="flex items-center mt-1 h-9">
          <Loader2 className="w-5 h-5 text-charcoal-400 animate-spin" />
        </div>
      ) : (
        <p className="mt-1 text-2xl font-bold text-charcoal-900 tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      )}

      {trend && !isLoading && (
        <div className={`
          mt-2 flex items-center gap-1 text-xs font-medium
          ${trend.positive ? 'text-success' : 'text-danger'}
        `}>
          {trend.positive ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>{Math.abs(trend.value)}% vs last period</span>
        </div>
      )}
    </div>
  );
}
