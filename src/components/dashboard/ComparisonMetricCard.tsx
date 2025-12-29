import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ReactNode } from 'react';

interface ComparisonMetricCardProps {
  title: string;
  currentValue: number;
  currentLabel: string;
  comparisonValue: number;
  comparisonLabel: string;
  format?: 'currency' | 'number' | 'percent';
  positiveDirection?: 'up' | 'down';
  icon?: ReactNode;
}

export function ComparisonMetricCard({
  title,
  currentValue,
  currentLabel,
  comparisonValue,
  comparisonLabel,
  format = 'number',
  positiveDirection = 'up',
  icon
}: ComparisonMetricCardProps) {
  const formatValue = (val: number) => {
    if (format === 'currency') {
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
      return `$${val.toFixed(0)}`;
    }
    if (format === 'percent') return `${val.toFixed(1)}%`;
    return val.toLocaleString();
  };

  const change = comparisonValue === 0
    ? (currentValue > 0 ? 100 : 0)
    : ((currentValue - comparisonValue) / comparisonValue) * 100;

  const isPositive = positiveDirection === 'up' ? change > 0 : change < 0;
  const isNegative = positiveDirection === 'up' ? change < 0 : change > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            {icon}
          </div>
        )}
        <span className="text-sm font-medium text-slate-600">{title}</span>
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-2xl font-bold text-slate-900">{formatValue(currentValue)}</div>
          <div className="text-xs text-slate-500 mt-0.5">{currentLabel}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-slate-400">{formatValue(comparisonValue)}</div>
          <div className="text-xs text-slate-400 mt-0.5">{comparisonLabel}</div>
        </div>
      </div>

      <div className={`flex items-center gap-1.5 text-sm font-medium ${
        isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-slate-500'
      }`}>
        {change > 0.5 ? <TrendingUp className="w-4 h-4" /> :
         change < -0.5 ? <TrendingDown className="w-4 h-4" /> :
         <Minus className="w-4 h-4" />}
        <span>{change > 0 ? '+' : ''}{change.toFixed(1)}% vs comparison</span>
      </div>
    </div>
  );
}
