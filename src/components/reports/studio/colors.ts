export const reportColors = {
  blue: { bg: '#3B82F6', text: 'white', light: '#EFF6FF', border: '#BFDBFE' },
  green: { bg: '#22C55E', text: 'white', light: '#F0FDF4', border: '#BBF7D0' },
  orange: { bg: '#F59E0B', text: 'white', light: '#FFFBEB', border: '#FED7AA' },
  yellow: { bg: '#EAB308', text: 'white', light: '#FEFCE8', border: '#FEF08A' },
  purple: { bg: '#8B5CF6', text: 'white', light: '#FAF5FF', border: '#DDD6FE' },
  red: { bg: '#EF4444', text: 'white', light: '#FEF2F2', border: '#FECACA' },
  teal: { bg: '#14B8A6', text: 'white', light: '#F0FDFA', border: '#99F6E4' },
  gray: { bg: '#6B7280', text: 'white', light: '#F9FAFB', border: '#E5E7EB' },
  slate: { bg: '#64748B', text: 'white', light: '#F8FAFC', border: '#E2E8F0' },
  emerald: { bg: '#10B981', text: 'white', light: '#ECFDF5', border: '#A7F3D0' },
  cyan: { bg: '#06B6D4', text: 'white', light: '#ECFEFF', border: '#A5F3FC' },
  rose: { bg: '#F43F5E', text: 'white', light: '#FFF1F2', border: '#FECDD3' },
} as const;

export type ReportColor = keyof typeof reportColors;

export const chartColors = [
  '#3B82F6',
  '#22C55E',
  '#F59E0B',
  '#14B8A6',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#6366F1',
  '#10B981',
  '#06B6D4',
];

export const colorOrder: ReportColor[] = [
  'blue',
  'green',
  'orange',
  'teal',
  'red',
  'purple',
  'cyan',
  'emerald',
  'yellow',
  'rose',
  'slate',
  'gray',
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
