import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  value: number;
  positiveDirection?: 'up' | 'down';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TrendIndicator({
  value,
  positiveDirection = 'up',
  showLabel = false,
  size = 'md',
  className = '',
}: TrendIndicatorProps) {
  const isUp = value > 0.5;
  const isDown = value < -0.5;
  const isFlat = !isUp && !isDown;

  const isPositive = positiveDirection === 'up' ? isUp : isDown;
  const isNegative = positiveDirection === 'up' ? isDown : isUp;

  const colorClass = isFlat
    ? 'text-slate-500'
    : isPositive
      ? 'text-emerald-600'
      : isNegative
        ? 'text-red-600'
        : 'text-slate-500';

  const bgClass = isFlat
    ? 'bg-slate-100'
    : isPositive
      ? 'bg-emerald-50'
      : 'bg-red-50';

  const sizeClasses = {
    sm: { text: 'text-xs', icon: 'w-3 h-3', gap: 'gap-0.5' },
    md: { text: 'text-sm', icon: 'w-4 h-4', gap: 'gap-1' },
    lg: { text: 'text-base', icon: 'w-5 h-5', gap: 'gap-1.5' },
  };

  const { text, icon, gap } = sizeClasses[size];

  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  const formattedValue = isFlat
    ? '0%'
    : `${value > 0 ? '+' : ''}${value.toFixed(1).replace(/\.0$/, '')}%`;

  return (
    <span className={`inline-flex items-center ${gap} ${className}`}>
      <span className={`inline-flex items-center ${gap} px-1.5 py-0.5 rounded ${bgClass} ${colorClass}`}>
        <Icon className={icon} />
        <span className={`${text} font-medium`}>{formattedValue}</span>
      </span>
      {showLabel && (
        <span className={`${text} text-slate-500`}>vs previous period</span>
      )}
    </span>
  );
}
