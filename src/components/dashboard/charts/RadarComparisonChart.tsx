import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Loader2 } from 'lucide-react';

export interface RadarMetric {
  metric: string;
  fullMark?: number;
  [key: string]: string | number | undefined;
}

export interface RadarEntity {
  key: string;
  name: string;
  color: string;
}

interface RadarComparisonChartProps {
  data: RadarMetric[];
  entities: RadarEntity[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  height?: number;
  showLegend?: boolean;
  className?: string;
}

export function RadarComparisonChart({
  data,
  entities,
  isLoading = false,
  title = 'Multi-Dimensional Comparison',
  subtitle,
  height = 400,
  showLegend = true,
  className = '',
}: RadarComparisonChartProps) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className={`flex items-center justify-center text-slate-500 ${className}`} style={{ height }}>
        No comparison data available
      </div>
    );
  }

  return (
    <div className={className}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />

          {entities.map((entity) => (
            <Radar
              key={entity.key}
              name={entity.name}
              dataKey={entity.key}
              stroke={entity.color}
              fill={entity.color}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}

          <Tooltip
            content={({ payload, label }) => {
              if (!payload || !payload.length) return null;
              return (
                <div className="bg-white px-3 py-2 rounded-lg shadow-xl border border-slate-200 text-xs">
                  <div className="font-medium text-slate-800 mb-1">{label}</div>
                  {payload.map((entry: any) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-slate-600">{entry.name}:</span>
                      <span className="font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              );
            }}
          />

          {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function buildCarrierRadarData(carriers: Array<{
  name: string;
  onTimePercent: number;
  claimRate: number;
  avgCost: number;
  coverage: number;
  responseTime: number;
}>): { data: RadarMetric[]; entities: RadarEntity[] } {
  const colors = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444'];

  const entities = carriers.map((c, i) => ({
    key: c.name.toLowerCase().replace(/\s+/g, '_'),
    name: c.name,
    color: colors[i % colors.length],
  }));

  const maxCost = Math.max(...carriers.map(c => c.avgCost));

  const data: RadarMetric[] = [
    {
      metric: 'On-Time %',
      fullMark: 100,
      ...Object.fromEntries(entities.map((e, i) => [e.key, carriers[i].onTimePercent])),
    },
    {
      metric: 'Low Claims',
      fullMark: 100,
      ...Object.fromEntries(entities.map((e, i) => [e.key, Math.max(0, 100 - carriers[i].claimRate * 10)])),
    },
    {
      metric: 'Cost Efficiency',
      fullMark: 100,
      ...Object.fromEntries(entities.map((e, i) => [e.key, Math.max(0, 100 - (carriers[i].avgCost / maxCost) * 100)])),
    },
    {
      metric: 'Coverage',
      fullMark: 100,
      ...Object.fromEntries(entities.map((e, i) => [e.key, carriers[i].coverage])),
    },
    {
      metric: 'Response Time',
      fullMark: 100,
      ...Object.fromEntries(entities.map((e, i) => [e.key, Math.max(0, 100 - carriers[i].responseTime * 10)])),
    },
  ];

  return { data, entities };
}

export default RadarComparisonChart;
