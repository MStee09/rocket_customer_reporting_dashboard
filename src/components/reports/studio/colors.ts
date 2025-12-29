import { chartColors as brandChartColors } from '../../../config/chartTheme';

export const reportColors = {
  orange: { bg: '#f97316', text: 'white', light: '#fff7ed', border: '#fed7aa' },
  gold: { bg: '#fbbf24', text: 'white', light: '#fffbeb', border: '#fde68a' },
  coral: { bg: '#fb7185', text: 'white', light: '#fff1f2', border: '#fecdd3' },
  charcoal: { bg: '#475569', text: 'white', light: '#f8fafc', border: '#cbd5e1' },
  green: { bg: '#22C55E', text: 'white', light: '#F0FDF4', border: '#BBF7D0' },
  amber: { bg: '#f59e0b', text: 'white', light: '#fffbeb', border: '#fed7aa' },
  teal: { bg: '#14B8A6', text: 'white', light: '#F0FDFA', border: '#99F6E4' },
  red: { bg: '#EF4444', text: 'white', light: '#FEF2F2', border: '#FECACA' },
  slate: { bg: '#64748B', text: 'white', light: '#F8FAFC', border: '#E2E8F0' },
  blue: { bg: '#0ea5e9', text: 'white', light: '#f0f9ff', border: '#bae6fd' },
  cyan: { bg: '#06B6D4', text: 'white', light: '#ECFEFF', border: '#A5F3FC' },
  emerald: { bg: '#10B981', text: 'white', light: '#ECFDF5', border: '#A7F3D0' },
} as const;

export type ReportColor = keyof typeof reportColors;

export const chartColors = brandChartColors.primary;

export const colorOrder: ReportColor[] = [
  'orange',
  'gold',
  'coral',
  'charcoal',
  'amber',
  'green',
  'teal',
  'slate',
  'blue',
  'cyan',
  'emerald',
  'red',
];

export function assignColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) => chartColors[i % chartColors.length]);
}

export function assignColorNames(count: number): ReportColor[] {
  return Array.from({ length: count }, (_, i) => colorOrder[i % colorOrder.length]);
}

export function getColorByIndex(index: number): ReportColor {
  return colorOrder[index % colorOrder.length];
}

export function formatValue(
  value: number | string,
  format?: 'currency' | 'number' | 'percent'
): string {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'number':
    default:
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
      }).format(value);
  }
}
