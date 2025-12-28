export type ReportTheme = 'blue' | 'red' | 'green' | 'orange' | 'purple' | 'teal' | 'slate';

export const themes: Record<ReportTheme, {
  gradient: string;
  solid: string;
  light: string;
  text: string;
  chartColors: string[];
}> = {
  blue: {
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-700',
    solid: 'bg-blue-500',
    light: 'bg-blue-100 text-blue-800',
    text: 'text-white',
    chartColors: ['#3B82F6', '#60A5FA', '#93C5FD', '#2563EB', '#1D4ED8'],
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
  orange: {
    gradient: 'bg-gradient-to-br from-orange-500 to-orange-700',
    solid: 'bg-orange-500',
    light: 'bg-orange-100 text-orange-800',
    text: 'text-white',
    chartColors: ['#F97316', '#FB923C', '#FDBA74', '#EA580C', '#C2410C'],
  },
  purple: {
    gradient: 'bg-gradient-to-br from-purple-500 to-purple-700',
    solid: 'bg-purple-500',
    light: 'bg-purple-100 text-purple-800',
    text: 'text-white',
    chartColors: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#7C3AED', '#6D28D9'],
  },
  teal: {
    gradient: 'bg-gradient-to-br from-teal-500 to-teal-700',
    solid: 'bg-teal-500',
    light: 'bg-teal-100 text-teal-800',
    text: 'text-white',
    chartColors: ['#14B8A6', '#2DD4BF', '#5EEAD4', '#0D9488', '#0F766E'],
  },
  slate: {
    gradient: 'bg-gradient-to-br from-slate-500 to-slate-700',
    solid: 'bg-slate-500',
    light: 'bg-slate-100 text-slate-800',
    text: 'text-white',
    chartColors: ['#64748B', '#94A3B8', '#CBD5E1', '#475569', '#334155'],
  },
};

export function getTheme(name?: string) {
  return themes[name as ReportTheme] || themes.blue;
}

export function getThemeColors(name?: string): { primary: string; secondary: string } {
  const theme = themes[name as ReportTheme] || themes.blue;
  return {
    primary: theme.chartColors[0],
    secondary: theme.chartColors[1],
  };
}
