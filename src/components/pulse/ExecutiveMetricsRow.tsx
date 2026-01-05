import { useState, useEffect } from 'react';
import { Package, DollarSign, Clock, TrendingUp, ArrowUpRight, ArrowDownRight, Minus, Truck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ExecutiveMetricsRowProps {
  customerId: string;
  startDate: string;
  endDate: string;
}

interface MetricsData {
  totalShipments: number;
  totalSpend: number;
  avgCostPerShipment: number;
  onTimePercentage: number;
  avgTransitDays: number;
  activeCarriers: number;
  shipmentsChange: number;
  spendChange: number;
  onTimeChange: number;
}

function TrendIndicator({ value, inverse = false }: { value: number; inverse?: boolean }) {
  if (Math.abs(value) < 0.5) {
    return (
      <span className="flex items-center gap-1 text-slate-500 text-xs">
        <Minus className="w-3 h-3" />
        <span>No change</span>
      </span>
    );
  }

  const isPositive = inverse ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  const colorClass = isPositive ? 'text-emerald-600' : 'text-red-500';

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{Math.abs(value).toFixed(1)}%</span>
    </span>
  );
}

export function ExecutiveMetricsRow({ customerId, startDate, endDate }: ExecutiveMetricsRowProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_pulse_executive_metrics', {
          p_customer_id: parseInt(customerId),
          p_start_date: startDate,
          p_end_date: endDate,
        });

        if (error) {
          console.error('Error loading metrics:', error);
          setMetrics(null);
        } else if (data) {
          setMetrics(data);
        }
      } catch (err) {
        console.error('Error:', err);
        setMetrics(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadMetrics();
  }, [customerId, startDate, endDate]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="h-4 bg-slate-100 rounded animate-pulse w-24 mb-3" />
            <div className="h-8 bg-slate-100 rounded animate-pulse w-20 mb-2" />
            <div className="h-4 bg-slate-100 rounded animate-pulse w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
        <p className="text-slate-500">No data available for the selected period</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const metricCards = [
    {
      icon: Package,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      label: 'Total Shipments',
      value: metrics.totalShipments.toLocaleString(),
      change: metrics.shipmentsChange,
      inverse: false,
    },
    {
      icon: DollarSign,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      label: 'Total Spend',
      value: formatCurrency(metrics.totalSpend),
      change: metrics.spendChange,
      inverse: true,
    },
    {
      icon: Clock,
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      label: 'On-Time Delivery',
      value: `${metrics.onTimePercentage.toFixed(1)}%`,
      change: metrics.onTimeChange,
      inverse: false,
    },
    {
      icon: Truck,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      label: 'Active Carriers',
      value: metrics.activeCarriers.toString(),
      change: 0,
      inverse: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${metric.iconBg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${metric.iconColor}`} />
              </div>
              <span className="text-sm font-medium text-slate-600">{metric.label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {metric.value}
            </div>
            <TrendIndicator value={metric.change} inverse={metric.inverse} />
          </div>
        );
      })}
    </div>
  );
}
