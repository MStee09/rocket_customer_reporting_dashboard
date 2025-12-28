import {
  DollarSign,
  Truck,
  Package,
  BarChart3,
  Clock,
  TrendingUp,
  Hash,
  Percent,
} from 'lucide-react';
import { formatValue } from './colors';
import { getTheme, ReportTheme } from './reportTheme';

const iconMap = {
  dollar: DollarSign,
  truck: Truck,
  package: Package,
  chart: BarChart3,
  clock: Clock,
  trending: TrendingUp,
  hash: Hash,
  percent: Percent,
};

export type HeroIcon = keyof typeof iconMap;

export interface HeroMetricProps {
  label: string;
  value: number | string;
  format?: 'currency' | 'number' | 'percent';
  icon?: HeroIcon;
  theme?: ReportTheme;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
  compact?: boolean;
}

export function HeroMetric({
  label,
  value,
  format = 'number',
  icon = 'chart',
  theme = 'blue',
  subtitle,
  trend,
  compact = false,
}: HeroMetricProps) {
  const Icon = iconMap[icon] || iconMap.chart;
  const themeColors = getTheme(theme);
  const formattedValue = formatValue(value, format);

  if (compact) {
    return (
      <div
        className={`relative overflow-hidden rounded-xl p-4 shadow-sm ${themeColors.gradient}`}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-xs font-medium uppercase tracking-wide">
              {label}
            </p>
            <p className="text-white text-2xl font-bold tracking-tight leading-none mt-0.5">
              {formattedValue}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-8 shadow-lg ${themeColors.gradient}`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
        <div
          className="w-full h-full rounded-full transform translate-x-1/3 -translate-y-1/3"
          style={{ backgroundColor: 'white' }}
        />
      </div>

      <div className="relative flex items-start gap-6">
        <div
          className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <Icon className="w-8 h-8 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white/80 text-sm font-medium uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className="text-white text-5xl font-bold tracking-tight leading-none">
            {formattedValue}
          </p>
          {subtitle && (
            <p className="text-white/70 text-sm mt-2">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-2 mt-3">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  trend.direction === 'up'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/20 text-white'
                }`}
              >
                {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span className="text-white/60 text-xs">{trend.label}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
