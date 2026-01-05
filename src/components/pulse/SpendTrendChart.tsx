import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

interface SpendTrendChartProps {
  customerId: string;
  startDate: string;
  endDate: string;
}

interface DailySpend {
  date: string;
  spend: number;
  shipments: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function SpendTrendChart({ customerId, startDate, endDate }: SpendTrendChartProps) {
  const [data, setData] = useState<DailySpend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalSpend, setTotalSpend] = useState(0);
  const [spendChange, setSpendChange] = useState(0);

  useEffect(() => {
    async function loadTrendData() {
      setIsLoading(true);
      try {
        const { data: trendData, error } = await supabase.rpc('get_pulse_spend_trend', {
          p_customer_id: parseInt(customerId),
          p_start_date: startDate,
          p_end_date: endDate,
        });

        if (error) {
          console.error('Error loading spend trend:', error);
          setData([]);
          setTotalSpend(0);
          setSpendChange(0);
        } else if (trendData && trendData.length > 0) {
          setData(trendData);
          const total = trendData.reduce((sum: number, d: DailySpend) => sum + Number(d.spend), 0);
          setTotalSpend(total);

          const midpoint = Math.floor(trendData.length / 2);
          if (midpoint > 0) {
            const firstHalf = trendData.slice(0, midpoint).reduce((s: number, d: DailySpend) => s + Number(d.spend), 0);
            const secondHalf = trendData.slice(midpoint).reduce((s: number, d: DailySpend) => s + Number(d.spend), 0);
            const change = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
            setSpendChange(change);
          }
        } else {
          setData([]);
          setTotalSpend(0);
          setSpendChange(0);
        }
      } catch (err) {
        console.error('Error:', err);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadTrendData();
  }, [customerId, startDate, endDate]);

  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      spend: Number(d.spend),
      displayDate: format(parseISO(d.date), 'MMM d'),
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="h-4 bg-slate-100 rounded animate-pulse w-32 mb-4" />
        <div className="h-48 bg-slate-50 rounded animate-pulse" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Spend Trend</h3>
            <p className="text-sm text-slate-500">Daily freight spend</p>
          </div>
        </div>
        <div className="h-48 flex items-center justify-center text-slate-500">
          No spend data available for this period
        </div>
      </div>
    );
  }

  const TrendIcon = spendChange > 1 ? TrendingUp : spendChange < -1 ? TrendingDown : Minus;
  const trendColor = spendChange > 1 ? 'text-red-500' : spendChange < -1 ? 'text-emerald-600' : 'text-slate-500';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Spend Trend</h3>
            <p className="text-sm text-slate-500">Daily freight spend</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(totalSpend)}
          </div>
          <div className={`flex items-center gap-1 justify-end ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {spendChange > 0 ? '+' : ''}{spendChange.toFixed(1)}% vs prior
            </span>
          </div>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="displayDate"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              tickFormatter={(value) => formatCurrency(value)}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                border: 'none',
                borderRadius: '8px',
                color: '#F8FAFC',
              }}
              formatter={(value: number) => [formatCurrency(value), 'Spend']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="spend"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#spendGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
