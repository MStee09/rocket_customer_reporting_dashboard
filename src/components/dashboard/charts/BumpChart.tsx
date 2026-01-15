import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';

export interface BumpRanking {
  period: string;
  [entity: string]: string | number;
}

export interface BumpEntity {
  key: string;
  name: string;
  color: string;
}

interface BumpChartProps {
  data: BumpRanking[];
  entities: BumpEntity[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  height?: number;
  showLegend?: boolean;
  className?: string;
}

export function BumpChart({
  data,
  entities,
  isLoading = false,
  title = 'Ranking Changes Over Time',
  subtitle,
  height = 400,
  showLegend = true,
  className = '',
}: BumpChartProps) {
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
        No ranking data available
      </div>
    );
  }

  const maxRank = entities.length;

  return (
    <div className={className}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis
            reversed
            domain={[1, maxRank]}
            ticks={Array.from({ length: maxRank }, (_, i) => i + 1)}
            tick={{ fontSize: 11, fill: '#64748b' }}
            label={{
              value: 'Rank',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 11, fill: '#64748b' },
            }}
          />
          <Tooltip
            content={({ payload, label }) => {
              if (!payload || !payload.length) return null;
              return (
                <div className="bg-white px-3 py-2 rounded-lg shadow-xl border border-slate-200 text-xs">
                  <div className="font-medium text-slate-800 mb-2">{label}</div>
                  {payload
                    .sort((a, b) => (a.value as number) - (b.value as number))
                    .map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 text-right font-bold" style={{ color: entry.color }}>
                          #{entry.value}
                        </div>
                        <span className="text-slate-600">{entry.name}</span>
                      </div>
                    ))}
                </div>
              );
            }}
          />

          {entities.map((entity) => (
            <Line
              key={entity.key}
              type="monotone"
              dataKey={entity.key}
              name={entity.name}
              stroke={entity.color}
              strokeWidth={3}
              dot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 8, strokeWidth: 2 }}
            />
          ))}

          {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function buildCarrierBumpData(rankings: Array<{
  period: string;
  rankings: Array<{ carrier: string; rank: number }>;
}>): { data: BumpRanking[]; entities: BumpEntity[] } {
  const colors = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444', '#06b6d4'];

  const carriers = [...new Set(rankings.flatMap(r => r.rankings.map(c => c.carrier)))];

  const entities = carriers.map((carrier, i) => ({
    key: carrier.toLowerCase().replace(/\s+/g, '_'),
    name: carrier,
    color: colors[i % colors.length],
  }));

  const data: BumpRanking[] = rankings.map(r => ({
    period: r.period,
    ...Object.fromEntries(
      r.rankings.map(c => [c.carrier.toLowerCase().replace(/\s+/g, '_'), c.rank])
    ),
  }));

  return { data, entities };
}

export default BumpChart;
