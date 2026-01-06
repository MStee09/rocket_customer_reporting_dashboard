import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, ArrowRight, CheckCircle, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TopCarriersCompactProps {
  customerId: string;
  startDate: string;
  endDate: string;
}

interface CarrierSummary {
  carrier_name: string;
  shipment_count: number;
  total_spend: number;
  on_time_pct: number;
  volume_share_pct: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function PerformanceBadge({ onTimePct }: { onTimePct: number }) {
  if (onTimePct >= 95) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
        <CheckCircle className="w-3 h-3" />
        {onTimePct.toFixed(0)}%
      </span>
    );
  } else if (onTimePct >= 85) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
        {onTimePct.toFixed(0)}%
      </span>
    );
  } else if (onTimePct > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium">
        <AlertTriangle className="w-3 h-3" />
        {onTimePct.toFixed(0)}%
      </span>
    );
  }
  return null;
}

export function TopCarriersCompact({ customerId, startDate, endDate }: TopCarriersCompactProps) {
  const navigate = useNavigate();
  const [carriers, setCarriers] = useState<CarrierSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCarriers() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_pulse_top_carriers', {
          p_customer_id: parseInt(customerId),
          p_start_date: startDate,
          p_end_date: endDate,
          p_limit: 5,
        });

        if (error) {
          console.error('Error loading carriers:', error);
          setCarriers([]);
        } else if (data) {
          setCarriers(data);
        }
      } catch (err) {
        console.error('Error:', err);
        setCarriers([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (customerId) {
      loadCarriers();
    }
  }, [customerId, startDate, endDate]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse" />
          <div>
            <div className="h-5 bg-slate-100 rounded w-24 mb-1 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded w-16 animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Truck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Top Carriers</h3>
            <p className="text-sm text-slate-500">By volume</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/analytics')}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          View all
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {carriers.length === 0 ? (
        <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl">
          No carrier data for this period
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {carriers.map((carrier, index) => (
              <div
                key={carrier.carrier_name}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  index === 0 ? 'bg-amber-100 text-amber-700' :
                  index === 1 ? 'bg-slate-200 text-slate-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-900 truncate">
                      {carrier.carrier_name}
                    </span>
                    <PerformanceBadge onTimePct={carrier.on_time_pct} />
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    {carrier.shipment_count} shipments
                    {carrier.volume_share_pct > 0 && ` - ${carrier.volume_share_pct.toFixed(0)}% share`}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-semibold text-slate-900">
                    {formatCurrency(carrier.total_spend)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-slate-100">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600">Carrier mix stable</span>
          </div>
        </>
      )}
    </div>
  );
}
