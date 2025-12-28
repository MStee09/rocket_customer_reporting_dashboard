import { WidgetCategory, WidgetSize } from './widgetTypes';

export const categoryColors: Record<WidgetCategory, string> = {
  volume: 'bg-blue-500',
  financial: 'bg-emerald-500',
  geographic: 'bg-indigo-500',
  performance: 'bg-purple-500',
  breakdown: 'bg-cyan-500',
  customers: 'bg-slate-500',
};

export const gradients = {
  blue: 'from-blue-600 to-blue-700',
  green: 'from-emerald-600 to-emerald-700',
  purple: 'from-purple-600 to-purple-700',
  orange: 'from-orange-500 to-orange-600',
};

export const sizeToColSpan: Record<WidgetSize, number> = {
  small: 1,
  medium: 1,
  wide: 2,
  full: 3,
};

export const sizeToMinHeight: Record<WidgetSize, string> = {
  small: 'min-h-[160px]',
  medium: 'min-h-[200px]',
  wide: 'min-h-[320px]',
  full: 'min-h-[400px]',
};

export const chartColors = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#6366f1',
];
