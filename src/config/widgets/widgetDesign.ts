import { WidgetCategory, WidgetSize } from './widgetTypes';

export const categoryColors: Record<WidgetCategory, string> = {
  volume: 'bg-rocket-500',
  financial: 'bg-emerald-500',
  geographic: 'bg-charcoal-600',
  performance: 'bg-coral-500',
  breakdown: 'bg-teal-500',
  customers: 'bg-rocket-400',
};

export const gradients = {
  orange: 'from-rocket-500 to-rocket-600',
  green: 'from-emerald-600 to-emerald-700',
  coral: 'from-coral-500 to-coral-600',
  charcoal: 'from-charcoal-600 to-charcoal-700',
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

import { chartColors as brandChartColors } from '../chartTheme';
export const chartColors = brandChartColors.primary;
