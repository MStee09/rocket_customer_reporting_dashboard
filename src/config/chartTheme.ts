export const chartColors = {
  primary: [
    '#f97316', // rocket-600 - Orange (primary)
    '#fbbf24', // rocket-400 - Gold
    '#fb7185', // coral-400 - Coral
    '#475569', // charcoal-600 - Slate
    '#f59e0b', // rocket-500 - Amber
    '#fda4af', // coral-300 - Light coral
    '#64748b', // charcoal-500 - Gray
    '#fcd34d', // rocket-300 - Light gold
  ],

  comparison: {
    current: '#f97316',
    previous: '#cbd5e1',
  },

  sentiment: {
    positive: '#22c55e',
    negative: '#ef4444',
    neutral: '#64748b',
  },

  status: {
    delivered: '#22c55e',
    inTransit: '#0ea5e9',
    pending: '#f59e0b',
    exception: '#ef4444',
    cancelled: '#94a3b8',
  },

  gradients: {
    orange: ['#f97316', '#fed7aa'],
    gold: ['#fbbf24', '#fef3c7'],
    coral: ['#fb7185', '#fecdd3'],
  },

  grid: '#e2e8f0',
  axis: '#94a3b8',
  label: '#64748b',
};

export const rechartsTheme = {
  tooltip: {
    contentStyle: {
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      padding: '12px',
    },
    labelStyle: {
      color: '#1e293b',
      fontWeight: 600,
      marginBottom: '4px',
    },
    itemStyle: {
      color: '#64748b',
      fontSize: '13px',
    },
  },

  legend: {
    wrapperStyle: {
      paddingTop: '20px',
    },
    iconType: 'circle' as const,
    iconSize: 8,
  },

  xAxis: {
    axisLine: { stroke: chartColors.grid },
    tickLine: { stroke: chartColors.grid },
    tick: { fill: chartColors.label, fontSize: 12 },
  },

  yAxis: {
    axisLine: false,
    tickLine: false,
    tick: { fill: chartColors.label, fontSize: 12 },
  },

  cartesianGrid: {
    strokeDasharray: '3 3',
    stroke: chartColors.grid,
    vertical: false,
  },
};

export function getChartColor(index: number): string {
  return chartColors.primary[index % chartColors.primary.length];
}

export function getPieColors(count: number): string[] {
  return chartColors.primary.slice(0, count);
}
