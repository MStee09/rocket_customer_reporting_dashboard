import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';

export interface CalendarDay {
  date: string;
  value: number;
}

interface CalendarHeatmapProps {
  data: CalendarDay[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  height?: number;
  colorScale?: string[];
  valueLabel?: string;
  className?: string;
}

export function CalendarHeatmap({
  data,
  isLoading = false,
  title = 'Daily Activity',
  subtitle,
  height = 180,
  colorScale = ['#f0fdf4', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d'],
  valueLabel = 'shipments',
  className = '',
}: CalendarHeatmapProps) {
  const { weeks, stats, monthLabels } = useMemo(() => {
    if (!data.length) return { weeks: [], stats: { min: 0, max: 0 }, monthLabels: [] };

    const values = data.map(d => d.value);
    const stats = {
      min: Math.min(...values),
      max: Math.max(...values),
    };

    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const dataMap = new Map(sorted.map(d => [d.date, d.value]));
    const startDate = new Date(sorted[0].date);
    const endDate = new Date(sorted[sorted.length - 1].date);

    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weeks: Array<Array<{ date: string; value: number | null; dayOfWeek: number }>> = [];
    let currentWeek: Array<{ date: string; value: number | null; dayOfWeek: number }> = [];
    const monthLabels: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;

    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay();
      const month = current.getMonth();

      currentWeek.push({
        date: dateStr,
        value: dataMap.get(dateStr) ?? null,
        dayOfWeek,
      });

      if (dayOfWeek === 6 || current.getTime() === endDate.getTime()) {
        weeks.push(currentWeek);
        currentWeek = [];

        if (month !== lastMonth) {
          monthLabels.push({
            label: current.toLocaleDateString('en-US', { month: 'short' }),
            weekIndex: weeks.length - 1,
          });
          lastMonth = month;
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return { weeks, stats, monthLabels };
  }, [data]);

  const getColor = (value: number | null): string => {
    if (value === null) return '#f1f5f9';
    const range = stats.max - stats.min || 1;
    const normalized = (value - stats.min) / range;
    const index = Math.min(Math.floor(normalized * colorScale.length), colorScale.length - 1);
    return colorScale[index];
  };

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
        No daily data available
      </div>
    );
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const cellSize = 14;
  const cellGap = 3;

  return (
    <div className={className}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="inline-block">
          <div className="flex mb-1 ml-8">
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="text-xs text-slate-500"
                style={{
                  marginLeft: i === 0 ? 0 : (m.weekIndex - (monthLabels[i - 1]?.weekIndex || 0)) * (cellSize + cellGap) - 30,
                  minWidth: 30,
                }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="flex">
            <div className="flex flex-col mr-2">
              {dayLabels.map((day, i) => (
                <div
                  key={day}
                  className="text-xs text-slate-400"
                  style={{ height: cellSize + cellGap, lineHeight: `${cellSize}px` }}
                >
                  {i % 2 === 1 ? day : ''}
                </div>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      className="rounded-sm cursor-pointer transition-transform hover:scale-110"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: getColor(day.value),
                      }}
                      title={`${day.date}: ${day.value !== null ? `${day.value} ${valueLabel}` : 'No data'}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-1 mt-3 text-xs text-slate-500">
            <span>Less</span>
            {colorScale.map((color, i) => (
              <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarHeatmap;
