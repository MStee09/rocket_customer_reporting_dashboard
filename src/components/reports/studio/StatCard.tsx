import {
  DollarSign,
  Truck,
  Package,
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown,
  Hash,
  Percent,
  MapPin,
  Users,
  Calendar,
  Scale,
  Route,
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
  location: MapPin,
  users: Users,
  calendar: Calendar,
  scale: Scale,
  route: Route,
};

export type StatIcon = keyof typeof iconMap;

export interface StatCardProps {
  label: string;
  value: number | string;
  format?: 'currency' | 'number' | 'percent';
  icon?: StatIcon;
  theme?: ReportTheme;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  subtitle?: string;
  compact?: boolean;
}

export function StatCard({
  label,
  value,
  format = 'number',
  icon,
  theme,
  trend,
  subtitle,
  compact = false,
}: StatCardProps) {
  const Icon = icon ? iconMap[icon] : null;
  const formattedValue = formatValue(value, format);
  const themeColors = theme ? getTheme(theme) : null;

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p data-stat-label className="text-gray-500 text-xs font-medium truncate">{label}</p>
            <p className="text-gray-900 text-lg font-bold tracking-tight">
              {formattedValue}
            </p>
          </div>
          {Icon && (
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${
                themeColors ? themeColors.light : 'bg-gray-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${themeColors ? '' : 'text-gray-600'}`} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p data-stat-label className="text-gray-500 text-sm font-medium truncate">{label}</p>
          <p className="text-gray-900 text-2xl font-bold mt-1 tracking-tight">
            {formattedValue}
          </p>
          {subtitle && (
            <p className="text-gray-400 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ml-3 ${
              themeColors ? themeColors.light : 'bg-gray-100'
            }`}
          >
            <Icon className={`w-5 h-5 ${themeColors ? '' : 'text-gray-600'}`} />
          </div>
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
          {trend.direction === 'up' ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span
            className={`text-sm font-medium ${
              trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.direction === 'up' ? '+' : '-'}
            {Math.abs(trend.value)}%
          </span>
          <span className="text-gray-400 text-xs">vs previous period</span>
        </div>
      )}
    </div>
  );
}
