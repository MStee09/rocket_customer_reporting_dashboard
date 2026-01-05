import { useState, useEffect } from 'react';
import { DollarSign, Package, TrendingUp, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CoreKPIRowProps {
  customerId: string;
  startDate: string;
  endDate: string;
}

interface KPIData {
  totalSpend: number;
  totalShipments: number;
  avgCostPerShipment: number;
  onTimePercentage: number;
  spendChange: number;
  shipmentsChange: number;
  avgCostChange: number;
  otpChange: number;
}

export function CoreKPIRow({ customerId, startDate, endDate }: CoreKPIRowProps) {
  const [data, setData] = useState<KPIData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchKPIs() {
      setIsLoading(true);
      try {
        const { data: currentData, error: currentError } = await supabase.rpc('get_pulse_kpis', {
          p_customer_id: parseInt(customerId),
          p_start_date: startDate,
          p_end_date: endDate,
        });

        if (currentError) throw currentError;

        const startMs = new Date(startDate).getTime();
        const endMs = new Date(endDate).getTime();
        const periodLength = endMs - startMs;
        const prevStartDate = new Date(startMs - periodLength).toISOString().split('T')[0];
        const prevEndDate = new Date(startMs - 1).toISOString().split('T')[0];

        const { data: prevData } = await supabase.rpc('get_pulse_kpis', {
          p_customer_id: parseInt(customerId),
          p_start_date: prevStartDate,
          p_end_date: prevEndDate,
        });

        const current = currentData?.[0] || {};
        const prev = prevData?.[0] || {};

        const calcChange = (curr: number, previous: number) => {
          if (!previous || previous === 0) return 0;
          return ((curr - previous) / previous) * 100;
        };

        setData({
          totalSpend: current.total_spend || 0,
          totalShipments: current.total_shipments || 0,
          avgCostPerShipment: current.avg_cost_per_shipment || 0,
          onTimePercentage: current.on_time_percentage || 0,
          spendChange: calcChange(current.total_spend || 0, prev.total_spend || 0),
          shipmentsChange: calcChange(current.total_shipments || 0, prev.total_shipments || 0),
          avgCostChange: calcChange(current.avg_cost_per_shipment || 0, prev.avg_cost_per_shipment || 0),
          otpChange: calcChange(current.on_time_percentage || 0, prev.on_time_percentage || 0),
        });
      } catch (err) {
        console.error('Error fetching KPIs:', err);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchKPIs();
  }, [customerId, startDate, endDate]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000) return value.toLocaleString();
    return value.toString();
  };

  const kpis = data ? [
    { label: 'Total Spend', value: formatCurrency(data.totalSpend), change: data.spendChange, icon: DollarSign, color: 'emerald', inverseChange: true },
    { label: 'Shipments', value: formatNumber(data.totalShipments), change: data.shipmentsChange, icon: Package, color: 'blue', inverseChange: false },
    { label: 'Avg Cost', value: formatCurrency(data.avgCostPerShipment), change: data.avgCostChange, icon: TrendingUp, color: 'orange', inverseChange: true },
    { label: 'On-Time %', value: `${data.onTimePercentage.toFixed(0)}%`, change: data.otpChange, icon: Clock, color: 'teal', inverseChange: false },
  ] : [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-20 mb-3" />
            <div className="h-8 bg-slate-100 rounded w-24 mb-2" />
            <div className="h-3 bg-slate-100 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
        <p className="text-slate-500">No data available for the selected period</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const isPositive = kpi.inverseChange ? kpi.change < 0 : kpi.change > 0;
        const isNegative = kpi.inverseChange ? kpi.change > 0 : kpi.change < 0;

        return (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">{kpi.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                kpi.color === 'emerald' ? 'bg-emerald-50' :
                kpi.color === 'blue' ? 'bg-blue-50' :
                kpi.color === 'orange' ? 'bg-orange-50' : 'bg-teal-50'
              }`}>
                <Icon className={`w-4 h-4 ${
                  kpi.color === 'emerald' ? 'text-emerald-600' :
                  kpi.color === 'blue' ? 'text-blue-600' :
                  kpi.color === 'orange' ? 'text-orange-600' : 'text-teal-600'
                }`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-2">{kpi.value}</div>
            <div className="flex items-center gap-1">
              {kpi.change !== 0 && (
                <>
                  {isPositive ? <ArrowUp className="w-3 h-3 text-emerald-500" /> :
                   isNegative ? <ArrowDown className="w-3 h-3 text-red-500" /> : null}
                  <span className={`text-xs font-medium ${
                    isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-slate-500'
                  }`}>
                    {Math.abs(kpi.change).toFixed(1)}%
                  </span>
                </>
              )}
              <span className="text-xs text-slate-400">vs prev period</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
