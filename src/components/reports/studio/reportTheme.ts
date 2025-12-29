import { chartColors } from '../../../config/chartTheme';

export type ReportTheme = 'orange' | 'red' | 'green' | 'gold' | 'coral' | 'teal' | 'slate';

export const themes: Record<ReportTheme, {
  gradient: string;
  solid: string;
  light: string;
  text: string;
  chartColors: string[];
}> = {
  orange: {
    gradient: 'bg-gradient-to-br from-rocket-500 to-rocket-700',
    solid: 'bg-rocket-500',
    light: 'bg-rocket-100 text-rocket-800',
    text: 'text-white',
    chartColors: chartColors.primary,
  },
  gold: {
    gradient: 'bg-gradient-to-br from-rocket-400 to-rocket-600',
    solid: 'bg-rocket-400',
    light: 'bg-rocket-50 text-rocket-700',
    text: 'text-white',
    chartColors: ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#fde68a'],
  },
  red: {
    gradient: 'bg-gradient-to-br from-red-500 to-red-700',
    solid: 'bg-red-500',
    light: 'bg-red-100 text-red-800',
    text: 'text-white',
    chartColors: ['#EF4444', '#F87171', '#FCA5A5', '#DC2626', '#B91C1C'],
  },
  green: {
    gradient: 'bg-gradient-to-br from-green-500 to-green-700',
    solid: 'bg-green-500',
    light: 'bg-green-100 text-green-800',
    text: 'text-white',
    chartColors: ['#22C55E', '#4ADE80', '#86EFAC', '#16A34A', '#15803D'],
  },
  coral: {
    gradient: 'bg-gradient-to-br from-coral-400 to-coral-600',
    solid: 'bg-coral-500',
    light: 'bg-coral-100 text-coral-800',
    text: 'text-white',
    chartColors: ['#fb7185', '#f43f5e', '#e11d48', '#fda4af', '#fecdd3'],
  },
  teal: {
    gradient: 'bg-gradient-to-br from-teal-500 to-teal-700',
    solid: 'bg-teal-500',
    light: 'bg-teal-100 text-teal-800',
    text: 'text-white',
    chartColors: ['#14B8A6', '#2DD4BF', '#5EEAD4', '#0D9488', '#0F766E'],
  },
  slate: {
    gradient: 'bg-gradient-to-br from-charcoal-500 to-charcoal-700',
    solid: 'bg-charcoal-500',
    light: 'bg-charcoal-100 text-charcoal-800',
    text: 'text-white',
    chartColors: ['#64748B', '#94A3B8', '#CBD5E1', '#475569', '#334155'],
  },
};

export function getTheme(name?: string) {
  return themes[name as ReportTheme] || themes.orange;
}

export function getThemeColors(name?: string): { primary: string; secondary: string } {
  const theme = themes[name as ReportTheme] || themes.orange;
  return {
    primary: theme.chartColors[0],
    secondary: theme.chartColors[1],
  };
}
